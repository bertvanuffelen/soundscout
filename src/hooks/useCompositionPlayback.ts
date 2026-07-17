/**
 * useCompositionPlayback — gedeeld afspeel-fundament voor presentatie-
 * oppervlakken (universeel presentatiescherm, fase 1).
 *
 * Kapselt de tot nu toe 4-6× gedupliceerde cyclus in:
 *   samples laden (AbortController) → scheduleTimeline → setLoop → play,
 * plus beat-tracking (~30fps op Tone.Transport.seconds, met loop-modulo),
 * pause/resume via de bestaande Part (geen reschedule) en de
 * onPlaybackEnd-lifecycle.
 *
 * Gebruikt door: PeerReviewModal, SubmissionPlayer, SharedPlayer,
 * ClassPresentationView. Bewust NIET door StageView/StagePlayback — het
 * podium speelt de live studio-compositie via useAudioEngine (audioStore,
 * reschedule-on-change), een andere verantwoordelijkheid.
 *
 * Tone.js-pitfalls (CLAUDE.md) zijn hier geborgd: currentBeat wordt nooit
 * als callback-dependency gebruikt (refs), en pause/stop lopen via
 * audioService die de on-demand players expliciet opruimt.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { audioService } from '../services/AudioService';
import { audioDiag } from '../utils/audioDiagnostics';
import { DEFAULT_BPM } from '../constants/config';
import { logger } from '../utils/logger';
import type { CompositionData } from '../types';

export type CompositionPlaybackState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'error';

interface UseCompositionPlaybackOptions {
  /** Aangeroepen als de compositie tot het einde is gespeeld (auto-advance). */
  onEnded?: () => void;
  /**
   * false = de loop-instelling van de compositie negeren en nooit loopen —
   * nodig voor doorspelen (presentatie) en peer-batches. Default true
   * (docent-review speelt een loopende compositie ook echt in een loop).
   */
  respectLoop?: boolean;
  /**
   * false = samples NIET automatisch laden bij data-wissel; de aanroeper
   * roept zelf load() aan (publieke luisterlink: Tone mag pas na een
   * gebruikersgebaar initialiseren). Default true.
   */
  autoLoad?: boolean;
}

export function useCompositionPlayback(
  data: CompositionData | null,
  { onEnded, respectLoop = true, autoLoad = true }: UseCompositionPlaybackOptions = {},
) {
  const [state, setState] = useState<CompositionPlaybackState>('idle');
  const [currentBeat, setCurrentBeat] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalBeats = data?.totalBeats ?? 32;
  const bpm = data?.bpm ?? DEFAULT_BPM;
  const effectiveLooping = respectLoop && (data?.isLooping ?? false);

  // Waarden in refs zodat het beat-interval en de callbacks stabiel blijven
  // (currentBeat/bpm mogen nooit een re-subscribe of stale closure forceren)
  const bpmRef = useRef(bpm);
  const totalBeatsRef = useRef(totalBeats);
  const loopingRef = useRef(effectiveLooping);
  const onEndedRef = useRef(onEnded);
  const dataRef = useRef(data);
  useEffect(() => {
    bpmRef.current = bpm;
    totalBeatsRef.current = totalBeats;
    loopingRef.current = effectiveLooping;
    onEndedRef.current = onEnded;
    dataRef.current = data;
  }, [bpm, totalBeats, effectiveLooping, onEnded, data]);

  const abortRef = useRef<AbortController | null>(null);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Beat-tracking (~30fps; interval is stabieler dan RAF hier) ---
  useEffect(() => {
    if (state === 'playing') {
      beatIntervalRef.current = setInterval(() => {
        const beat = (Tone.Transport.seconds / 60) * bpmRef.current;
        if (loopingRef.current && totalBeatsRef.current > 0) {
          setCurrentBeat(beat % totalBeatsRef.current);
        } else {
          setCurrentBeat(Math.min(beat, totalBeatsRef.current));
        }
      }, 33);
    } else if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    };
  }, [state]);

  // --- Einde-afspelen: terug naar 'ready' + onEnded (auto-advance) ---
  useEffect(() => {
    const unsubscribe = audioService.onPlaybackEnd(() => {
      setCurrentBeat(0);
      setState((prev) => {
        if (prev === 'playing') {
          onEndedRef.current?.();
          return 'ready';
        }
        return prev;
      });
    });
    return unsubscribe;
  }, []);

  // --- Samples laden (expliciet aanroepbaar voor de gesture-gate) ---
  const load = useCallback(async () => {
    const current = dataRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState('loading');
    setLoadingProgress(0);
    setErrorMessage(null);
    setCurrentBeat(0);
    audioService.stop();

    try {
      await audioService.initialize();
      if (controller.signal.aborted) return;

      const currentSamples = current?.samples ?? [];
      if (currentSamples.length === 0) {
        // Geen samples = niets te laden; afspelen levert stilte, maar het
        // oppervlak beslist zelf of dat een fout is
        setState('ready');
        return;
      }

      const results = await audioService.loadSamples(currentSamples, (loaded, total) => {
        if (!controller.signal.aborted) {
          setLoadingProgress(Math.round((loaded / total) * 100));
        }
      });
      if (controller.signal.aborted) return;

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        logger.warn('useCompositionPlayback: samples niet geladen', failed.map((f) => f.sampleId));
      }
      setState('ready');
    } catch (err) {
      if (controller.signal.aborted) return;
      logger.warn('useCompositionPlayback: laden mislukt', err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  }, []);

  // --- Auto-laden bij data-wissel (playlist-advance, modal-open) ---
  const dataKey = data === null ? null : `${data.samples?.length ?? 0}:${data.totalBeats}:${data.tracks?.length ?? 0}`;
  useEffect(() => {
    if (!autoLoad) return;
    if (dataRef.current === null) {
      setState('idle');
      return;
    }
    void load();
    // dataKey vat de identiteit van de compositie samen zonder object-
    // referentie-churn (zelfde patroon als elders: ID-based comparison)
  }, [autoLoad, dataKey, load]);

  // --- Opruimen bij unmount ---
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioService.stop();
    };
  }, []);

  // --- Transport ---
  const play = useCallback((fromBeat?: number) => {
    const current = dataRef.current;
    if (!current) return;

    setCurrentBeat((beat) => {
      const startBeat = fromBeat ?? beat;
      if (audioService.hasActiveSchedule()) {
        // Resume: de bestaande Part overleeft pause(); geen reschedule nodig
        audioDiag.resumeWithExistingSchedule(startBeat);
        audioService.play(startBeat);
      } else {
        audioService.scheduleTimeline(current.tracks ?? [], current.samples ?? []);
        audioService.setLoop(loopingRef.current, totalBeatsRef.current);
        audioService.play(startBeat);
      }
      return startBeat;
    });
    setState('playing');
  }, []);

  const pause = useCallback(() => {
    audioService.pause();
    setState((prev) => (prev === 'playing' ? 'paused' : prev));
  }, []);

  const stop = useCallback(() => {
    audioService.stop();
    setCurrentBeat(0);
    setState((prev) => (prev === 'playing' || prev === 'paused' ? 'ready' : prev));
  }, []);

  const seek = useCallback((beat: number) => {
    setCurrentBeat(beat);
    audioService.seek(beat);
  }, []);

  return {
    state,
    currentBeat,
    loadingProgress,
    errorMessage,
    load,
    play,
    pause,
    stop,
    seek,
  };
}
