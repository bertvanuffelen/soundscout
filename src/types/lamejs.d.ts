/**
 * Type declarations for @breezystack/lamejs
 * @see https://github.com/nickytonline/lamejs
 */

declare module '@breezystack/lamejs' {
  export class Mp3Encoder {
    /**
     * Create a new MP3 encoder
     * @param channels Number of audio channels (1 for mono, 2 for stereo)
     * @param sampleRate Sample rate in Hz (e.g., 44100)
     * @param kbps Bitrate in kbps (e.g., 128)
     */
    constructor(channels: number, sampleRate: number, kbps: number);

    /**
     * Encode a buffer of audio samples
     * @param left Left channel samples as Int16Array
     * @param right Right channel samples as Int16Array (same as left for mono)
     * @returns Encoded MP3 data
     */
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;

    /**
     * Flush any remaining data and finalize the MP3
     * @returns Remaining MP3 data
     */
    flush(): Int8Array;
  }

  export class WavHeader {
    static readHeader(dataView: DataView): WavHeaderData;
  }

  export interface WavHeaderData {
    channels: number;
    sampleRate: number;
    dataLen: number;
  }
}
