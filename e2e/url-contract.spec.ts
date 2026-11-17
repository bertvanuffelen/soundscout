/**
 * URL-contract (V2 Fase 2) — elke link, deelcode en QR-code die vandaag werkt,
 * moet blijven werken. Zie docs/v2/URL-CONTRACT.md voor de volledige tabel.
 *
 * Deze suite is geschreven tegen de code ZONDER router en moet daarna, met de
 * router, ongewijzigd blijven slagen. De beweringen gaan daarom over wat de
 * gebruiker merkt: welk scherm verschijnt, dat de parameter is "verbruikt"
 * (niet meer in de adresbalk), en wat de app ermee heeft gedaan (appStore).
 *
 * Supabase bestaat hier niet: de RPC-aanroepen worden onderschept. Een lege
 * lijst = "niet gevonden"; waar het kan krijgt een test een minimale fixture.
 */
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

const START_BUTTON = 'Nieuwe soundscape';

type RpcFixtures = Record<string, unknown>;

/** Onderschep alle Supabase-RPC's; onbekende functies geven een lege lijst. */
async function mockSupabase(page: Page, fixtures: RpcFixtures = {}): Promise<string[]> {
  const calls: string[] = [];
  await page.route(/\/__e2e-supabase\//, async (route) => {
    const match = route.request().url().match(/\/rpc\/([a-z_0-9]+)/);
    const fn = match?.[1] ?? '';
    calls.push(fn);
    const body = fn in fixtures ? fixtures[fn] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return calls;
}

interface AppSnapshot {
  currentScreen: string;
  shareCode: string | null;
  sharedPraatplaatCode: string | null;
  sharedAlbumCode: string | null;
  pendingLessonCardKey: string | null;
  pendingTeacherTab: string | null;
  pendingSaveCode: string | null;
  themeId: string;
}

async function appState(page: Page): Promise<AppSnapshot> {
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/stores/appStore.ts');
    const { useThemeStore } = await import('/src/stores/themeStore.ts');
    const s = useAppStore.getState();
    return {
      currentScreen: s.currentScreen,
      shareCode: s.shareCode,
      sharedPraatplaatCode: s.sharedPraatplaatCode,
      sharedAlbumCode: s.sharedAlbumCode,
      pendingLessonCardKey: s.pendingLessonCardKey,
      pendingTeacherTab: s.pendingTeacherTab,
      pendingSaveCode: s.pendingSaveCode,
      themeId: useThemeStore.getState().activeThemeId,
    };
  });
}

function params(page: Page): URLSearchParams {
  return new URL(page.url()).searchParams;
}

async function expectStart(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

// --- Startscherm en paden ---

test.describe('startscherm', () => {
  for (const path of ['/', '/index.html', '/dit-pad-bestaat-niet']) {
    test(`${path} toont het startscherm`, async ({ page }) => {
      await mockSupabase(page);
      await page.goto(path);
      await expectStart(page);
      await expect(page).toHaveTitle('SoundScout');
      expect((await appState(page)).currentScreen).toBe('start');
    });
  }
});

// --- ?theme= ---

test.describe('?theme=', () => {
  test('laadt het thema en blijft in de adresbalk staan, ook na navigeren', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/?theme=winterspelen');
    await expectStart(page);
    expect((await appState(page)).themeId).toBe('winterspelen');
    expect(params(page).get('theme')).toBe('winterspelen');

    // Na een schermwissel leest de app het thema nog steeds uit de adresbalk
    // (ThemePicker, workInProgress): de parameter mag dus niet verdwijnen.
    await page.evaluate(async () => {
      const { useAppStore } = await import('/src/stores/appStore.ts');
      useAppStore.getState().goToMap();
    });
    await expect.poll(async () => (await appState(page)).currentScreen).toBe('map');
    await expect.poll(() => params(page).get('theme')).toBe('winterspelen');
    expect((await appState(page)).themeId).toBe('winterspelen');
  });

  test('onbekend thema valt terug op het standaardthema', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/?theme=bestaat-niet');
    await expectStart(page);
    expect((await appState(page)).themeId).toBe('basis');
  });
});

// --- ?dev=true ---

test('?dev=true zet de ontwikkelvlaggen aan en verdwijnt uit de adresbalk', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/?dev=true&theme=winterspelen');
  await expectStart(page);
  await expect.poll(() => params(page).has('dev')).toBe(false);
  expect(params(page).get('theme')).toBe('winterspelen');
  const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('soundscout:dev-flags') ?? '{}'));
  expect(flags).toMatchObject({ sections: true, templates: true });
});

// --- ?share= (deellink van een soundscape, 8 tekens) ---

test.describe('?share=', () => {
  test('onbekende code: speler met "niet gevonden", terug gaat naar start', async ({ page }) => {
    const calls = await mockSupabase(page);
    await page.goto('/?share=12345E67');
    await expect(page.getByText('Soundscape niet gevonden').first()).toBeVisible();
    await expect.poll(() => params(page).has('share')).toBe(false);
    const state = await appState(page);
    expect(state.currentScreen).toBe('shared');
    // De code moet letterlijk overkomen (12345E67 is geen getal 1.2345e71)
    expect(state.shareCode).toBe('12345E67');
    expect(calls).toContain('get_shared_composition');

    await page.getByRole('button', { name: /Terug/ }).first().click();
    await expectStart(page);
  });

  test('de code werkt ook met een thema-parameter erbij', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/?theme=winterspelen&share=ABCD2345');
    await expect(page.getByText('Soundscape niet gevonden').first()).toBeVisible();
    expect((await appState(page)).shareCode).toBe('ABCD2345');
    expect(params(page).has('share')).toBe(false);
  });
});

// --- ?pp-share= (publieke praatplaat) ---

test.describe('?pp-share=', () => {
  test('onbekende code: "Praatplaat niet gevonden"', async ({ page }) => {
    const calls = await mockSupabase(page, { get_shared_praatplaat: null });
    await page.goto('/?pp-share=PPSHARE1');
    await expect(page.getByText('Praatplaat niet gevonden')).toBeVisible();
    await expect.poll(() => params(page).has('pp-share')).toBe(false);
    const state = await appState(page);
    expect(state.currentScreen).toBe('shared-praatplaat');
    expect(state.sharedPraatplaatCode).toBe('PPSHARE1');
    expect(calls).toContain('get_shared_praatplaat');
  });

  test('bestaande praatplaat: wacht op "Luister naar de praatplaat"', async ({ page }) => {
    await mockSupabase(page, {
      get_shared_praatplaat: {
        praatplaat: { id: 'pp-1', name: 'De haven', image_url: '/images/overige/og-image.jpg', theme_id: 'basis', location_id: '' },
        submissions: [],
      },
    });
    await page.goto('/?pp-share=PPSHARE2');
    await expect(page.getByRole('button', { name: 'Luister naar de praatplaat' })).toBeVisible();
    expect(params(page).has('pp-share')).toBe(false);
  });
});

// --- ?album= (klas-album) ---

test.describe('?album=', () => {
  test('onbekende code: "Album niet gevonden"', async ({ page }) => {
    const calls = await mockSupabase(page, { get_shared_class_album: null });
    await page.goto('/?album=ALBUM001');
    await expect(page.getByText('Album niet gevonden')).toBeVisible();
    await expect.poll(() => params(page).has('album')).toBe(false);
    const state = await appState(page);
    expect(state.currentScreen).toBe('shared-album');
    expect(state.sharedAlbumCode).toBe('ALBUM001');
    expect(calls).toContain('get_shared_class_album');
  });

  test('bestaand album: wacht op "Open het album"', async ({ page }) => {
    await mockSupabase(page, {
      get_shared_class_album: {
        class_name: 'Groep 7b', assignment_type: 'free', assignment_name: null,
        image_url: null, storyboard_ref: null, free_theme_id: 'basis', submissions: [],
      },
    });
    await page.goto('/?album=ALBUM002');
    await expect(page.getByText('Groep 7b')).toBeVisible();
    expect(params(page).has('album')).toBe(false);
    expect((await appState(page)).currentScreen).toBe('shared-album');
  });
});

// --- ?pp= (klascode-link / QR van de docent) ---

test.describe('?pp=', () => {
  test('klas met een opdracht: de opdracht-landing verschijnt', async ({ page }) => {
    await mockSupabase(page, {
      get_active_assignment: [{
        assignment_type: 'free',
        payload: { free_theme_id: 'basis' },
        card: null,
        class_id: '00000000-0000-0000-0000-000000000001',
        class_name: 'Groep 6a',
      }],
    });
    await page.goto('/?pp=0042');
    await expect(page.getByRole('button', { name: 'Starten' })).toBeVisible();
    await expect(page.getByText('Groep 6a')).toBeVisible();
    expect(params(page).has('pp')).toBe(false);
    expect((await appState(page)).currentScreen).toBe('assignment-landing');
  });

  test('klas zonder opdracht: landing met "Nog geen opdracht klaar"', async ({ page }) => {
    await mockSupabase(page, {
      get_active_assignment: [],
      get_class_by_code: [{ id: 'c1', name: 'Groep 6a', teacher_name: 'Juf' }],
    });
    await page.goto('/?pp=1234');
    await expect(page.getByText('Nog geen opdracht klaar')).toBeVisible();
    expect(params(page).has('pp')).toBe(false);
  });

  test('onbekende klascode: terug op het startscherm', async ({ page }) => {
    const calls = await mockSupabase(page, { get_active_assignment: [], get_class_by_code: [] });
    await page.goto('/?pp=9999');
    await expect.poll(() => calls.includes('get_class_by_code')).toBe(true);
    await expectStart(page);
    expect(params(page).has('pp')).toBe(false);
    expect((await appState(page)).currentScreen).toBe('start');
  });
});

// --- ?screen=teacher (brug vanaf /teacher en /les/<key>/) ---

test.describe('?screen=teacher', () => {
  test('opent het docentenscherm (inloggen)', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/?screen=teacher');
    await expect(page).toHaveTitle('Docenten Dashboard — SoundScout');
    await expect(page.getByRole('button', { name: 'Inloggen' })).toBeVisible();
    expect(params(page).has('screen')).toBe(false);
    expect((await appState(page)).currentScreen).toBe('teacher');
  });

  test('&lesson= en &tab= overleven de inlog-hop', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/?screen=teacher&lesson=drumbeat&tab=lessons');
    await expect(page).toHaveTitle('Docenten Dashboard — SoundScout');
    const state = await appState(page);
    expect(state.currentScreen).toBe('teacher');
    expect(state.pendingLessonCardKey).toBe('drumbeat');
    expect(state.pendingTeacherTab).toBe('lessons');
    for (const key of ['screen', 'lesson', 'tab']) expect(params(page).has(key)).toBe(false);
  });
});

// --- ?screen=teacher-guide ---

test('?screen=teacher-guide&section= opent de docentenhandleiding', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/?screen=teacher-guide&section=sequencer');
  await expect(page).toHaveTitle('Docentenhandleiding — SoundScout');
  await expect(page.getByRole('heading', { name: 'Docentenhandleiding' }).first()).toBeVisible();
  for (const key of ['screen', 'section']) expect(params(page).has(key)).toBe(false);
  expect((await appState(page)).currentScreen).toBe('teacher-guide');
});

// --- Wachtwoord-reset (e-maillink van Supabase) ---

test.describe('wachtwoord-reset', () => {
  /** Leg elke adresbalk-wijziging vast, zodat we zien of de #hash blijft staan. */
  async function recordHistoryWrites(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const log: string[] = [];
      (window as unknown as { __historyWrites: string[] }).__historyWrites = log;
      for (const name of ['pushState', 'replaceState'] as const) {
        const original = history[name].bind(history);
        history[name] = (state: unknown, unused: string, url?: string | URL | null) => {
          original(state, unused, url);
          log.push(window.location.href);
        };
      }
    });
  }

  test('?screen=reset-password opent het reset-formulier op het docentenscherm', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/?screen=reset-password');
    await expect(page.getByRole('heading', { name: /Nieuw wachtwoord|Link verlopen/ })).toBeVisible();
    expect(params(page).has('screen')).toBe(false);
    expect((await appState(page)).currentScreen).toBe('teacher');
  });

  test('het recovery-token in de #hash blijft staan als de app de adresbalk opschoont', async ({ page }) => {
    await mockSupabase(page);
    await recordHistoryWrites(page);
    const hash = '#access_token=fake-token&refresh_token=fake&expires_in=3600&token_type=bearer&type=recovery';
    await page.goto(`/?screen=reset-password${hash}`);
    await expect(page.getByRole('heading', { name: /Nieuw wachtwoord|Link verlopen/ })).toBeVisible();
    expect((await appState(page)).currentScreen).toBe('teacher');
    const writes = await page.evaluate(() => (window as unknown as { __historyWrites: string[] }).__historyWrites);
    // De eerste schrijfactie die ?screen= weghaalt is van de app zelf (Supabase
    // komt later, lazy): die mag het token niet meenemen.
    const cleaned = writes.find((href) => !href.includes('screen=reset-password'));
    expect(cleaned).toBeDefined();
    expect(cleaned).toContain('access_token=fake-token');
    // En geen enkele schrijfactie vóór die opschoning mag het token kwijt zijn
    for (const href of writes.slice(0, writes.indexOf(cleaned!) + 1)) {
      expect(href).toContain('access_token=fake-token');
    }
  });

  test('alleen een #hash met type=recovery (zonder ?screen=) werkt ook', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/#access_token=fake-token&refresh_token=fake&expires_in=3600&token_type=bearer&type=recovery');
    await expect(page.getByRole('heading', { name: /Nieuw wachtwoord|Link verlopen/ })).toBeVisible();
    expect((await appState(page)).currentScreen).toBe('teacher');
  });

  test('verlopen link (#error_code=otp_expired) komt op het docentenscherm', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/#error=access_denied&error_code=otp_expired&error_description=expired');
    await expect(page.getByRole('heading', { name: /Nieuw wachtwoord|Link verlopen/ })).toBeVisible();
    expect((await appState(page)).currentScreen).toBe('teacher');
  });
});

// --- #code= ("mee naar huis"-link en QR met een bewaarcode) ---

test.describe('#code=', () => {
  test('opent het codevenster op het startscherm, zoekt de code op en wist de hash', async ({ page }) => {
    const calls = await mockSupabase(page, { load_saved_composition: [] });
    await page.goto('/#code=abc123');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('input').first()).toHaveValue('ABC123');
    await expect.poll(() => calls.includes('load_saved_composition')).toBe(true);
    expect(new URL(page.url()).hash).toBe('');
    expect((await appState(page)).currentScreen).toBe('start');
  });

  test('een ongeldige hash doet niets', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/#code=te-lang-1234');
    await expectStart(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

// --- Losse pagina's met eigen HTML ---

test.describe('losse pagina\'s', () => {
  for (const path of ['/teacher', '/teacher.html']) {
    test(`${path} toont de docentenpagina`, async ({ page }) => {
      await mockSupabase(page);
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('button', { name: START_BUTTON })).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }

  for (const path of ['/over', '/over.html']) {
    test(`${path} toont de Over-pagina`, async ({ page }) => {
      await mockSupabase(page);
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('link', { name: /docent/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: START_BUTTON })).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }

  test('/over → "naar de app" en het startscherm → /teacher zijn gewone paginawissels', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await expectStart(page);
    await page.getByRole('button', { name: /docent/i }).first().click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/teacher');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

// --- Alleen in ontwikkeling ---

test.describe('dev-routes', () => {
  test('/sequencer toont het sequencer-lab', async ({ page }) => {
    await page.goto('/sequencer');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('button', { name: START_BUTTON })).toHaveCount(0);
  });

  test('/editor toont de authoring-tools', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('button, h1, h2').first()).toBeVisible();
    await expect(page.getByRole('button', { name: START_BUTTON })).toHaveCount(0);
  });

  test('/v2-mockup toont de mockup', async ({ page }) => {
    await page.goto('/v2-mockup');
    await expect(page.getByRole('button', { name: 'Mockup-paneel' })).toBeVisible();
  });
});

// --- Statische bestanden (worden niet door de app afgehandeld) ---

test.describe('statische pagina\'s', () => {
  for (const key of ['drumbeat', 'robotfabriek', 'verspringen', 'vrij-basis']) {
    test(`/les/${key}/ is pure HTML met een deeplink naar het dashboard`, async ({ request }) => {
      const response = await request.get(`/les/${key}/index.html`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain(`href="/?screen=teacher&amp;lesson=${key}"`);
      expect(html).not.toContain('id="root"');
    });
  }

  for (const path of ['/privacy/index.html', '/privacy/en/index.html', '/animaties/onboarding-4-stappen.html', '/animaties/reis-van-een-geluid.html', '/animaties/sequencer-ritme-melodie.html', '/animaties/klascode-op-het-bord.html', '/animaties/feedback-cirkel.html']) {
    test(`${path} wordt als bestand geserveerd`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(await response.text()).not.toContain('id="root"');
    });
  }

  test('sitemap.xml noemt de leskaart-pagina\'s', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('https://soundscout.nl/les/drumbeat');
  });
});

// --- Terugknop ---

test('de terugknop van de browser blijft binnen de app (kaart → start)', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/');
  await expectStart(page);
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/stores/appStore.ts');
    useAppStore.getState().goToMap();
  });
  await expect(page.getByTitle('De Kinderboerderij')).toBeVisible();
  await page.goBack();
  await expectStart(page);
  expect((await appState(page)).currentScreen).toBe('start');
});
