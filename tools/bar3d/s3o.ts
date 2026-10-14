/**
 * Reader for Spring/Recoil S3O unit models. Layout (little-endian):
 *   header (52 B): "Spring unit\0", version, radius, height, mid x/y/z, rootPiece, collisionData,
 *                  texture1, texture2 (offsets)
 *   piece  (52 B): name, numChildren, children, numVertices, vertices, vertexType, primitiveType,
 *                  vertexTableSize, vertexTable, collisionData, offset x/y/z
 *   vertex (32 B): position xyz, normal xyz, uv
 * primitiveType 0 = triangles, 1 = triangle strips (-1 restarts), 2 = quads.
 */

export interface S3OPiece {
  name: string;
  offset: [number, number, number];
  /** Interleaved per vertex: x y z nx ny nz u v. */
  vertices: Float32Array;
  /** Triangle list into `vertices`. */
  indices: Uint32Array;
  children: S3OPiece[];
}

export interface S3OModel {
  radius: number;
  height: number;
  mid: [number, number, number];
  texture1: string;
  texture2: string;
  root: S3OPiece;
}

const MAGIC = 'Spring unit';

function cString(buf: Buffer, offset: number): string {
  if (offset <= 0 || offset >= buf.length) return '';
  const end = buf.indexOf(0, offset);
  return buf.toString('latin1', offset, end < 0 ? buf.length : end);
}

function triangulate(raw: Int32Array, primitiveType: number): Uint32Array {
  const out: number[] = [];
  if (primitiveType === 0) {
    for (let i = 0; i + 2 < raw.length; i += 3) out.push(raw[i]!, raw[i + 1]!, raw[i + 2]!);
  } else if (primitiveType === 2) {
    for (let i = 0; i + 3 < raw.length; i += 4) out.push(raw[i]!, raw[i + 1]!, raw[i + 2]!, raw[i]!, raw[i + 2]!, raw[i + 3]!);
  } else if (primitiveType === 1) {
    let strip: number[] = [];
    const flush = (): void => {
      for (let i = 0; i + 2 < strip.length; i++) {
        const [a, b, c] = [strip[i]!, strip[i + 1]!, strip[i + 2]!];
        if (a === b || b === c || a === c) continue; // degenerate
        out.push(...(i % 2 === 0 ? [a, b, c] : [b, a, c]));
      }
      strip = [];
    };
    for (const v of raw) {
      if (v < 0) flush();
      else strip.push(v);
    }
    flush();
  } else {
    throw new Error(`Unsupported S3O primitive type ${primitiveType}`);
  }
  return Uint32Array.from(out);
}

function readPiece(buf: Buffer, at: number, depth: number): S3OPiece {
  if (depth > 64) throw new Error('S3O piece tree too deep');
  const i32 = (o: number): number => buf.readInt32LE(at + o);
  const f32 = (o: number): number => buf.readFloatLE(at + o);
  const numChildren = i32(4);
  const childrenAt = i32(8);
  const numVertices = i32(12);
  const verticesAt = i32(16);
  const primitiveType = i32(24);
  const tableSize = i32(28);
  const tableAt = i32(32);

  const vertices = new Float32Array(numVertices * 8);
  for (let v = 0; v < numVertices * 8; v++) vertices[v] = buf.readFloatLE(verticesAt + v * 4);
  const raw = new Int32Array(tableSize);
  for (let t = 0; t < tableSize; t++) raw[t] = buf.readInt32LE(tableAt + t * 4);

  const children: S3OPiece[] = [];
  for (let c = 0; c < numChildren; c++) children.push(readPiece(buf, buf.readInt32LE(childrenAt + c * 4), depth + 1));

  return {
    name: cString(buf, i32(0)).toLowerCase(),
    offset: [f32(40), f32(44), f32(48)],
    vertices,
    indices: triangulate(raw, primitiveType),
    children
  };
}

export function parseS3O(buf: Buffer): S3OModel {
  if (buf.toString('latin1', 0, MAGIC.length) !== MAGIC) throw new Error('Not an S3O model');
  return {
    radius: buf.readFloatLE(16),
    height: buf.readFloatLE(20),
    mid: [buf.readFloatLE(24), buf.readFloatLE(28), buf.readFloatLE(32)],
    texture1: cString(buf, buf.readInt32LE(44)),
    texture2: cString(buf, buf.readInt32LE(48)),
    root: readPiece(buf, buf.readInt32LE(36), 0)
  };
}

/** Every piece, depth first, with its parent's name (null for the root). */
export function flattenPieces(model: S3OModel): Array<{ piece: S3OPiece; parent: string | null }> {
  const out: Array<{ piece: S3OPiece; parent: string | null }> = [];
  const walk = (p: S3OPiece, parent: string | null): void => {
    out.push({ piece: p, parent });
    for (const c of p.children) walk(c, p.name);
  };
  walk(model.root, null);
  return out;
}
