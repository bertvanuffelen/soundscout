import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ThemeManifestSchema } from '../../themes/manifest';
import { createDraft, editorReducer, validateDraft, prepareVersionManifest, assetUrl, slugify, type Draft, type DraftAsset } from '../editorState';
import { buildAdminRows, rollbackTargets, reorder } from '../overview';
import { resolveAdminStatus } from '../../hooks/useIsAdmin';
// @ts-expect-error -- gewoon JS-hulpscript, gedeeld met de e2e-fixture
import { makeManifest, makePng } from '../../../e2e/fixtures/make-theme-pack.mjs';

const winter = ThemeManifestSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'public/themes/winterspelen/manifest.json'), 'utf8')));
const SUPA = 'https://p.supabase.co/storage/v1/object/public/themes';
const errors = (d: Draft) => validateDraft(d).filter((i) => i.severity === 'error').map((i) => i.rule);
const asset = (extra: Partial<DraftAsset> = {}): DraftAsset => ({ bytes: new Uint8Array([1, 2, 3]), contentType: 'audio/wav', ...extra });

function draft(): Draft {
  return createDraft(ThemeManifestSchema.parse(makeManifest('kerst')), `${SUPA}/kerst/v2/manifest.json`, 2);
}

describe('editor: hotspots en kaart', () => {
  it('slepen buiten de veilige zone geeft live een fout; terugslepen haalt hem weg', () => {
    let d = draft();
    expect(errors(d)).toEqual([]);
    d = editorReducer(d, { type: 'moveHotspot', locationId: 'plein', hotspotId: 'plein-toon', x: 50, y: 95.04 });
    expect(d.manifest.locations[0].hotspots[0].y).toBe(95);
    expect(d.dirty).toBe(true);
    expect(errors(d)).toContain('hotspot-safe-zone');
    d = editorReducer(d, { type: 'moveHotspot', locationId: 'plein', hotspotId: 'plein-toon', x: 50, y: 40 });
    expect(errors(d)).toEqual([]);
  });

  it('posities blijven binnen 0–100 %', () => {
    const d = editorReducer(draft(), { type: 'moveHotspot', locationId: 'plein', hotspotId: 'plein-toon', x: -20, y: 140 });
    expect(d.manifest.locations[0].hotspots[0]).toMatchObject({ x: 0, y: 100 });
  });

  it('een tweede hotspot op dezelfde plek overlapt (afstandsregel)', () => {
    const d = editorReducer(draft(), { type: 'addHotspot', locationId: 'plein', sampleId: 'plein-toon' });
    expect(d.manifest.locations[0].hotspots.map((h) => h.id)).toEqual(['plein-toon', 'plein-toon-2']);
    expect(errors(d)).toContain('hotspot-spacing');
    const removed = editorReducer(d, { type: 'removeHotspot', locationId: 'plein', hotspotId: 'plein-toon-2' });
    expect(errors(removed)).toEqual([]);
  });

  it('kaartmarker verslepen', () => {
    const d = editorReducer(draft(), { type: 'moveMarker', locationId: 'plein', x: 12.34, y: 77 });
    expect(d.manifest.map.positions[0]).toMatchObject({ x: 12.3, y: 77 });
  });
});

describe('editor: geluiden en teksten', () => {
  const add = (d: Draft, credit = { source: 'eigen opname', licence: 'CC0' }) => editorReducer(d, {
    type: 'addSample', locationId: 'plein', path: 'audio/klok.wav', asset: asset(), credit,
    sample: { id: 'plein-toon', file: '', duration: 3.2, icon: 'Bell', color: '#FF0000', kind: 'sfx' },
    names: { nl: 'Klok', en: '' },
  });

  it('geluid toevoegen: unieke id, hotspot erbij, naam in nl, ontbrekende vertaling als waarschuwing', () => {
    const d = add(draft());
    const s = d.manifest.samples.find((x) => x.file === 'audio/klok.wav')!;
    expect(s.id).toBe('plein-toon-2');
    expect(d.manifest.texts.nl.samples[s.id]).toBe('Klok');
    expect(d.manifest.locations[0].hotspots.some((h) => h.sampleId === s.id)).toBe(true);
    expect(d.assets['audio/klok.wav']).toBeDefined();
    expect(validateDraft(d).some((i) => i.rule === 'missing-translation')).toBe(true);
  });

  it('zonder licentie geen publicatie (fout), met licentie wel', () => {
    const d = add(draft(), { source: '', licence: '' });
    expect(errors(d)).toContain('credit-missing');
    const fixed = editorReducer(d, { type: 'setCredit', path: 'audio/klok.wav', credit: { source: 'eigen opname', licence: 'CC0' } });
    expect(errors(fixed)).not.toContain('credit-missing');
  });

  it('een effect van 9 s is een fout; als loop moet het exact 8,0 s zijn', () => {
    let d = editorReducer(draft(), { type: 'updateSample', sampleId: 'plein-toon', patch: { kind: 'loop' } });
    expect(errors(d)).toContain('sample-duration');
    d = editorReducer(d, { type: 'updateSample', sampleId: 'plein-toon', patch: { kind: 'sfx' } });
    expect(errors(d)).not.toContain('sample-duration');
  });

  it('geluid verwijderen haalt ook hotspot, teksten en het nieuwe bestand weg', () => {
    const d = add(draft());
    const id = d.manifest.samples[1].id;
    const r = editorReducer(d, { type: 'removeSample', sampleId: id });
    expect(r.manifest.samples.map((s) => s.id)).toEqual(['plein-toon']);
    expect(r.manifest.locations[0].hotspots.some((h) => h.sampleId === id)).toBe(false);
    expect(r.manifest.texts.nl.samples[id]).toBeUndefined();
    expect(r.assets['audio/klok.wav']).toBeUndefined();
  });

  it('teksten: Engels leegmaken = terugvallen op nl (waarschuwing), Nederlandse naam leeg = fout', () => {
    let d = editorReducer(draft(), { type: 'setLocationText', lang: 'en', locationId: 'plein', field: 'name', value: '' });
    expect(d.manifest.texts.en?.locations?.plein?.name).toBeUndefined();
    expect(validateDraft(d).some((i) => i.rule === 'missing-translation')).toBe(true);
    d = editorReducer(d, { type: 'setThemeText', lang: 'nl', field: 'name', value: ' ' });
    expect(errors(d)).toContain('pack-schema');
    d = editorReducer(d, { type: 'setSampleName', lang: 'de', sampleId: 'plein-toon', value: 'Ton' });
    expect(d.manifest.texts.de?.samples?.['plein-toon']).toBe('Ton');
  });
});

describe('editor: beelden en opslaan als versie', () => {
  it('een vervangen beeld van de verkeerde maat is een fout', () => {
    const d = editorReducer(draft(), {
      type: 'replaceImage', target: { kind: 'location', locationId: 'plein' }, path: 'images/plein-2.png',
      asset: { bytes: new Uint8Array(makePng(10, 10)), contentType: 'image/png', size: { width: 1600, height: 1200 } },
      credit: { source: 'eigen', licence: 'CC0' },
    });
    expect(d.manifest.locations[0].image).toBe('images/plein-2.png');
    expect(errors(d)).toContain('image-size');
  });

  it('nieuwe bestanden in de nieuwe versiemap, bestaande via ../v<oud>/ (oude versies veranderen nooit)', () => {
    const d = editorReducer(draft(), {
      type: 'replaceImage', target: { kind: 'map', lang: 'nl' }, path: 'images/kaart-nieuw.png',
      asset: { bytes: new Uint8Array([1]), contentType: 'image/png', size: { width: 1920, height: 1080 } },
    });
    const { manifest, uploads } = prepareVersionManifest(d, 3);
    expect(manifest.version).toBe(3);
    expect(manifest.status).toBe('draft');
    expect(manifest.map.image.nl).toBe('images/kaart-nieuw.png');
    expect(manifest.locations[0].image).toBe('../v2/images/plein.png');
    expect(manifest.samples[0].file).toBe('../v2/audio/plein-toon.wav');
    expect(uploads.map(([p]) => p)).toEqual(['images/kaart-nieuw.png']);
  });

  it('een statisch thema (assetBase "/") overnemen: bestaande media blijven op de eigen site', () => {
    const d = createDraft(winter, '/themes/winterspelen/manifest.json', null);
    const { manifest } = prepareVersionManifest(d, 1);
    expect(manifest.assetBase).toBeUndefined();
    expect(manifest.locations[0].image.startsWith('/images/themes/winterspelen/')).toBe(true);
    expect(ThemeManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it('assetUrl: nieuw bestand lokaal, de rest op de plek van de bronversie', () => {
    const d = { ...draft(), assets: { 'audio/x.wav': asset({ objectUrl: 'blob:abc' }) } };
    expect(assetUrl(d, 'audio/x.wav')).toBe('blob:abc');
    expect(assetUrl(d, 'images/plein.png')).toBe(`${SUPA}/kerst/v2/images/plein.png`);
  });

  it('slugify maakt veilige bestandsnamen', () => {
    expect(slugify('Hond blaft! (Freesound).MP3')).toBe('hond-blaft-freesound');
    expect(slugify('???')).toBe('geluid');
  });
});

describe('overzicht', () => {
  const row = { status: 'published' as const, is_public: true, season_from: null, season_until: null, sort: 5, updated_at: '' };
  const v = (theme_id: string, version: number, published: boolean, manifest: unknown) => ({ theme_id, version, manifest, created_at: '2026-11-0' + version, published_at: published ? '2026-11-1' : null });

  it('database-thema vervangt het statische; concept, telling en terugzet-doelen', () => {
    const w1 = { ...winter, version: 1, assetBase: undefined };
    const w2 = { ...winter, version: 2 };
    const w3 = { ...winter, version: 3 };
    const rows = buildAdminRows(
      { themes: [{ ...row, id: 'winterspelen', published_version: 2 }], versions: [v('winterspelen', 1, true, w1), v('winterspelen', 2, true, w2), v('winterspelen', 3, false, w3)] },
      [{ manifest: winter, url: '/themes/winterspelen/manifest.json' }, { manifest: ThemeManifestSchema.parse(makeManifest('los')), url: '/themes/los/manifest.json' }],
      (id, n) => `${SUPA}/${id}/v${n}/manifest.json`,
    );
    const w = rows.find((r) => r.id === 'winterspelen')!;
    expect(w.source).toBe('database');
    expect(w.latest.version).toBe(3);
    expect(w.hasDraft).toBe(true);
    expect(w.errors).toBeGreaterThan(0); // winterspelen heeft bekende veilige-zone-fouten (THEMES.md §2)
    expect(rollbackTargets(w)).toEqual([1]);
    expect(rows.find((r) => r.id === 'los')?.source).toBe('static');
    expect(rows[0].id).toBe('winterspelen'); // sort 5 eerst
  });

  it('herschikken geeft alleen nieuwe sort-waarden voor database-thema\'s', () => {
    const rows = buildAdminRows(
      { themes: [{ ...row, id: 'a', sort: 10, published_version: 1 }, { ...row, id: 'b', sort: 20, published_version: 1 }], versions: [v('a', 1, true, makeManifest('a')), v('b', 1, true, makeManifest('b'))] },
      [], (id, n) => `${SUPA}/${id}/v${n}/manifest.json`,
    );
    expect(reorder(rows, 1, -1)).toEqual([{ id: 'b', sort: 10 }, { id: 'a', sort: 20 }]);
    expect(reorder(rows, 0, -1)).toEqual([]);
  });
});

describe('useIsAdmin: terugval', () => {
  it('database zegt ja/nee → dat telt, ongeacht VITE_ADMIN_EMAILS', () => {
    expect(resolveAdminStatus({ data: true, error: null }, 'x@example.test')).toEqual({ isAdmin: true, source: 'database', backendMissing: false });
    expect(resolveAdminStatus({ data: false, error: null }, 'x@example.test').isAdmin).toBe(false);
    expect(resolveAdminStatus({ data: [], error: null }, 'x@example.test').isAdmin).toBe(false);
  });

  it('functie bestaat nog niet (migratie 043 niet gedraaid) → e-maillijst, alleen voor de interface', () => {
    const missing = { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.is_admin' } };
    const status = resolveAdminStatus(missing, 'iemand@example.test');
    expect(status.source).toBe('email-fallback');
    expect(status.backendMissing).toBe(true);
    expect(status.isAdmin).toBe(false); // niet in de (lege) testlijst
  });

  it('elke andere fout → geen beheerder (veilige kant)', () => {
    expect(resolveAdminStatus({ data: null, error: { code: '500', message: 'boem' } }, 'x').isAdmin).toBe(false);
  });
});
