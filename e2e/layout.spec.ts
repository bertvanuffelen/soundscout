/**
 * Fase 0 — layout-vangnet.
 *
 * Loopt per formaat de leerlingreis af (start → keuzeflow → kaart → locatie →
 * studio → podium) plus de docentenpagina. Per scherm:
 *  1. een schermafbeelding als visuele regressie-basislijn (toHaveScreenshot);
 *  2. een layout-meting (overloop, buiten beeld, te kleine doelen, overlap,
 *     te kleine tekst) → docs/v2/baseline/layout/<formaat>.json.
 *
 * De metingen laten de test NIET falen: ze leggen de huidige stand vast (ook
 * de bekende problemen L1–L8 uit het voorstel), zodat Fase 1 aantoonbaar
 * verbetert. Wél falen: een scherm dat er anders uitziet dan de basislijn.
 */
import { test, expect, type Page } from '@playwright/test';
import { VIEWPORTS, prepare, settle, measureLayout, writeJson, type LayoutMetrics } from './helpers';

interface ScreenResult {
  screen: string;
  reached: boolean;
  note?: string;
  metrics?: LayoutMetrics;
}

for (const vp of VIEWPORTS) {
  test.describe(`layout · ${vp.id}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('leerlingreis + docentenpagina', async ({ page }) => {
      const results: ScreenResult[] = [];
      let clicks = 0;
      const journey: Record<string, number> = {};

      const capture = async (screen: string) => {
        await settle(page);
        const metrics = await measureLayout(page);
        results.push({ screen, reached: true, metrics });
        await expect.soft(page).toHaveScreenshot(`${vp.id}/${screen}.png`);
      };
      const step = async (screen: string, action: (p: Page) => Promise<void>) => {
        try {
          await action(page);
          await capture(screen);
          return true;
        } catch (err) {
          results.push({ screen, reached: false, note: String(err).split('\n')[0].slice(0, 200) });
          return false;
        }
      };
      const click = async (locator: ReturnType<Page['locator']>) => {
        await locator.click({ timeout: 8000 });
        clicks += 1;
      };

      await prepare(page);

      // 1. Startscherm
      await step('01-start', async (p) => {
        await p.goto('/');
        await p.getByRole('button', { name: 'Nieuwe soundscape' }).waitFor();
      });

      // 2–3. Keuzeflow
      await step('02-wizard-modus', async (p) => {
        await click(p.getByRole('button', { name: 'Nieuwe soundscape' }));
        await p.getByText('Hoe wil je componeren?').waitFor();
      });
      await step('03-wizard-wereld', async (p) => {
        await click(p.getByRole('button', { name: 'Volgende' }));
        await p.getByText('Kies je wereld').waitFor();
      });

      // 4. Kaart
      const onMap = await step('04-kaart', async (p) => {
        await click(p.getByRole('button', { name: /De Stad/ }));
        await p.getByTitle('De Kinderboerderij').waitFor();
      });

      // 5–6. Locatie
      const onLocation = onMap && await step('05-locatie', async (p) => {
        await click(p.getByTitle('De Kinderboerderij'));
        await p.locator('button.hotspot').first().waitFor({ timeout: 20000 });
      });
      if (onLocation) {
        await step('06-locatie-verzameld', async (p) => {
          for (let i = 0; i < 3; i++) {
            // force: hotspots pulseren doorlopend en worden dus nooit "stabiel"
            await p.locator('button.hotspot:not([disabled])').first().click({ force: true, timeout: 8000 });
            clicks += 1;
            await p.waitForTimeout(350);
            if (i === 0) journey.clicksToFirstSound = clicks;
          }
        });
      }

      // 7–9. Studio
      const inStudio = onLocation && await step('07-studio-leeg', async (p) => {
        await click(p.getByRole('button', { name: 'Naar Studio' }));
        await p.getByRole('heading', { name: 'Studio' }).waitFor();
        await p.waitForTimeout(800);
      });
      const hasClips = inStudio && await step('08-studio-clips', async (p) => {
        // Clips via de store plaatsen: deterministisch, onafhankelijk van sleepgedrag.
        const placed = await p.evaluate(async () => {
          const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
          const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
          const samples = useLibraryStore.getState().librarySamples;
          samples.slice(0, 3).forEach((sample: { id: string }, i: number) => {
            useTimelineStore.getState().addClip(i, { id: `e2e-${i}`, sampleId: sample.id, startBeat: i * 6 }, samples);
          });
          return samples.length;
        });
        if (placed === 0) throw new Error('Bibliotheek is leeg na "Naar Studio"');
        await p.locator('[role="listitem"]').first().waitFor();
        journey.clicksToFirstClip = clicks + 1; // + één sleepactie
      });
      if (hasClips) {
        await step('09-studio-clip-geselecteerd', async (p) => {
          await p.locator('[role="listitem"]').first().click({ timeout: 8000 });
          await p.getByRole('button', { name: 'Effecten' }).waitFor({ timeout: 5000 });
        });
      }

      // 10. Podium
      if (hasClips) {
        await step('10-podium', async (p) => {
          await click(p.getByRole('button', { name: /Naar (het )?[Pp]odium/ }).first());
          await p.waitForTimeout(1500);
        });
      }

      // 11. Docentenpagina
      await step('11-docentenpagina', async (p) => {
        await p.goto('/teacher');
        await p.locator('h1').first().waitFor();
      });

      writeJson(`docs/v2/baseline/layout/${vp.id}.json`, {
        viewport: vp,
        journey,
        screens: results,
      });

      // Elk scherm moet bereikbaar zijn op de primaire leerling-formaten.
      const primary = !vp.id.startsWith('phone');
      if (primary) {
        expect(results.filter((r) => !r.reached).map((r) => `${r.screen}: ${r.note}`)).toEqual([]);
      }
    });
  });
}
