/**
 * Type declarations for audiobuffer-to-wav
 * @see https://github.com/Experience-Monks/audiobuffer-to-wav
 */

declare module 'audiobuffer-to-wav' {
  /**
   * Convert an AudioBuffer to a WAV ArrayBuffer
   * @param buffer The AudioBuffer to convert
   * @param options Optional conversion options
   * @returns ArrayBuffer containing WAV data
   */
  function toWav(
    buffer: AudioBuffer,
    options?: {
      /** Use 32-bit float instead of 16-bit integer */
      float32?: boolean;
    }
  ): ArrayBuffer;

  export = toWav;
}
