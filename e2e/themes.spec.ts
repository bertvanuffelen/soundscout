/**
 * Themaplatform (V2 Fase 3): thema's komen uit manifesten in public/themes/.
 * Zie docs/v2/THEMES.md.
 *
 *  - /?theme=winterspelen laadt het winterthema uit zijn manifest (kaart + locaties);
 *  - de themakiezer toont dezelfde thema's als vóór Fase 3 (piraten verborgen);
 *  - een thema dat alleen in de (vernieuwde) index staat, verschijnt in de kiezer
 *    zonder codewijziging, en een seizoensthema buiten seizoen niet.
 *
 * De seizoensbadge voor docenten zit achter de login: die staat in
 * src/themes/__tests__/registry.test.ts. Offline: e2e/sw/offline.sw.ts (h).
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

const START_BUTTON = 'Nieuwe soundscape';

async function openThemePicker(page: Page): Promise<void> {
  await page.getByRole('button', { name: START_BUTTON }).click();
  await page.getByText('Hoe wil je componeren?').waitFor();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByText('Kies je wereld').waitFor();
}

/** Thema-namen in de kiezer, in volgorde. */
async function pickerThemes(page: Page): Promise<string[]> {
  const dialog = page.getByRole('dialog');
  return dialog.locator('h3').allInnerTexts();
}

function mmdd(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('/?theme=winterspelen laadt de winterkaart uit het manifest', async ({ page }) => {
  const manifestRequest = page.waitForRequest((r) => new URL(r.url()).pathname === '/themes/winterspelen/manifest.json');
  await page.goto('/?theme=winterspelen');
  await manifestRequest;
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();

  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/stores/appStore.ts');
    useAppStore.getState().goToMap();
  });
  await expect(page.locator('img[src="/images/themes/winterspelen/plattegrond.jpg"]')).toBeVisible();
  // De vier winterlocaties staan op de kaart (namen uit de manifest-teksten)
  for (const name of ['Winterdorp', 'Bobslee baan', 'Skipiste', 'IJsarena']) {
    await expect(page.getByTitle(name, { exact: true }).first()).toBeVisible();
  }
});

test('de themakiezer toont dezelfde thema\'s als voorheen; piraten blijft verborgen', async ({ page }) => {
  await page.goto('/');
  await openThemePicker(page);
  expect(await pickerThemes(page)).toEqual(['De Stad', 'Winterspelen']);
});

test('een nieuw thema in de index verschijnt zonder code; buiten seizoen niet', async ({ page }) => {
  const index = JSON.parse(readFileSync('public/themes/index.json', 'utf8'));
  const winter = index.themes.find((t: { id: string }) => t.id === 'winterspelen');
  const today = new Date();
  const later = new Date(today.getTime() + 40 * 24 * 3600 * 1000);
  const muchLater = new Date(today.getTime() + 80 * 24 * 3600 * 1000);
  const variant = (id: string, name: string, season: { from: string; until: string }, sort: number) => ({
    ...winter,
    id,
    sort,
    season,
    manifest: `${id}/manifest.json`,
    texts: { nl: { ...winter.texts.nl, name }, en: { ...winter.texts.en, name } },
  });
  index.themes.push(
    variant('testseizoen', 'Testseizoen', { from: mmdd(today), until: mmdd(today) }, 40),
    variant('buitenseizoen', 'Buiten seizoen', { from: mmdd(later), until: mmdd(muchLater) }, 50),
  );
  await page.route('**/themes/index.json', (route) => route.fulfill({ json: index }));

  await page.goto('/');
  // De index wordt bij het starten op de achtergrond ververst
  await expect.poll(() => page.evaluate(async () => {
    const { getThemeSummary } = await import('/src/data/themes/index.ts');
    return !!getThemeSummary('testseizoen');
  })).toBe(true);

  await openThemePicker(page);
  expect(await pickerThemes(page)).toEqual(['De Stad', 'Winterspelen', 'Testseizoen']);
});
