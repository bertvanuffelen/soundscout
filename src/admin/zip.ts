/**
 * Kleine zip-lezer en -schrijver voor themapakketten (.sspack = zip).
 *
 * Geen extra afhankelijkheid: uitpakken gebruikt de ingebouwde
 * `DecompressionStream('deflate-raw')` (Chrome 103+, Safari 16.4+, Firefox 113+,
 * Node 18+); inpakken schrijft "stored" (niet gecomprimeerd — mp3/jpg
 * comprimeren toch niet). Genoeg voor wat het dashboard doet: geen zip64,
 * geen versleuteling, geen meerdelige archieven.
 */

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;

export class ZipError extends Error {}

/** Maximale uitgepakte grootte van een pakket (beschermt tegen zip-bommen). */
export const MAX_UNPACKED_BYTES = 300 * 1024 * 1024;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const stream = source.pipeThrough(new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Pak een zip uit naar `pad → bytes` (mappen weggelaten). */
export async function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === SIG_END) { end = i; break; }
  }
  if (end < 0) throw new ZipError('geen zip-bestand');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const out = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  let total = 0;

  for (let n = 0; n < count; n++) {
    if (view.getUint32(offset, true) !== SIG_CENTRAL) throw new ZipError('beschadigde inhoudsopgave');
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith('/')) continue;
    if (flags & 0x1) throw new ZipError(`${name}: versleuteld`);
    if (compressedSize === 0xffffffff || size === 0xffffffff) throw new ZipError(`${name}: zip64 wordt niet ondersteund`);
    total += size;
    if (total > MAX_UNPACKED_BYTES) throw new ZipError('pakket is te groot');

    if (view.getUint32(localOffset, true) !== SIG_LOCAL) throw new ZipError(`${name}: beschadigd`);
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    let data: Uint8Array;
    if (method === 0) data = raw.slice();
    else if (method === 8) data = await inflateRaw(raw);
    else throw new ZipError(`${name}: onbekende compressie (${method})`);
    if (data.length !== size) throw new ZipError(`${name}: verkeerde lengte`);
    out.set(name, data);
  }
  return out;
}

// --- Schrijven ---

let crcTable: Uint32Array | null = null;
function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Maak een zip (stored) van `pad → bytes`. */
export function writeZip(files: Map<string, Uint8Array> | Array<[string, Uint8Array]>): Uint8Array {
  const entries = [...files];
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const [path, data] of entries) {
    const name = encoder.encode(path);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, SIG_LOCAL, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 namen
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, SIG_CENTRAL, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, SIG_END, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const out = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
