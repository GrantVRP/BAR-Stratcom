import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  Group,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  Points,
  ShaderMaterial
} from 'three';
import { colorAt, type Particle } from '../../../../core/launch/fx';

const SHAPES: Record<Particle['shape'], number> = { blob: 0, shard: 1, spark: 2, ring: 3 };

const DISC_POOL = 24;
const blend = { transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor } as const;

/** Flat particles (ground flashes, the shockwave) as discs lying on the ground, like BAR's decals. */
class FlatDiscs {
  readonly group = new Group();
  private readonly meshes: Array<Mesh<PlaneGeometry, ShaderMaterial>> = [];
  private readonly geometry = new PlaneGeometry(2, 2);

  constructor() {
    this.geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < DISC_POOL; i += 1) {
      const material = new ShaderMaterial({
        uniforms: { rgba: { value: [0, 0, 0, 0] }, ring: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec4 rgba;
          uniform float ring;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float m = ring > 0.5 ? smoothstep(0.7, 0.85, d) * (1.0 - smoothstep(0.9, 1.0, d)) : 1.0 - smoothstep(0.2, 1.0, d);
            if (m <= 0.01) discard;
            gl_FragColor = vec4(rgba.rgb * m, rgba.a * m);
          }`,
        ...blend
      });
      const mesh = new Mesh(this.geometry, material);
      mesh.visible = false;
      mesh.renderOrder = 9;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  update(particles: readonly Particle[]): void {
    this.meshes.forEach((mesh, i) => {
      const p = particles[i];
      mesh.visible = !!p;
      if (!p) return;
      mesh.position.set(p.x, 0.6 + i * 0.05, p.z);
      mesh.scale.setScalar(Math.max(0.01, p.size));
      mesh.material.uniforms.rgba!.value = colorAt(p.colormap, p.age / p.life);
      mesh.material.uniforms.ring!.value = p.shape === 'ring' ? 1 : 0;
    });
  }

  dispose(): void {
    this.geometry.dispose();
    for (const m of this.meshes) m.material.dispose();
  }
}

/**
 * Draws launch-scene particles as one point cloud with Spring's blending (ONE, ONE_MINUS_SRC_ALPHA
 * on premultiplied colours from the CEG colormaps). Sizes are in elmos, so particles shrink with
 * distance and come out as chunky pixels through the PixelPass like the rest of the scene.
 */
export class FxPoints {
  readonly points: Points;
  /** add to the scene: billboards and ground discs */
  readonly object = new Group();
  private readonly discs = new FlatDiscs();
  private readonly geometry = new BufferGeometry();
  private readonly material: ShaderMaterial;
  private capacity = 0;

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: { pxScale: { value: 100 } },
      vertexShader: /* glsl */ `
        attribute vec4 rgba;
        attribute float size;
        attribute float shape;
        uniform float pxScale;
        varying vec4 vRgba;
        varying float vShape;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // pull the billboard toward the camera by its radius so it does not sink into the ground
          mv.xyz += normalize(-mv.xyz) * size;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(1.0, 2.0 * size * pxScale / -mv.z);
          vRgba = rgba;
          vShape = shape;
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vRgba;
        varying float vShape;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float m;
          if (vShape < 0.5) m = 1.0 - smoothstep(0.35, 1.0, d);        // blob: soft puff
          else if (vShape < 1.5) m = 1.0;                                 // shard: solid chip
          else if (vShape < 2.5) m = 1.0 - smoothstep(0.0, 0.6, d);       // spark: hot core
          else m = smoothstep(0.7, 0.85, d) * (1.0 - smoothstep(0.9, 1.0, d)); // ring
          if (m <= 0.01) discard;
          gl_FragColor = vec4(vRgba.rgb * m, vRgba.a * m);
        }`,
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor
    });
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.object.add(this.discs.group, this.points);
  }

  /** Screen pixels per elmo at distance 1: half the render target height times the projection scale. */
  setPixelScale(targetHeight: number, projectionYScale: number): void {
    this.material.uniforms.pxScale!.value = (targetHeight / 2) * projectionYScale;
  }

  update(all: readonly Particle[]): void {
    this.discs.update(all.filter((p) => p.flat));
    const particles = all.filter((p) => !p.flat);
    if (particles.length > this.capacity) {
      this.capacity = Math.max(256, particles.length * 2);
      this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.capacity * 3), 3));
      this.geometry.setAttribute('rgba', new BufferAttribute(new Float32Array(this.capacity * 4), 4));
      this.geometry.setAttribute('size', new BufferAttribute(new Float32Array(this.capacity), 1));
      this.geometry.setAttribute('shape', new BufferAttribute(new Float32Array(this.capacity), 1));
    }
    if (this.capacity === 0) return;
    const pos = this.geometry.getAttribute('position') as BufferAttribute;
    const rgba = this.geometry.getAttribute('rgba') as BufferAttribute;
    const size = this.geometry.getAttribute('size') as BufferAttribute;
    const shape = this.geometry.getAttribute('shape') as BufferAttribute;
    particles.forEach((p, i) => {
      pos.setXYZ(i, p.x, p.y, p.z);
      const c = colorAt(p.colormap, p.age / p.life);
      rgba.setXYZW(i, c[0], c[1], c[2], c[3]);
      size.setX(i, p.size);
      shape.setX(i, SHAPES[p.shape]);
    });
    for (const a of [pos, rgba, size, shape]) a.needsUpdate = true;
    this.geometry.setDrawRange(0, particles.length);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.discs.dispose();
  }
}
