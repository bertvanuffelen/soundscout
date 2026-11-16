import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import i18n from '../../i18n';
import { ThemeIndexSchema, ThemeManifestSchema, type ThemeIndex, type ThemeManifest } from '../manifest';
import { manifestToIndexEntry, manifestToThemeConfig, resolveAsset, resolveAssetBase } from '../mapping';
import { createStaticThemeRepository, parseManifest } from '../repository';
import { setThemeRepository, getThemeSummaries, refreshThemeIndex, getLoadedTheme } from '../registry';
import {
  getPublicThemes,
  getTeacherThemes,
  getAssignableThemes,
  getThemeSeasonInfo,
  loadTheme,
  isValidTheme,
} from '../../data/themes';
import { useThemeStore } from '../../stores/themeStore';

const read = (path: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'themes', path), 'utf8'));
const realIndex = ThemeIndexSchema.parse(read('index.json'));
const winter = ThemeManifestSchema.parse(read('winterspelen/manifest.json'));

/** Een seizoensthema op basis van winterspelen (eigen id, eigen teksten, relatieve paden). */
function seasonal(): ThemeManifest {
  return {
    ...winter,
    id: 'sinterklaas',
    sort: 40,
    season: { from: '11-15', until: '12-06' },
    assetBase: undefined,
    texts: { ...winter.texts, nl: { ...winter.texts.nl, name: 'Sinterklaas' }, en: { ...winter.texts.en, name: 'Saint Nicholas' } },
  };
}

function fakeRepository(extra: ThemeManifest[]) {
  const index: ThemeIndex = {
    schemaVersion: 1,
    themes: [...realIndex.themes, ...extra.map((m) => manifestToIndexEntry(m, `${m.id}/manifest.json`))],
  };
  const files: Record<string, unknown> = { '/themes/index.json': index };
  for (const m of extra) files[`/themes/${m.id}/manifest.json`] = m;
  const fetchJson = vi.fn(async (url: string) => {
    if (url in files) return files[url];
    return read(url.replace('/themes/', ''));
  });
  return { fetchJson, repo: createStaticThemeRepository({ fetchJson, bundled: [] }) };
}

describe('mediapaden', () => {
  it('lost relatieve paden op tegen assetBase of tegen de map van het manifest', () => {
    expect(resolveAsset(resolveAssetBase('/themes/basis/manifest.json', '/'), 'audio/x.mp3')).toBe('/audio/x.mp3');
    expect(resolveAsset(resolveAssetBase('/themes/sint/v2/manifest.json', undefined), 'audio/derived/x.mp3')).toBe('/themes/sint/v2/audio/derived/x.mp3');
    expect(resolveAsset(resolveAssetBase('/themes/sint/manifest.json', '../../media/'), 'a.mp3')).toBe('/media/a.mp3');
    expect(resolveAsset(resolveAssetBase('https://cdn.example/themes/sint/v1/manifest.json', undefined), 'images/a.webp'))
      .toBe('https://cdn.example/themes/sint/v1/images/a.webp');
    expect(resolveAsset('/themes/x/', '/audio/absoluut.mp3')).toBe('/audio/absoluut.mp3');
  });

  it('een manifest zonder assetBase (zoals een .sspack) krijgt paden onder zijn eigen map', () => {
    const config = manifestToThemeConfig(seasonal(), '/themes/sinterklaas/manifest.json');
    expect(config.samples[0].audioUrl).toBe(`/themes/sinterklaas/${winter.samples[0].file}`);
  });
});

describe('loader', () => {
  it('weigert een manifest met een integriteitsfout', () => {
    const broken = structuredClone(winter);
    broken.locations[0].hotspots[0].sampleId = 'bestaat-niet';
    expect(() => parseManifest(broken, 'test')).toThrow(/onbekende sample/);
  });

  it('weigert JSON die niet aan het schema voldoet', () => {
    expect(() => parseManifest({ ...winter, version: 'een' }, 'test')).toThrow(/ongeldig manifest/);
  });
});

describe('register met een nieuw (seizoens)thema uit een map', () => {
  const { repo, fetchJson } = fakeRepository([seasonal()]);

  beforeEach(async () => {
    setThemeRepository(repo);
    await refreshThemeIndex();
  });

  afterAll(() => setThemeRepository(createStaticThemeRepository({ bundled: [] })));

  it('verschijnt in de lijst na het verversen van de index, met teksten in i18n', () => {
    expect(getThemeSummaries().map((s) => s.id)).toEqual(['basis', 'winterspelen', 'piraten', 'sinterklaas']);
    expect(isValidTheme('sinterklaas')).toBe(true);
    expect(i18n.t('themes.sinterklaas.name', { lng: 'nl' })).toBe('Sinterklaas');
    expect(i18n.t('themes.sinterklaas.name', { lng: 'en' })).toBe('Saint Nicholas');
  });

  it('buiten seizoen: weg uit leerling-kiezers, wél bij docenten met seizoensbadge', () => {
    vi.useFakeTimers({ now: new Date(2026, 6, 1) }); // 1 juli
    try {
      expect(getPublicThemes().map((t) => t.id)).not.toContain('sinterklaas');
      expect(getAssignableThemes().map((t) => t.id)).not.toContain('sinterklaas');
      expect(getTeacherThemes().map((t) => t.id)).toContain('sinterklaas');
      expect(getThemeSeasonInfo('sinterklaas')).toEqual({ inSeason: false, returnsInMonth: 11 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('in seizoen: ook voor leerlingen zichtbaar', () => {
    vi.useFakeTimers({ now: new Date(2026, 11, 1) }); // 1 december
    try {
      expect(getPublicThemes().map((t) => t.id)).toContain('sinterklaas');
      expect(getThemeSeasonInfo('sinterklaas').inSeason).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('piraten blijft verborgen (isPublic: false) maar laadbaar', async () => {
    expect(getPublicThemes().map((t) => t.id)).not.toContain('piraten');
    expect(getTeacherThemes().map((t) => t.id)).not.toContain('piraten');
    expect(await loadTheme('piraten')).toBeDefined();
  });

  it('laadt een manifest één keer, ook bij gelijktijdige aanvragen', async () => {
    fetchJson.mockClear();
    const [a, b] = await Promise.all([loadTheme('sinterklaas'), loadTheme('sinterklaas')]);
    expect(a).toBe(b);
    expect(fetchJson.mock.calls.filter(([url]) => url.endsWith('sinterklaas/manifest.json'))).toHaveLength(1);
    expect(getLoadedTheme('sinterklaas')?.samples.length).toBe(winter.samples.length);
    expect(i18n.t(getLoadedTheme('sinterklaas')!.samples[0].name, { lng: 'nl' })).toBe(winter.texts.nl.samples[winter.samples[0].id]);
  });
});

describe('themeStore', () => {
  beforeEach(() => setThemeRepository(createStaticThemeRepository({ bundled: [] })));

  it('setTheme wacht op het manifest en zet daarna het thema actief', async () => {
    await useThemeStore.getState().setTheme('winterspelen');
    expect(useThemeStore.getState().activeThemeId).toBe('winterspelen');
    expect(useThemeStore.getState().getLocations().map((l) => l.id)).toEqual(winter.locations.map((l) => l.id));
  });

  it('een onbekend thema laat het huidige thema staan', async () => {
    await useThemeStore.getState().setTheme('basis');
    await useThemeStore.getState().setTheme('bestaat-niet');
    expect(useThemeStore.getState().activeThemeId).toBe('basis');
  });

  it('bij twee snelle keuzes wint de laatste', async () => {
    const first = useThemeStore.getState().setTheme('piraten');
    const second = useThemeStore.getState().setTheme('basis');
    await Promise.all([first, second]);
    expect(useThemeStore.getState().activeThemeId).toBe('basis');
  });
});
