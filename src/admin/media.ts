/**
 * Mediabestanden herkennen en meten, zonder ze te decoderen (puur, ook in Node).
 * Beeldmaten uit de bestandskop (PNG, JPEG, WebP); formaat uit de "magic bytes".
 * Het decoderen van geluid (duur) gebeurt in de browser: browserMedia.ts.
 */

export type MediaKind = 'image' | 'audio';

export interface DetectedFormat {
  kind: MediaKind;
  /** Vaste naam, bv. 'jpeg', 'png', 'webp', 'avif', 'mp3', 'wav', 'ogg', 'm4a'. */
  format: string;
  contentType: string;
}

const ascii = (b: Uint8Array, start: number, length: number) => String.fromCharCode(...b.subarray(start, start + length));

/** Herken het formaat aan de inhoud (niet aan de extensie). */
export function detectFormat(b: Uint8Array): DetectedFormat | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return { kind: 'image', format: 'png', contentType: 'image/png' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', format: 'jpeg', contentType: 'image/jpeg' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return { kind: 'image', format: 'webp', contentType: 'image/webp' };
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    if (brand === 'avif' || brand === 'avis') return { kind: 'image', format: 'avif', contentType: 'image/avif' };
    return { kind: 'audio', format: 'm4a', contentType: 'audio/mp4' };
  }
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WAVE') return { kind: 'audio', format: 'wav', contentType: 'audio/wav' };
  if (ascii(b, 0, 4) === 'OggS') return { kind: 'audio', format: 'ogg', contentType: 'audio/ogg' };
  if (ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { kind: 'audio', format: 'mp3', contentType: 'audio/mpeg' };
  return null;
}

/** Welke formaten bij welke extensie horen. */
const EXTENSIONS: Record<string, string[]> = {
  jpeg: ['jpg', 'jpeg'], png: ['png'], webp: ['webp'], avif: ['avif'],
  mp3: ['mp3'], wav: ['wav'], ogg: ['ogg', 'oga'], m4a: ['m4a', 'mp4', 'aac'],
};

export function extensionOf(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return m ? m[1].toLowerCase() : '';
}

export function extensionMatches(path: string, format: string): boolean {
  return (EXTENSIONS[format] ?? []).includes(extensionOf(path));
}

/** Breedte × hoogte uit de kop van een PNG, JPEG of WebP; null als onbekend (bv. AVIF). */
export function readImageSize(b: Uint8Array): { width: number; height: number } | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const f = detectFormat(b)?.format;
  try {
    if (f === 'png') return { width: v.getUint32(16), height: v.getUint32(20) };
    if (f === 'webp') {
      const chunk = ascii(b, 12, 4);
      if (chunk === 'VP8X') return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
      if (chunk === 'VP8 ') return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
      if (chunk === 'VP8L') {
        const bits = v.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      return null;
    }
    if (f === 'jpeg') {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const marker = b[i + 1];
        const length = v.getUint16(i + 2);
        // SOF0..SOF15 behalve DHT (C4), JPG (C8) en DAC (CC)
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { width: v.getUint16(i + 7), height: v.getUint16(i + 5) };
        }
        i += 2 + length;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Vereiste maat van locatiebeelden en plattegronden (V2-voorstel §6.1 regel 10). */
export const REQUIRED_IMAGE = { width: 1920, height: 1080 } as const;

/** Grenzen per bestand (de bucket weigert > 5 MB). */
export const SIZE_LIMITS = {
  hardMax: 5 * 1024 * 1024,
  imageWarn: 1.5 * 1024 * 1024,
  audioWarn: 1024 * 1024,
} as const;
