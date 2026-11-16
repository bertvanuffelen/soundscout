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

import type { Track, Sample, Clip, ClipEffects } from '../types';
import type { SequencerSequence } from '../types/sequencer';
import { SEQ_CHOKE_FADE_SECONDS } from '../types/sequencer';
import {
  beatsToSeconds,
  secondsToBeats,
  getClipTrimStart,
  getClipLengthFactor,
  getClipPlaybackDuration,
  getEffectiveClipEndBeat,
} from '../utils/audio';
import { getSequenceIdFromSampleId } from '../utils/sequencer';
import {
  gainToDb,
  generatePatternEvents,
  patternDurationSeconds,
} from './sequencerEvents';
import { clipRecipe, type BakeRecipe } from './bakeRecipe';

// --- Types ---

/**
 * Keten-effecten per event (alles wat in de Tone-graph zit). Pitch, speed,
 * reverse en tempo-stretch zitten NIET in de graph maar in het bake-recept
 * (`ClipEvent.recipe`); `pitch` staat hier alleen nog zodat de keten kan
 * terugvallen op Tone.PitchShift als de bake niet beschikbaar is.
 */
export interface ClipEffectsConfig {
  pitch: number;
  reverb: number;
  fadeIn: number;
  fadeOut: number;
  /** Echo 0–100 (alleen aanwezig als > 0) */
  echo?: number;
  /** Echo-vertraging in seconden (een halve tel in het compositietempo) */
  echoDelay?: number;
  /** Filter −100..+100 (alleen aanwezig als ≠ 0) */
  filter?: number;
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
  /**
   * Bake-recept (V2 Fase 4): pitch, bandsnelheid, reverse en tempo-stretch.
   * `trimStart` en `duration` zijn dan in seconden van de GEBAKKEN buffer.
   * Afwezig = de bronbuffer ongewijzigd afspelen.
   */
  recipe?: BakeRecipe;
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
  /**
   * Sequencer-patronen (fase 2). Een clip met sampleId `seq:<id>` wordt
   * uitgepakt naar gewone geluids-events — één keer hier, dus live én
   * export blijven per constructie identiek.
   */
  sequences?: SequencerSequence[];
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

// --- Echo (V2 Fase 4) ---

/** Echo-vertraging: een halve tel (achtste noot) in het compositietempo */
export function echoDelaySeconds(bpm: number): number {
  return 30 / bpm;
}

/** Terugkoppeling 0.3..0.6 voor echo 0..100 (hoger = meer herhalingen) */
export function echoFeedback(echo: number): number {
  return 0.3 + 0.3 * (Math.min(100, Math.max(0, echo)) / 100);
}

/** Niveau van de eerste herhaling 0..0.6 (de droge klank blijft op 1) */
export function echoWet(echo: number): number {
  return 0.6 * (Math.min(100, Math.max(0, echo)) / 100);
}

/** Maximum echostaart (s) — vangnet voor exportlengte en auto-stop */
const MAX_ECHO_TAIL_SECONDS = 10;

/**
 * Hoe lang de echo ná het clip-einde doorklinkt: tot de herhalingen onder
 * −60 dBFS (0.001) zakken. Herhaling n heeft niveau wet·feedbackⁿ⁻¹.
 */
export function echoTailSeconds(echo: number, delaySeconds: number): number {
  if (!(echo > 0) || !(delaySeconds > 0)) return 0;
  const wet = echoWet(echo);
  const fb = echoFeedback(echo);
  const repeats = Math.ceil(1 + Math.log(0.001 / wet) / Math.log(fb));
  return Math.min(MAX_ECHO_TAIL_SECONDS, Math.max(1, repeats) * delaySeconds);
}

// --- Filter (V2 Fase 4) ---

/**
 * Filterwaarde −100..+100 → biquad. Negatief = dof (low-pass, 20 kHz → 250 Hz),
 * positief = helder (high-pass, 30 Hz → 3 kHz), beide exponentieel zodat elke
 * stap even groot klinkt. 0 = uit (null).
 */
export function filterSettings(filter: number): { type: 'lowpass' | 'highpass'; frequency: number } | null {
  const f = Math.min(100, Math.max(-100, filter));
  if (f === 0 || !Number.isFinite(f)) return null;
  if (f < 0) {
    return { type: 'lowpass', frequency: 20000 * Math.pow(250 / 20000, -f / 100) };
  }
  return { type: 'highpass', frequency: 30 * Math.pow(3000 / 30, f / 100) };
}

/** Heeft deze clip effecten in de keten (reverb, fade, echo, filter of pitch)? */
export function clipHasEffects(clip: Clip): boolean {
  const fx = clip.effects;
  if (!fx) return false;
  return (
    (fx.pitch !== 0 && fx.pitch !== undefined) ||
    (fx.reverb !== 0 && fx.reverb !== undefined) ||
    fx.fadeIn > 0 ||
    fx.fadeOut > 0 ||
    (fx.echo ?? 0) > 0 ||
    (fx.filter ?? 0) !== 0
  );
}

/**
 * Keten-config uit clip-effecten (gedeeld door event-generatie en de
 * EffectsModal-preview). Echo/filter-velden alleen als ze iets doen, zodat
 * events zonder die effecten exact gelijk blijven aan vóór V2 Fase 4.
 */
export function toEffectsConfig(
  fx: Partial<ClipEffects> | undefined,
  bpm: number
): ClipEffectsConfig {
  const config: ClipEffectsConfig = {
    pitch: fx?.pitch ?? 0,
    reverb: fx?.reverb ?? 0,
    fadeIn: fx?.fadeIn ?? 0,
    fadeOut: fx?.fadeOut ?? 0,
  };
  if ((fx?.echo ?? 0) > 0) {
    config.echo = fx!.echo;
    config.echoDelay = echoDelaySeconds(bpm);
  }
  if ((fx?.filter ?? 0) !== 0) config.filter = fx!.filter;
  return config;
}

/** Alle staart (galm + echo) die ná een event doorklinkt */
export function effectsTailSeconds(effects: ClipEffectsConfig | undefined): number {
  if (!effects) return 0;
  return Math.max(
    reverbTailSeconds(effects.reverb),
    echoTailSeconds(effects.echo ?? 0, effects.echoDelay ?? 0)
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
  const { bpm, soloTrackIndex = null, hasBuffer, sequences = [] } = options;
  const sampleMap = new Map(samples.map((s) => [s.id, s]));
  const sequenceMap = new Map(sequences.map((seq) => [seq.id, seq]));

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
      // --- Sequence-clip (fase 2): patroon uitpakken naar geluids-events ---
      const sequenceId = getSequenceIdFromSampleId(clip.sampleId);
      if (sequenceId) {
        const sequence = sequenceMap.get(sequenceId);
        if (!sequence) return;
        totalClipCount++;

        const clipVolume = clip.effects?.volume ?? 0;
        const clipMuted = clip.effects?.mute ?? false;
        const isMuted = trackMuted || clipMuted || soloedOut;
        if (isMuted) mutedClipCount++;

        // Op de tijdlijn klinkt een patroon in het compositietempo
        // (1 vakje = 1 tel), niet in het lab-tempo van de sequence
        const patternEvents = generatePatternEvents(sequence, samples, {
          hasBuffer,
          bpm,
        });
        const patternSeconds = patternDurationSeconds(sequence, bpm);
        const clipStartSeconds = beatsToSeconds(clip.startBeat, bpm);
        // 1 vakje = 1 tel: patroonbreedte in tellen = lengthSteps.
        // Uitrekken (clip.loop) = patroon herhalen tot loopDurationBeats.
        const clipBeats =
          clip.loop && clip.loopDurationBeats
            ? clip.loopDurationBeats
            : sequence.lengthSteps;
        const totalSeconds = beatsToSeconds(clipBeats, bpm);

        // Choke-administratie over iteratiegrenzen heen: laatst gestarte
        // event per sequencer-spoor, zodat 'afkappen' ook op de tijdlijn
        // deterministisch is (zelfde events → zelfde export).
        const lastByPatternTrack = new Map<string, ClipEvent>();

        let offset = 0;
        while (offset < totalSeconds - 0.001 && patternSeconds > 0) {
          for (const pe of patternEvents) {
            const startOffset = offset + pe.timeOffset;
            if (startOffset >= totalSeconds - 0.001) continue;
            // Afkappen op de clipgrens: een uitgerekte clip stopt exact op
            // zijn einde (zelfde regel als loop-clips)
            const duration = Math.min(pe.duration, totalSeconds - startOffset);
            const cappedAtClipEnd = duration < pe.duration;
            // Fades nodig bij: getrimde start (declick), choke ('cut'), een
            // op de clipgrens afgekapt event of een afgekapte melodienoot —
            // allemaal klikrisico's
            const needsFades =
              pe.declickIn > 0 || pe.choke || cappedAtClipEnd || pe.declickOut > 0;
            const event: ClipEvent = {
              time: clipStartSeconds + startOffset,
              sampleId: pe.sampleId,
              trimStart: pe.trimStart,
              duration,
              volumeDb: trackVolume + clipVolume + gainToDb(pe.gain),
              isMuted,
              trackIndex,
              effects: needsFades
                ? {
                    pitch: 0,
                    reverb: 0,
                    fadeIn: pe.declickIn,
                    fadeOut: SEQ_CHOKE_FADE_SECONDS,
                  }
                : undefined,
              fadeIn: pe.declickIn,
              fadeOut: needsFades ? SEQ_CHOKE_FADE_SECONDS : 0,
              ...(pe.recipe ? { recipe: pe.recipe } : {}),
            };
            // Choke ('cut'): een nieuwe stap kapt de vorige op ditzelfde
            // sequencer-spoor af — duur van het vorige event inkorten.
            if (pe.choke) {
              const previous = lastByPatternTrack.get(pe.trackId);
              if (previous) {
                previous.duration = Math.min(
                  previous.duration,
                  event.time - previous.time
                );
              }
            }
            lastByPatternTrack.set(pe.trackId, event);
            events.push(event);
            if (!isMuted) {
              const audibleEnd = event.time + event.duration;
              if (audibleEnd > lastAudibleSeconds) {
                lastAudibleSeconds = audibleEnd;
              }
            }
          }
          offset += patternSeconds;
        }

        const endBeat = clip.startBeat + clipBeats;
        if (endBeat > lastContentBeat) lastContentBeat = endBeat;
        return;
      }

      const sample = sampleMap.get(clip.sampleId);
      if (!sample) return;
      if (hasBuffer && !hasBuffer(clip.sampleId)) return;
      totalClipCount++;

      const clipVolume = clip.effects?.volume ?? 0;
      const clipMuted = clip.effects?.mute ?? false;
      const volumeDb = trackVolume + clipVolume;
      const isMuted = trackMuted || clipMuted || soloedOut;
      if (isMuted) mutedClipCount++;

      // Trim staat in bron-seconden (wat de leerling in de golfvorm ziet —
      // bij reverse: het omgekeerde geluid). In de gebakken buffer schaalt
      // hij mee met de lengtefactor (tempo-stretch ÷ bandsnelheid).
      const lengthFactor = getClipLengthFactor(clip, sample, bpm);
      const trimStart = getClipTrimStart(clip) * lengthFactor;
      const singleDuration = getClipPlaybackDuration(clip, sample, bpm);
      const recipe = clipRecipe(clip, sample, bpm);

      const effects: ClipEffectsConfig | undefined = clipHasEffects(clip)
        ? toEffectsConfig(clip.effects, bpm)
        : undefined;

      const fadeIn = clip.effects?.fadeIn ?? 0;
      const fadeOut = clip.effects?.fadeOut ?? 0;
      const tail = effectsTailSeconds(effects);

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
          ...(recipe ? { recipe } : {}),
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
