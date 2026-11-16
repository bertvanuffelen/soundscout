import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  AUDIO_CACHE,
  IMAGE_CACHE,
  NAVIGATE_FALLBACK_DENYLIST,
  PRECACHE_ID,
  PRECACHE_IGNORE_PARAMS,
  THEME_DATA_CACHE,
  THEME_MEDIA_CACHE,
  isAppImage,
  isThemeBucketMedia,
  isThemeAudio,
  isThemeData,
} from './src/pwa/swRouting'
import { deployEnvPlugin } from './scripts/deployEnvPlugin'

const DAY = 24 * 60 * 60

/**
 * Service worker (V2 Fase 2 — offline). Alles hierover: docs/v2/OFFLINE.md.
 *
 *  - Alleen in een productie-build; in `npm run dev` bestaat er geen service worker.
 *  - NOODREM: upload docs/v2/sw-kill-switch.js als `sw.js` (zie OFFLINE.md §6).
 */
const pwa = VitePWA({
  // Geen automatische wissel: een nieuwe versie wacht tot alle tabbladen dicht
  // zijn of tot iemand op het startscherm op "Vernieuwen" tikt. Kinderen
  // worden dus nooit midden in een les herladen.
  registerType: 'prompt',
  // Registratie doen we zelf, in de bundel (src/pwa/registerServiceWorker.ts):
  // geen los of inline registratiescript (CSP: script-src 'self').
  injectRegister: false,
  // public/manifest.json is het ene manifest; de plugin maakt er geen tweede.
  manifest: false,
  workbox: {
    // Eén bestand (sw.js) in plaats van sw.js + workbox-<hash>.js: bij een
    // FTP-upload kan er dan geen half paar op de server staan.
    inlineWorkboxRuntime: true,
    // Bij de allereerste installatie meteen de open pagina overnemen, zodat
    // één bezoek genoeg is om offline te kunnen. Bij een update gebeurt dit
    // pas nadat de oude versie weg is (skipWaiting staat uit).
    clientsClaim: true,
    skipWaiting: false,
    cleanupOutdatedCaches: true,
    cacheId: PRECACHE_ID,

    // --- Precache: de app zelf (geen thema-media) ---
    globPatterns: [
      'index.html',
      'manifest.json',
      'assets/**/*.{js,css,wasm}',
      'fonts/**/*.{woff2,css}',
      'animaties/**/*.{html,js}',
      'images/overige/logo-soundscout*.{svg,png}',
      'images/overige/pwa/*.png',
    ],
    // Ontwikkelgereedschap (/editor, /sequencer, /v2-mockup) bestaat alleen in
    // `npm run dev`; de bijbehorende bestanden hoeven niet mee.
    globIgnores: ['**/V2Mockup-*.js', '**/SequencerLab-*.js', '**/EditorHub-*.js'],
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    ignoreURLParametersMatching: PRECACHE_IGNORE_PARAMS,

    // --- Navigatie: app-paden → index.html, eigen pagina's en bestanden niet ---
    navigateFallback: '/index.html',
    navigateFallbackDenylist: NAVIGATE_FALLBACK_DENYLIST,

    // --- Runtime: thema-media, pas bewaard als ze gebruikt worden ---
    // Alleen GET. Eigen origin, plus ÉÉN uitzondering: de publieke thema-bucket
    // van Supabase Storage (isThemeBucketMedia). De rest van Supabase (REST,
    // RPC, Auth, andere buckets), EmailJS en YouTube heeft geen regel en gaat
    // dus ongemoeid langs de service worker.
    runtimeCaching: [
      {
        // Thema-index en -manifesten (V2 Fase 3, docs/v2/THEMES.md): eerst het
        // netwerk (een publicatie is direct zichtbaar), na 4 s of zonder
        // verbinding de laatst bewaarde versie. Klein, dus geen ruimteprobleem.
        urlPattern: isThemeData,
        handler: 'NetworkFirst',
        options: {
          cacheName: THEME_DATA_CACHE,
          networkTimeoutSeconds: 4,
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 60, maxAgeSeconds: 365 * DAY },
        },
      },
      {
        urlPattern: isThemeAudio,
        handler: 'CacheFirst',
        options: {
          cacheName: AUDIO_CACHE,
          // Alleen volledige antwoorden bewaren (geen 206-stukjes, geen
          // ondoorzichtige antwoorden); een Range-verzoek wordt uit het
          // volledige bestand in de cache gesneden.
          cacheableResponse: { statuses: [200] },
          rangeRequests: true,
          expiration: { maxEntries: 400, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
        },
      },
      {
        // Media van in /beheer gepubliceerde thema's (Supabase Storage,
        // .../object/public/themes/<id>/v<n>/...): elk versiepad is
        // onveranderlijk, dus cache-first, net als de eigen thema-media.
        urlPattern: isThemeBucketMedia,
        handler: 'CacheFirst',
        options: {
          cacheName: THEME_MEDIA_CACHE,
          cacheableResponse: { statuses: [200] },
          rangeRequests: true,
          expiration: { maxEntries: 500, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
        },
      },
      {
        urlPattern: isAppImage,
        handler: 'CacheFirst',
        options: {
          cacheName: IMAGE_CACHE,
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
        },
      },
    ],
  },
})

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    pwa,
    // CSP-host per omgeving + staging nooit indexeren (docs/v2/STAGING.md)
    deployEnvPlugin({ mode, supabaseUrl: loadEnv(mode, process.cwd(), '').VITE_SUPABASE_URL }),
  ],
  build: {
    rollupOptions: {
      // Multi-page: /teacher en /over krijgen een eigen HTML met eigen
      // SEO-meta (title/description/JSON-LD); alle drie laden dezelfde app.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        teacher: fileURLToPath(new URL('./teacher.html', import.meta.url)),
        over: fileURLToPath(new URL('./over.html', import.meta.url)),
      },
      output: {
        manualChunks: {
          'tone': ['tone'],
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'audio-export': ['@breezystack/lamejs'],
          'supabase': ['@supabase/supabase-js'],
          // Eigen chunk: verandert zelden, dus blijft in de browsercache als
          // de app-code (main) een nieuwe versie krijgt.
          'router': ['@tanstack/react-router'],
          'query': ['@tanstack/react-query'],
        },
      },
    },
  },
}))
