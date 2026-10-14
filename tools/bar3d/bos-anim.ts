/**
 * Extracts a baked walk animation from a BAR unit script. The Sprinter and Fiend walks were
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

/* ------------------------------------------------------------------------------------------------ */
/* Deaths (launch scene unit deaths)                                                                 */
/* ------------------------------------------------------------------------------------------------ */

export interface ExplodeCommand {
  piece: string;
  flags: string[];
}

export interface DeathBlock {
  frame: number;
  /** sleep at the end of the block: the time its targets take, in ms */
  ms: number;
  turn: Keyframe['turn'];
  move: Keyframe['move'];
  explode: ExplodeCommand[];
  hide: string[];
}

const EXPLODE = /explode (\w+) type ([A-Z_| ]+);/g;
const HIDE = /hide (\w+);/g;
const DEATH_BLOCK = /if \(TRUE\) \{ \/\/Frame:(\d+)([\s\S]*?)sleep (\d+);\s*\n\t*\}/g;

function body(bos: string, header: RegExp): string | null {
  const start = bos.search(header);
  if (start < 0) return null;
  // the function ends at the first closing brace in column 0
  const end = bos.indexOf('\n}', start + 1);
  return bos.slice(start, end < 0 ? undefined : end);
}

function explodes(text: string): ExplodeCommand[] {
  return [...text.matchAll(EXPLODE)].map((m) => ({ piece: m[1]!, flags: m[2]!.split('|').map((f) => f.trim()).filter(Boolean) }));
}

/** A baked DeathAnim() (Skeletor_S3O export): keyframe blocks with turns, moves, explodes and hides. */
export function parseDeathAnim(bos: string): DeathBlock[] | null {
  const text = body(bos, /\nDeathAnim\(\)\s*\{/);
  if (!text) return null;
  const blocks: DeathBlock[] = [];
  for (const m of text.matchAll(DEATH_BLOCK)) {
    const b: DeathBlock = { frame: Number(m[1]), ms: Number(m[3]), turn: {}, move: {}, explode: explodes(m[2]!), hide: [] };
    for (const t of m[2]!.matchAll(TURN)) (b.turn[t[1]!] ??= {})[t[2] as Axis] = Number(t[3]);
    for (const t of m[2]!.matchAll(MOVE)) (b.move[t[1]!] ??= {})[t[2] as Axis] = Number(t[3]);
    for (const h of m[2]!.matchAll(HIDE)) b.hide.push(h[1]!);
    blocks.push(b);
  }
  return blocks.length > 0 ? blocks : null;
}

export interface KilledBranch {
  /** highest severity of this branch (Infinity for the last) */
  maxSeverity: number;
  corpseType: number;
  deathAnim: boolean;
  explodes: ExplodeCommand[];
}

/** Killed(severity, corpsetype): one branch per `if( severity <= N )`, then the default. */
export function parseKilled(bos: string): KilledBranch[] {
  const text = body(bos, /\nKilled\(severity, corpsetype\)\s*\{/);
  if (!text) throw new Error('No Killed() in script');
  const parts = text.split(/if\(\s*severity\s*<=\s*(\d+)\s*\)/);
  const branches: KilledBranch[] = [];
  const branch = (src: string, max: number): KilledBranch => ({
    maxSeverity: max,
    corpseType: Number(/corpsetype = (\d)/.exec(src)?.[1] ?? 0),
    deathAnim: /call-script DeathAnim\(\)/.test(src),
    explodes: explodes(src)
  });
  for (let i = 1; i < parts.length; i += 2) {
    const src = parts[i + 1]!;
    const close = src.indexOf('return');
    const inside = close >= 0 ? src.slice(0, src.indexOf('}', close) + 1) : src;
    branches.push(branch(inside, Number(parts[i])));
    if (i + 2 >= parts.length) {
      const rest = src.slice(inside.length);
      if (/corpsetype/.test(rest)) branches.push(branch(rest, Number.POSITIVE_INFINITY));
    }
  }
  return branches;
}
