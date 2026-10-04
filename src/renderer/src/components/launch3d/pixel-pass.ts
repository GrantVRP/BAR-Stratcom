import {
  DepthTexture,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type WebGLRenderer
} from 'three';

/**
 * 32-bit pixel-art look for a 3D scene (T06.15): the scene renders into a small target (one target
 * pixel = `pixelSize` screen pixels), then a full-screen pass upscales it with nearest filtering,
 * draws 1-px dark outlines where depth jumps, and steps the colours with a light ordered dither.
 */
const FRAGMENT = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 resolution;
  uniform float near;
  uniform float far;
  varying vec2 vUv;

  float linearDepth(vec2 uv) {
    float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
    return (2.0 * near * far) / (far + near - z * (far - near));
  }

  float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    float m[16];
    m[0] = 0.0; m[1] = 8.0; m[2] = 2.0; m[3] = 10.0;
    m[4] = 12.0; m[5] = 4.0; m[6] = 14.0; m[7] = 6.0;
    m[8] = 3.0; m[9] = 11.0; m[10] = 1.0; m[11] = 9.0;
    m[12] = 15.0; m[13] = 7.0; m[14] = 13.0; m[15] = 5.0;
    for (int k = 0; k < 16; k++) { if (k == i) return m[k] / 16.0 - 0.5; }
    return 0.0;
  }

  void main() {
    vec2 cell = floor(vUv * resolution);
    vec2 uv = (cell + 0.5) / resolution;
    vec2 px = 1.0 / resolution;
    vec3 col = texture2D(tColor, uv).rgb;

    // outline: this pixel is noticeably nearer than a neighbour
    float d = linearDepth(uv);
    float far4 = max(max(linearDepth(uv + vec2(px.x, 0.0)), linearDepth(uv - vec2(px.x, 0.0))),
                     max(linearDepth(uv + vec2(0.0, px.y)), linearDepth(uv - vec2(0.0, px.y))));
    float edge = step(14.0 + d * 0.07, far4 - d);
    col = mix(col, col * vec3(0.5, 0.48, 0.55), edge);

    // linear -> sRGB, a little lift and saturation (Greenest Fields' sunny greens), then 32 colour
    // steps per channel with a light 4x4 ordered dither
    col = pow(clamp(col * 1.12, 0.0, 1.0), vec3(1.0 / 2.2));
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(luma), col, 1.22), 0.0, 1.0);
    float levels = 32.0;
    col = floor(col * levels + 0.5 + bayer4(cell) * 0.6) / levels;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export class PixelPass {
  readonly target: WebGLRenderTarget;
  private readonly quad: Mesh;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: ShaderMaterial;

  constructor(near: number, far: number) {
    this.target = new WebGLRenderTarget(1, 1, { depthTexture: new DepthTexture(1, 1) });
    this.target.texture.minFilter = NearestFilter;
    this.target.texture.magFilter = NearestFilter;
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        resolution: { value: [1, 1] },
        near: { value: near },
        far: { value: far }
      },
      depthTest: false,
      depthWrite: false
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Low-resolution size for a canvas of width × height at `pixelSize` screen px per scene pixel. */
  static lowRes(width: number, height: number, pixelSize: number): { w: number; h: number } {
    return { w: Math.max(1, Math.ceil(width / pixelSize)), h: Math.max(1, Math.ceil(height / pixelSize)) };
  }

  setSize(w: number, h: number): void {
    this.target.setSize(w, h);
    this.material.uniforms.resolution!.value = [w, h];
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: import('three').Camera): void {
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
