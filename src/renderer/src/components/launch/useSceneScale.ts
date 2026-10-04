import { useEffect, useState, type RefObject } from 'react';
import { SCENE_H, SCENE_W } from '../../../../core/launch/scene-layout';

/**
 * Whole-number scale that covers the element with the 320 × 200 scene (4 in the default 1280 × 800
 * window). Whole numbers keep every scene pixel the same size on screen.
 */
export function coverScale(width: number, height: number): number {
  return Math.max(1, Math.ceil(Math.max(width / SCENE_W, height / SCENE_H) - 0.001));
}

export function useSceneScale(ref: RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(() =>
    typeof window === 'undefined' ? 4 : coverScale(window.innerWidth, window.innerHeight)
  );
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(coverScale(entry.contentRect.width, entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return scale;
}
