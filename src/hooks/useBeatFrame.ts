/**
 * Hooks rond de afspeelklok (V2 Fase 1).
 *
 *  - useBeatFrame:   roep een callback aan op elk frame met de actuele tel.
 *                    Voor tekenen direct in de DOM — veroorzaakt géén render.
 *  - useDerivedBeat: krijg een van de tel AFGELEIDE waarde als React-state die
 *                    alleen opnieuw rendert wanneer die waarde zelf verandert
 *                    (bv. "welk beeld is actief": een paar keer per compositie,
 *                    in plaats van 20× per seconde).
 */

import { useEffect, useRef, useState } from 'react';
import { subscribeFrame } from '../services/frameLoop';
import { playbackClock } from '../services/playbackClock';

export type BeatGetter = () => number;

/**
 * @param onFrame  wordt elk frame aangeroepen met (tel, speelt-af)
 * @param getBeat  optioneel: eigen bron in plaats van de afspeelklok
 *                 (bv. een weergave met een eigen afspeelmotor)
 */
export function useBeatFrame(
  onFrame: (beat: number, isPlaying: boolean) => void,
  getBeat?: BeatGetter,
): void {
  const onFrameRef = useRef(onFrame);
  const getBeatRef = useRef(getBeat);
  useEffect(() => {
    onFrameRef.current = onFrame;
    getBeatRef.current = getBeat;
  });

  useEffect(() => subscribeFrame(() => {
    const beat = getBeatRef.current ? getBeatRef.current() : playbackClock.getBeat();
    onFrameRef.current(beat, playbackClock.isPlaying());
  }), []);
}

/** Afgeleide waarde van de tel; rendert alleen bij verandering van die waarde. */
export function useDerivedBeat<T>(select: (beat: number) => T): T {
  const selectRef = useRef(select);
  useEffect(() => {
    selectRef.current = select;
  });
  const [value, setValue] = useState<T>(() => select(playbackClock.getBeat()));

  useEffect(() => subscribeFrame(() => {
    const next = selectRef.current(playbackClock.getBeat());
    setValue((prev) => (Object.is(prev, next) ? prev : next));
  }), []);

  return value;
}
