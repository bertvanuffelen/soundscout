/**
 * V2 Fase 4 — Vervormen en tempo in de studio.
 *
 * Geluid plaatsen (via de store, deterministisch — zelfde patroon als
 * layout.spec.ts) → Vervormen openen vanaf de clip → snelheid 2×,
 * achterstevoren, echo → Toepassen: de clip wordt half zo breed en krijgt
 * het sterretje → heropenen toont de bewaarde waarden → tempo naar 90
 * tijdens afspelen: de afspeellijn blijft op dezelfde tel, de muziekloop
 * houdt zijn breedte in tellen, het losse geluid verandert mee (bij een
 * TRAGER tempo wordt het korter in tellen) → ongedaan maken zet alles terug.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { prepare } from './helpers';

async function toStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nieuwe soundscape' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: /De Stad/ }).click();
  await page.getByTitle('De Kinderboerderij').click();
  await page.locator('button.hotspot').first().waitFor({ timeout: 20000 });
  for (let i = 0; i < 2; i++) {
    await page.locator('button.hotspot:not([disabled])').first().click({ force: true, timeout: 8000 });
    await page.waitForTimeout(350);
  }
  await page.getByRole('button', { name: 'Naar Studio' }).click();
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
  await expect.poll(() => page.evaluate(async () => {
    const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
    return useLibraryStore.getState().librarySamples.length;
  }), { timeout: 10000 }).toBeGreaterThan(0);
}

async function width(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('clip niet zichtbaar');
  return box.width;
}

/** Breedte na de CSS-overgang van de clip (twee gelijke metingen op rij). */
async function stableWidth(locator: Locator): Promise<number> {
  let previous = -1;
  for (let i = 0; i < 40; i++) {
    const current = await width(locator);
    if (Math.abs(current - previous) < 0.1) return current;
    previous = current;
    await locator.page().waitForTimeout(100);
  }
  return previous;
}

test.use({ viewport: { width: 1366, height: 768 } });

test('vervormen: snelheid, achterstevoren, echo; tempo; ongedaan maken', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await prepare(page);
  await toStudio(page);

  // --- Een los geluid (spoor 1) en een muziekwinkel-loop (spoor 2) plaatsen ---
  const placed = await page.evaluate(async () => {
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
    const { useThemeStore } = await import('/src/stores/themeStore.ts');
    const library = useLibraryStore.getState();
    const sfx = library.librarySamples[0];
    const loop = useThemeStore.getState().getSampleById('muziekwinkel-drums');
    if (!sfx || !loop) return { ok: false, sfx: !!sfx, loop: !!loop };
    library.loadLibrary([...library.librarySamples, loop]);
    const samples = useLibraryStore.getState().librarySamples;
    useTimelineStore.getState().addClip(0, { id: 'e2e-sfx', sampleId: sfx.id, startBeat: 0 }, samples);
    useTimelineStore.getState().addClip(1, { id: 'e2e-loop', sampleId: loop.id, startBeat: 0 }, samples);
    return { ok: true, sfxDuration: sfx.duration };
  });
  expect(placed.ok, JSON.stringify(placed)).toBe(true);

  const sfxClip = page.locator('#track-1 [role="listitem"]').first();
  const loopClip = page.locator('#track-2 [role="listitem"]').first();
  await sfxClip.waitFor();
  await loopClip.waitFor();
  const sfxWidth = await stableWidth(sfxClip);
  const loopWidth = await stableWidth(loopClip);

  // --- Vervormen openen vanaf de clip ---
  await sfxClip.click();
  await page.getByRole('button', { name: 'Vervormen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Vervormen' });
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Snelheid 2×' }).click();
  await dialog.getByRole('button', { name: 'Achterstevoren' }).click();
  await dialog.getByRole('slider', { name: 'Echo' }).fill('40');
  await expect(dialog.locator('canvas[data-reversed="true"]')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Toepassen' }).click();
  await expect(dialog).toBeHidden();

  // Half zo breed, met het sterretje
  await expect.poll(() => width(sfxClip)).toBeLessThan(sfxWidth * 0.55);
  const vervormdWidth = await stableWidth(sfxClip);
  expect(Math.abs(vervormdWidth - sfxWidth / 2)).toBeLessThan(2);
  await expect(sfxClip.getByTestId('clip-fx-indicator')).toBeVisible();

  // --- Heropenen: de bewaarde waarden staan er nog ---
  await page.getByRole('button', { name: 'Vervormen' }).click();
  await dialog.waitFor();
  await expect(dialog.getByRole('button', { name: 'Snelheid 2×' })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('button', { name: 'Achterstevoren' })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('slider', { name: 'Echo' })).toHaveValue('40');
  await expect(dialog.getByRole('button', { name: 'Toepassen' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Annuleren' }).click();
  await expect(dialog).toBeHidden();

  // --- Tempo naar 90 tijdens het afspelen ---
  await page.getByRole('button', { name: 'Afspelen' }).click();
  await expect.poll(async () => page.evaluate(async () => {
    const { playbackClock } = await import('/src/services/playbackClock.ts');
    return playbackClock.getBeat();
  }), { timeout: 10000 }).toBeGreaterThan(2);

  await page.getByTestId('tempo-button').click();
  const before = await page.evaluate(async () => {
    const { playbackClock } = await import('/src/services/playbackClock.ts');
    return playbackClock.getBeat();
  });
  await page.getByRole('menuitemradio', { name: /Traag/ }).click();
  const after = await page.evaluate(async () => {
    const { playbackClock } = await import('/src/services/playbackClock.ts');
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    return { beat: playbackClock.getBeat(), bpm: useTimelineStore.getState().bpm };
  });
  expect(after.bpm).toBe(90);
  // Zelfde tel (een fractie verder door de tijd die de klik kost) — geen sprong
  expect(after.beat).toBeGreaterThanOrEqual(before - 0.25);
  expect(after.beat).toBeLessThan(before + 1.5);
  await expect(page.getByTestId('tempo-button')).toContainText('90');
  await page.getByRole('button', { name: 'Pauze' }).click();

  // Loop: zelfde breedte in tellen. Los geluid: korter in tellen (×90/120).
  await expect.poll(() => width(sfxClip)).toBeLessThan(vervormdWidth * 0.8);
  expect(Math.abs((await stableWidth(loopClip)) - loopWidth)).toBeLessThan(2);
  expect(Math.abs((await stableWidth(sfxClip)) - vervormdWidth * 0.75)).toBeLessThan(2);

  // --- Ongedaan maken: tempo (en posities) terug in één stap ---
  await page.getByRole('button', { name: 'Ongedaan maken' }).click();
  await expect(page.getByTestId('tempo-button')).toContainText('120');
  await expect.poll(() => width(sfxClip)).toBeGreaterThan(vervormdWidth - 2);
  expect(Math.abs((await stableWidth(sfxClip)) - vervormdWidth)).toBeLessThan(2);
  expect(Math.abs((await stableWidth(loopClip)) - loopWidth)).toBeLessThan(2);

  expect(pageErrors).toEqual([]);
});
