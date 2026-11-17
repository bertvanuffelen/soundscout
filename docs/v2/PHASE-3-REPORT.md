# V2 Phase 3 — theme platform

> Status: **implemented** (16-11-2026). All automated gates pass. Migration 043 is a file only: it has **not** been run on the real Supabase project. Until it is, the dashboard can edit and export theme packs, and students keep getting the themes from the static files on Strato.

## What was built

| Part | Result | Detail |
|---|---|---|
| Manifest schema | Zod schema with texts per language (`nl` required, any other language allowed), map, locations, hotspots, samples (optional `kind` sfx/loop), season, visibility. JSON Schema exported for the content-track tooling. | `src/themes/manifest.ts`, `public/themes/manifest.schema.json` |
| Rules | Integrity rules (the loader refuses a theme that breaks them) and design rules (safe zone 12–88 %, hotspot spacing at the smallest scene, sound durations) with severities. | `src/themes/rules.ts` |
| Three themes converted | `basis`, `winterspelen`, `piraten` as `public/themes/<id>/manifest.json` + `index.json`. Media unchanged. | `scripts/export-theme-manifests.mjs` |
| Loader | `ThemeRepository` with a static implementation and a Supabase implementation that merges on top; `basis` bundled for offline. | `src/themes/` |
| Equivalence gate | The converted themes are identical to the originals, including every name in Dutch and English. Now permanent: compared against frozen JSON copies of the originals. | `src/themes/__tests__/equivalence.test.ts` |
| Old theme files | `src/data/themes/winterspelen` and `piraten` deleted; `basis` kept as decided. | `docs/v2/THEMES.md` §7 |
| Audio memory budget | 96 MB on iPad (no `deviceMemory`), 64–192 MB elsewhere; least-recently-used sounds released above budget; anything in use is pinned. | `docs/v2/AUDIO-MEMORY.md` |
| Administrator Dashboard | `/beheer`: theme overview, editor (hotspots with live safe-zone and spacing checks, sounds, map, images, NL/EN texts), theme-pack import with every check re-run, preview as student, publish and roll back, statistics. | `docs/v2/ADMIN-DASHBOARD.md` |
| Migration 043 | `admins`, `themes`, `theme_versions` (published = immutable), `theme_assets`, view `published_themes`, publish/rollback RPCs (admin-only, rate-limited), public bucket `themes` with admin-only writes. Tested on PGlite (16 tests). | `supabase/migrations/043_theme_platform.sql` |

## Gates

| Gate | Result |
|---|---|
| `npx tsc -b` | clean |
| Unit tests | 882 pass |
| DB tests (PGlite) | 036 and 043 green |
| `npm run build` | succeeds |
| `npm run e2e` | 95 pass; layout screenshots unchanged at all 7 sizes |
| `npm run e2e:sw` | 9 pass |
| Lint | 23 pre-existing errors; none in new code |

## One-time setup for Bert

1. Run `supabase/migrations/043_theme_platform.sql` in the Supabase SQL editor.
2. Run the commented admin insert at the bottom of that file with your own e-mail.
3. If the migration logs a storage-policy warning: create the four policies by hand (`docs/v2/ADMIN-DASHBOARD.md` §2 step 3).
4. Check that bucket `themes` exists and is Public.
5. Upload the build including `.htaccess` (the CSP now also allows the Supabase host for images and audio). The upload order from Phase 2 still applies: `sw.js` last.

## To check by hand (needs the real project)

- [ ] `/beheer` with your admin account shows the dashboard; with a non-admin teacher account it shows "Geen toegang".
- [ ] A non-admin cannot insert a theme version or upload to the bucket.
- [ ] Import or edit a theme, save the draft, publish, then open `/?theme=<id>` in a private window: no CSP errors, sounds play.
- [ ] Editing a published version is refused; rollback from v2 to v1 works.
- [ ] One online visit, then offline: the published theme still opens and plays.

## Things to know

- **The design rules flag the existing themes.** Hotspots outside the safe zone (winter 2, pirates 3) and overlapping hotspots at the smallest scene (city 3 pairs, winter 1, pirates 6). The app loads them as before; the dashboard blocks *publishing* a theme with these errors, so they must be fixed before a theme is republished through it. *Update 17-11-2026: fixed; all 15 hotspots moved, see `docs/v2/THEMES.md` §2.*
- **Rollback affects running assignments.** Compositions do not yet store the theme version they were made with, so a rollback or republish changes a theme for everyone on their next load.
- **Not built in the dashboard:** "new theme" and "add location" from scratch (themes come in by importing a pack), image derivatives (AVIF/WebP) and a loudness check, and the mockup sections Storyboards & platen, Leskaarten and Reflectievragen.
- **The content track's pack format differs from schema v1** in several fields (visibility, texts per item, nested samples, image variants, loop metadata, extra credit fields). The table is in `docs/v2/ADMIN-DASHBOARD.md` §6; the two must be aligned before the Sinterklaas pack is imported.
- **Theme names are still in `nl.json`/`en.json`** as well as in the manifests, so the app did not get smaller yet.
- **The sequencer keeps its own second copy of its sounds**, outside the memory budget.
- **Not verified on a real iPad or Chromebook**, neither the memory budget nor the themes from storage.
