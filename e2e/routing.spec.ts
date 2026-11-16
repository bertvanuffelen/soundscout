/**
 * Routing (V2 Fase 2) — de NIEUWE paden: elk scherm heeft een eigen adres,
 * Terug/Vooruit lopen door de bezochte schermen, en herladen op elk pad komt
 * op een zinnige plek uit. De oude links staan in url-contract.spec.ts.
 */
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

const START_BUTTON = 'Nieuwe soundscape';

async function mockSupabase(page: Page, fixtures: Record<string, unknown> = {}): Promise<void> {
  await page.route(/\/__e2e-supabase\//, async (route) => {
    const fn = route.request().url().match(/\/rpc\/([a-z_0-9]+)/)?.[1] ?? '';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fn in fixtures ? fixtures[fn] : []) });
  });
}

const path = (page: Page) => new URL(page.url()).pathname;

async function screen(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/stores/appStore.ts');
    return useAppStore.getState().currentScreen;
  });
}

async function expectStart(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  expect(path(page)).toBe('/');
}

/** Start → kaart → locatie → studio, met echte klikken. */
async function walkToStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: START_BUTTON }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: /De Stad/ }).click();
  await page.getByTitle('De Kinderboerderij').waitFor();
  await expect.poll(() => path(page)).toBe('/kaart');

  await page.getByTitle('De Kinderboerderij').click();
  await page.locator('button.hotspot').first().waitFor({ timeout: 20000 });
  await expect.poll(() => path(page)).toMatch(/^\/locatie\/.+/);

  await page.getByRole('button', { name: 'Naar Studio' }).click();
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
  await expect.poll(() => path(page)).toBe('/studio');
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
  await mockSupabase(page);
});

test('Terug en Vooruit lopen door de bezochte schermen: studio → locatie → kaart → start', async ({ page }) => {
  await walkToStudio(page);

  await page.goBack();
  await page.locator('button.hotspot').first().waitFor();
  expect(path(page)).toMatch(/^\/locatie\/.+/);
  expect(await screen(page)).toBe('location');

  await page.goBack();
  await page.getByTitle('De Kinderboerderij').waitFor();
  expect(path(page)).toBe('/kaart');
  expect(await screen(page)).toBe('map');

  await page.goBack();
  await expectStart(page);
  expect(await screen(page)).toBe('start');

  await page.goForward();
  await page.getByTitle('De Kinderboerderij').waitFor();
  expect(path(page)).toBe('/kaart');

  await page.goForward();
  await page.locator('button.hotspot').first().waitFor();
  await page.goForward();
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
  expect(path(page)).toBe('/studio');
  expect(await screen(page)).toBe('studio');
});

test('podium heeft een eigen pad en Terug gaat naar de studio', async ({ page }) => {
  await walkToStudio(page);
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/stores/appStore.ts');
    useAppStore.getState().goToStage();
  });
  await expect.poll(() => path(page)).toBe('/podium');
  await page.goBack();
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
  expect(path(page)).toBe('/studio');
});

test.describe('herladen', () => {
  for (const workPath of ['/kaart', '/locatie/kinderboerderij', '/studio', '/podium', '/nieuw', '/opdracht', '/praatplaat/plek']) {
    test(`${workPath} koud openen komt op het startscherm`, async ({ page }) => {
      await page.goto(workPath);
      await expectStart(page);
      expect(await screen(page)).toBe('start');
    });
  }

  test('herladen in de studio: startscherm met "Verder werken", het werk is er nog', async ({ page }) => {
    await walkToStudio(page);
    await page.evaluate(async () => {
      const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
      const { useThemeStore } = await import('/src/stores/themeStore.ts');
      useLibraryStore.getState().loadLibrary(useThemeStore.getState().getSamples().slice(0, 2));
    });
    await page.waitForTimeout(900); // werk-in-uitvoering wordt met vertraging bewaard
    await page.reload();
    await expectStart(page);
    const samples = await page.evaluate(async () => {
      const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
      return useLibraryStore.getState().librarySamples.length;
    });
    expect(samples).toBe(2);
  });

  const stable: Array<[string, string, RegExp | string]> = [
    ['/uitleg', 'tutorial', "Uitleg & video's — SoundScout"],
    ['/handleiding', 'teacher-guide', 'Docentenhandleiding — SoundScout'],
    ['/docent', 'teacher', 'Docenten Dashboard — SoundScout'],
    ['/composities', 'compositions', 'Mijn soundscapes — SoundScout'],
  ];
  for (const [stablePath, expectedScreen, title] of stable) {
    test(`${stablePath} is een instappunt en overleeft herladen`, async ({ page }) => {
      await page.goto(stablePath);
      await expect(page).toHaveTitle(title);
      expect(await screen(page)).toBe(expectedScreen);
      await page.reload();
      await expect(page).toHaveTitle(title);
      expect(path(page)).toBe(stablePath);
    });
  }
});

test.describe('gedeelde schermen op hun eigen pad', () => {
  test('/gedeeld/CODE opent de speler, ook na herladen', async ({ page }) => {
    await page.goto('/gedeeld/12345E67');
    await expect(page.getByText('Soundscape niet gevonden').first()).toBeVisible();
    await page.reload();
    await expect(page.getByText('Soundscape niet gevonden').first()).toBeVisible();
    expect(path(page)).toBe('/gedeeld/12345E67');
  });

  test('/album/CODE en /praatplaat/gedeeld/CODE', async ({ page }) => {
    await mockSupabase(page, { get_shared_class_album: null, get_shared_praatplaat: null });
    await page.goto('/album/ALBUM001');
    await expect(page.getByText('Album niet gevonden')).toBeVisible();
    await page.goto('/praatplaat/gedeeld/PPSHARE1');
    await expect(page.getByText('Praatplaat niet gevonden')).toBeVisible();
  });

  test('een oude link komt op het nieuwe pad uit; Terug verlaat de speler niet naar een lege stap', async ({ page }) => {
    await page.goto('/?share=ABCD2345');
    await expect(page.getByText('Soundscape niet gevonden').first()).toBeVisible();
    expect(path(page)).toBe('/gedeeld/ABCD2345');
    await page.getByRole('button', { name: /Terug/ }).first().click();
    await expectStart(page);
  });

  test('een oude link werkt ook op een nieuw pad (bv. gekopieerd vanaf /docent)', async ({ page }) => {
    await page.goto('/docent?album=ALBUM001');
    await expect.poll(() => path(page)).toBe('/album/ALBUM001');
  });
});

test('het thema blijft in het adres staan bij elke schermwissel', async ({ page }) => {
  await page.goto('/?theme=winterspelen');
  await page.getByRole('button', { name: START_BUTTON }).waitFor();
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/stores/appStore.ts');
    useAppStore.getState().goToMap();
  });
  await expect.poll(() => page.url()).toContain('/kaart?theme=winterspelen');
  await page.goBack();
  await expect.poll(() => page.url()).toContain('/?theme=winterspelen');
});

test('schermwissel gebruikt een View Transition, en niet bij "minder beweging"', async ({ page, browser }) => {
  const count = async (p: Page) => {
    await p.addInitScript(() => {
      const w = window as unknown as { __vt: number };
      w.__vt = 0;
      const original = document.startViewTransition?.bind(document);
      if (!original) return;
      document.startViewTransition = ((arg: Parameters<typeof original>[0]) => {
        w.__vt += 1;
        return original(arg);
      }) as typeof document.startViewTransition;
    });
    await p.goto('/');
    await p.getByRole('button', { name: START_BUTTON }).waitFor();
    await p.evaluate(() => { (window as unknown as { __vt: number }).__vt = 0; });
    await p.evaluate(async () => {
      const { useAppStore } = await import('/src/stores/appStore.ts');
      useAppStore.getState().goToTutorial();
    });
    // De titel volgt de store en loopt dus een fractie voor op de router:
    // wacht op het pad én op het scherm zelf.
    await expect.poll(() => path(p)).toBe('/uitleg');
    await expect(p.getByRole('heading', { name: "Uitleg & video's" }).first()).toBeVisible();
    return p.evaluate(() => (window as unknown as { __vt: number }).__vt);
  };

  expect(await count(page)).toBe(1);

  const reduced = await browser.newContext({ reducedMotion: 'reduce', locale: 'nl-NL' });
  const reducedPage = await reduced.newPage();
  await prepare(reducedPage);
  await mockSupabase(reducedPage);
  expect(await count(reducedPage)).toBe(0);
  await reduced.close();
});
