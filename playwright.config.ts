/**
 * Playwright — V2 Fase 0 vangnet (zie v2-architecture-proposal.md §5.2 en §6.5).
 *
 * Drie suites in e2e/:
 *  - layout.spec.ts        schermafbeeldingen + layout-metingen per formaat
 *  - audio-golden.spec.ts  gouden offline-renders (zelfde compositie = zelfde audio)
 *  - perf-baseline.spec.ts geheugen per thema + frame-/store-metingen tijdens afspelen
 *
 * Draait tegen een eigen dev-server op poort 5180 (botst niet met `npm run dev`).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 5180;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'],
    },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Nep-Supabase op de eigen origin: zonder deze twee variabelen gooit
    // getSupabase() meteen en is geen enkele deel-/klascode-flow te testen.
    // e2e/url-contract.spec.ts onderschept de RPC-aanroepen met page.route;
    // elders mislukken ze gewoon (404 van de dev-server), net als voorheen.
    env: {
      VITE_SUPABASE_URL: `http://localhost:${PORT}/__e2e-supabase`,
      VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
    },
  },
});
