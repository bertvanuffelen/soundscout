declare module 'signalsmith-stretch' {
  /**
   * Maakt een Signalsmith Stretch AudioWorkletNode aan op de gegeven context.
   * De node krijgt remote-methodes (addBuffers, schedule, start, stop,
   * latency, configure, dropBuffers) die Promises teruggeven.
   */
  const SignalsmithStretch: (
    context: BaseAudioContext,
    options?: AudioWorkletNodeOptions
  ) => Promise<AudioWorkletNode & {
    addBuffers: (buffers: Float32Array[]) => Promise<number>;
    schedule: (change: Record<string, number | boolean>) => Promise<unknown>;
    start: (when?: number) => Promise<unknown>;
    stop: (when?: number) => Promise<unknown>;
    latency: () => Promise<number>;
    configure: (options: Record<string, unknown>) => Promise<unknown>;
    dropBuffers: (toSeconds?: number) => Promise<unknown>;
  }>;
  export default SignalsmithStretch;
}
