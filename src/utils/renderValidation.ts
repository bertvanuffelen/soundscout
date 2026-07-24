/**
 * Render Validation — objectieve kwaliteitscontrole van gerenderde audio.
 *
 * Ontstaan uit het export-glitch-onderzoek (docs/audio/ONDERZOEK-EXPORT-EFFECTGLITCH.md §15):
 * PitchShift-korrelartefacten tonen zich als periodieke sample-discontinuïteiten
 * ("klik-treinen" op de korrelfrequentie, bv. 12 Hz bij pitch +12). Deze module
 * meet dat signaal zodat de exportflow een verdachte render kan detecteren en
 * op het realtime-capture-vangnet kan overschakelen (plan §2.4).
 *
 * Referentiewaarden (gemeten 23/24-7-2026, zie onderzoek §15.2):
 * - schone renders: maxJump ≤ ~0.28 op drummateriaal, 0 kliks boven 0.35
 * - inherente pitch-korrelklikjes: 1-2 kliks per clip (geen trein)
 * - catastrofale modus: duizenden kliks, maxJump > 1.5, strakke periodiciteit
 */

// --- Types ---

export interface RenderChannels {
  /** Eén Float32Array per kanaal */
  channelData: Float32Array[];
  sampleRate: number;
}

export interface RenderAnalysis {
  /** Grootste sprong tussen twee opeenvolgende samples (0..2) */
  maxJump: number;
  /** Aantal sprongen boven de klikdrempel (alle kanalen samen) — informatief:
   *  echt muzikaal materiaal (drums!) telt hier honderden legitieme
   *  transiënten, dus dit is GEEN afkeurcriterium meer */
  clickCount: number;
  /** Tijdstippen (s) van de eerste kliks op kanaal 0, max 32 */
  clickTimes: number[];
  /** Aantal extreme sprongen (≥ extremeJumpThreshold) — de catastrofale
   *  modus (crossfade-uitval, amplitude ×2) produceert er duizenden */
  extremeJumpCount: number;
  /** Grootste absolute sampleamplitude */
  peak: number;
  /** Aantal samples op of boven 0.985 (bijna-clipping) */
  nearClipSamples: number;
  /** True als er een aaneengesloten regelmatige klik-trein in het
   *  korrelfrequentiebereik (9–50 Hz) is gevonden — de PitchShift-signatuur */
  clickTrain: boolean;
  /** Gemiddelde klik-interval in seconden van de gevonden trein, anders null */
  clickTrainIntervalSec: number | null;
  /** Eindoordeel: is deze render verdacht? */
  suspicious: boolean;
  /** Leesbare redenen voor het oordeel (leeg als schoon) */
  reasons: string[];
}

export interface RenderValidationOptions {
  /** Sprongdrempel die als klik telt (default 0.35) */
  clickThreshold?: number;
  /** Sprongdrempel die als extreem telt (default 0.9 — catastrofale modus) */
  extremeJumpThreshold?: number;
  /** Vanaf dit aantal extreme sprongen is de render verdacht (default 10) */
  suspiciousExtremeJumps?: number;
}

const DEFAULTS: Required<RenderValidationOptions> = {
  clickThreshold: 0.35,
  extremeJumpThreshold: 0.9,
  suspiciousExtremeJumps: 10,
};

/**
 * Trein-detectie (herkalibratie 24-7 na vals alarm op drum-transiënten):
 * een LOKALE run van ≥ TRAIN_MIN_CLICKS geclusterde kliks waarvan de
 * opeenvolgende intervallen in het kórrelfrequentiebereik liggen. Bewust
 * 0.02–0.11 s (≈ 9–50 Hz): PitchShift-korrels zitten daar (12 Hz bij +12),
 * muzikale ritmes niet (16e noten @ 120 bpm = 0.125 s, valt erbuiten).
 */
const TRAIN_MIN_CLICKS = 5;
const TRAIN_MIN_INTERVAL_SEC = 0.02;
const TRAIN_MAX_INTERVAL_SEC = 0.11;
/** Relatieve spreiding waaronder intervallen "regelmatig" heten */
const TRAIN_MAX_REL_SPREAD = 0.4;
/** Kliks binnen dit venster horen bij dezelfde fysieke klik (cluster) */
const CLUSTER_WINDOW_SEC = 0.005;

// --- Analyse ---

/**
 * Analyseer een render op discontinuïteiten en klik-treinen.
 * Puur — werkt op kanaaldata zodat het ook in jsdom/vitest testbaar is.
 */
export function analyzeRender(
  render: RenderChannels,
  options: RenderValidationOptions = {}
): RenderAnalysis {
  const { clickThreshold, extremeJumpThreshold, suspiciousExtremeJumps } = {
    ...DEFAULTS,
    ...options,
  };
  const { channelData, sampleRate } = render;

  let maxJump = 0;
  let clickCount = 0;
  let extremeJumpCount = 0;
  let peak = 0;
  let nearClipSamples = 0;
  const rawClickTimes: number[] = [];

  channelData.forEach((data, channel) => {
    for (let i = 1; i < data.length; i++) {
      const jump = Math.abs(data[i] - data[i - 1]);
      if (jump > maxJump) maxJump = jump;
      if (jump > clickThreshold) {
        clickCount++;
        if (jump >= extremeJumpThreshold) extremeJumpCount++;
        if (channel === 0) rawClickTimes.push(i / sampleRate);
      }
      const amplitude = Math.abs(data[i]);
      if (amplitude > peak) peak = amplitude;
      if (amplitude >= 0.985) nearClipSamples++;
    }
  });

  // Cluster kliks die vlak op elkaar liggen (één fysieke klik geeft vaak
  // meerdere opeenvolgende drempeloverschrijdingen)
  const clusteredTimes: number[] = [];
  for (const t of rawClickTimes) {
    if (
      clusteredTimes.length === 0 ||
      t - clusteredTimes[clusteredTimes.length - 1] > CLUSTER_WINDOW_SEC
    ) {
      clusteredTimes.push(t);
    }
  }

  const { clickTrain, intervalSec } = detectClickTrain(clusteredTimes);

  // Oordeel (herkalibratie 24-7): alleen ondubbelzinnige glitch-signaturen.
  // Losse kliks — hoe veel ook — zijn bij echt percussief materiaal gewoon
  // muziek; een eerste export van Bert telde er 523 terwijl de realtime
  // opname van dezelfde compositie er 483 gaf (= transiënten, geen glitch).
  const reasons: string[] = [];
  if (clickTrain && intervalSec !== null) {
    reasons.push(
      `klik-trein gedetecteerd (~${(1 / intervalSec).toFixed(1)} Hz — PitchShift-signatuur)`
    );
  }
  if (extremeJumpCount >= suspiciousExtremeJumps) {
    reasons.push(
      `${extremeJumpCount} extreme sprongen ≥ ${extremeJumpThreshold} (catastrofale modus)`
    );
  }

  return {
    maxJump,
    clickCount,
    clickTimes: clusteredTimes.slice(0, 32),
    extremeJumpCount,
    peak,
    nearClipSamples,
    clickTrain,
    clickTrainIntervalSec: intervalSec,
    suspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Detecteer een LOKALE (bijna-)regelmatige klik-trein: een aaneengesloten
 * run van ≥ TRAIN_MIN_CLICKS kliks met opeenvolgende intervallen in het
 * korrelfrequentiebereik en lage relatieve spreiding binnen de run. Een
 * korte glitch-passage (bv. 5 korrels over 0.4 s) telt dus ook, terwijl
 * losse muzikale transiënten verspreid over het nummer niet matchen.
 */
function detectClickTrain(clickTimes: number[]): {
  clickTrain: boolean;
  intervalSec: number | null;
} {
  const windowSize = TRAIN_MIN_CLICKS - 1; // aantal intervallen per run
  if (clickTimes.length < TRAIN_MIN_CLICKS) {
    return { clickTrain: false, intervalSec: null };
  }
  const intervals: number[] = [];
  for (let i = 1; i < clickTimes.length; i++) {
    intervals.push(clickTimes[i] - clickTimes[i - 1]);
  }
  for (let start = 0; start + windowSize <= intervals.length; start++) {
    const run = intervals.slice(start, start + windowSize);
    if (run.some((iv) => iv < TRAIN_MIN_INTERVAL_SEC || iv > TRAIN_MAX_INTERVAL_SEC)) {
      continue;
    }
    const mean = run.reduce((a, b) => a + b, 0) / run.length;
    const variance = run.reduce((a, b) => a + (b - mean) * (b - mean), 0) / run.length;
    const relSpread = Math.sqrt(variance) / mean;
    if (relSpread <= TRAIN_MAX_REL_SPREAD) {
      return { clickTrain: true, intervalSec: mean };
    }
  }
  return { clickTrain: false, intervalSec: null };
}


// --- Gemakshelpers ---

/** Analyse rechtstreeks op een (native) AudioBuffer. */
export function analyzeAudioBuffer(
  buffer: AudioBuffer,
  options: RenderValidationOptions = {}
): RenderAnalysis {
  const channelData: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }
  return analyzeRender({ channelData, sampleRate: buffer.sampleRate }, options);
}

/** Compacte logregel voor diagnostiek. */
export function formatRenderAnalysis(a: RenderAnalysis): string {
  const verdict = a.suspicious ? 'VERDACHT' : 'schoon';
  const train = a.clickTrain
    ? ` trein@${a.clickTrainIntervalSec ? (1 / a.clickTrainIntervalSec).toFixed(1) : '?'}Hz`
    : '';
  return (
    `render ${verdict}: maxJump=${a.maxJump.toFixed(3)} kliks=${a.clickCount}` +
    `${train} peak=${a.peak.toFixed(3)} nearClip=${a.nearClipSamples}` +
    (a.reasons.length ? ` — ${a.reasons.join('; ')}` : '')
  );
}
