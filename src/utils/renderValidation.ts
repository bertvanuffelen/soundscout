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
  /** Aantal sprongen boven de klikdrempel (alle kanalen samen) */
  clickCount: number;
  /** Tijdstippen (s) van de eerste kliks op kanaal 0, max 32 */
  clickTimes: number[];
  /** Grootste absolute sampleamplitude */
  peak: number;
  /** Aantal samples op of boven 0.985 (bijna-clipping) */
  nearClipSamples: number;
  /** True als de kliks een (bijna-)regelmatige trein vormen — de PitchShift-signatuur */
  clickTrain: boolean;
  /** Gemiddelde klik-interval in seconden als clickTrain, anders null */
  clickTrainIntervalSec: number | null;
  /** Eindoordeel: is deze render verdacht? */
  suspicious: boolean;
  /** Leesbare redenen voor het oordeel (leeg als schoon) */
  reasons: string[];
}

export interface RenderValidationOptions {
  /** Sprongdrempel die als klik telt (default 0.35 — boven natuurlijke transiënten) */
  clickThreshold?: number;
  /** Vanaf dit aantal kliks is de render sowieso verdacht (default 20) */
  suspiciousClickCount?: number;
  /** Vanaf deze maxJump is de render sowieso verdacht (default 0.9) */
  suspiciousMaxJump?: number;
}

const DEFAULTS: Required<RenderValidationOptions> = {
  clickThreshold: 0.35,
  suspiciousClickCount: 20,
  suspiciousMaxJump: 0.9,
};

/** Minimaal aantal kliks op kanaal 0 om van een trein te kunnen spreken */
const TRAIN_MIN_CLICKS = 6;
/** Korrelfrequenties liggen ruwweg tussen 2 en 50 Hz → intervallen 0.02–0.5 s */
const TRAIN_MIN_INTERVAL_SEC = 0.02;
const TRAIN_MAX_INTERVAL_SEC = 0.5;
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
  const { clickThreshold, suspiciousClickCount, suspiciousMaxJump } = {
    ...DEFAULTS,
    ...options,
  };
  const { channelData, sampleRate } = render;

  let maxJump = 0;
  let clickCount = 0;
  let peak = 0;
  let nearClipSamples = 0;
  const rawClickTimes: number[] = [];

  channelData.forEach((data, channel) => {
    for (let i = 1; i < data.length; i++) {
      const jump = Math.abs(data[i] - data[i - 1]);
      if (jump > maxJump) maxJump = jump;
      if (jump > clickThreshold) {
        clickCount++;
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

  const reasons: string[] = [];
  if (clickTrain && intervalSec !== null) {
    reasons.push(
      `klik-trein gedetecteerd (~${(1 / intervalSec).toFixed(1)} Hz — PitchShift-signatuur)`
    );
  }
  if (clickCount >= suspiciousClickCount) {
    reasons.push(`${clickCount} kliks boven drempel ${clickThreshold}`);
  }
  if (maxJump >= suspiciousMaxJump) {
    reasons.push(`extreme sprong ${maxJump.toFixed(2)} (≥ ${suspiciousMaxJump})`);
  }

  return {
    maxJump,
    clickCount,
    clickTimes: clusteredTimes.slice(0, 32),
    peak,
    nearClipSamples,
    clickTrain,
    clickTrainIntervalSec: intervalSec,
    suspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Detecteer een (bijna-)regelmatige klik-trein: veel kliks met intervallen in
 * het korrelfrequentie-bereik en lage relatieve spreiding.
 */
function detectClickTrain(clickTimes: number[]): {
  clickTrain: boolean;
  intervalSec: number | null;
} {
  if (clickTimes.length < TRAIN_MIN_CLICKS) {
    return { clickTrain: false, intervalSec: null };
  }
  const intervals: number[] = [];
  for (let i = 1; i < clickTimes.length; i++) {
    intervals.push(clickTimes[i] - clickTimes[i - 1]);
  }
  const inRange = intervals.filter(
    (iv) => iv >= TRAIN_MIN_INTERVAL_SEC && iv <= TRAIN_MAX_INTERVAL_SEC
  );
  if (inRange.length < TRAIN_MIN_CLICKS - 1) {
    return { clickTrain: false, intervalSec: null };
  }
  const mean = inRange.reduce((a, b) => a + b, 0) / inRange.length;
  const variance =
    inRange.reduce((a, b) => a + (b - mean) * (b - mean), 0) / inRange.length;
  const relSpread = Math.sqrt(variance) / mean;
  if (relSpread <= TRAIN_MAX_REL_SPREAD) {
    return { clickTrain: true, intervalSec: mean };
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
