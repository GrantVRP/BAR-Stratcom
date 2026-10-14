import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Registry } from '../../core/registry';
import { CoachDocSchema, type CoachDoc } from '../../core/schemas/protocol';
import type { BridgeSource } from '../game/source';
import { RadarRunner } from './radar-runner';
import { noTelemetrySnapshot } from './tick-support';

class FakeSource extends EventEmitter {
  start(): void {}
  stop(): void {}
}

const registry = { get: (id: string) => (id === 'armpw' ? { id, name: 'Pawn' } : undefined) } as unknown as Registry;

describe('RadarRunner (radar mode without a plan)', () => {
  let dir: string;
  let source: FakeSource;
  let runner: RadarRunner;
  const read = (): CoachDoc => CoachDocSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'coach.json'), 'utf8')));
  const start = (hud = { enabled: true }) =>
    runner.start({ source: source as unknown as BridgeSource, registry, stratcomDir: dir, profile: 'intermediate', hudSettings: () => hud });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-runner-'));
    source = new FakeSource();
    runner = new RadarRunner();
  });

  afterEach(async () => {
    await runner.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes a coach.json whose HUD is only the radar, with the enemy contacts and their sightings', async () => {
    start();
    source.emit('state', { ...noTelemetrySnapshot(30), enemies: { armpw: 2 } });
    await runner.tick();
    const first = read();
    expect(first.mode).toBe('live');
    expect(first.hud).toEqual(
      expect.objectContaining({ visible: true, build: null, factory: null, alerts: [], radar: { range: 2400, lines: [{ text: '2× Pawn', tone: 'warn', right: 'NEW' }] } })
    );
    expect(first.assist.enabled).toEqual({ armNext: false, factoryQueue: false });

    source.emit('state', { ...noTelemetrySnapshot(50), enemies: { armpw: 3 } });
    await runner.tick();
    const second = read();
    expect(second.seq).toBeGreaterThan(first.seq);
    expect(second.hud.radar?.lines[0]).toEqual({ text: '3× Pawn', tone: 'info', right: '0:20 ago' });
  });

  it('Widget HUD Display off hides it; stop writes the off doc and lets go of the source', async () => {
    start({ enabled: false });
    source.emit('state', noTelemetrySnapshot(10));
    await runner.tick();
    expect(read().hud.visible).toBe(false);

    await runner.stop();
    expect(read().mode).toBe('off');
    expect(runner.isRunning()).toBe(false);
    expect(source.listenerCount('state')).toBe(0);
  });
});
