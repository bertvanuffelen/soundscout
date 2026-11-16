import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { readZip, writeZip, ZipError } from '../zip';
import { detectFormat, readImageSize, extensionMatches } from '../media';
import { stripCommonRoot, unpackZip, validatePack } from '../pack';
import { checkCredit, normalizeCredits } from '../checks';
// @ts-expect-error -- gewoon JS-hulpscript, gedeeld met de e2e-fixture
import { makePng, makeWav, makeManifest, makeCredits } from '../../../e2e/fixtures/make-theme-pack.mjs';

const enc = (v: unknown) => new TextEncoder().encode(typeof v === 'string' ? v : JSON.stringify(v));
const u8 = (b: Uint8Array) => new Uint8Array(b);

function pack(overrides: { manifest?: unknown; credits?: unknown; drop?: string[]; extra?: Record<string, Uint8Array> } = {}) {
  const files = new Map<string, Uint8Array>([
    ['manifest.json', enc(overrides.manifest ?? makeManifest())],
    ['credits.json', enc(overrides.credits ?? makeCredits())],
    ['report.json', enc({ allGreen: true })],
    ['images/plattegrond.png', u8(makePng(1920, 1080))],
    ['images/plein.png', u8(makePng(1920, 1080))],
    ['audio/plein-toon.wav', u8(makeWav(2.5))],
    ...Object.entries(overrides.extra ?? {}),
  ]);
  for (const d of overrides.drop ?? []) files.delete(d);
  return files;
}

const decodeDuration = async (bytes: Uint8Array) => {
  // WAV 8-bit mono: (lengte − kop) / samplerate
  if (detectFormat(bytes)?.format !== 'wav') return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset);
  return v.getUint32(40, true) / v.getUint32(24, true);
};

const rules = (r: { issues: Array<{ rule: string; severity: string }> }, severity = 'error') =>
  r.issues.filter((i) => i.severity === severity).map((i) => i.rule);

describe('zip', () => {
  it('leest een met deflate ingepakt archief (zoals Finder/zip het maakt)', async () => {
    const files = await readZip(new Uint8Array(readFileSync(join(__dirname, 'deflated.zip'))));
    expect(new TextDecoder().decode(files.get('pakket/a.txt'))).toBe('hallo '.repeat(500));
    expect(files.has('pakket/')).toBe(false);
  });

  it('schrijven en weer lezen geeft dezelfde bestanden', async () => {
    const input = new Map([['manifest.json', enc({ a: 1 })], ['audio/x.wav', u8(makeWav(0.1))]]);
    const back = await readZip(writeZip(input));
    expect([...back.keys()]).toEqual([...input.keys()]);
    expect(back.get('audio/x.wav')).toEqual(input.get('audio/x.wav'));
  });

  it('weigert iets dat geen zip is', async () => {
    await expect(readZip(enc('dit is geen zip'))).rejects.toBeInstanceOf(ZipError);
  });

  it('de e2e-fixture is een geldig pakket in een bovenmap', async () => {
    const files = await unpackZip(new Uint8Array(readFileSync(join(process.cwd(), 'e2e/fixtures/e2e-pakket.sspack'))));
    expect(files.has('manifest.json')).toBe(true);
    const result = await validatePack(files, { decodeDuration });
    expect(rules(result)).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('media', () => {
  it('herkent formaten aan de inhoud en leest de PNG-maat', () => {
    const png = u8(makePng(1920, 1080));
    expect(detectFormat(png)?.format).toBe('png');
    expect(readImageSize(png)).toEqual({ width: 1920, height: 1080 });
    expect(detectFormat(u8(makeWav(0.1)))?.kind).toBe('audio');
    expect(extensionMatches('a/b.JPG', 'jpeg')).toBe(true);
    expect(extensionMatches('a/b.png', 'jpeg')).toBe(false);
  });

  it('leest de maat uit een JPEG-kop', () => {
    // SOI, APP0 (lengte 16), SOF0 met hoogte 1080 en breedte 1920
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0), 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(readImageSize(jpeg)).toEqual({ width: 1920, height: 1080 });
  });
});

describe('pakket importeren — alles opnieuw controleren', () => {
  it('een geldig pakket: geen fouten, gemeten duur, report.json alleen bewaard om te tonen', async () => {
    const result = await validatePack(pack(), { decodeDuration });
    expect(rules(result)).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.manifest?.status).toBe('draft');
    expect([...result.files.keys()].sort()).toEqual(['audio/plein-toon.wav', 'images/plattegrond.png', 'images/plein.png']);
    expect(result.packReport).toEqual({ allGreen: true });
    // credits.json met alleen de bestandsnaam als sleutel
    expect(result.credits['audio/plein-toon.wav']?.licence).toBe('CC0');
  });

  it('een bovenmap in de zip wordt weggehaald', () => {
    const nested = new Map([...pack()].map(([k, v]) => [`sinterklaas/${k}`, v] as [string, Uint8Array]));
    nested.set('__MACOSX/sinterklaas/._manifest.json', enc('x'));
    expect([...stripCommonRoot(nested).keys()]).toContain('manifest.json');
    expect([...stripCommonRoot(nested).keys()].some((k) => k.includes('MACOSX'))).toBe(false);
  });

  it('ontbrekend bestand', async () => {
    const result = await validatePack(pack({ drop: ['audio/plein-toon.wav'] }), { decodeDuration });
    expect(rules(result)).toContain('pack-missing-file');
    expect(result.ok).toBe(false);
  });

  it('geen manifest, of kapotte JSON', async () => {
    expect(rules(await validatePack(pack({ drop: ['manifest.json'] })))).toEqual(['pack-no-manifest']);
    expect(rules(await validatePack(pack({ manifest: '{kapot' })))).toEqual(['pack-bad-json']);
  });

  it('manifest dat niet aan het schema voldoet', async () => {
    const bad = { ...makeManifest(), id: 'Met Hoofdletters', locations: [] };
    const result = await validatePack(pack({ manifest: bad }));
    expect(rules(result)).toContain('pack-schema');
    expect(result.manifest).toBeNull();
  });

  it('regelfouten uit rules.ts: hotspot buiten de veilige zone, loop niet exact 8 s', async () => {
    const m = makeManifest();
    m.locations[0].hotspots[0].y = 95;
    m.samples[0].kind = 'loop';
    const result = await validatePack(pack({ manifest: m }), { decodeDuration });
    expect(rules(result)).toEqual(expect.arrayContaining(['hotspot-safe-zone', 'sample-duration']));
  });

  it('opgegeven duur wordt niet vertrouwd: de gemeten duur telt', async () => {
    const m = makeManifest();
    m.samples[0].duration = 4; // pakket liegt; bestand is 2,5 s
    const result = await validatePack(pack({ manifest: m }), { decodeDuration });
    expect(result.manifest?.samples[0].duration).toBe(2.5);
    expect(rules(result, 'warning')).toContain('audio-duration-mismatch');
  });

  it('verkeerde beeldmaat is een harde fout (geen bijsnijden)', async () => {
    const result = await validatePack(pack({ extra: { 'images/plein.png': u8(makePng(1600, 1200)) } }), { decodeDuration });
    expect(rules(result)).toContain('image-size');
  });

  it('een geluid dat eigenlijk een beeld is', async () => {
    const result = await validatePack(pack({ extra: { 'audio/plein-toon.wav': u8(makePng(10, 10)) } }), { decodeDuration });
    expect(rules(result)).toContain('pack-format');
  });

  it('licenties: ontbrekend, NC/ND, CC-BY zonder maker', async () => {
    const credits = { ...makeCredits(), 'images/plein.png': { source: 'freesound', licence: 'CC BY-NC 4.0', author: 'x', url: 'https://x' } };
    delete (credits as Record<string, unknown>)['plein-toon.wav'];
    const result = await validatePack(pack({ credits }), { decodeDuration });
    expect(rules(result)).toEqual(expect.arrayContaining(['credit-missing', 'credit-licence']));
    expect(checkCredit('a.mp3', { source: 'freesound', licence: 'CC BY 4.0' })[0]?.rule).toBe('credit-attribution');
    expect(checkCredit('a.mp3', { source: 'freesound', licence: 'CC BY 4.0', author: 'x', licenceUrl: 'https://x' })).toEqual([]);
    expect(normalizeCredits({ 'x.mp3': { source: 's', license: 'CC0', url: 'u' } }, ['audio/x.mp3'])['audio/x.mp3']).toMatchObject({ licence: 'CC0', licenceUrl: 'u' });
  });

  it('assetBase in een pakket is een fout (media zouden buiten het pakket wijzen)', async () => {
    const result = await validatePack(pack({ manifest: { ...makeManifest(), assetBase: '/' } }), { decodeDuration });
    expect(rules(result)).toContain('pack-asset-base');
  });
});
