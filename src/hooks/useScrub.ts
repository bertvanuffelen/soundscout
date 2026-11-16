/**
 * useScrub — slepen om te zoeken in een tijdlijn (muis, pen én vinger).
 *
 * Gedeeld door het afspeelhandvat, de liniaal en (in de alleen-lezen
 * tijdlijn van presentatie/beluisteren) het hele sporenvlak.
 *
 * - De tel wordt berekend uit de rechthoek van het sleepvlak zelf
 *   (`surface: 'self'`) of van de ouder (`'parent'`, voor het handvat dat
 *   midden in de liniaal staat). Zo klopt het ook als de tijdlijn horizontaal
 *   gescrold is en bij de smallere labelkolom op telefoons.
 * - Seeks tijdens het slepen worden per animatieframe gebundeld: de
 *   audio-engine herstart dan niet bij elke pointermove.
 * - `touch-action` zet de aanroeper zelf (none op liniaal/handvat, pan-y op
 *   het sporenvlak zodat verticaal scrollen blijft werken).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type Surface = 'self' | 'parent';
/** immediate = meteen zoeken bij aanraken (liniaal/handvat);
 *  deferred = pas bij een horizontale beweging of een tik (sporenvlak, zodat
 *  verticaal scrollen niet per ongeluk de afspeelpositie verzet). */
type Mode = 'immediate' | 'deferred';
const MOVE_THRESHOLD_PX = 6;

/** Tel onder de aanwijzer, geklemd op [0, totalBeats]. */
export function beatAtClientX(clientX: number, rect: { left: number; width: number }, totalBeats: number): number {
  if (rect.width <= 0) return 0;
  const beat = ((clientX - rect.left) / rect.width) * totalBeats;
  return Math.max(0, Math.min(totalBeats, beat));
}

export function useScrub(onSeek: (beat: number) => void, totalBeats: number) {
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const pendingBeatRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    if (pendingBeatRef.current !== null) {
      onSeek(pendingBeatRef.current);
      pendingBeatRef.current = null;
    }
  }, [onSeek]);

  const schedule = useCallback((beat: number) => {
    pendingBeatRef.current = beat;
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const beatFor = useCallback((e: React.PointerEvent<HTMLElement>, surface: Surface) => {
    const el = surface === 'parent' ? e.currentTarget.parentElement ?? e.currentTarget : e.currentTarget;
    return beatAtClientX(e.clientX, el.getBoundingClientRect(), totalBeats);
  }, [totalBeats]);

  const startDrag = useCallback((e: React.PointerEvent<HTMLElement>, surface: Surface) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    schedule(beatFor(e, surface));
  }, [beatFor, schedule]);

  const endDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
    draggingRef.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingBeatRef.current = null;
  }, []);

  const handlers = useCallback((surface: Surface, mode: Mode = 'immediate') => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      if (mode === 'immediate') {
        e.preventDefault();
        startDrag(e, surface);
      } else {
        startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingRef.current) {
        schedule(beatFor(e, surface));
        return;
      }
      const st = startRef.current;
      if (!st || st.id !== e.pointerId) return;
      const dx = Math.abs(e.clientX - st.x);
      const dy = Math.abs(e.clientY - st.y);
      if (dx > MOVE_THRESHOLD_PX && dx > dy) {
        startRef.current = null;
        startDrag(e, surface);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const st = startRef.current;
      startRef.current = null;
      if (draggingRef.current) {
        endDrag(e);
        // Eindpositie afronden op de dichtstbijzijnde tel
        onSeek(Math.round(beatFor(e, surface)));
        return;
      }
      // Tik zonder noemenswaardige beweging = zoeken naar die plek
      if (st && st.id === e.pointerId
        && Math.abs(e.clientX - st.x) <= MOVE_THRESHOLD_PX && Math.abs(e.clientY - st.y) <= MOVE_THRESHOLD_PX) {
        onSeek(Math.round(beatFor(e, surface)));
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      // Browser neemt het over (bijv. verticaal scrollen): niets zoeken
      startRef.current = null;
      if (draggingRef.current) endDrag(e);
    },
  }), [beatFor, schedule, onSeek, startDrag, endDrag]);

  return { isDragging, handlers };
}
