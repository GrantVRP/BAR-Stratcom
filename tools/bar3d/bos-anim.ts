/**
 * Extracts a baked walk animation from a BAR unit script (T06.15). The Sprinter and Fiend walks were
 * made by Beherith in Blender and exported as keyframe blocks ("Skeletor_S3O"):
 *
 *   Walk() { if (isMoving) { //Frame:3  turn lthigh to x-axis <10.7> speed <...>; move pelvis to y-axis [-3.0] ... }
 *            sleep (...);   while(isMoving) { if (isMoving) { //Frame:5 ... } sleep (...); ... } }
 *
 * We keep only the keyframe targets (piece, axis, degrees / elmos). The first block is the step into
 * the walk; the blocks inside while(isMoving) are the loop.
 */

export type Axis = 'x' | 'y' | 'z';

export interface Keyframe {
  frame: number;
  /** piece → axis → degrees */
  turn: Record<string, Partial<Record<Axis, number>>>;
  /** piece → axis → elmos */
  move: Record<string, Partial<Record<Axis, number>>>;
}

export interface WalkAnimation {
  pieces: string[];
  keyframes: Keyframe[];
  /** Index of the first keyframe of the repeating loop. */
  loopFrom: number;
}

const BLOCK = /if \(isMoving\) \{ \/\/Frame:(\d+)([\s\S]*?)\n\t*\}/g;
const TURN = /turn (\w+) to ([xyz])-axis <(-?[\d.]+)>/g;
const MOVE = /move (\w+) to ([xyz])-axis \[(-?[\d.]+)\]/g;

export function parseWalk(bos: string): WalkAnimation {
  const start = bos.search(/\nWalk\(\)\s*\{/);
  if (start < 0) throw new Error('No Walk() in script');
  const end = bos.indexOf('\n}', start + 1);
  const body = bos.slice(start, end < 0 ? undefined : end);
  const loopAt = body.indexOf('while(isMoving)');

  const keyframes: Keyframe[] = [];
  const pieces = new Set<string>();
  let loopFrom = -1;
  for (const m of body.matchAll(BLOCK)) {
    if (loopFrom < 0 && loopAt >= 0 && m.index! > loopAt) loopFrom = keyframes.length;
    const kf: Keyframe = { frame: Number(m[1]), turn: {}, move: {} };
    for (const t of m[2]!.matchAll(TURN)) {
      (kf.turn[t[1]!] ??= {})[t[2] as Axis] = Number(t[3]);
      pieces.add(t[1]!);
    }
    for (const t of m[2]!.matchAll(MOVE)) {
      (kf.move[t[1]!] ??= {})[t[2] as Axis] = Number(t[3]);
      pieces.add(t[1]!);
    }
    keyframes.push(kf);
  }
  if (keyframes.length === 0) throw new Error('Walk() has no keyframes');
  return { pieces: [...pieces].sort(), keyframes, loopFrom: loopFrom < 0 ? 0 : loopFrom };
}
