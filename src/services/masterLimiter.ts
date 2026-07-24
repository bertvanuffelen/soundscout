/**
 * masterLimiter — lookahead brickwall-limiter op de master (Audio Engine v2).
 *
 * Voorkomt digitaal clippen wanneer veel luide sporen samen boven full scale
 * uitkomen, zonder de klank aan te tasten zolang het signaal onder het
 * plafond blijft (unity gain). Professionele mastering-aanpak:
 *
 * - plafond −1.0 dBFS (streaming-standaard, marge voor lossy encoding)
 * - 5 ms lookahead: de gain is al verlaagd vóórdat de piek arriveert
 *   (geen hoorbare attack-vervorming zoals bij een gewone compressor)
 * - 1 ms attack- en 150 ms release-smoothing (one-pole, exponentieel)
 * - harde clamp op het plafond als laatste vangrail (grijpt vrijwel nooit)
 *
 * De DSP-kernel is één pure, zelfstandige factory (geen imports/closures)
 * die op DRIE plekken exact hetzelfde draait — de kerngarantie van v2
 * ("export = live") blijft daardoor overeind:
 * 1. live:   AudioWorklet ná de masterBus (kernel via toString() in de blob)
 * 2. offline: applyLimiterToBuffer over de gerenderde buffer (met
 *    lookahead-compensatie, dus sample-uitgelijnd en deterministisch)
 * 3. vangnet: idem over de realtime-opname
 */

// --- Instellingen (dB → lineair: 10^(dB/20)) ---

/** Plafond: −1.0 dBFS */
export const LIMITER_CEILING = 0.8912509381337456;
/** Lookahead in ms — ook de uitgangslatency van de live worklet */
export const LIMITER_LOOKAHEAD_MS = 5;
/** Attack-smoothing (τ) in ms — ruim binnen de lookahead */
export const LIMITER_ATTACK_MS = 1;
/** Release-smoothing (τ) in ms */
export const LIMITER_RELEASE_MS = 150;

export interface LimiterKernel {
  /** Uitgangslatency in samples (= lookahead-venster) */
  latencySamples: number;
  /**
   * Verwerk één blok. channels = per kanaal een Float32Array van gelijke
   * lengte; output wordt IN PLACE geschreven (zelfde arrays). De output is
   * `latencySamples` vertraagd t.o.v. de input.
   */
  processBlock: (channels: Float32Array[]) => void;
  /** Grootste gain-reductie tot nu toe (1 = geen; 0.5 = −6 dB) */
  minGain: () => number;
}

/**
 * Zelfstandige kernel-factory — LET OP: geen externe referenties gebruiken;
 * deze functie wordt via toString() in de AudioWorklet-blob geëmbed.
 */
export function createLimiterKernel(
  sampleRate: number,
  ceiling: number,
  lookaheadMs: number,
  attackMs: number,
  releaseMs: number
): LimiterKernel {
  const lookahead = Math.max(1, Math.round((lookaheadMs / 1000) * sampleRate));
  const attackCoeff = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const releaseCoeff = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));

  // Ringbuffers: vertraagd signaal per kanaal (lazy per kanaalaantal)
  let delayLines: Float32Array[] = [];
  let writeIndex = 0;
  let warmedUp = 0; // aantal geschreven samples (< lookahead → stilte uit)

  // Monotone deque voor het schuivende venster-maximum van |x| (joint over
  // kanalen): indices oplopend, waarden strikt aflopend.
  const dequeCapacity = lookahead + 1;
  const dequeIdx = new Int32Array(dequeCapacity);
  const dequeVal = new Float32Array(dequeCapacity);
  let dequeHead = 0;
  let dequeLen = 0;
  let sampleCounter = 0;

  let gain = 1;
  let minGainSeen = 1;

  const ensureChannels = (count: number, blockLen: number) => {
    if (delayLines.length !== count) {
      delayLines = [];
      for (let c = 0; c < count; c++) delayLines.push(new Float32Array(lookahead));
      writeIndex = 0;
      warmedUp = 0;
    }
    void blockLen;
  };

  const processBlock = (channels: Float32Array[]) => {
    const channelCount = channels.length;
    if (channelCount === 0) return;
    const blockLen = channels[0].length;
    ensureChannels(channelCount, blockLen);

    for (let i = 0; i < blockLen; i++) {
      // 1. Piek van dit sample over alle kanalen
      let peak = 0;
      for (let c = 0; c < channelCount; c++) {
        const v = Math.abs(channels[c][i]);
        if (v > peak) peak = v;
      }

      // 2. Schuivend venster-maximum bijwerken (monotone deque)
      const idx = sampleCounter++;
      while (dequeLen > 0) {
        const tailPos = (dequeHead + dequeLen - 1) % dequeCapacity;
        if (dequeVal[tailPos] <= peak) dequeLen--;
        else break;
      }
      const insertPos = (dequeHead + dequeLen) % dequeCapacity;
      dequeIdx[insertPos] = idx;
      dequeVal[insertPos] = peak;
      dequeLen++;
      // Venster [idx-lookahead, idx]: het sample dat nú (vertraagd) wordt
      // uitgevoerd (input van idx-lookahead) telt zelf nog mee in het maximum
      while (dequeLen > 0 && dequeIdx[dequeHead] < idx - lookahead) {
        dequeHead = (dequeHead + 1) % dequeCapacity;
        dequeLen--;
      }
      const windowMax = dequeVal[dequeHead];

      // 3. Doel-gain + attack/release-smoothing
      const targetGain = windowMax > ceiling ? ceiling / windowMax : 1;
      const coeff = targetGain < gain ? attackCoeff : releaseCoeff;
      gain = coeff * gain + (1 - coeff) * targetGain;
      if (gain < minGainSeen) minGainSeen = gain;

      // 4. Vertraagd sample uitlezen, gain toepassen, hard clampen (vangrail)
      for (let c = 0; c < channelCount; c++) {
        const line = delayLines[c];
        const delayed = warmedUp >= lookahead ? line[writeIndex] : 0;
        line[writeIndex] = channels[c][i];
        let out = delayed * gain;
        if (out > ceiling) out = ceiling;
        else if (out < -ceiling) out = -ceiling;
        channels[c][i] = out;
      }
      writeIndex = (writeIndex + 1) % lookahead;
      warmedUp++;
    }
  };

  return {
    latencySamples: lookahead,
    processBlock,
    minGain: () => minGainSeen,
  };
}

// --- Offline gebruik: hele buffer, met lookahead-compensatie ---

export interface LimiterStats {
  /** Grootste gain-reductie in dB (0 = limiter greep niet in) */
  maxReductionDb: number;
  /** Piek vóór de limiter */
  inputPeak: number;
  /** Piek ná de limiter */
  outputPeak: number;
}

/**
 * Pas de limiter toe op kanaaldata, IN PLACE, sample-uitgelijnd (de
 * lookahead-latency wordt gecompenseerd door met stilte door te spoelen).
 * Puur en deterministisch — geschikt voor offline render, vangnet-opname
 * en unit-tests.
 */
export function applyLimiterToChannels(
  channelData: Float32Array[],
  sampleRate: number
): LimiterStats {
  const kernel = createLimiterKernel(
    sampleRate,
    LIMITER_CEILING,
    LIMITER_LOOKAHEAD_MS,
    LIMITER_ATTACK_MS,
    LIMITER_RELEASE_MS
  );
  const latency = kernel.latencySamples;
  const length = channelData[0]?.length ?? 0;
  if (length === 0 || channelData.length === 0) {
    return { maxReductionDb: 0, inputPeak: 0, outputPeak: 0 };
  }

  let inputPeak = 0;
  channelData.forEach((data) => {
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > inputPeak) inputPeak = v;
    }
  });

  // Verwerk met `latency` extra stilte-samples en schuif de (vertraagde)
  // output terug — resultaat is exact uitgelijnd met de input.
  const padded = channelData.map((data) => {
    const extended = new Float32Array(length + latency);
    extended.set(data);
    return extended;
  });
  kernel.processBlock(padded);
  padded.forEach((extended, c) => {
    channelData[c].set(extended.subarray(latency, latency + length));
  });

  let outputPeak = 0;
  channelData.forEach((data) => {
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > outputPeak) outputPeak = v;
    }
  });

  const minGain = kernel.minGain();
  return {
    maxReductionDb: minGain >= 1 ? 0 : -20 * Math.log10(minGain),
    inputPeak,
    outputPeak,
  };
}

/** Gemakswrapper voor een (native) AudioBuffer, IN PLACE. */
export function applyLimiterToBuffer(buffer: AudioBuffer): LimiterStats {
  const channelData: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }
  return applyLimiterToChannels(channelData, buffer.sampleRate);
}

// --- Live gebruik: AudioWorklet-code met exact dezelfde kernel ---

/**
 * Bouw het limiter-processor-fragment voor de gedeelde DSP-worklet-module.
 * De kernel-factory wordt letterlijk geëmbed (toString), zodat live en
 * offline gegarandeerd dezelfde DSP draaien. De processor is stereo en
 * transparant onder het plafond.
 *
 * LET OP: dit is een frágment — AudioService bundelt het met de
 * capture-processor in ÉÉN module (`buildDspWorkletCode`), omdat Tone's
 * context-wrapper maar één addAudioWorkletModule per context ondersteunt
 * (elke tweede module levert nodes op die NotSupportedError gooien).
 */
export function buildLimiterProcessorCode(): string {
  return `
    const createLimiterKernel = ${createLimiterKernel.toString()};
    class SoundScoutLimiter extends AudioWorkletProcessor {
      constructor() {
        super();
        this.kernel = createLimiterKernel(
          sampleRate,
          ${LIMITER_CEILING},
          ${LIMITER_LOOKAHEAD_MS},
          ${LIMITER_ATTACK_MS},
          ${LIMITER_RELEASE_MS}
        );
      }
      process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !input[0] || !output || !output[0]) return true;
        const channels = [];
        for (let c = 0; c < output.length; c++) {
          const src = input[c] || input[0];
          output[c].set(src);
          channels.push(output[c]);
        }
        this.kernel.processBlock(channels);
        return true;
      }
    }
    registerProcessor('soundscout-limiter', SoundScoutLimiter);
  `;
}
