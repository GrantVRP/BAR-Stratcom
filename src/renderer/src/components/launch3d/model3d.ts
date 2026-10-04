import { BufferAttribute, BufferGeometry, Group, Mesh, type Material } from 'three';

/** Model JSON written by tools/build-launch-3d.ts (from BAR S3O files). */
export interface ModelJson {
  height: number;
  radius: number;
  pieces: Array<{
    name: string;
    parent: string | null;
    offset: [number, number, number];
    /** base64 Float32: x y z nx ny nz u v per vertex */
    v: string;
    /** base64 Uint16 (or Uint32 when i32) triangle indices */
    i: string;
    i32: boolean;
  }>;
}

export interface Model3D {
  root: Group;
  /** Piece groups by name, positioned at their rest offsets (for animation). */
  pieces: Map<string, Group>;
  /** Rest offsets, so animations can add "move" values on top. */
  rest: Map<string, [number, number, number]>;
  height: number;
}

function decode(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function pieceGeometry(v: string, i: string, i32: boolean): BufferGeometry | null {
  const verts = new Float32Array(decode(v));
  if (verts.length === 0) return null;
  const count = verts.length / 8;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  for (let k = 0; k < count; k++) {
    position.set(verts.subarray(k * 8, k * 8 + 3), k * 3);
    normal.set(verts.subarray(k * 8 + 3, k * 8 + 6), k * 3);
    // S3O texture coordinates use OpenGL's bottom-left origin
    uv[k * 2] = verts[k * 8 + 6]!;
    uv[k * 2 + 1] = verts[k * 8 + 7]!;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('normal', new BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  const indices = i32 ? new Uint32Array(decode(i)) : new Uint16Array(decode(i));
  if (indices.length > 0) geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/** Builds the piece hierarchy of a BAR model as three.js groups with one material. */
export function buildModel(json: ModelJson, material: Material, castShadow = true): Model3D {
  const pieces = new Map<string, Group>();
  const rest = new Map<string, [number, number, number]>();
  let root: Group | null = null;
  for (const p of json.pieces) {
    const group = new Group();
    group.name = p.name;
    group.position.set(...p.offset);
    group.rotation.order = 'YXZ';
    const geometry = pieceGeometry(p.v, p.i, p.i32);
    if (geometry) {
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    pieces.set(p.name, group);
    rest.set(p.name, p.offset);
    if (p.parent === null) root = group;
    else pieces.get(p.parent)?.add(group);
  }
  if (!root) throw new Error('Model has no root piece');
  const wrapper = new Group();
  wrapper.add(root);
  return { root: wrapper, pieces, rest, height: json.height };
}
