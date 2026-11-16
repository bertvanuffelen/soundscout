/**
 * Browserkant van de mediacontroles: geluid decoderen (duur meten) en een
 * beeldmaat bepalen als de bestandskop dat niet vertelt (AVIF). Niets wordt
 * opnieuw gecodeerd — het dashboard meldt, het past niets aan.
 */

import { readImageSize } from './media';

let context: OfflineAudioContext | null = null;

/** Duur in seconden, of null als de browser het bestand niet kan decoderen. */
export async function decodeAudioDuration(bytes: Uint8Array): Promise<number | null> {
  try {
    context ??= new OfflineAudioContext(1, 1, 44100);
    const copy = bytes.slice().buffer;
    const buffer = await context.decodeAudioData(copy);
    return buffer.duration;
  } catch {
    return null;
  }
}

export async function measureImage(bytes: Uint8Array, contentType: string): Promise<{ width: number; height: number } | null> {
  const fromHeader = readImageSize(bytes);
  if (fromHeader) return fromHeader;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: contentType }));
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

export async function fileBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Bied bytes aan als download (themapakket), zonder iets te uploaden. */
export function downloadBytes(bytes: Uint8Array, filename: string, type = 'application/zip'): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
