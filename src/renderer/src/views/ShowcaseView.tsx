import React, { useEffect, useRef, useState } from 'react';
import { BasicShadowMap, WebGLRenderer } from 'three';
import { SHOWCASE, SHOWCASE_FRAME_EVENT } from '../../../core/launch/scene3d';
import { LaunchTitle } from '../components/launch/LaunchTitle';
import { pixelSizeFor } from '../components/launch3d/LaunchScene3D';
import { PixelPass } from '../components/launch3d/pixel-pass';
import { buildLaunchWorld, type LaunchWorld } from '../components/launch3d/scene-builder';
import { factionAccent } from '../lib/faction-style';

/**
 * The README's animated header (#/dev/showcase): the launcher scene with both factions, a Sprinter
 * chasing a Fiend past the Cortex and Armada wind turbines, under the title in both faction
 * colours. Plays live until tools/readme-showcase.ts asks for exact frames (SHOWCASE_FRAME_EVENT).
 */
export function ShowcaseView({ version }: { version: string }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let disposed = false;
    let raf = 0;
    let renderer: WebGLRenderer | null = null;
    let world: LaunchWorld | null = null;
    let pass: PixelPass | null = null;
    let size = '';

    const draw = (ms: number): void => {
      const { clientWidth: w, clientHeight: h } = host;
      if (size !== `${w}x${h}`) {
        size = `${w}x${h}`;
        renderer!.setSize(w, h, false);
        const low = PixelPass.lowRes(w, h, pixelSizeFor(w));
        pass!.setSize(low.w, low.h);
        world!.camera.aspect = w / Math.max(1, h);
        world!.camera.updateProjectionMatrix();
      }
      world!.showcase(ms % SHOWCASE.loopMs);
      pass!.render(renderer!, world!.scene, world!.camera);
    };
    const onFrame = (e: Event): void => {
      if (!world) return;
      cancelAnimationFrame(raf);
      const ms = Number((e as CustomEvent<number>).detail);
      draw(ms);
      host.dataset.frame = String(ms);
    };

    const start = async (): Promise<void> => {
      try {
        // the README tool screenshots the canvas between frames
        renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
      } catch {
        setStatus('failed');
        return;
      }
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = BasicShadowMap;
      try {
        world = await buildLaunchWorld('showcase');
      } catch (err) {
        console.warn('[showcase] scene failed to load:', err);
        setStatus('failed');
        return;
      }
      if (disposed) return;
      pass = new PixelPass(world.camera.near, world.camera.far);
      window.addEventListener(SHOWCASE_FRAME_EVENT, onFrame);
      const shownAt = performance.now();
      const live = (now: number): void => {
        draw(Math.max(0, now - shownAt));
        raf = requestAnimationFrame(live);
      };
      raf = requestAnimationFrame(live);
      setStatus('ready');
    };
    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener(SHOWCASE_FRAME_EVENT, onFrame);
      world?.dispose();
      pass?.dispose();
      renderer?.forceContextLoss();
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="showcase"
      data-status={status}
      className="crt crt-soft fixed inset-0 h-screen w-screen select-none overflow-hidden bg-[#0a0c14] text-[#e4e4e7]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: 'pixelated', visibility: status === 'ready' ? 'visible' : 'hidden' }}
        role="img"
        aria-label="An Armada Sprinter chasing a Cortex Fiend past the Cortex and Armada wind turbines on Greenest Fields"
      />
      <LaunchTitle colors={[factionAccent('cortex'), factionAccent('armada')]} version={version} />
    </div>
  );
}
