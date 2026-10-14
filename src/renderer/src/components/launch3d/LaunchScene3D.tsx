import React, { useEffect, useRef, useState } from 'react';
import { WebGLRenderer, BasicShadowMap } from 'three';
import { LaunchScene } from '../launch/LaunchScene';
import { PixelPass } from './pixel-pass';
import { buildLaunchWorld, type Faction3D, type LaunchWorld } from './scene-builder';

export interface LaunchScene3DProps {
  faction: Faction3D;
  reducedMotion: boolean;
}

/** Screen pixels per scene pixel: about 427 scene pixels across, at least 2. */
export function pixelSizeFor(width: number): number {
  return Math.max(2, Math.round(width / 427));
}

/**
 * The launcher's 3D scene in 32-bit pixel style: Greenest Fields with its Aleppo pines, the
 * faction's wind turbine spinning, and the Sprinter / Fiend walking up the track with its in-game
 * walk animation. Falls back to the 2D pixel scene when WebGL is unavailable.
 */
export function LaunchScene3D({ faction, reducedMotion }: LaunchScene3DProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const factionRef = useRef(faction);
  const motionRef = useRef(reducedMotion);
  const shownAt = useRef(0);
  const worldRef = useRef<LaunchWorld | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    if (factionRef.current !== faction) shownAt.current = performance.now();
    factionRef.current = faction;
    motionRef.current = reducedMotion;
  }, [faction, reducedMotion]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let disposed = false;
    let raf = 0;
    let renderer: WebGLRenderer | null = null;
    let world: LaunchWorld | null = null;
    let pass: PixelPass | null = null;
    let observer: ResizeObserver | null = null;

    const resize = (): void => {
      if (!renderer || !world || !pass) return;
      const { clientWidth: w, clientHeight: h } = host;
      renderer.setSize(w, h, false);
      const low = PixelPass.lowRes(w, h, pixelSizeFor(w));
      pass.setSize(low.w, low.h);
      world.camera.aspect = w / Math.max(1, h);
      world.camera.updateProjectionMatrix();
      world.setTargetHeight(low.h);
    };

    const start = async (): Promise<void> => {
      try {
        renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
      } catch {
        setStatus('failed');
        return;
      }
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = BasicShadowMap;
      try {
        world = await buildLaunchWorld();
      } catch (err) {
        console.warn('[launch3d] scene failed to load:', err);
        setStatus('failed');
        return;
      }
      if (disposed) return;
      worldRef.current = world;
      pass = new PixelPass(world.camera.near, world.camera.far);
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(host);
      shownAt.current = performance.now();
      setStatus('ready');
      const frame = (now: number): void => {
        // the frame timestamp can be a little earlier than when the scene was shown
        world!.update(factionRef.current, Math.max(0, now - shownAt.current), motionRef.current);
        pass!.render(renderer!, world!.scene, world!.camera);
        // where the unit is (fraction of the canvas), for tests that click it
        const at = world!.runnerScreen(factionRef.current);
        canvas.dataset.runner = at ? `${((at.x + 1) / 2).toFixed(3)},${((1 - at.y) / 2).toFixed(3)}` : '';
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    void start();

    return () => {
      disposed = true;
      worldRef.current = null;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      world?.dispose();
      pass?.dispose();
      // dispose() alone keeps the WebGL context (and its GPU memory) until garbage collection
      renderer?.forceContextLoss();
      renderer?.dispose();
    };
  }, []);

  /** Pointer position in normalised device coordinates, and whether it is on the walking unit. */
  const onUnit = (e: React.PointerEvent<HTMLCanvasElement>): boolean => {
    const world = worldRef.current;
    if (!world || motionRef.current) return false;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    return world.hitRunner(factionRef.current, x, y);
  };

  return (
    <div ref={hostRef} data-testid="launch-scene-3d" data-status={status} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the 2D pixel scene only stands in when WebGL is unavailable; while 3D loads the page stays dark */}
      {status === 'failed' && <LaunchScene faction={faction} reducedMotion={reducedMotion} />}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        data-testid="launch-scene-canvas"
        style={{ imageRendering: 'pixelated', visibility: status === 'ready' ? 'visible' : 'hidden', pointerEvents: status === 'ready' ? 'auto' : 'none' }}
        onPointerMove={(e) => {
          e.currentTarget.style.cursor = onUnit(e) ? 'pointer' : 'default';
        }}
        onPointerDown={(e) => {
          // clicking the Sprinter / Fiend destroys it with its BAR death; a new one runs in 3 s later
          if (onUnit(e)) worldRef.current?.kill(factionRef.current, Math.max(0, performance.now() - shownAt.current));
        }}
        role="img"
        aria-label={`${faction === 'armada' ? 'An Armada Sprinter' : 'A Cortex Fiend'} walking past a spinning wind turbine on Greenest Fields`}
      />
    </div>
  );
}
