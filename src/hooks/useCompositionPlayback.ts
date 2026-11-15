/**
 * useCompositionPlayback — gedeeld afspeel-fundament voor presentatie-
 * oppervlakken (universeel presentatiescherm, fase 1).
 *
 * Kapselt de tot nu toe 4-6× gedupliceerde cyclus in:
 *   samples laden (AbortController) → scheduleTimeline → setLoop → play,
 * plus de afspeelpositie (`getBeat()`, met loop-modulo), pause/resume via de
 * bestaande Part (geen reschedule) en de onPlaybackEnd-lifecycle.
 *
 * V2 Fase 1: de positie gaat NIET meer door React-state. `getBeat()` is een
 * stabiele functie die per frame gelezen wordt (useBeatFrame / useDerivedBeat):
 * tijdens afspelen de HOORBARE positie (audioService.getAudibleBeat), in rust
 * de rustpositie (na pauze, stop, seek, einde). De hook rendert dus alleen nog
 * bij een toestandswissel (laden/klaar/afspelen/pauze).
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
import { audioService } from '../services/AudioService';
import { wrapBeat } from '../services/audibleBeat';
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

  // --- Afspeelpositie zonder React-state (V2 Fase 1) ---
  // playingRef loopt synchroon mee met de transport-acties (niet met de
  // render), zodat getBeat() nooit een frame achterloopt op `state`.
  const playingRef = useRef(false);
  const restBeatRef = useRef(0);

  /** Naar rust: vanaf nu geeft getBeat() deze positie. */
  const rest = useCallback((beat: number) => {
    playingRef.current = false;
    restBeatRef.current = beat;
  }, []);

  /** Tellen van de motor (DEFAULT_BPM) → tellen van deze compositie, met loop-modulo. */
  const toCompositionBeat = useCallback((engineBeat: number) => wrapBeat(
    engineBeat * (bpmRef.current / DEFAULT_BPM),
    totalBeatsRef.current,
    loopingRef.current,
  ), []);

  const getBeat = useCallback((): number => (
    playingRef.current
      ? toCompositionBeat(audioService.getAudibleBeat())
      : restBeatRef.current
  ), [toCompositionBeat]);

  // --- Einde-afspelen: terug naar 'ready' + onEnded (auto-advance) ---
  useEffect(() => {
    const unsubscribe = audioService.onPlaybackEnd(() => {
      rest(0);
      setState((prev) => {
        if (prev === 'playing') {
          onEndedRef.current?.();
          return 'ready';
        }
        return prev;
      });
    });
    return unsubscribe;
  }, [rest]);

  // --- Samples laden (expliciet aanroepbaar voor de gesture-gate) ---
  const load = useCallback(async () => {
    const current = dataRef.current;
    abortRef.current?.abort();

    if (!current) {
      audioService.stop();
      setState('idle');
      rest(0);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState('loading');
    setLoadingProgress(0);
    setErrorMessage(null);
    rest(0);
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
  }, [rest]);

  // --- Auto-laden bij data-wissel (playlist-advance, modal-open) ---
  const dataKey = data === null ? null : `${data.samples?.length ?? 0}:${data.totalBeats}:${data.tracks?.length ?? 0}`;
  useEffect(() => {
    if (!autoLoad) return;
    // Eén tick uitstellen: houdt alle setState-updates uit het synchrone
    // effect-frame (react-hooks/set-state-in-effect) zonder gedragsverschil.
    // dataKey vat de identiteit van de compositie samen zonder object-
    // referentie-churn (zelfde patroon als elders: ID-based comparison).
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
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

    const startBeat = fromBeat ?? getBeat();
    if (audioService.hasActiveSchedule()) {
      // Resume: de bestaande Part overleeft pause(); geen reschedule nodig
      audioDiag.resumeWithExistingSchedule(startBeat);
      audioService.play(startBeat);
    } else {
      audioService.scheduleTimeline(
        current.tracks ?? [],
        current.samples ?? [],
        current.sequences ?? []
      );
      audioService.setLoop(loopingRef.current, totalBeatsRef.current);
      audioService.play(startBeat);
    }
    restBeatRef.current = startBeat;
    playingRef.current = true;
    setState('playing');
  }, [getBeat]);

  const pause = useCallback(() => {
    const wasPlaying = playingRef.current;
    audioService.pause();
    // Rustpositie = waar de motor is blijven staan (daar hervat play() ook).
    if (wasPlaying) rest(toCompositionBeat(audioService.getCurrentBeat()));
    setState((prev) => (prev === 'playing' ? 'paused' : prev));
  }, [rest, toCompositionBeat]);

  const stop = useCallback(() => {
    audioService.stop();
    rest(0);
    setState((prev) => (prev === 'playing' || prev === 'paused' ? 'ready' : prev));
  }, [rest]);

  const seek = useCallback((beat: number) => {
    // Rustpositie bijwerken; tijdens afspelen volgt getBeat() de motor.
    restBeatRef.current = beat;
    audioService.seek(beat);
  }, []);

  return {
    state,
    getBeat,
    loadingProgress,
    errorMessage,
    load,
    play,
    pause,
    stop,
    seek,
  };
}
