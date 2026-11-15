/**
 * usePreviewPlayhead — afspeellijn van het voorbeeld in het trim- en
 * effectenvenster (V2 Fase 1).
 *
 * De lijn is een DOM-element boven de golfvorm dat per frame wordt verplaatst
 * via de gedeelde frame-lus. Geen React-state per frame en geen her-tekenen
 * van het golfvorm-canvas: het venster rendert alleen bij start en einde.
 *
 * De tijdbasis is `performance.now()` vanaf de start van het voorbeeld (het
 * voorbeeld speelt los van de transportklok).
 */

import { useCallback, useEffect, useRef } from 'react';
import { subscribeFrame } from '../services/frameLoop';
import { previewPosition } from '../services/audibleBeat';

export function usePreviewPlayhead(onFinished: () => void) {
  const lineRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  /** Stop de lijn en verberg hem. */
  const stop = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    if (lineRef.current) lineRef.current.style.display = 'none';
  }, []);

  /**
   * Start de lijn.
   * @param startSeconds     beginpositie in het geluid
   * @param durationSeconds  lengte van het voorbeeld
   * @param totalSeconds     lengte van de hele golfvorm (= 100% breedte)
   */
  const start = useCallback((startSeconds: number, durationSeconds: number, totalSeconds: number) => {
    stop();
    const startedAt = performance.now();

    const draw = (): boolean => {
      const position = previewPosition((performance.now() - startedAt) / 1000, startSeconds, durationSeconds);
      if (position === null) return false;
      const line = lineRef.current;
      if (line && totalSeconds > 0) {
        line.style.left = `${(position / totalSeconds) * 100}%`;
        line.style.display = 'block';
      }
      return true;
    };

    draw();
    unsubscribeRef.current = subscribeFrame(() => {
      if (draw()) return;
      stop();
      onFinishedRef.current();
    });
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { lineRef, start, stop };
}
