/**
 * liteAudio — minimale afspeelmotor voor de V2-mockup (/v2-mockup, dev-only).
 *
 * Bewust ZONDER Tone.js: dit is het "lite player"-idee uit het V2-voorstel
 * (§6.4) — kale Web Audio, één lookahead-scheduler, één klok. Niet bedoeld
 * als productiecode; wel als bewijs dat hero/embed/showcase licht kunnen.
 */

export interface LoopClip {
  id: string;
  sampleId: string;
  track: number;
  startBeat: number;
}

export interface LiteSound {
  id: string;
  url?: string;
  /** Vooraf gemaakte buffer (Klanklab-geluiden: recept → buffer). */
  buffer?: AudioBuffer;
  duration: number;
}

export const BPM = 120;
export const LOOP_BEATS = 16;
export const BEAT_SEC = 60 / BPM;
export const LOOP_SEC = LOOP_BEATS * BEAT_SEC;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let timeData: Uint8Array<ArrayBuffer> | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer>>();

export function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    timeData = new Uint8Array(analyser.fftSize);
    master.connect(analyser);
    analyser.connect(ctx.destination);
  }
  return ctx;
}

export function getMaster(): GainNode {
  getCtx();
  return master!;
}

export function getAnalyser(): AnalyserNode {
  getCtx();
  return analyser!;
}

/** Moet vanuit een gebruikersgebaar worden aangeroepen (autoplay-beleid). */
export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (c.state !== 'running') await c.resume();
}

export function loadBuffer(url: string): Promise<AudioBuffer> {
  let p = bufferCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Audio niet gevonden: ${url}`);
        return r.arrayBuffer();
      })
      .then((ab) => getCtx().decodeAudioData(ab));
    p.catch(() => bufferCache.delete(url));
    bufferCache.set(url, p);
  }
  return p;
}

export async function resolveBuffer(sound: LiteSound): Promise<AudioBuffer | null> {
  if (sound.buffer) return sound.buffer;
  if (!sound.url) return null;
  try {
    return await loadBuffer(sound.url);
  } catch (err) {
    console.warn('[v2-mockup]', err);
    return null;
  }
}

export interface PlayOptions {
  when?: number;
  gain?: number;
  rate?: number;
  maxDuration?: number;
}

export function playBuffer(buffer: AudioBuffer, opts: PlayOptions = {}): AudioBufferSourceNode {
  const c = getCtx();
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = opts.rate ?? 1;
  const g = c.createGain();
  g.gain.value = opts.gain ?? 1;
  src.connect(g);
  g.connect(getMaster());
  const when = Math.max(opts.when ?? 0, c.currentTime);
  src.start(when);
  if (opts.maxDuration) src.stop(when + opts.maxDuration);
  src.onended = () => {
    src.disconnect();
    g.disconnect();
  };
  return src;
}

let previewSrc: AudioBufferSourceNode | null = null;

/** Eén geluid voorbeluisteren; een lopende preview stopt eerst. */
export async function previewSound(sound: LiteSound): Promise<void> {
  await unlockAudio();
  const buffer = await resolveBuffer(sound);
  if (!buffer) return;
  stopPreview();
  previewSrc = playBuffer(buffer);
}

export function stopPreview(): void {
  if (previewSrc) {
    try { previewSrc.stop(); } catch { /* al gestopt */ }
    previewSrc = null;
  }
}

/** Huidig uitstuurniveau 0..1 (RMS), voor audio-reactieve visuals. */
export function getLevel(): number {
  if (!analyser || !timeData) return 0;
  analyser.getByteTimeDomainData(timeData);
  let sum = 0;
  for (let i = 0; i < timeData.length; i++) {
    const v = (timeData[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / timeData.length) * 3.2);
}

/**
 * MiniLoop — rondlopende tijdlijn van LOOP_BEATS tellen.
 *
 * De klok is de AudioContext; de UI leest `getBeat()` in de gedeelde
 * frame-loop en schrijft direct naar de DOM (geen React-state per frame).
 */
export class MiniLoop {
  private clips: LoopClip[] = [];
  private sounds = new Map<string, LiteSound>();
  private timer: number | null = null;
  private startTime = 0;
  private scheduledUntil = 0;
  private live = new Set<AudioBufferSourceNode>();
  /** Lengte van één ronde in tellen (hero: 16; studio: lengte van de inhoud). */
  loopBeats = LOOP_BEATS;
  /** false = één keer afspelen en dan stoppen (studio zonder herhalen). */
  repeat = true;
  onEnded: (() => void) | null = null;
  /** sampleId → eindtijd (ctx-tijd) van de laatst gestarte clip, voor visuals. */
  readonly activeUntil = new Map<string, number>();

  configure(opts: { loopBeats?: number; repeat?: boolean; onEnded?: (() => void) | null }): void {
    if (opts.loopBeats !== undefined) this.loopBeats = opts.loopBeats;
    if (opts.repeat !== undefined) this.repeat = opts.repeat;
    if (opts.onEnded !== undefined) this.onEnded = opts.onEnded;
  }

  get isPlaying(): boolean {
    return this.timer !== null;
  }

  setContent(clips: LoopClip[], sounds: LiteSound[]): void {
    this.clips = clips;
    this.sounds = new Map(sounds.map((s) => [s.id, s]));
    for (const s of sounds) void resolveBuffer(s);
  }

  async play(): Promise<void> {
    await unlockAudio();
    if (this.timer !== null) return;
    const c = getCtx();
    this.startTime = c.currentTime + 0.06;
    this.scheduledUntil = this.startTime;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    for (const src of this.live) {
      try { src.stop(); } catch { /* al gestopt */ }
    }
    this.live.clear();
    this.activeUntil.clear();
  }

  /** Positie in tellen; gecorrigeerd voor uitvoervertraging (wat je HOORT). */
  getBeat(): number {
    if (this.timer === null) return 0;
    const c = getCtx();
    const latency = Number.isFinite(c.outputLatency) ? c.outputLatency : 0;
    const t = c.currentTime - latency - this.startTime;
    if (t < 0) return 0;
    const loopSec = this.loopBeats * BEAT_SEC;
    return (this.repeat ? t % loopSec : Math.min(t, loopSec)) / BEAT_SEC;
  }

  isSoundActive(sampleId: string): boolean {
    const until = this.activeUntil.get(sampleId);
    return until !== undefined && until > getCtx().currentTime;
  }

  private tick(): void {
    const c = getCtx();
    if (!this.repeat && c.currentTime > this.startTime + this.loopBeats * BEAT_SEC + 0.2) {
      this.stop();
      this.onEnded?.();
      return;
    }
    const horizon = c.currentTime + 0.12;
    while (this.scheduledUntil < horizon) {
      const from = this.scheduledUntil;
      const to = Math.min(horizon, from + 0.1);
      this.scheduleWindow(from, to);
      this.scheduledUntil = to;
    }
  }

  private scheduleWindow(from: number, to: number): void {
    const loopSec = this.loopBeats * BEAT_SEC;
    const loopIndexFrom = Math.floor((from - this.startTime) / loopSec);
    const loopIndexTo = this.repeat ? Math.floor((to - this.startTime) / loopSec) : 0;
    for (let li = Math.max(0, loopIndexFrom); li <= loopIndexTo; li++) {
      const loopStart = this.startTime + li * loopSec;
      for (const clip of this.clips) {
        const when = loopStart + clip.startBeat * BEAT_SEC;
        if (when < from || when >= to) continue;
        const sound = this.sounds.get(clip.sampleId);
        if (!sound) continue;
        void resolveBuffer(sound).then((buffer) => {
          if (!buffer || this.timer === null) return;
          const src = playBuffer(buffer, { when, gain: 0.85 });
          this.live.add(src);
          src.addEventListener('ended', () => this.live.delete(src));
          this.activeUntil.set(clip.sampleId, when + buffer.duration);
        });
      }
    }
  }
}

// --- Eén gedeelde frame-loop (V2-voorstel §2.1) ---

type FrameCallback = (now: number) => void;
const frameSubscribers = new Set<FrameCallback>();
let rafId: number | null = null;

function runFrame(now: number): void {
  for (const cb of frameSubscribers) cb(now);
  rafId = frameSubscribers.size > 0 ? requestAnimationFrame(runFrame) : null;
}

export function subscribeFrame(cb: FrameCallback): () => void {
  frameSubscribers.add(cb);
  if (rafId === null) rafId = requestAnimationFrame(runFrame);
  return () => {
    frameSubscribers.delete(cb);
  };
}
