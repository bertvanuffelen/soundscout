# URL contract (V2 Phase 2 — routing)

> Status: implemented 16-11-2026. Gate: `npm run e2e` → `e2e/url-contract.spec.ts` (old links, 42 tests) and `e2e/routing.spec.ts` (new paths, 20 tests).
> Rule from the product owner: **every existing URL, deep link, share code and QR code keeps working.** This file is the inventory; the two specs are the proof.

## 1. How it fits together

| Piece | File | Role |
|---|---|---|
| Routes | `src/router/routes.tsx` | Code-based TanStack Router tree (SPA mode). One route per screen, each tagged with its `GameScreen` in `staticData.screen`. |
| Router | `src/router/router.ts` | The single router instance: plain-string search parsing, view transitions, binds the store. |
| Store ↔ router | `src/router/screenSync.ts` | The **only** place where `appStore` and the router meet (see §5). |
| Old links | `src/router/legacyEntry.ts` | Pure function: address in → destination + things to remember. Runs in the app layout's `beforeLoad`, so it works on every path. |
| Search schema | `src/router/searchParams.ts` | Zod schema (`validateSearch`) for everything the app reads from the query string. |
| Screen ↔ path table | `src/router/paths.ts` | `SCREEN_PATHS`, `pathForScreen()`. |
| Links the app hands out | `src/utils/entryLinks.ts`, `src/utils/saveCodeLink.ts` | Builders for share modals and QR codes. They keep the **old** form. |
| Entry snapshot | `src/router/entryLocation.ts` | The address bar as the visitor arrived, for `AuthContext` (password reset). |

Search values are always text. TanStack's default parser reads values as JSON, which would turn share code `12345E67` into the number 1.2345e71 and is why `parseSearch`/`stringifySearch` are replaced.

## 2. Existing URL shapes (must keep working)

"Test" = covered by `e2e/url-contract.spec.ts` (E), a unit test in `src/router/__tests__/` (U), or not automated (—, see §6).

| # | URL shape | Who generates it | What must happen | After the router | Test |
|---|---|---|---|---|---|
| 1 | `/` | typed, bookmarks, `<a href="/">` on /over, /teacher | Start screen | same | E |
| 2 | `/index.html` | hosting default | Start screen | start screen; address becomes `/` | E |
| 3 | any unknown path (`/foo`) | typos, old links | Start screen | start screen; address becomes `/` (was left as typed) | E |
| 4 | `/?theme=<id>` | theme cards on /teacher (`TeacherLandingPage`), teachers by hand | Theme loaded; parameter **stays** in the address bar on every screen (ThemePicker and work-in-progress read it later) | same; travels along as `/kaart?theme=<id>` | E |
| 5 | `/?theme=<unknown>` | — | Default theme `basis` | same | E |
| 6 | `/?dev=true` | developers | All dev flags on, parameter removed, other parameters kept | same | E U |
| 7 | `/?share=<8>` | `ShareLinkModal` (student, podium) | Shared player for that code; parameter removed | same; address becomes `/gedeeld/<8>` | E U |
| 8 | `/?pp=<4>` | `SharePraatplaatModal` link + QR (teacher) | Class code looked up → assignment landing; unknown code → start; parameter removed | same; landing is `/opdracht` | E U |
| 9 | `/?pp-share=<8>` | `SharePraatplaatModal` link + QR | Public praatplaat viewer; parameter removed | same; address becomes `/praatplaat/gedeeld/<8>` | E U |
| 10 | `/?album=<8>` | `ShareAlbumModal` link + QR | Public class album; parameter removed | same; address becomes `/album/<8>` | E U |
| 11 | `/?screen=teacher` | "Inloggen" on /teacher | Teacher login/dashboard; parameter removed | same; address becomes `/docent` | E U |
| 12 | `/?screen=teacher&lesson=<key>` (+`&tab=<tab>`) | "Open voor je klas" on /teacher; CTA on every static `/les/<key>/` page | As 11, and the lesson card / tab opens after login (`pendingLessonCardKey`, `pendingTeacherTab`) | same | E U |
| 13 | `/?screen=teacher-guide` (+`&section=<id>`) | "?" links on /teacher | Teacher guide, opened on that section; parameters removed | same; address becomes `/handleiding` | E U |
| 14 | `/?screen=reset-password#<supabase token>` | `src/lib/auth.ts` → Supabase reset mail | Teacher screen with the new-password form; `screen` removed, **hash kept** (the token is read later by the lazy Supabase client) | same; address becomes `/docent#<token>` | E U |
| 15 | `/#…type=recovery…` or `/#…error_code=otp_expired…` | Supabase (mail link without our parameter, expired link) | Teacher screen (reset form / "Link verlopen") | same | E U |
| 16 | `/#code=<6>` | `buildSaveCodeLink`: "mee naar huis" link, mail, QR (`SaveCodeTakeHome`), printed music card QR (`MusicCardModal`) | Start screen, code window opens and looks the code up; hash removed from the address bar at once (privacy) | same | E U |
| 17 | `/teacher`, `/teacher.html` | sitemap, search engines, start screen "Ben je docent?", /over | Public teacher page (own HTML, own SEO meta) | same | E |
| 18 | `/over`, `/over.html` | sitemap, footer links | About page (own HTML, own SEO meta) | same | E |
| 19 | `/les/<key>/` (`drumbeat`, `robotfabriek`, `verspringen`, `vrij-basis`) | `scripts/generate-les-pages.mjs`, sitemap, lesson cards on /teacher | Static HTML file, no app; CTA links to shape 12 | untouched (file on disk) | E |
| 20 | `/privacy/`, `/privacy/en/` | privacy modal, register form, sitemap | Static HTML | untouched | E |
| 21 | `/animaties/*.html` | iframes in the app | Static HTML | untouched | E |
| 22 | `/sitemap.xml`, `/robots.txt`, `/manifest.json`, `/assets/*`, `/audio/*`, `/images/*`, `/fonts/*` | build | Files | untouched | E (sitemap) |
| 23 | `/editor` (+`?location=<id>`), `/sequencer`, `/v2-mockup` | developers | **Dev only**: the tool. In production: start screen | same (production: address becomes `/`); `/editor` now shows a banner pointing to `/beheer` | E (dev) |
| 24 | Browser Back on a work screen | user | Stays inside the app | real history (see §4) | E |
| 25 | 4/6/8-character codes typed into "Ik heb een code" | students, teachers | Class code → landing; save code → studio/podium; 8 chars → template / share / praatplaat / album | unchanged (`ShareCodeInput` calls the same store actions) | — (§6) |

Combination rule, unchanged from before: if one link carries several destinations, the last in this order wins — `share`, `screen=teacher`, `screen=teacher-guide`, password reset, `pp-share`, `album`, `#code`. Old parameters work on **any** path, not only `/` (e.g. `/docent?album=X`).

## 3. New paths

| Screen (`GameScreen`) | Path | Cold open / hard refresh |
|---|---|---|
| start | `/` | start |
| compose-mode | `/nieuw` | → `/` |
| map | `/kaart` | → `/` |
| location | `/locatie/$locationId` | → `/` (unknown location id during a session → `/kaart`) |
| studio | `/studio` | → `/` |
| stage | `/podium` | → `/` |
| assignment-landing | `/opdracht` | → `/` (needs a looked-up class code) |
| praatplaat-select | `/praatplaat/plek` | → `/` (needs an active praatplaat) |
| compositions | `/composities` | stays |
| tutorial | `/uitleg` | stays |
| teacher-guide | `/handleiding` | stays |
| teacher (login + dashboard) | `/docent` | stays |
| shared | `/gedeeld/$code` | stays — reloadable and forwardable |
| shared-praatplaat | `/praatplaat/gedeeld/$code` | stays |
| shared-album | `/album/$code` | stays |
| — (admin dashboard, outside the app layout) | `/beheer` | stays — login gate, then "geen toegang" or the dashboard (`docs/v2/ADMIN-DASHBOARD.md`). Production route, own lazy chunk. Falls back to `index.html` in Apache and the service worker. Tests: `src/router/__tests__/paths.test.ts`, `e2e/admin.spec.ts` |

Why work screens go to `/` on a cold open: they need state that only exists in memory (collected sounds, the open composition, the class session). This is how the app already recovered from a refresh: `workInProgress.ts` silently restores the work and the start screen offers "Verder werken". Nothing is lost; the student is one tap away.

`?theme=` is carried along on every in-app navigation.

## 4. Back and Forward

Every screen change is a real history entry. Back walks the screens actually visited (podium → studio → location → map → start); Forward works too.

Different from before: the old `useLeaveGuard` back handling used a fixed table (studio → map, skipping the location). The warning on leaving or reloading with unsaved work (`beforeunload`) is unchanged.

Going Back into `/opdracht` or `/praatplaat/plek` after their state is gone lands on the start screen.

## 5. appStore and the router

`appStore.currentScreen` is kept, so the ~100 call sites of `goToStudio()`, `goToMap()`, … are unchanged. `src/router/screenSync.ts` → `bindStoreToRouter(router)` is the single link:

1. **Store → router.** A `goTo…()` action changes `currentScreen` (plus location id or share code). The subscriber computes the path with `pathForScreen()` and calls `router.navigate`. The screen only changes on screen when the router has resolved.
2. **Router → store.** On every `onResolved` (Back/Forward, a direct link, a redirect) `applyRouteToStore()` sets the store to the route's `staticData.screen` and path parameters, through the same `goTo…()` actions so their clean-up also runs on Back.

Without a router (unit tests, the e2e presentation harness) the store behaves exactly as before. Rule: screen components do not use router hooks.

## 6. Static hosting, teacher.html and over.html

- `public/.htaccess` needed no new rule: it already sends everything that is not an existing file or directory to `index.html`, which now covers the new paths. A comment documents this. CSP, caching and the `/teacher` and `/over` rewrites are untouched.
- The build is still multi-page (`index.html`, `teacher.html`, `over.html`), each with its own SEO meta and all loading the same app. Inside the app `/teacher`, `/teacher.html`, `/over` and `/over.html` are ordinary routes **outside** the app layout (no theme, auth or audio set-up), exactly like the old path check in `App.tsx`. Links between them and the app stay full page loads, so the visitor always gets the right HTML document.
- Dev-only routes are only added to the tree when `import.meta.env.DEV`.
- A new app path must never share its first segment with a file or folder in `public/` (`paths.test.ts` guards the current list).

## 7. Not covered by automated tests

| Gap | Why | Risk |
|---|---|---|
| Real Supabase data behind share/album/praatplaat/class codes | No backend in the test run; RPC calls are intercepted. "Not found" is tested for all three viewers, "found" for album, praatplaat and class code (free assignment). A *found* shared soundscape (`?share=`) with audio is not. | Low: the viewer components are unchanged and receive the same `code` prop. |
| Real password-reset mail | Needs a real Supabase token. Tested: the right screen opens and the token stays in the hash through the redirect. Not tested: Supabase accepting the token afterwards. | Medium: **please test one real reset mail before release.** |
| Share modals and QR images in the teacher dashboard | Need a logged-in teacher. The link text is unit-tested (`entryLinks`), and each built link is fed back through `resolveLegacyEntry`. The QR bitmap itself is not decoded. | Low. |
| Codes typed into "Ik heb een code" (shape 25) | Needs backend data per code type. Code path unchanged. | Low. |
| Apache behaviour (`.htaccess`) | No Apache in the test run; verified with `vite preview` on the production build only. | Low: no rule changed. Check `/docent` and `/gedeeld/TEST1234` once after upload. |
| Template (8-char) codes | Never had a URL form; only via the code window. | — |

## 8. Assertions that were changed after the baseline run

The contract spec was written and passed on the code without the router (42 tests), then re-run with it. One assertion had to change:

- *"het recovery-token in de #hash blijft staan…"* asserted that the **first** history write removed `?screen=` and kept the token. The router's very first write only stamps its own state on the unchanged address, so the test now looks for the first write that removed `?screen=` and requires the token in it and in every write before it. Same guarantee, and it still passes on the old code (there the first write is that write).
