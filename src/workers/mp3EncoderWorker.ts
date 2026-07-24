/**
 * MP3-encoder in een Web Worker (exports-audit #12).
 *
 * De lamejs-encode van een lange compositie blokkeerde de main thread
 * (UI bevroor tijdens "Exporteren…"). Deze worker doet exact dezelfde
 * encode; audioExport.ts valt terug op de main thread als Workers niet
 * beschikbaar zijn.
 */

import { Mp3Encoder } from '@breezystack/lamejs';

export interface Mp3WorkerRequest {
  left: Int16Array;
  right: Int16Array;
  sampleRate: number;
  bitrate: number;
}

export type Mp3WorkerResponse =
  | { type: 'progress'; processed: number; total: number }
  | { type: 'done'; chunks: ArrayBuffer[] }
  | { type: 'error'; message: string };

const BLOCK_SIZE = 1152; // samples per MP3-frame
const PROGRESS_EVERY = BLOCK_SIZE * 200;

self.onmessage = (event: MessageEvent<Mp3WorkerRequest>) => {
  try {
    const { left, right, sampleRate, bitrate } = event.data;
    const encoder = new Mp3Encoder(2, sampleRate, bitrate);
    const chunks: ArrayBuffer[] = [];
    const total = left.length;

    for (let i = 0; i < total; i += BLOCK_SIZE) {
      const end = Math.min(i + BLOCK_SIZE, total);
      const mp3buf = encoder.encodeBuffer(left.subarray(i, end), right.subarray(i, end));
      if (mp3buf.length > 0) {
        chunks.push(new Uint8Array(mp3buf).buffer);
      }
      if (i % PROGRESS_EVERY === 0) {
        const progress: Mp3WorkerResponse = { type: 'progress', processed: i, total };
        self.postMessage(progress);
      }
    }
    const tail = encoder.flush();
    if (tail.length > 0) {
      chunks.push(new Uint8Array(tail).buffer);
    }
    const done: Mp3WorkerResponse = { type: 'done', chunks };
    // Chunks als transferables — geen kopie terug naar de main thread
    (self as unknown as Worker).postMessage(done, chunks);
  } catch (err) {
    const error: Mp3WorkerResponse = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
