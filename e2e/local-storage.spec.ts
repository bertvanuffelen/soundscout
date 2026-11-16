/**
 * V2 Fase 2 — lokale composities van localStorage naar IndexedDB.
 *
 * Zet composities in het oude formaat klaar vóór de app laadt, opent de app
 * en controleert: ze staan in "Mijn soundscapes", de oude localStorage-lijst
 * staat er nog (back-up), de marker is gezet en de app leest daarna echt uit
 * IndexedDB. Zie docs/v2/LOCAL-STORAGE.md.
 */
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

const LEGACY_KEY = 'soundscout:compositions';
const MARKER_KEY = 'soundscout:migrated-to-idb';
const NAMES = ['Oud werk een', 'Oud werk twee', 'Oud werk drie'];

function legacyComposition(n: number, name: string) {
  const stamp = new Date(Date.UTC(2026, 8, n, 9)).toISOString();
  return {
    id: `legacy-${n}`,
    name,
    createdAt: stamp,
    updatedAt: stamp,
    timeline: {
      tracks: Array.from({ length: 8 }, (_, i) => ({ id: `track-${i}`, clips: [] })),
      bpm: 120,
      totalBeats: 128,
      isLooping: false,
    },
    samples: [],
    metadata: { duration: 0, trackCount: 0, clipCount: 0, locations: [] },
  };
}

const SEED = JSON.stringify(NAMES.map((name, i) => legacyComposition(i + 1, name)));

async function idbCompositionIds(page: Page): Promise<string[]> {
  return page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open('soundscout-local');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const keys = db.transaction('compositions').objectStore('compositions').getAllKeys();
      keys.onerror = () => reject(keys.error);
      keys.onsuccess = () => { db.close(); resolve((keys.result as string[]).sort()); };
    };
  }));
}

async function openMyCompositions(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mijn soundscapes' }).click();
  await expect(page.getByRole('heading', { name: 'Mijn soundscapes' })).toBeVisible();
}

test('oude composities verschijnen na de overzet en de back-up blijft staan', async ({ page }) => {
  await prepare(page);
  // Na prepare (die de opslag leegt): één keer de oude lijst klaarzetten
  await page.addInitScript(([key, seed]) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem(key, seed);
  }, [LEGACY_KEY, SEED] as const);

  await openMyCompositions(page);
  for (const name of NAMES) await expect(page.getByText(name)).toBeVisible();

  // De oude gegevens staan er nog, onveranderd
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBe(SEED);

  // Marker + inhoud van IndexedDB
  await expect.poll(async () => {
    const marker = await page.evaluate((key) => localStorage.getItem(key), MARKER_KEY);
    return marker ? (JSON.parse(marker) as { state: string }).state : null;
  }).toBe('done');
  const marker = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), MARKER_KEY))!) as Record<string, unknown>;
  expect(marker).toMatchObject({ version: 1, sourceCount: 3, migratedCount: 3, skippedCount: 0 });
  expect(await idbCompositionIds(page)).toEqual(['legacy-1', 'legacy-2', 'legacy-3']);

  // Bewijs dat de app uit IndexedDB leest: zonder de oude lijst staan ze er nog
  await page.evaluate((key) => localStorage.removeItem(key), LEGACY_KEY);
  await openMyCompositions(page);
  for (const name of NAMES) await expect(page.getByText(name)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBeNull();
});

test('zonder IndexedDB blijft de app op localStorage werken', async ({ page }) => {
  await prepare(page);
  await page.addInitScript(([key, seed]) => {
    // IndexedDB weigert te openen, zoals in sommige privé-vensters
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: { open: () => { throw new DOMException('blocked', 'SecurityError'); } },
    });
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem(key, seed);
  }, [LEGACY_KEY, SEED] as const);

  await openMyCompositions(page);
  for (const name of NAMES) await expect(page.getByText(name)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBe(SEED);
  expect(await page.evaluate((key) => localStorage.getItem(key), MARKER_KEY)).toBeNull();
});
