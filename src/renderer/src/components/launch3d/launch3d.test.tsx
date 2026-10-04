// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { buildModel, pieceGeometry, type ModelJson } from './model3d';
import { PixelPass } from './pixel-pass';
import { LaunchScene3D, pixelSizeFor } from './LaunchScene3D';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function b64(arr: Float32Array | Uint16Array): string {
  let s = '';
  const bytes = new Uint8Array(arr.buffer);
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

const tri = new Float32Array([0, 0, 0, 0, 1, 0, 0.5, 0.5, 10, 0, 0, 0, 1, 0, 1, 0, 0, 10, 0, 0, 1, 0, 0, 1]);
const model: ModelJson = {
  height: 37,
  radius: 19,
  pieces: [
    { name: 'pelvis', parent: null, offset: [0, 19.7, 0], v: b64(tri), i: b64(new Uint16Array([0, 1, 2])), i32: false },
    { name: 'lthigh', parent: 'pelvis', offset: [3.2, 0, 0], v: '', i: '', i32: false }
  ]
};

describe('launch 3D renderer helpers (T06.15)', () => {
  it('rebuilds a BAR model as a piece hierarchy with rest offsets', () => {
    const m = buildModel(model, new MeshBasicMaterial());
    expect([...m.pieces.keys()]).toEqual(['pelvis', 'lthigh']);
    expect(m.pieces.get('lthigh')!.parent).toBe(m.pieces.get('pelvis'));
    expect(m.rest.get('pelvis')).toEqual([0, 19.7, 0]);
    expect(m.pieces.get('pelvis')!.position.y).toBeCloseTo(19.7);
    expect(m.pieces.get('pelvis')!.children.some((c) => c instanceof Mesh)).toBe(true);
    expect(m.pieces.get('lthigh')!.children).toHaveLength(0);
  });

  it('decodes interleaved vertices into position, normal and uv', () => {
    const g = pieceGeometry(b64(tri), b64(new Uint16Array([0, 1, 2])), false)!;
    expect(g.getAttribute('position').getX(1)).toBe(10);
    expect(g.getAttribute('normal').getY(0)).toBe(1);
    expect(g.getAttribute('uv').getX(0)).toBe(0.5);
    expect(g.getIndex()!.count).toBe(3);
    expect(pieceGeometry('', '', false)).toBeNull();
  });

  it('renders about 427 scene pixels across at a whole-number pixel size', () => {
    expect(pixelSizeFor(1280)).toBe(3);
    expect(pixelSizeFor(1920)).toBe(4);
    expect(pixelSizeFor(800)).toBe(2);
    expect(PixelPass.lowRes(1280, 800, 3)).toEqual({ w: 427, h: 267 });
  });

  it('keeps the 2D pixel scene when WebGL is not available', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => root.render(<LaunchScene3D faction="cortex" reducedMotion={true} />));
    const host = container.querySelector('[data-testid="launch-scene-3d"]')!;
    expect(host.getAttribute('data-status')).toBe('failed');
    expect(container.querySelector('[data-testid="launch-scene"]')).not.toBeNull();
    act(() => root.unmount());
  });
});
