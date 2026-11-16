# Offline (V2 Phase 2 — service worker)

> Status: implemented 16-11-2026. Gate: `npm run e2e:sw` (7 tests against a production build).
> Goal: a class that has opened SoundScout keeps working through a bad or dropped connection.
> Not verified on a real iPad/Safari or on the real Apache at Strato — see §9.

## 1. How it fits together

| Piece | File | Role |
|---|---|---|
| Plugin config | `vite.config.ts` (`VitePWA`, Workbox `generateSW`) | Builds `dist/sw.js`. One file, Workbox runtime inlined. |
| Rules | `src/pwa/swRouting.ts` | Cache names, navigation deny-list, what counts as theme audio / app image. Unit-tested. |
| Registration | `src/pwa/registerServiceWorker.ts` (called from `src/main.tsx`) | Registers `sw.js` in production builds only, checks for updates, starts the warm-up. |
| Warm-up | `src/pwa/warmThemeCache.ts` | Fetches the active theme's media in the background so it lands in the cache. |
| Update notice | `src/pwa/UpdateNotice.tsx`, `src/pwa/updateStore.ts` | "Er is een nieuwe versie" — only on a quiet screen. |
| Manifest | `public/manifest.json` | The one manifest (the plugin generates none). Icons in `public/images/overige/pwa/`. |
| Kill switch | `docs/v2/sw-kill-switch.js` | Upload as `sw.js` to remove the service worker everywhere (§6). |
| Tests | `e2e/sw/offline.sw.ts`, `playwright.sw.config.ts`, `src/pwa/__tests__/` | §7. |

There is **no service worker in `npm run dev`**, so the normal suites (`npm run e2e`) are unaffected.

## 2. What is cached, and when

### Precache — the app itself (at install, ≈ 2.9 MB, 78 files)

`index.html`, every file in `assets/` (all JS chunks and CSS, including the lazily loaded screens, the Supabase client and the MP3 worker), the Nunito font, the two explainer animations (`/animaties/`), the logo, the app icons and `manifest.json`.

All chunks are precached on purpose, not only the first screen: a device that still runs the previous version must be able to open every screen from its own cache, even when the server already has newer files (manual FTP uploads are not atomic).

Not precached: theme media, `teacher.html`, `over.html`, `/les/`, `/privacy/`, and the three dev-only chunks (`V2Mockup`, `SequencerLab`, `EditorHub`).

### Runtime cache — media, when used

| Cache | Matches | Strategy | Limits |
|---|---|---|---|
| `soundscout-audio-v1` | same origin, `/audio/**.mp3` | cache-first | 400 files, 60 days, purged first when storage is full |
| `soundscout-images-v1` | same origin, `/images/**` (`jpg`, `png`, `webp`, `svg`) | cache-first | 300 files, 60 days, purged first when storage is full |

- Only complete `200` responses are stored. Partial (`206`) and opaque responses are never stored.
- **Range requests**: the app loads audio with `fetch` + `decodeAudioData` (Tone's `ToneAudioBuffer.load`), which asks for the whole file, so ranges do not occur in normal use. For safety the audio rule has Workbox's range plugin: a `Range` request is answered by slicing the complete cached file.
- Workbox has no byte limit, only a file count. Today all audio is 10 MB and all images 25 MB in total, so the caps cannot be reached by size.
- Media file names are **not** content-hashed. A replaced sound or image under the same name stays stale for up to 60 days on devices that already have it (the `.htaccess` already told browsers to keep it for a year). **Give a changed media file a new name.**

### Warm-up — the active theme

As soon as the service worker controls the page (on a first visit: a few seconds after load), the app waits 4 seconds and then fetches, two at a time:

1. the map, every location image and every sound of the **active** theme (`basis` ≈ 10 MB);
2. the media this page had already loaded before the service worker took over (re-read from the browser cache, no network).

It repeats when the theme changes (a class code that selects another theme, `?theme=`). It does not run when the browser's data-saver is on or the device is offline. Nothing is decoded, so this costs disk space, not working memory. Other themes are never fetched in advance.

Result: **one online visit is enough** for the active theme to work offline, including locations that were never opened.

Not warmed: storyboard and praatplaat images. They are cached once they have been shown; a storyboard that was never opened online has no pictures offline.

## 3. What is never cached or intercepted

- **Supabase** (API, auth, storage), **EmailJS** and **YouTube**: other origins, no rule. The service worker does not call `respondWith` for them; the browser handles them as if there were no service worker.
- **Anything that is not GET** (every Supabase RPC is a POST).
- `/teacher`, `/teacher.html`, `/over`, `/over.html`, `/les/**`, `/privacy/**`, `/sitemap.xml`, `/robots.txt`: always from the server.

So offline the online features fail exactly as before: a class code, handing in, sharing and save codes return the same errors the UI already shows. Nothing is queued and nothing pretends to succeed. The only difference is that the app itself still opens.

## 4. Navigation and the URL contract

Navigations to an app path (`/`, `/kaart`, `/docent`, `/gedeeld/<code>`, unknown paths, and every legacy link with query parameters such as `/?theme=…`, `/?share=…`, `/?pp=…`, `/?screen=teacher&lesson=…`) are answered with the precached `index.html`. The router then does what it always did; query string and hash are untouched.

The deny-list (`NAVIGATE_FALLBACK_DENYLIST`) keeps these away from that fallback: `/teacher(.html)`, `/over(.html)`, `/les`, `/privacy`, `/animaties`, `/assets`, `/audio`, `/images`, `/fonts`, any path ending in a file name with an extension, and `/__…`. Only the path is tested, so a dot inside a query value does not turn a link into a "file".

A new static folder or page in `public/` must be added to the deny-list, next to the existing rule in `docs/v2/URL-CONTRACT.md` §6.

## 5. Updates

**Mode: the new version waits (`registerType: 'prompt'`, `skipWaiting: false`).** Not `autoUpdate`.

Why: with `autoUpdate` a new service worker takes over open pages at once and deletes the old files from the cache. A child in the studio would then run old code against a cache that no longer has the old chunks — the next screen fails to load, mid-lesson. And because uploads go by FTP, "the new version" may be half on the server at that moment.

What happens instead:

1. The browser checks `sw.js` on every page load; an open tab also checks every hour and when it becomes visible again.
2. A changed `sw.js` installs in the background: it downloads the complete new app into a new cache. If any file is missing (upload still running) the install fails, the old version keeps working, and it is retried at the next check.
3. The new version **waits**. The open page keeps running the old, complete version.
4. It becomes active when:
   - all SoundScout tabs/windows have been closed (the normal case: next school day), or
   - someone taps **Vernieuwen** in the notice. The notice only shows on the start screen or the teacher screen **and** only when no work is open (no clips, no collected sounds). A child who is working never sees it.
5. A first-ever install takes control of the open page immediately (`clientsClaim`), which is safe because there is no older version.

Reload and unsaved work: the notice cannot appear while there is work, and `applyUpdate` checks again. If a reload does happen with work open (the kill switch, or a second tab), the existing mechanisms apply: `workInProgress.ts` writes the open soundscape to `localStorage` on every change and on `pagehide`, and restores it at start-up ("Verder werken").

Second tab: if another tab applies the update, this tab still runs old code. When a screen then fails to load, it reloads once (guarded against loops).

### Uploading to Strato — order matters

1. Folders first: `assets/`, `fonts/`, `animaties/`, `images/`, `audio/`, `les/`, `privacy/`.
2. Then the loose files: `index.html`, `teacher.html`, `over.html`, `manifest.json`, `.htaccess`, `robots.txt`, `sitemap.xml`.
3. **`sw.js` last.**
4. Do **not** delete old files in `assets/` during the same upload; clean up at the next one.

Why `sw.js` last: it is the signal "a new version is complete". If it arrives before `index.html`, a device can store the *old* `index.html` under the new version. That device then keeps starting the old app (which still works as long as the old `assets/` files exist) until the next change.

**Repair for a wrong upload order:** raise `PRECACHE_ID` in `src/pwa/swRouting.ts` (`soundscout-1` → `soundscout-2`), build, upload in the right order. Every device then downloads the app afresh.

### Files that must not be cached by the browser

`public/.htaccess` sets this; check it after the first upload (DevTools → Network → response headers):

| File | Header | Why |
|---|---|---|
| `sw.js` | `no-cache, no-store, must-revalidate` | Otherwise the general `.js` rule gives it one year, and devices would not see a new version or the kill switch. The block must stay **after** the `.js` rule. |
| `*.html` | `no-cache` (was 1 hour) | `index.html` decides which version starts once the service worker is gone; an hour-old copy would delay the kill switch by an hour. |
| `manifest.json` | `no-cache` | New icon or name arrives without delay. |

The CSP is unchanged: `worker-src 'self' blob:` already allows `sw.js`, the manifest falls under `default-src 'self'`, and registration is inside the bundle (no inline script).

## 6. Kill switch

If the service worker misbehaves in the field:

1. Upload **`docs/v2/sw-kill-switch.js`** to the site root **as `sw.js`** (overwrite). No build needed.
2. On each device, at the next visit (or within an hour for an open tab), the file replaces the old service worker, deletes all its caches, unregisters itself and reloads the open tabs once. They then load from the server like before Phase 2.
3. Students' work is not in these caches (it lives in `localStorage` / IndexedDB) and is kept; an open soundscape comes back through "Verder werken".
4. Leave the file in place until the next normal upload. The app keeps registering `sw.js`; the kill file just removes itself again each time, which is harmless.

To ship without a service worker for a longer time, also remove the `registerServiceWorker()` call from `src/main.tsx` and keep the kill file as `sw.js`.

A device that is offline cannot receive the kill switch; it gets it at its first online visit.

Note: the kill file calls `skipWaiting()` during install **and** a few times after. In the test browser (Chromium 159) a call during install alone did not make the new worker take over; the plugin's own `selfDestroying` option has that same pattern and is therefore not used.

## 7. Testing

### Automated

```bash
npm run e2e:sw     # builds to node_modules/.cache/sw-e2e-dist, serves it on :5181, fake Supabase on :5182
```

| Test | Proves |
|---|---|
| a | First visit registers `sw.js`, it controls the page, the precache holds the app and no theme media or teacher/about/lesson pages. |
| b | After one online visit with the farm open: offline reload shows the start screen; map, location, collecting sounds and the studio work; every sound comes from the service worker; no request to the own site fails. Also checks that "offline" applies to the service worker itself. |
| c | `/teacher`, `/teacher.html`, `/over`, `/over.html`, `/les/drumbeat/`, `/sitemap.xml`, `/robots.txt`, `/privacy/` come from the server as their own documents; offline they fail instead of showing the app. |
| d | A Supabase GET reaches the backend every time, is in no cache, and fails offline; the class-code link offline shows the start screen, not the assignment. |
| e | `/?theme=winterspelen` resolves online (from the precache) and offline, the parameter stays; `/?screen=teacher-guide`, `/index.html`, `/kaart` and an unknown path open the app offline. |
| f | A new `sw.js` installs and waits; the open page is not reloaded or taken over; the notice appears on the start screen; "Vernieuwen" activates it. |
| g | The kill-switch file removes all caches and the controller, reloads exactly once (no loop), and later visits stay clean. |

Unit tests: `src/pwa/__tests__/swRouting.test.ts` (deny-list against every app path and legacy link; nothing from another origin is cacheable) and `warmThemeCache.test.ts`.

### By hand in Chrome

1. `npm run build && npm run preview`, open the address shown.
2. DevTools → **Application → Service workers**: `sw.js` is "activated and is running".
3. **Application → Cache storage**: one `soundscout-1-precache-…`, and after a few seconds `soundscout-audio-v1` and `soundscout-images-v1` fill up.
4. Tick **Offline** (Application → Service workers, or Network → throttling). Reload. Walk start → map → location → collect → studio → podium. Try "Ik heb een code" with a class code: it must report failure.
5. Update test: change any text, build again, reload once. Application shows a second worker "waiting to activate"; the page still runs the old one. Close all tabs and reopen, or use "Vernieuwen".
6. Reset: Application → Storage → **Clear site data**.

### By hand on an iPad

1. Needs HTTPS: test on the real site or a staging folder at Strato (a service worker does not register on a plain `http://` LAN address).
2. Open the site in Safari, open one location, wait about half a minute.
3. Switch on flight mode. Reload. Walk the same journey.
4. Add to Home Screen (Share → "Zet op beginscherm") and repeat from the icon: it must open without the Safari bars. An installed app has its own storage on iOS, so it needs its own first online visit.
5. Things to look at: sound after the first tap, the bottom bar in the studio and on the podium near the home indicator, rotation.

## 8. Installable app

`public/manifest.json`: `name`/`short_name` SoundScout, `start_url` and `scope` `/`, `display: standalone`, theme and background `#0F172A` (brand).

Icons were generated from the existing white logo on the brand colour with `npm run pwa:icons` (`scripts/generate-pwa-icons.mjs`, uses Playwright's Chromium): 192, 512, a maskable 512 with the logo inside the safe zone, and a 180 px `apple-touch-icon` (linked from `index.html`, `teacher.html`, `over.html`). No new artwork. The old manifest declared the 577×503 logo as 512×512, which browsers reject.

`viewport-fit=cover` was **not** added. With it, the fixed screens (map, location, studio, podium) extend under the iPad home indicator and only three components use the safe-area utilities today; that cannot be checked without a real device. Without it iOS keeps the app inside the safe area by itself, so standalone mode is safe as it is.

## 9. Not verified / known limits

| Item | Status |
|---|---|
| Real iPad / Safari | Not tested. Safari may clear the caches of a site that has not been visited for 7 days (not for an installed home-screen app); the class then needs one online visit again. |
| Real Apache at Strato | Not tested. Verify the three cache headers of §5 after the first upload. |
| School Chromebooks | Not tested on a managed device; some schools disable service workers or clear data at sign-out, which gives the old behaviour (no offline). |
| Warm-up load on school Wi-Fi | A class opening the app for the first time downloads about 10 MB per device in the background (two requests at a time). Tunable in `warmThemeCache.ts` (`CONCURRENCY`, `START_DELAY_MS`). |
| Storyboard / praatplaat images | Only cached after being shown. |
| Shared / teacher screens offline | They open, but all their data is online-only and fails. |
| `docs/TEKSTEN.md` | Not regenerated for the three new `pwa.*` strings (`npm run teksten:export`). |
