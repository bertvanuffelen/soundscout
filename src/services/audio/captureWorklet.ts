/**
 * captureWorklet — broncode van de capture-processor voor het realtime
 * export-vangnet (V2 Fase 1: afgesplitst uit AudioService, inhoud ongewijzigd).
 * Wordt samen met de limiter in ÉÉN worklet-module geregistreerd
 * (zie AudioService.buildDspWorkletCode en Tone.js-pitfall 10).
 */

export function buildCaptureWorkletCode(): string {
    // De worklet vangt ALLES vanaf zijn geboorte, frame-geïndexeerd; de
    // main thread knipt het exacte venster uit. Zo maakt de latentie van
    // het start-bericht (module-compile kan honderden ms duren) niet uit.
    return `
        class SoundScoutCapture extends AudioWorkletProcessor {
          constructor() {
            super();
            this.capturing = true;
            this.bufs = [];
            this.count = 0;
            this.port.onmessage = (e) => {
              const d = e.data;
              if (d.cmd === 'ping') { this.port.postMessage({ type: 'pong' }); }
              if (d.cmd === 'flush') {
                this.capturing = false;
                this.flush();
                this.port.postMessage({ type: 'end' });
              }
            };
          }
          flush() {
            if (this.bufs.length) {
              this.port.postMessage({ type: 'chunks', chunks: this.bufs });
              this.bufs = [];
              this.count = 0;
            }
          }
          process(inputs) {
            if (!this.capturing) return true;
            const inp = inputs[0];
            if (!inp || !inp[0]) {
              // Inactieve input (bv. na de laatste clip) = stilte — óók
              // vastleggen, anders mist het venster zijn stille staart.
              const zeros = new Float32Array(128);
              this.bufs.push({ f: currentFrame, L: zeros, R: zeros });
            } else {
              this.bufs.push({
                f: currentFrame,
                L: inp[0].slice(0),
                R: (inp[1] || inp[0]).slice(0),
              });
            }
            if (++this.count >= 64) this.flush();
            return true;
          }
        }
        registerProcessor('soundscout-capture', SoundScoutCapture);
      `;
}
