/**
 * Playwright — service-worker-suite (V2 Fase 2, offline). Zie docs/v2/OFFLINE.md §7.
 *
 *   npm run e2e:sw
 *
 * Los van de gewone suites (`npm run e2e`): die draaien tegen de dev-server,
 * waar GEEN service worker bestaat. Deze suite bouwt de productie-versie naar
 * een eigen map (dist/ blijft ongemoeid) en serveert die met `vite preview` op
 * poort 5181. Een nep-Supabase draait op een andere origin (poort 5182).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 5181;
const BACKEND_PORT = 5182;
const OUT_DIR = 'node_modules/.cache/sw-e2e-dist';

export default defineConfig({
  testDir: './e2e/sw',
  testMatch: '**/*.sw.ts',
  outputDir: './e2e/.results-sw',
  timeout: 120_000,
  // Eén voor één: de tests delen niets, maar een service worker installeren
  // en een thema ophalen is zwaar genoeg om elkaar anders te storen.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
    serviceWorkers: 'allow',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: [
    {
      command: `node e2e/sw/fakeBackend.mjs ${BACKEND_PORT}`,
      url: `http://127.0.0.1:${BACKEND_PORT}/__hits`,
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      command: `npx vite build --outDir ${OUT_DIR} --emptyOutDir && npx vite preview --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      // Altijd vers bouwen: een oude build zou een oude service worker testen
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        VITE_SUPABASE_URL: `http://127.0.0.1:${BACKEND_PORT}/__e2e-supabase`,
        VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
      },
    },
  ],
});
