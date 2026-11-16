import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { ThemeManifestSchema, type ThemeManifest } from '../manifest';
import type { LoadedManifest, ThemeRepository } from '../repository';
import {
  bucketPublicUrl,
  createMergedThemeRepository,
  createRestPublishedSource,
  rowToLoadedManifest,
  versionFolderUrl,
  ThemeBackendMissingError,
  type KeyValueStore,
  type PublishedThemeRow,
  type PublishedThemesSource,
} from '../supabaseRepository';
import { createDefaultStaticRepository } from '../registry';

const SUPA = 'https://proj.supabase.co';
const read = (path: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'themes', path), 'utf8'));
const winter = ThemeManifestSchema.parse(read('winterspelen/manifest.json'));

/** Een thema zoals het dashboard het maakt: relatieve paden, geen assetBase. */
function dashboardTheme(id: string, version = 1): ThemeManifest {
  return {
    ...winter,
    id,
    version,
    assetBase: undefined,
    texts: { ...winter.texts, nl: { ...winter.texts.nl, name: `NL ${id}` } },
    locations: winter.locations.map((l) => ({ ...l, image: `images/${l.id}.jpg` })),
    samples: winter.samples.map((s) => ({ ...s, file: `audio/${s.id}.mp3` })),
    map: { ...winter.map, image: { nl: 'images/kaart.jpg' } },
  };
}

function row(manifest: unknown, overrides: Partial<PublishedThemeRow> = {}): PublishedThemeRow {
  const m = manifest as { id: string; version: number };
  return { id: m.id, status: 'published', is_public: true, season_from: null, season_until: null, sort: 50, version: m.version, manifest, ...overrides };
}

const source = (rows: PublishedThemeRow[] | Error): PublishedThemesSource & { calls: number } => {
  const s = {
    calls: 0,
    async list() {
      s.calls += 1;
      if (rows instanceof Error) throw rows;
      return rows;
    },
  };
  return s;
};

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
}

const repo = (published: PublishedThemesSource | null, extra: { cache?: KeyValueStore; preview?: () => LoadedManifest | null; staticRepository?: ThemeRepository } = {}) =>
  createMergedThemeRepository({ staticRepository: extra.staticRepository ?? createDefaultStaticRepository(), published, supabaseUrl: SUPA, cache: extra.cache ?? null, preview: extra.preview });

describe('adressen in Storage', () => {
  it('versiemap = <supabase>/storage/v1/object/public/themes/<id>/v<n>/', () => {
    expect(bucketPublicUrl(`${SUPA}/`)).toBe(`${SUPA}/storage/v1/object/public/themes/`);
    expect(versionFolderUrl(SUPA, 'kerst', 3)).toBe(`${SUPA}/storage/v1/object/public/themes/kerst/v3/`);
  });

  it('relatieve mediapaden komen in de versiemap uit, ook ../v<oud>/ voor hergebruikte media', async () => {
    const m = dashboardTheme('kerst', 2);
    m.samples[0] = { ...m.samples[0], file: '../v1/audio/oud.mp3' };
    const theme = await repo(source([row(m)])).getTheme('kerst');
    expect(theme?.locations[0].backgroundImage).toBe(`${SUPA}/storage/v1/object/public/themes/kerst/v2/images/${m.locations[0].id}.jpg`);
    expect(theme?.map.backgroundImage).toBe(`${SUPA}/storage/v1/object/public/themes/kerst/v2/images/kaart.jpg`);
    expect(theme?.samples[0].audioUrl).toBe(`${SUPA}/storage/v1/object/public/themes/kerst/v1/audio/oud.mp3`);
  });

  it('een manifest met eigen assetBase ("/") houdt zijn paden op de eigen site', async () => {
    const loaded = rowToLoadedManifest(row({ ...winter, version: 4 }), SUPA)!;
    expect(loaded.url).toBe(`${SUPA}/storage/v1/object/public/themes/winterspelen/v4/manifest.json`);
    const theme = await repo(source([row({ ...winter, version: 4 })])).getTheme('winterspelen');
    expect(theme?.locations[0].backgroundImage.startsWith('/images/themes/winterspelen/')).toBe(true);
  });
});

describe('rijen uit published_themes', () => {
  it('zichtbaarheid, seizoen, volgorde en versie komen uit de themes-rij, niet uit het manifest', () => {
    const loaded = rowToLoadedManifest(row({ ...dashboardTheme('kerst'), isPublic: true, sort: 1 }, { is_public: false, sort: 7, season_from: '12-01', season_until: '01-06', version: 1 }), SUPA)!;
    expect(loaded.manifest.isPublic).toBe(false);
    expect(loaded.manifest.sort).toBe(7);
    expect(loaded.manifest.season).toEqual({ from: '12-01', until: '01-06' });
    expect(loaded.manifest.status).toBe('published');
  });

  it('verborgen = niet in kiezers, wel laadbaar', () => {
    const loaded = rowToLoadedManifest(row(dashboardTheme('kerst'), { status: 'hidden', is_public: true }), SUPA)!;
    expect(loaded.manifest.isPublic).toBe(false);
  });

  it('een kapot manifest wordt overgeslagen, niet de hele lijst', async () => {
    const r = repo(source([row({ id: 'kapot', version: 1, schemaVersion: 1 }), row(dashboardTheme('kerst'))]));
    const ids = (await r.listThemes()).map((t) => t.id);
    expect(ids).toContain('kerst');
    expect(ids).not.toContain('kapot');
  });
});

describe('samenvoegen met de statische thema\'s', () => {
  it('basis komt altijd uit de bundel, ook als Supabase een basis publiceert', async () => {
    const fake = { ...dashboardTheme('basis', 9) };
    const r = repo(source([row(fake)]));
    const basis = await r.getManifest('basis');
    expect(basis?.url).toBe('/themes/basis/manifest.json');
    expect((await r.listThemes()).find((t) => t.id === 'basis')?.version).not.toBe(9);
  });

  it('een gepubliceerd thema vervangt de statische kopie met hetzelfde id', async () => {
    const r = repo(source([row(dashboardTheme('winterspelen', 5))]));
    const list = await r.listThemes();
    expect(list.find((t) => t.id === 'winterspelen')?.version).toBe(5);
    const theme = await r.getTheme('winterspelen');
    expect(theme?.locations[0].backgroundImage.startsWith(`${SUPA}/storage/`)).toBe(true);
  });

  it('statische thema\'s die Supabase niet kent blijven werken; nieuwe Supabase-thema\'s komen erbij', async () => {
    const r = repo(source([row(dashboardTheme('kerst'))]));
    const ids = (await r.listThemes()).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['basis', 'winterspelen', 'piraten', 'kerst']));
    expect((await r.getTheme('piraten'))?.locations[0].backgroundImage.startsWith('/images/')).toBe(true);
  });

  it('volgorde: sort uit de themes-rij', async () => {
    const r = repo(source([row(dashboardTheme('kerst'), { sort: -1 })]));
    expect((await r.listThemes())[0].id).toBe('kerst');
  });
});

describe('terugvallen: de leerling-app breekt nooit door de beheer-backend', () => {
  it('Supabase niet ingesteld → alleen statisch', async () => {
    const ids = (await repo(null).listThemes()).map((t) => t.id);
    expect(ids.sort()).toEqual(['basis', 'piraten', 'winterspelen']);
  });

  it('migratie nog niet gedraaid → statisch, en niet elke keer opnieuw proberen', async () => {
    const s = source(new ThemeBackendMissingError('42P01'));
    const r = repo(s);
    expect((await r.listThemes()).map((t) => t.id)).toContain('winterspelen');
    await r.listThemes();
    await r.getTheme('winterspelen');
    expect(s.calls).toBe(1);
  });

  it('onbereikbaar → laatst geziene lijst uit de opslag (offline), anders statisch', async () => {
    const cache = memoryStore();
    await repo(source([row(dashboardTheme('kerst'))]), { cache }).listThemes();
    expect(cache.data.size).toBe(1);

    const offline = repo(source(new TypeError('Failed to fetch')), { cache });
    expect((await offline.listThemes()).map((t) => t.id)).toContain('kerst');
    expect((await offline.getTheme('kerst'))?.id).toBe('kerst');

    const noCache = repo(source(new TypeError('Failed to fetch')));
    expect((await noCache.listThemes()).map((t) => t.id)).not.toContain('kerst');
    expect((await noCache.getTheme('winterspelen'))?.id).toBe('winterspelen');
  });

  it('een kapotte offline-kopie wordt genegeerd', async () => {
    const cache = memoryStore();
    cache.set('soundscout:themes:published-v1', '{kapot');
    const r = repo(source(new Error('500')), { cache });
    expect((await r.listThemes()).map((t) => t.id)).toContain('basis');
  });

  it('alles onbereikbaar → listThemes faalt (de registry houdt dan de vorige lijst)', async () => {
    const failing: ThemeRepository = {
      listThemes: () => Promise.reject(new Error('offline')),
      getManifest: () => Promise.resolve(null),
      getTheme: () => Promise.resolve(null),
    };
    await expect(repo(source(new Error('offline')), { staticRepository: failing }).listThemes()).rejects.toThrow();
  });
});

describe('concept-voorbeeld in dit tabblad', () => {
  it('gaat voor op de gepubliceerde versie, en komt in de lijst', async () => {
    const draft = dashboardTheme('kerst', 3);
    const preview = { manifest: { ...draft, texts: { ...draft.texts, nl: { ...draft.texts.nl, name: 'Concept' } } }, url: versionFolderUrl(SUPA, 'kerst', 3) + 'manifest.json' };
    const r = repo(source([row(dashboardTheme('kerst', 2))]), { preview: () => preview });
    expect((await r.getManifest('kerst'))?.manifest.version).toBe(3);
    expect((await r.listThemes()).find((t) => t.id === 'kerst')?.version).toBe(3);
  });

  it('kan basis niet vervangen', async () => {
    const r = repo(null, { preview: () => ({ manifest: dashboardTheme('basis', 9), url: '/x/manifest.json' }) });
    expect((await r.getManifest('basis'))?.url).toBe('/themes/basis/manifest.json');
  });
});

describe('REST-bron', () => {
  const ok = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

  it('leest de view met de anon-sleutel en valideert het antwoord', async () => {
    const fetchImpl = ok([row(dashboardTheme('kerst'))]);
    const rows = await createRestPublishedSource({ supabaseUrl: `${SUPA}/`, anonKey: 'anon', fetchImpl }).list();
    expect(rows[0].id).toBe('kerst');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith(`${SUPA}/rest/v1/published_themes?select=`)).toBe(true);
    expect((init.headers as Record<string, string>).apikey).toBe('anon');
  });

  it('herkent een ontbrekende migratie (PostgREST 404 / PGRST205 / 42P01)', async () => {
    for (const fetchImpl of [
      ok({ code: 'PGRST205', message: "Could not find the table 'public.published_themes' in the schema cache" }, 404),
      ok({ code: '42P01', message: 'relation "public.published_themes" does not exist' }, 400),
    ]) {
      await expect(createRestPublishedSource({ supabaseUrl: SUPA, anonKey: 'a', fetchImpl }).list()).rejects.toBeInstanceOf(ThemeBackendMissingError);
    }
  });

  it('een onverwacht antwoord of serverfout is een gewone fout', async () => {
    await expect(createRestPublishedSource({ supabaseUrl: SUPA, anonKey: 'a', fetchImpl: ok({ niet: 'een lijst' }) }).list()).rejects.toThrow('onverwacht');
    await expect(createRestPublishedSource({ supabaseUrl: SUPA, anonKey: 'a', fetchImpl: ok({ message: 'boem' }, 500) }).list()).rejects.not.toBeInstanceOf(ThemeBackendMissingError);
  });
});
