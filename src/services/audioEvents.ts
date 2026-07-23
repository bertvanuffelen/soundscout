/**
 * audioEvents — de éne bron van waarheid voor clip-events.
 *
 * Genereert uit tracks+samples de afspeel-events (incl. loop-iteraties,
 * per-iteratie-fades, mute/solo en volumes) die zowel de live motor
 * (AudioService.scheduleTimeline) als de offline export (renderOffline)
 * gebruiken. Vóór Audio Engine v2 hadden beide een eigen implementatie die
 * hoorbaar uit elkaar gegroeid was (divergenties D1–D7 in
 * docs/audio/ONDERZOEK-EXPORT-EFFECTGLITCH.md).
 *
 * Deze module is bewust puur (geen Tone-import) zodat de event-generatie
 * in jsdom/vitest getest kan worden. De Tone-graafbouw zit in audioGraph.ts.
 */

import type { Track, Sample, Clip } from '../types';
import {
  beatsToSeconds,
  secondsToBeats,
  getClipTrimStart,
  getClipDuration,
  getEffectiveClipEndBeat,
} from '../utils/audio';

// --- Types ---

export interface ClipEffectsConfig {
  pitch: number;
  reverb: number;
  fadeIn: number;
  fadeOut: number;
}

export interface ClipEvent {
  /** Starttijd in seconden op de transport-tijdlijn */
  time: number;
  sampleId: string;
  /** Offset in de bron-buffer (trim) in seconden */
  trimStart: number;
  /** Speelduur van dit event in seconden */
  duration: number;
  /** Gecombineerd track + clip volume in dB */
  volumeDb: number;
  /** True als track of clip gemute is (of weggesoloed, indien meegegeven) */
  isMuted: boolean;
  trackIndex: number;
  /** Effect-config, alleen aanwezig als de clip niet-default effecten heeft */
  effects?: ClipEffectsConfig;
  /** Fade-in voor dít event (per loop-iteratie — pulse, UX-FADE-LOOP) */
  fadeIn: number;
  /** Fade-out voor dít event */
  fadeOut: number;
}

export interface GenerateEventsOptions {
  bpm: number;
  /**
   * Solo-spoor om in de events te bakken (export). Live wordt solo dynamisch
   * via bus-gains geregeld en hoort dit veld leeg te blijven.
   */
  soloTrackIndex?: number | null;
  /** Filter: alleen events voor samples waarvan de buffer geladen is */
  hasBuffer?: (sampleId: string) => boolean;
}

export interface GeneratedTimeline {
  events: ClipEvent[];
  totalClipCount: number;
  mutedClipCount: number;
  /** Beat waarop de laatste clip-inhoud eindigt (excl. galmstaart) */
  lastContentBeat: number;
  /** Moment (s) waarop het láátste geluid uitgestorven is (incl. galmstaart) */
  lastAudibleSeconds: number;
  /** lastAudibleSeconds omgerekend naar beats (voor live auto-stop) */
  lastAudibleBeat: number;
}

// --- Effect-constanten (voorheen 4× gedupliceerde magic formula) ---

/** Reverb-decay in seconden voor een reverb-waarde 0..100 */
export function reverbDecay(reverb: number): number {
  return 1.5 + (reverb / 100) * 3;
}

/** Galmstaart die ná het clip-einde doorklinkt (0 als geen reverb) */
export function reverbTailSeconds(reverb: number): number {
  return reverb > 0 ? reverbDecay(reverb) : 0;
}

/** Heeft deze clip niet-default effecten (pitch, reverb of fade)? */
export function clipHasEffects(clip: Clip): boolean {
  const fx = clip.effects;
  if (!fx) return false;
  return (
    (fx.pitch !== 0 && fx.pitch !== undefined) ||
    (fx.reverb !== 0 && fx.reverb !== undefined) ||
    fx.fadeIn > 0 ||
    fx.fadeOut > 0
  );
}

// --- Fade-curves (#79) ---

/**
 * Fade-curve voor setValueCurveAtTime.
 * - Fade-in: x² — geleidelijke opbouw vanaf stilte
 * - Fade-out: (1-x)² — soepele afdaling naar stilte
 * Symmetrisch paar; matcht de visuele curve in Waveform.tsx.
 */
export function createFadeCurve(type: 'in' | 'out', steps: number = 128): number[] {
  const curve: number[] = new Array(steps);
  for (let i = 0; i < steps; i++) {
    const progress = i / (steps - 1);
    curve[i] = type === 'in' ? progress * progress : (1 - progress) * (1 - progress);
  }
  return curve;
}

export const FADE_IN_CURVE: readonly number[] = createFadeCurve('in');
export const FADE_OUT_CURVE: readonly number[] = createFadeCurve('out');

// --- Event-generatie ---

/**
 * Genereer alle afspeel-events voor een tijdlijn.
 *
 * Gedrag (identiek aan de live motor, nu ook leidend voor de export):
 * - loop-clips → één event per iteratie, laatste iteratie afgekapt op de loopduur
 * - fades op élke loop-iteratie (pulse — UX-FADE-LOOP)
 * - mute (track of clip) → event blijft bestaan met isMuted=true
 * - solo (alleen indien soloTrackIndex meegegeven) → andere tracks isMuted=true
 */
export function generateClipEvents(
  tracks: Track[],
  samples: Sample[],
  options: GenerateEventsOptions
): GeneratedTimeline {
  const { bpm, soloTrackIndex = null, hasBuffer } = options;
  const sampleMap = new Map(samples.map((s) => [s.id, s]));

  const events: ClipEvent[] = [];
  let totalClipCount = 0;
  let mutedClipCount = 0;
  let lastContentBeat = 0;
  let lastAudibleSeconds = 0;

  tracks.forEach((track, trackIndex) => {
    const trackVolume = track.volume ?? 0;
    const trackMuted = track.mute ?? false;
    const soloedOut = soloTrackIndex !== null && soloTrackIndex !== trackIndex;

    track.clips.forEach((clip) => {
      const sample = sampleMap.get(clip.sampleId);
      if (!sample) return;
      if (hasBuffer && !hasBuffer(clip.sampleId)) return;
      totalClipCount++;

      const clipVolume = clip.effects?.volume ?? 0;
      const clipMuted = clip.effects?.mute ?? false;
      const volumeDb = trackVolume + clipVolume;
      const isMuted = trackMuted || clipMuted || soloedOut;
      if (isMuted) mutedClipCount++;

      const trimStart = getClipTrimStart(clip);
      const singleDuration = getClipDuration(clip, sample);

      const effects: ClipEffectsConfig | undefined = clipHasEffects(clip)
        ? {
            pitch: clip.effects?.pitch ?? 0,
            reverb: clip.effects?.reverb ?? 0,
            fadeIn: clip.effects?.fadeIn ?? 0,
            fadeOut: clip.effects?.fadeOut ?? 0,
          }
        : undefined;

      const fadeIn = clip.effects?.fadeIn ?? 0;
      const fadeOut = clip.effects?.fadeOut ?? 0;
      const tail = reverbTailSeconds(effects?.reverb ?? 0);

      const pushEvent = (time: number, duration: number) => {
        events.push({
          time,
          sampleId: clip.sampleId,
          trimStart,
          duration,
          volumeDb,
          isMuted,
          trackIndex,
          effects,
          fadeIn,
          fadeOut,
        });
        if (!isMuted) {
          const audibleEnd = time + duration + tail;
          if (audibleEnd > lastAudibleSeconds) lastAudibleSeconds = audibleEnd;
        }
      };

      // Loop-logica (#65): meerdere events voor loopende clips
      if (clip.loop && clip.loopDurationBeats) {
        const totalSeconds = beatsToSeconds(clip.loopDurationBeats, bpm);
        const startSeconds = beatsToSeconds(clip.startBeat, bpm);
        let offset = 0;
        while (offset < totalSeconds - 0.001) {
          const remaining = totalSeconds - offset;
          pushEvent(startSeconds + offset, Math.min(singleDuration, remaining));
          offset += singleDuration;
        }
      } else {
        pushEvent(beatsToSeconds(clip.startBeat, bpm), singleDuration);
      }

      const endBeat = getEffectiveClipEndBeat(clip, sample, bpm);
      if (endBeat > lastContentBeat) lastContentBeat = endBeat;
    });
  });

  return {
    events,
    totalClipCount,
    mutedClipCount,
    lastContentBeat,
    lastAudibleSeconds,
    lastAudibleBeat: secondsToBeats(lastAudibleSeconds, bpm),
  };
}
