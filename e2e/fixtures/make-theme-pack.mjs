// Maakt het kleine test-themapakket voor e2e/admin.spec.ts (en src/admin-tests):
//   e2e/fixtures/e2e-pakket.sspack
// Alles is gegenereerd: een effen PNG van 1920×1080 en een toon van 2,5 s (WAV).
// Geen auteursrechtelijk beschermde media. Opnieuw maken: node e2e/fixtures/make-theme-pack.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';

export function makePng(width, height, rgb = [30, 64, 120]) {
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function makeWav(seconds, rate = 8000, freq = 440) {
  const n = Math.round(seconds * rate);
  const b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(60 * Math.sin((2 * Math.PI * freq * i) / rate));
  return b;
}

export function makeManifest(id = 'e2e-pakket') {
  return {
    schemaVersion: 1, id, version: 1, status: 'draft', isPublic: true, sort: 90,
    map: { image: { nl: 'images/plattegrond.png' }, positions: [{ locationId: 'plein', x: 50, y: 50 }] },
    locations: [{ id: 'plein', image: 'images/plein.png', hotspots: [{ id: 'plein-toon', x: 50, y: 50, sampleId: 'plein-toon', visualHint: 'pulse' }] }],
    samples: [{ id: 'plein-toon', locationId: 'plein', file: 'audio/plein-toon.wav', duration: 2.5, icon: 'Bell', color: '#3B82F6', kind: 'sfx' }],
    texts: {
      nl: { name: 'E2E-pakket', description: 'Testthema', locations: { plein: { name: 'Het plein', description: 'Een plein' } }, samples: { 'plein-toon': 'Toon' } },
      en: { name: 'E2E pack', description: 'Test theme', locations: { plein: { name: 'The square', description: 'A square' } }, samples: { 'plein-toon': 'Tone' } },
    },
  };
}

export function makeCredits() {
  const own = { source: 'gegenereerd', author: 'SoundScout e2e', licence: 'CC0' };
  return { 'images/plattegrond.png': own, 'images/plein.png': own, 'plein-toon.wav': own };
}

// --- zip (stored) ---
export function zip(entries) {
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, data] of entries) {
    const nb = Buffer.from(name); const crc = crc32(data) >>> 0;
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x0800, 6);
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(data.length, 18); l.writeUInt32LE(data.length, 22); l.writeUInt16LE(nb.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(offset, 42);
    locals.push(l, nb, data); centrals.push(c, nb); offset += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, e]);
}

if (process.argv[1]?.endsWith('make-theme-pack.mjs')) {
  const png = makePng(1920, 1080);
  const files = [
    ['e2e-pakket/manifest.json', Buffer.from(JSON.stringify(makeManifest(), null, 2))],
    ['e2e-pakket/credits.json', Buffer.from(JSON.stringify(makeCredits(), null, 2))],
    ['e2e-pakket/report.json', Buffer.from(JSON.stringify({ note: 'wordt alleen getoond, nooit vertrouwd', allGreen: true }))],
    ['e2e-pakket/images/plattegrond.png', png],
    ['e2e-pakket/images/plein.png', makePng(1920, 1080, [40, 120, 60])],
    ['e2e-pakket/audio/plein-toon.wav', makeWav(2.5)],
  ];
  const out = new URL('./e2e-pakket.sspack', import.meta.url);
  writeFileSync(out, zip(files));
  console.log(`geschreven: ${out.pathname}`);
}
