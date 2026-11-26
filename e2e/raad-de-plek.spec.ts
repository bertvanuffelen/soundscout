/**
 * Raad-de-plek (migratie 047) — het praatplaat-bord met "Plekken tonen" uit.
 *
 * Via de lokale testopstelling (e2e/harness/presentationHarness.tsx): het
 * échte PresentationSurface met een vaste playlist van drie inzendingen op het
 * Sinterklaaspaleis. Getest wordt wat de klas op het digibord ziet:
 *  - verborgen: geen enkele plek, naam of clusterkeuze op de plaat; de
 *    soundscapes staan als lijst ernaast en zijn daar te kiezen;
 *  - "Toon plek" zet alleen de plek van de soundscape die nu klinkt erop;
 *  - "Alle plekken" zet alles erop (en weer eraf);
 *  - publiek (gedeelde link) is er geen onthul-knop;
 *  - met plekken aan is het bord zoals het altijd was.
 * Niet getest: het ophalen van de instelling uit Supabase (zie de unit- en
 * databasetests).
 */
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

async function mount(page: Page, options: { hidden?: boolean; mode?: 'teacher-present' | 'public' }) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nieuwe soundscape' }).waitFor();
  await page.evaluate(async (opts) => {
    const harness = await import('/e2e/harness/presentationHarness.tsx');
    harness.mountGuessBoard(opts);
  }, options);
  const surface = page.locator('#presentation-harness');
  await surface.getByRole('img', { name: 'Het Sinterklaaspaleis' }).waitFor({ timeout: 20000 });
  return surface;
}

/** De plek-knoppen op de plaat (PraatplaatSpot): aria-label = naam of aantal */
const spots = (surface: ReturnType<Page['locator']>) => surface.locator('button:has(svg.lucide-volume-2)');

test('verborgen: geen plekken op de plaat, lijst ernaast, onthullen per soundscape en alles', async ({ page }) => {
  const surface = await mount(page, { hidden: true });

  // Niets op de plaat dat de plek verraadt
  await expect(spots(surface)).toHaveCount(0);
  // De lijst staat ernaast, met alle drie de soundscapes (namen wél zichtbaar)
  const list = surface.locator('aside');
  await expect(list.getByRole('button', { name: /Eerste/ })).toBeVisible();
  await expect(list.getByRole('button', { name: /Tweede/ })).toBeVisible();
  await expect(list.getByRole('button', { name: /Derde/ })).toBeVisible();

  // Toon plek: alleen de plek van de huidige (Robin)
  const reveal = surface.getByRole('button', { name: 'Toon plek' });
  await reveal.click();
  await expect(spots(surface)).toHaveCount(1);
  await expect(surface.getByRole('button', { name: 'Robin', exact: true })).toBeVisible();
  await expect(surface.getByRole('button', { name: 'Verberg plek' })).toBeVisible();

  // Volgende soundscape via de lijst: zijn plek is nog verborgen, Robin blijft staan
  await list.getByRole('button', { name: /Tweede/ }).click();
  await expect(surface.getByRole('button', { name: 'Toon plek' })).toBeVisible();
  await expect(spots(surface)).toHaveCount(1);
  await surface.getByRole('button', { name: 'Toon plek' }).click();
  await expect(surface.getByRole('button', { name: 'Sam', exact: true })).toBeVisible();
  await expect(spots(surface)).toHaveCount(2);

  // Alle plekken: Sam en Noor liggen dicht bij elkaar → één cluster van 2
  await surface.getByRole('button', { name: 'Alle plekken' }).click();
  await expect(spots(surface)).toHaveCount(2);
  await expect(surface.getByRole('button', { name: '2', exact: true })).toBeVisible();

  // Alle plekken weer uit: terug naar wat los onthuld was
  await surface.getByRole('button', { name: 'Alle plekken' }).click();
  await expect(spots(surface)).toHaveCount(2);
  await expect(surface.getByRole('button', { name: 'Sam', exact: true })).toBeVisible();

  // Verberg plek haalt de huidige weer weg
  await surface.getByRole('button', { name: 'Verberg plek' }).click();
  await expect(spots(surface)).toHaveCount(1);
});

test('verborgen + publiek: plaat met lijst, geen plekken en geen onthul-knop', async ({ page }) => {
  const surface = await mount(page, { hidden: true, mode: 'public' });
  await expect(spots(surface)).toHaveCount(0);
  await expect(surface.locator('aside').getByRole('button', { name: /Eerste/ })).toBeVisible();
  await expect(surface.getByRole('button', { name: 'Toon plek' })).toHaveCount(0);
  await expect(surface.getByRole('button', { name: 'Alle plekken' })).toHaveCount(0);
});

test('plekken aan: het bord is zoals het was (alle plekken, geen onthul-knoppen)', async ({ page }) => {
  const surface = await mount(page, { hidden: false });
  await expect(spots(surface)).toHaveCount(2); // Robin + cluster van 2
  await expect(surface.getByRole('button', { name: 'Toon plek' })).toHaveCount(0);
  await expect(surface.getByRole('button', { name: 'Alle plekken' })).toHaveCount(0);
});
