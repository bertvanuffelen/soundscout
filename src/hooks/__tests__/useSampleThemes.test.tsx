/**
 * Geluidsnamen van niet-basis-thema's in docentweergaven: zonder het thema te
 * laden stond de ruwe sleutel in beeld ("themes.sinterklaas.samples.…").
 * Tegen het echte manifest (src/test/setup.ts leest public/themes/).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import * as registry from '../../themes/registry';
import { useSampleThemes, themeIdsFromSamples } from '../useSampleThemes';
import { ThemeManifestSchema, type ThemeManifest } from '../../themes/manifest';

// Een thema dat alleen als manifest bestaat (zoals sinterklaas): de namen
// staan dan níet in de meegebundelde vertaalbestanden. Winterspelen is hier
// onder een ander id gezet, zodat de test het echte manifestformaat gebruikt.
const winter = ThemeManifestSchema.parse(
  JSON.parse(readFileSync(join(process.cwd(), 'public/themes/winterspelen/manifest.json'), 'utf8')),
);
const proef: ThemeManifest = { ...winter, id: 'proefthema' };
const KEY = 'themes.proefthema.samples.winterdorp-wakingup';

beforeAll(() => {
  registry.setThemeRepository({
    listThemes: async () => [],
    getManifest: async (id) => (id === 'proefthema' ? { manifest: proef, url: '/themes/proefthema/manifest.json' } : null),
    getTheme: async () => null,
  });
});
afterAll(() => registry.setThemeRepository(registry.createDefaultStaticRepository()));

function Names({ names }: { names: string[] }) {
  const { t } = useTranslation();
  useSampleThemes(names.map((name) => ({ name })));
  return <ul>{names.map((name) => <li key={name}>{t(name)}</li>)}</ul>;
}

describe('themeIdsFromSamples', () => {
  it('haalt unieke thema-ids uit de naam-sleutels; de rest telt niet mee', () => {
    expect(themeIdsFromSamples([
      { name: 'themes.piraten.samples.a' },
      { name: 'themes.piraten.samples.b' },
      { name: 'themes.basis.samples.c' },
      { name: 'Eigen opname' },
      { name: 'themes.piraten.name' },
      { name: null },
      null,
    ])).toEqual(['basis', 'piraten']);
    expect(themeIdsFromSamples(null)).toEqual([]);
  });
});

describe('useSampleThemes', () => {
  it('laadt het thema en toont daarna de geluidsnaam in plaats van de sleutel', async () => {
    expect(registry.getLoadedTheme('proefthema')).toBeUndefined();
    render(<Names names={[KEY]} />);
    // Eerst de ruwe sleutel (thema nog niet geladen) …
    expect(screen.getByText(KEY)).toBeTruthy();
    // … daarna vanzelf de echte naam, zonder dat de ouder opnieuw tekent
    await waitFor(() => expect(screen.queryByText(KEY)).toBeNull());
    expect(registry.getLoadedTheme('proefthema')).toBeDefined();
    expect(screen.getByRole('listitem').textContent).not.toMatch(/^themes\./);
  });

  it('laadt een geladen thema niet opnieuw en struikelt niet over een onbekend thema', async () => {
    const spy = vi.spyOn(registry, 'loadTheme');
    render(<Names names={[KEY, 'themes.basis.samples.x', 'themes.bestaat-niet.samples.y']} />);
    await waitFor(() => expect(spy).toHaveBeenCalledWith('bestaat-niet'));
    expect(spy).not.toHaveBeenCalledWith('proefthema');
    expect(spy).not.toHaveBeenCalledWith('basis');
    // Onbekend thema: de naam blijft zoals hij was, geen fout
    expect(screen.getByText('themes.bestaat-niet.samples.y')).toBeTruthy();
    spy.mockRestore();
  });
});
