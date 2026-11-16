/**
 * V2 Fase 3 — geheugenbudget voor gedecodeerde audio (docs/v2/AUDIO-MEMORY.md).
 *
 * Meet na het laden van de studio (thema basis/stad, 6 verzamelde geluiden)
 * wat er gedecodeerd in het geheugen staat, volgens de boekhouding van de
 * engine zelf (`window.__soundscoutAudioStats`, alleen in DEV). Schrijft
 * docs/v2/baseline/audio-memory-latest.json (of AUDIO_MEMORY_OUT).
 *
 * Faalt alleen als de boekhouding ontbreekt of iets opruimt wat niet mag:
 * bij normaal gebruik blijft alles ruim onder budget en wordt er niets
 * opgeruimd.
 */
import { test, expect } from '@playwright/test';
import { prepare, writeJson } from './helpers';

interface Stats {
  totalBytes: number;
  totalMB: number;
  budgetMB: number;
  budgetSource: string;
  deviceMemoryGB: number | null;
  entryCount: number;
  byCategory: Record<'sample' | 'pitch', { bytes: number; count: number }>;
  pinnedBytes: number;
  evictedTotal: number;
}

function readStats(): Stats {
  return (window as unknown as { __soundscoutAudioStats: () => Stats }).__soundscoutAudioStats();
}

test('audiogeheugen in de studio (basis-thema)', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Nieuwe soundscape' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: /De Stad/ }).click();
  await page.getByTitle('De Kinderboerderij').click();
  await page.locator('button.hotspot').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000); // locatie-geluiden geladen
  const atLocation = await page.evaluate(readStats);

  for (let i = 0; i < 6; i++) {
    await page.locator('button.hotspot:not([disabled])').first().click({ force: true });
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: 'Naar Studio' }).last().click(); // bij een volle recorder staat hij ook in een modal
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
  await page.waitForTimeout(1500);
  const inStudio = await page.evaluate(readStats);

  writeJson(process.env.AUDIO_MEMORY_OUT ?? 'docs/v2/baseline/audio-memory-latest.json', {
    measuredAt: new Date().toISOString().slice(0, 10),
    environment: {
      note: 'Headless Chromium op een ontwikkelmachine — vergelijkingsbasis, geen schoolapparaat.',
      chromium: browser.version(),
    },
    atLocation,
    inStudio,
  });

  expect(inStudio.entryCount).toBeGreaterThan(0);
  expect(inStudio.totalBytes).toBeGreaterThan(0);
  expect(inStudio.totalBytes).toBeLessThanOrEqual(inStudio.budgetMB * 1024 * 1024);
  expect(inStudio.evictedTotal).toBe(0);
});
