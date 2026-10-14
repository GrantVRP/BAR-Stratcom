import { describe, expect, it } from 'vitest';
import { parseWalk } from './bos-anim';
import { decodeDds } from './dds';
import { flattenPieces, parseS3O } from './s3o';
import { decodeTga } from './tga';
import { bakeTeamColour, modelJson, treeTexture } from '../build-launch-3d';

/* ---------------------------------- S3O ---------------------------------- */

function s3o(): Buffer {
  const buf = Buffer.alloc(1024);
  let at = 0;
  const str = (s: string): number => {
    const o = at;
    buf.write(`${s}\0`, at, 'latin1');
    at += s.length + 1;
    return o;
  };
  buf.write('Spring unit\0', 0, 'latin1');
  at = 52;
  const tex1 = str('Arm_color.dds');
  const tex2 = str('Arm_other.dds');
  const rootName = str('Pelvis');
  const childName = str('leg');
  // vertices: 4 per piece, 8 floats each
  const vert = (o: number, n: number): number => {
    const start = at;
    for (let i = 0; i < n * 8; i++) buf.writeFloatLE(o + i, start + i * 4);
    at += n * 32;
    return start;
  };
  const rootVerts = vert(0, 4);
  const childVerts = vert(100, 4);
  const ints = (vals: number[]): number => {
    const start = at;
    vals.forEach((v, i) => buf.writeInt32LE(v, start + i * 4));
    at += vals.length * 4;
    return start;
  };
  const rootTable = ints([0, 1, 2, 3]); // one quad
  const childTable = ints([0, 1, 2, 3, -1, 1, 2, 3]); // strips with a restart
  const piece = (name: number, kids: number, kidsAt: number, verts: number, table: number, n: number, prim: number, off: number[]): number => {
    const start = at;
    [name, kids, kidsAt, 4, verts, 0, prim, n, table, 0].forEach((v, i) => buf.writeInt32LE(v, start + i * 4));
    off.forEach((v, i) => buf.writeFloatLE(v, start + 40 + i * 4));
    at += 52;
    return start;
  };
  const child = piece(childName, 0, 0, childVerts, childTable, 8, 1, [0, -8, 0]);
  const kids = ints([child]);
  const root = piece(rootName, 1, kids, rootVerts, rootTable, 4, 2, [0, 19.5, 0]);
  buf.writeFloatLE(19, 16);
  buf.writeFloatLE(37, 20);
  buf.writeInt32LE(root, 36);
  buf.writeInt32LE(tex1, 44);
  buf.writeInt32LE(tex2, 48);
  return buf.subarray(0, at);
}

describe('S3O reader', () => {
  it('reads header, piece tree, vertices and triangulates quads and strips', () => {
    const model = parseS3O(s3o());
    expect(model).toMatchObject({ radius: 19, height: 37, texture1: 'Arm_color.dds', texture2: 'Arm_other.dds' });
    const pieces = flattenPieces(model);
    expect(pieces.map((p) => [p.piece.name, p.parent])).toEqual([
      ['pelvis', null],
      ['leg', 'pelvis']
    ]);
    expect(pieces[0]!.piece.offset[1]).toBeCloseTo(19.5);
    expect(Array.from(pieces[0]!.piece.indices)).toEqual([0, 1, 2, 0, 2, 3]);
    expect(Array.from(pieces[1]!.piece.indices)).toEqual([0, 1, 2, 2, 1, 3, 1, 2, 3]);
    expect(pieces[1]!.piece.vertices[0]).toBe(100);
  });

  it('rejects files that are not S3O', () => {
    expect(() => parseS3O(Buffer.from('not a model at all, sorry'))).toThrow('Not an S3O model');
  });

  it('writes model JSON the renderer can rebuild', () => {
    const json = JSON.parse(modelJson(s3o()));
    expect(json.height).toBe(37);
    expect(json.pieces.map((p: { name: string }) => p.name)).toEqual(['pelvis', 'leg']);
    const v = Buffer.from(json.pieces[1].v, 'base64');
    expect(new Float32Array(v.buffer, v.byteOffset, v.byteLength / 4).length).toBe(32);
  });
});

/* ---------------------------------- DDS ---------------------------------- */

function dds(fourCC: string, w: number, h: number, data: number[]): Buffer {
  const head = Buffer.alloc(128);
  head.write('DDS ', 0, 'latin1');
  head.writeUInt32LE(h, 12);
  head.writeUInt32LE(w, 16);
  head.writeUInt32LE(1, 28);
  head.write(fourCC, 84, 'latin1');
  if (fourCC === '\0\0\0\0') head.writeUInt32LE(32, 88);
  return Buffer.concat([head, Buffer.from(data)]);
}

describe('DDS decoder', () => {
  it('decodes a DXT1 block (pure red and blue endpoints)', () => {
    // c0 = red (0xF800), c1 = blue (0x001F); all pixels index 0 except the first (index 1)
    const img = decodeDds(dds('DXT1', 4, 4, [0x00, 0xf8, 0x1f, 0x00, 0x01, 0, 0, 0]));
    expect(Array.from(img.data.slice(0, 4))).toEqual([0, 0, 255, 255]);
    expect(Array.from(img.data.slice(4, 8))).toEqual([255, 0, 0, 255]);
  });

  it('decodes DXT5 alpha and colour', () => {
    const alpha = [255, 0, 0, 0, 0, 0, 0, 0]; // a0 = 255, every index 0
    const colour = [0xe0, 0x07, 0xe0, 0x07, 0, 0, 0, 0]; // green
    const img = decodeDds(dds('DXT5', 4, 4, [...alpha, ...colour]));
    expect(Array.from(img.data.slice(0, 4))).toEqual([0, 255, 0, 255]);
  });

  it('reads uncompressed BGRA', () => {
    const img = decodeDds(dds('\0\0\0\0', 1, 1, [10, 20, 30, 40]));
    expect(Array.from(img.data)).toEqual([30, 20, 10, 40]);
  });
});

/* ---------------------------------- TGA ---------------------------------- */

function tga(type: 2 | 10, topDown: boolean, payload: number[]): Buffer {
  const head = Buffer.alloc(18);
  head[2] = type;
  head.writeUInt16LE(2, 12);
  head.writeUInt16LE(2, 14);
  head[16] = 32;
  head[17] = 8 | (topDown ? 0x20 : 0);
  return Buffer.concat([head, Buffer.from(payload)]);
}

describe('TGA decoder', () => {
  it('flips bottom-up images and converts BGRA', () => {
    const px = (b: number, g: number, r: number, a: number): number[] => [b, g, r, a];
    const img = decodeTga(tga(2, false, [...px(1, 2, 3, 4), ...px(5, 6, 7, 8), ...px(9, 10, 11, 12), ...px(13, 14, 15, 16)]));
    expect(Array.from(img.data.slice(0, 4))).toEqual([11, 10, 9, 12]); // first row is the last stored row
  });

  it('expands RLE packets', () => {
    const img = decodeTga(tga(10, true, [0x83, 1, 2, 3, 255]));
    expect(Array.from(img.data)).toEqual([3, 2, 1, 255, 3, 2, 1, 255, 3, 2, 1, 255, 3, 2, 1, 255]);
  });
});

/* ------------------------------ walk scripts ------------------------------ */

const SCRIPT = `
piece pelvis, lthigh;
Walk() {// Created by Skeletor
	if (isMoving) { //Frame:3
			turn lthigh to x-axis <10.5> speed <100> / animSpeed;
			move pelvis to y-axis [-3.0] speed [90] / animSpeed;
		}
		sleep ((33*animSpeed) -1);
	while(isMoving) {
		if (isMoving) { //Frame:6
			turn lthigh to x-axis <-20.25> speed <100> / animSpeed;
			if (!isAiming) turn lthigh to z-axis <5> speed <10> / animSpeed;
		}
		sleep ((33*animSpeed) -1);
	}
}
`;

describe('walk animation extraction', () => {
  it('keeps keyframe targets and where the loop starts', () => {
    const walk = parseWalk(SCRIPT);
    expect(walk.pieces).toEqual(['lthigh', 'pelvis']);
    expect(walk.loopFrom).toBe(1);
    expect(walk.keyframes).toEqual([
      { frame: 3, turn: { lthigh: { x: 10.5 } }, move: { pelvis: { y: -3 } } },
      { frame: 6, turn: { lthigh: { x: -20.25, z: 5 } }, move: {} }
    ]);
  });

  it('fails clearly without a Walk()', () => {
    expect(() => parseWalk('piece a;')).toThrow('No Walk()');
  });
});

/* -------------------------------- textures -------------------------------- */

describe('texture baking', () => {
  it('mixes the faction colour into team-colour paint and keeps trees transparent', () => {
    const unit = { width: 1, height: 2, data: new Uint8ClampedArray([100, 100, 100, 0, 100, 100, 100, 255]) };
    const baked = bakeTeamColour(unit, [255, 0, 0]);
    expect(Array.from(baked.data)).toEqual([100, 100, 100, 255, 255, 0, 0, 255]);
    const tree = treeTexture(
      { width: 1, height: 1, data: new Uint8ClampedArray([10, 20, 30, 0]) },
      { width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 200]) }
    );
    expect(Array.from(tree.data)).toEqual([10, 20, 30, 200]);
  });
});
