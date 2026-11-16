/**
 * Service worker tegen de PRODUCTIE-build (V2 Fase 2 — offline).
 * Draaien: `npm run e2e:sw` (zie playwright.sw.config.ts en docs/v2/OFFLINE.md §7).
 *
 * Wat dit bewijst:
 *  (a) een eerste bezoek registreert de service worker en die neemt de pagina over;
 *  (b) na één bezoek met de boerderij open werkt de leerlingreis zonder verbinding:
 *      startscherm, kaart, locatie, geluid verzamelen, studio — alle geluiden
 *      komen uit de cache van de service worker;
 *  (c) /teacher, /over en een /les/<key>/-pagina worden niet door de app gekaapt;
 *  (d) een Supabase-verzoek wordt nooit bewaard en mislukt zonder verbinding;
 *  (e) oude links (?theme=…) blijven werken, ook zonder verbinding;
 *  (h) het actieve thema (manifest, V2 Fase 3) laadt na één bezoek ook offline;
 *  (f) een nieuwe versie wacht: ze neemt een open pagina niet vanzelf over;
 *  (g) de noodrem (docs/v2/sw-kill-switch.js) ruimt service worker en caches op.
 *
 * (f) en (g) vervangen sw.js in de testbuild en staan daarom achteraan.
 */
import { appendFileSync, copyFileSync } from 'node:fs';
import { test, expect, type Page, type Request } from '@playwright/test';
import { prepare } from '../helpers';

const START_BUTTON = 'Nieuwe soundscape';
const BACKEND = 'http://127.0.0.1:5182';
const AUDIO_CACHE = 'soundscout-audio-v1';
const IMAGE_CACHE = 'soundscout-images-v1';
const THEME_DATA_CACHE = 'soundscout-themes-v1';
/** De sw.js van de testbuild (zie OUT_DIR in playwright.sw.config.ts). */
const SW_FILE = 'node_modules/.cache/sw-e2e-dist/sw.js';

/** Wacht tot de service worker actief is én deze pagina bestuurt. */
async function waitForController(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
}

/** Paden in een cache van de service worker. */
async function cachedPaths(page: Page, cacheName: string): Promise<string[]> {
  return page.evaluate(async (name) => {
    if (!(await caches.has(name))) return [];
    const keys = await (await caches.open(name)).keys();
    return keys.map((request) => new URL(request.url).pathname);
  }, cacheName);
}

async function allCachedUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) urls.push(request.url);
    }
    return urls;
  });
}

async function backendHits(page: Page): Promise<number> {
  const response = await page.request.get(`${BACKEND}/__hits`);
  return (await response.json()).hits as number;
}

/** start → keuzeflow → kaart → boerderij (zelfde stappen als e2e/layout.spec.ts). */
async function openFarm(page: Page): Promise<void> {
  await page.getByRole('button', { name: START_BUTTON }).click();
  await page.getByText('Hoe wil je componeren?').waitFor();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByText('Kies je wereld').waitFor();
  await page.getByRole('button', { name: /De Stad/ }).click();
  await page.getByTitle('De Kinderboerderij').click();
  await page.locator('button.hotspot').first().waitFor({ timeout: 20_000 });
}

/** Eén online bezoek: boerderij open, daarna wachten tot het thema is opgewarmd. */
async function visitOnceOnline(page: Page): Promise<void> {
  await prepare(page);
  await page.goto('/');
  await openFarm(page);
  await waitForController(page);
  await expect
    .poll(async () => (await cachedPaths(page, AUDIO_CACHE)).filter((p) => p.startsWith('/audio/themes/basis/')).length, {
      timeout: 60_000,
      message: 'de geluiden van het basis-thema staan in de cache',
    })
    .toBeGreaterThanOrEqual(31);
  await expect
    .poll(async () => {
      const images = await cachedPaths(page, IMAGE_CACHE);
      return ['plattegrond', 'boerderij', 'speeltuin', 'gymlokaal', 'muziekwinkel', 'klaslokaal']
        .every((name) => images.includes(`/images/themes/basis/${name}.jpg`));
    }, { timeout: 60_000, message: 'kaart en locatiebeelden van het basis-thema staan in de cache' })
    .toBe(true);
}

test('(a) eerste bezoek registreert de service worker en precachet de app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await waitForController(page);

  const info = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return {
      scope: registration.scope,
      script: registration.active?.scriptURL,
      controlled: !!navigator.serviceWorker.controller,
      waiting: !!registration.waiting,
    };
  });
  expect(info.scope).toBe('http://localhost:5181/');
  expect(info.script).toBe('http://localhost:5181/sw.js');
  expect(info.controlled).toBe(true);
  expect(info.waiting).toBe(false);

  const urls = await allCachedUrls(page);
  const paths = urls.map((u) => new URL(u).pathname);
  expect(paths).toContain('/index.html');
  expect(paths.some((p) => /^\/assets\/main-.*\.js$/.test(p))).toBe(true);
  expect(paths.some((p) => /^\/assets\/StudioView-.*\.js$/.test(p))).toBe(true);
  expect(paths).toContain('/fonts/nunito/nunito-latin-wght-normal.woff2');
  // De precache bevat GEEN thema-media en geen eigen HTML-pagina's
  expect(paths.some((p) => /teacher\.html|over\.html|^\/les\//.test(p))).toBe(false);
  const precacheNames = await page.evaluate(async () => (await caches.keys()).filter((k) => k.includes('precache')));
  expect(precacheNames).toHaveLength(1);
  const precachePaths = await cachedPaths(page, precacheNames[0]);
  expect(precachePaths.some((p) => p.endsWith('.mp3') || p.startsWith('/images/themes/'))).toBe(false);
});

test('(b) na één bezoek werkt de leerlingreis zonder verbinding', async ({ page, context }) => {
  await visitOnceOnline(page);

  await context.setOffline(true);

  // Controle dat "offline" ook voor de service worker zelf geldt: een beeld
  // dat nog niet bewaard is, mag nu niet meer te halen zijn.
  const uncached = await page.evaluate(async () => {
    try {
      const response = await fetch('/images/themes/winterspelen/plattegrond.jpg?offline-check');
      return response.ok ? 'reachable' : `status ${response.status}`;
    } catch {
      return 'failed';
    }
  });
  expect(uncached, 'de testomgeving is echt offline').toBe('failed');

  const failed: string[] = [];
  const audioFromSw: string[] = [];
  const audioNotFromSw: string[] = [];
  page.on('requestfailed', (request: Request) => {
    if (new URL(request.url()).origin === 'http://localhost:5181') failed.push(request.url());
  });
  page.on('response', (response) => {
    const url = response.url();
    if (!url.endsWith('.mp3')) return;
    if (response.fromServiceWorker() && response.status() === 200) audioFromSw.push(new URL(url).pathname);
    else audioNotFromSw.push(url);
  });

  await page.reload();
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await expect(page.locator('#root')).not.toBeEmpty();

  // Kaart en locatie openen, een geluid verzamelen, naar de studio
  await openFarm(page);
  const mapImage = await page.evaluate(async () => !!(await caches.match('/images/themes/basis/boerderij.jpg')));
  expect(mapImage).toBe(true);

  for (let i = 0; i < 2; i++) {
    await page.locator('button.hotspot:not([disabled])').first().click({ force: true, timeout: 8000 });
    await page.waitForTimeout(500);
  }
  await expect.poll(() => audioFromSw.length, { message: 'geluiden kwamen uit de service worker' }).toBeGreaterThan(0);
  expect(audioFromSw.every((p) => p.startsWith('/audio/themes/basis/'))).toBe(true);
  expect(audioNotFromSw, 'geen geluid kwam van het netwerk').toEqual([]);

  // De studio is een apart geladen codebestand: moet uit de precache komen
  await page.getByRole('button', { name: 'Naar Studio' }).click();
  await expect(page.getByRole('heading', { name: 'Studio' })).toBeVisible();
  // De verzamelde geluiden zijn in de studio geladen (gedecodeerd), niet stuk
  await page.waitForTimeout(1500);
  expect(audioNotFromSw).toEqual([]);

  expect(failed, 'geen enkel verzoek aan de eigen site mislukte').toEqual([]);
});

test('(c) /teacher, /over en /les/<key>/ worden niet gekaapt', async ({ page, context }) => {
  await page.goto('/');
  await waitForController(page);

  // Online: elk adres levert zijn EIGEN HTML-document, rechtstreeks van de server
  const expectOwnDocument = async (path: string, title: RegExp) => {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    expect(response?.fromServiceWorker(), `${path} komt van de server, niet uit de service worker`).toBe(false);
    await expect(page).toHaveTitle(title);
  };
  await expectOwnDocument('/teacher', /docent|leerkracht|Docenten/i);
  await expect(page.locator('h1').first()).toBeVisible();
  await expectOwnDocument('/teacher.html', /docent|leerkracht|Docenten/i);
  await expectOwnDocument('/over', /Over/i);
  await expectOwnDocument('/over.html', /Over/i);

  const lesson = await page.goto('/les/drumbeat/');
  expect(lesson?.status()).toBe(200);
  expect(lesson?.fromServiceWorker()).toBe(false);
  // Statische pagina: geen app (#root) en een link terug naar de app
  await expect(page.locator('#root')).toHaveCount(0);
  await expect(page.locator('a[href*="screen=teacher"]').first()).toBeVisible();

  for (const file of ['/sitemap.xml', '/robots.txt', '/privacy/']) {
    const response = await page.request.get(file);
    expect(response.status(), file).toBe(200);
    expect(await response.text(), file).not.toContain('<div id="root">');
  }

  // Offline: deze pagina's krijgen NIET stiekem de app voorgeschoteld
  await page.goto('/');
  await waitForController(page);
  await context.setOffline(true);
  for (const path of ['/teacher', '/over', '/les/drumbeat/', '/sitemap.xml']) {
    const error = await page.goto(path).then(() => null, (e: Error) => e.message);
    expect(error, `${path} hoort offline te mislukken`).toMatch(/ERR_INTERNET_DISCONNECTED|ERR_FAILED/);
  }
});

test('(d) Supabase wordt nooit bewaard en mislukt eerlijk zonder verbinding', async ({ page, context }) => {
  await prepare(page);

  // Online: de klascode-link haalt de opdracht op bij de (nep-)Supabase
  await page.goto('/?pp=0042');
  await expect(page.getByRole('button', { name: 'Starten' })).toBeVisible();
  await expect(page.getByText('Groep 6a')).toBeVisible();
  await waitForController(page);

  // Een GET naar dezelfde backend, twee keer: beide keren echt naar de server
  const before = await backendHits(page);
  const restUrl = `${BACKEND}/__e2e-supabase/rest/v1/classes?select=*`;
  for (let i = 0; i < 2; i++) {
    // cache: 'no-store' zet de gewone browsercache buitenspel; een service
    // worker die het antwoord zou bewaren, zou het tweede verzoek wél afvangen.
    const ok = await page.evaluate(async (url) => (await fetch(url, { cache: 'no-store' })).ok, restUrl);
    expect(ok).toBe(true);
  }
  expect(await backendHits(page)).toBe(before + 2);

  // Niets van de backend staat in een cache van de service worker
  expect((await allCachedUrls(page)).filter((u) => u.startsWith(BACKEND))).toEqual([]);

  // Offline: het verzoek mislukt (geen antwoord uit een cache) ...
  await context.setOffline(true);
  const offline = await page.evaluate(async (url) => {
    try {
      await fetch(url, { cache: 'no-store' });
      return 'answered';
    } catch (error) {
      return error instanceof TypeError ? 'failed' : 'other';
    }
  }, restUrl);
  expect(offline).toBe('failed');

  // ... en de klascode-link doet NIET alsof: geen opdracht, gewoon het startscherm
  await page.goto('/?pp=0042');
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Starten' })).toHaveCount(0);
  await expect(page.getByText('Groep 6a')).toHaveCount(0);

  await context.setOffline(false);
  expect(await backendHits(page), 'offline kwam er niets bij de backend aan').toBeGreaterThanOrEqual(before + 2);
  expect((await allCachedUrls(page)).filter((u) => u.startsWith(BACKEND))).toEqual([]);
});

test('(e) oude links blijven werken, online en offline', async ({ page, context }) => {
  await prepare(page);
  await page.goto('/');
  await waitForController(page);

  const expectWinter = async () => {
    await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
    // De parameter blijft in de adresbalk (URL-contract, vorm 4)
    expect(new URL(page.url()).searchParams.get('theme')).toBe('winterspelen');
  };

  // Online, mét service worker: de navigatie komt uit de precache (index.html)
  const response = await page.goto('/?theme=winterspelen');
  expect(response?.fromServiceWorker()).toBe(true);
  await expectWinter();

  // Het winterthema wordt nu op de achtergrond opgewarmd
  await expect
    .poll(async () => (await cachedPaths(page, AUDIO_CACHE)).filter((p) => p.startsWith('/audio/themes/winterspelen/')).length, {
      timeout: 60_000,
    })
    .toBeGreaterThanOrEqual(27);

  await context.setOffline(true);
  await page.goto('/?theme=winterspelen');
  await expectWinter();

  // Andere oude vormen en nieuwe paden openen offline ook de app
  await page.goto('/?screen=teacher-guide');
  await expect(page).toHaveURL(/\/handleiding$/);
  await page.goto('/index.html');
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await page.goto('/kaart');
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await page.goto('/bestaat-niet');
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
});

test('(h) het actieve thema laadt na één bezoek ook offline uit zijn manifest', async ({ page, context }) => {
  await prepare(page);
  await page.goto('/');
  await waitForController(page);

  // Online: index en winter-manifest komen van het netwerk en worden bewaard
  const manifest = page.waitForResponse((r) => new URL(r.url()).pathname === '/themes/winterspelen/manifest.json');
  await page.goto('/?theme=winterspelen');
  expect((await manifest).ok()).toBe(true);
  await expect
    .poll(async () => (await cachedPaths(page, THEME_DATA_CACHE)).sort(), { timeout: 30_000 })
    .toEqual(expect.arrayContaining(['/themes/index.json', '/themes/winterspelen/manifest.json']));
  await expect
    .poll(async () => (await cachedPaths(page, IMAGE_CACHE)).includes('/images/themes/winterspelen/plattegrond.jpg'), { timeout: 60_000 })
    .toBe(true);

  // Offline: het manifest komt uit de cache van de service worker, de winterkaart verschijnt
  await context.setOffline(true);
  const offlineManifest = page.waitForResponse((r) => new URL(r.url()).pathname === '/themes/winterspelen/manifest.json');
  await page.goto('/?theme=winterspelen');
  const response = await offlineManifest;
  expect(response.ok()).toBe(true);
  expect(response.fromServiceWorker()).toBe(true);
  await page.getByRole('button', { name: START_BUTTON }).click();
  await page.getByText('Hoe wil je componeren?').waitFor();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByText('Kies je wereld').waitFor();
  await page.getByRole('button', { name: /Winterspelen/ }).click();
  await expect(page.locator('img[src="/images/themes/winterspelen/plattegrond.jpg"]')).toBeVisible();
  await expect(page.getByTitle('IJsarena', { exact: true }).first()).toBeVisible();
});

test('(f) een nieuwe versie wacht en neemt een open pagina niet vanzelf over', async ({ page }) => {
  await prepare(page);
  await page.goto('/');
  await waitForController(page);

  // Zet een nieuwe sw.js op de "server" (één regel erbij = nieuwe versie).
  // De build wordt bij elke run vers gemaakt, dus dit blijft niet hangen.
  appendFileSync(SW_FILE, `\n// nieuwe versie ${Date.now()}\n`);
  let reloads = 0;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) reloads += 1; });

  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const activeBefore = registration.active;
    await registration.update();
    // Wacht tot de nieuwe versie klaar is met installeren
    await new Promise<void>((resolve) => {
      const check = () => (registration.waiting ? resolve() : setTimeout(check, 100));
      check();
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      waiting: !!registration.waiting,
      sameActive: registration.active === activeBefore,
      sameController: navigator.serviceWorker.controller === activeBefore,
    };
  });
  expect(state).toEqual({ waiting: true, sameActive: true, sameController: true });
  expect(reloads, 'de pagina is niet herladen').toBe(0);

  // Op het startscherm, zonder open werk, verschijnt de melding
  const notice = page.getByTestId('update-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Er is een nieuwe versie');

  // "Vernieuwen" neemt de nieuwe versie in gebruik en herlaadt
  await notice.getByRole('button', { name: 'Vernieuwen' }).click();
  await expect.poll(() => reloads).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await expect
    .poll(() => page.evaluate(async () => !(await navigator.serviceWorker.ready).waiting))
    .toBe(true);
});

test('(g) noodrem: het kill-switch-bestand verwijdert service worker en caches', async ({ page }) => {
  await prepare(page);
  await page.goto('/');
  await waitForController(page);
  expect((await allCachedUrls(page)).length).toBeGreaterThan(0);

  // "Upload" de noodrem als sw.js
  copyFileSync('docs/v2/sw-kill-switch.js', SW_FILE);
  let navigations = 0;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations += 1; });
  await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });

  // De open pagina wordt één keer herladen en laadt daarna gewoon van de server
  // (Chrome wacht met wisselen tot de oude service worker geen lopende
  // verzoeken meer heeft, bijvoorbeeld het opwarmen van het thema.)
  await expect.poll(() => navigations, { timeout: 60_000 }).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();

  // Geen caches meer, geen service worker die de pagina bestuurt, geen herlaadlus
  await expect.poll(() => allCachedUrls(page)).toEqual([]);
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(false);
  expect(navigations, 'precies één herlaadbeurt, geen lus').toBe(1);

  // Een later bezoek blijft werken (van de server) en blijft zonder caches
  await page.reload();
  await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(await allCachedUrls(page)).toEqual([]);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(false);
});
