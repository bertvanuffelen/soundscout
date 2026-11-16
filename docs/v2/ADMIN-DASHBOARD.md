# Administrator Dashboard (`/beheer`) — V2 Phase 3

> Status: built 16-11-2026, **not yet connected to the real Supabase project.** Migration `supabase/migrations/043_theme_platform.sql` exists as a file only; nothing has been applied anywhere.
> Gates: `npm run test:db` (043 suite, PGlite), `src/admin/__tests__`, `src/themes/__tests__/supabaseRepository.test.ts`, `e2e/admin.spec.ts`, `e2e/sw/offline.sw.ts` (i).

## 1. What it does

`/beheer` is a page for administrators (Bert), behind the normal teacher login. Its own lazy chunk; students never download it.

| Section | What you can do |
|---|---|
| **Thema's** | All themes: those managed in the dashboard (database) and those built into the app (`public/themes`, label "Ingebouwd"). Per theme: cover, status (Concept / Gepubliceerd / Verborgen / Ingebouwd), season, version, number of errors and warnings from `src/themes/rules.ts`. For dashboard themes: reorder (= order in the student theme picker), switch "In de leerlingkiezers" on/off, set or clear the season window, hide/show, see all versions, **Publiceren** (blocked while there are errors) and **Terug naar v<n>** (previous published version). "Open in editor" and "Bekijk als leerling" for every theme. |
| **Editor** | The old `/editor`, now inside the dashboard. Per location: drag hotspots on the picture (safe zone drawn, errors live; arrow keys move 1 %, Shift 5 %), add/remove hotspots. Sounds: add from a local file (decoded in the browser, length measured, type sfx/loop, name NL/EN, icon, colour, source and licence), listen, remove. Map: drag location markers. Images: replace a location picture or the map (size measured and reported; must be exactly 1920×1080; nothing is cropped or re-encoded). Texts: NL and EN for theme, locations and sounds, with "ontbreekt" markers. **Concept bewaren** saves a new unpublished version; **Download als themapakket** gives a `.sspack` (works without the database). |
| **Importeren** | A `.sspack`/`.zip`, or a folder. Every check runs again in the browser (schema, all rules, file present, format by content, size, image 1920×1080, audio decodable and measured — the measured length replaces the declared one — and credits: source + licence, no NC/ND, CC BY with author and URL). `report.json` from the pack is only displayed, never trusted. "Maak concept" opens it in the editor; saving uploads the files. |
| **Statistieken** | The existing usage statistics (`UsageStatsPanel` content). The modal in the teacher dashboard stays as well; that header now also has a "Beheer" link for administrators. |

Who is an administrator is decided by the database (`admins` table, `is_admin()`), see §3.

## 2. One-time setup (product owner)

Everything below is done by hand in the Supabase dashboard. Nothing else needs to be created: the migration makes the tables, view, functions, triggers, RLS, the bucket and (normally) the storage policies.

1. **SQL Editor → run `supabase/migrations/043_theme_platform.sql`** (whole file). It is additive and idempotent; running it twice is fine.
2. **Make yourself administrator** (same SQL Editor; use the address you log in with as a teacher):
   ```sql
   INSERT INTO public.admins (user_id)
     SELECT id FROM auth.users WHERE email = 'jouw-adres@example.nl'
     ON CONFLICT DO NOTHING;
   ```
   Check: `SELECT * FROM public.admins;` shows one row.
3. **Storage policies — only if step 1 printed the warning** `043: geen rechten om storage-policies te maken`. Some Supabase projects do not let the SQL Editor create policies on `storage.objects`. Then: *Storage → Policies → bucket `themes` → New policy → For full customization*, four times:

   | Name | Operation | Target role | Definition |
   |---|---|---|---|
   | `themes_bucket_admin_select` | SELECT | authenticated | `bucket_id = 'themes' AND public.is_admin()` |
   | `themes_bucket_admin_insert` | INSERT | authenticated | WITH CHECK `bucket_id = 'themes' AND public.is_admin()` |
   | `themes_bucket_admin_update` | UPDATE | authenticated | USING and WITH CHECK `bucket_id = 'themes' AND public.is_admin()` |
   | `themes_bucket_admin_delete` | DELETE | authenticated | `bucket_id = 'themes' AND public.is_admin()` |

   No read policy for `anon` is needed: the bucket is **public**; files are read through `…/storage/v1/object/public/themes/…`.
4. **Check the bucket**: *Storage* shows a bucket `themes`, marked Public, 5 MB file limit. If it is missing (unusual — the migration inserts it), create it there with exactly that name and switch "Public bucket" on.
5. **Upload the new build**, `.htaccess` included (§5). Nothing in `.env` changes. `VITE_ADMIN_EMAILS` may stay; it only matters until step 1 is done (§3).

## 3. Who may do what

| | anon (student) | teacher | admin |
|---|---|---|---|
| read published themes + manifests (`themes`, `theme_versions`, view `published_themes`) | ✓ | ✓ | ✓ |
| see drafts | – | – | ✓ |
| write `themes`, `theme_versions`, `theme_assets` | – | – | ✓ (RLS) |
| upload/replace/delete in bucket `themes` | – | – | ✓ (storage policies) |
| `publish_theme_version`, `rollback_theme` | – | – (`not_admin`) | ✓, max 10 per minute (`check_rate_limit`) |
| change `admins` | – | – | – (SQL Editor only) |

- **Security is in the database only.** The dashboard's own check (`useIsAdmin`) only decides which screen to show. A teacher who forces their way into the page gets every write refused by RLS.
- `useIsAdmin` asks `is_admin()`, cached per user in TanStack Query. If that function does not exist yet (migration 043 not run: `PGRST202`/`42883`), it falls back to `VITE_ADMIN_EMAILS` — a **UI convenience** so the Statistics button keeps working; the dashboard then runs in "local only" mode (view, edit, import, download a pack; no saving or publishing). Any other error = not an admin.
- Published versions are **immutable** (trigger `theme_versions_guard`): no update, no delete. Publishing, and pointing the live version elsewhere, is only possible through the two RPCs (a transaction-local flag; direct table writes are refused with `theme_publish_via_rpc_only`). A theme that was ever published cannot be deleted, only hidden.
- `status` follows the live version: without a published version it is always `draft`; `hidden` keeps the theme loadable (links, running assignments, save codes) but removes it from every picker.
- The published-themes view is a plain table read, not an RPC, so it has no rate limit (it returns only public data, like a static file).
- Draft media in the bucket are readable by anyone who knows the exact URL (public bucket). They are not listed or linked anywhere. Do not put anything secret in a draft.

## 4. How a published theme reaches students

1. **Save a draft** → the files go to `themes/<id>/v<n>/…` in Storage, the manifest to `theme_versions` (unpublished), credits to `theme_assets`. Unchanged files are not copied: the new manifest points to `../v<old>/…` (old versions never change, so that is safe). A theme that started as a built-in one keeps its existing media on `/images/…` and `/audio/…`.
2. **Publish** → `publish_theme_version(id, n)` checks the manifest shape, sets `published_at` and `themes.published_version`. From that moment the view `published_themes` returns it.
3. **The app** (one place: `src/themes/install.ts` → `setThemeRepository`) merges three sources (`src/themes/supabaseRepository.ts`):
   - the static themes (`/themes/index.json` + manifests; `basis` from the bundle);
   - `GET <supabase>/rest/v1/published_themes` with the anon key — a plain `fetch`, **not** the Supabase client, so students do not download its 168 kB;
   - a draft opened with "Bekijk als leerling" in **this tab** (`sessionStorage`, never sent anywhere; a banner at the bottom offers "Voorbeeld stoppen").

   Rules: `basis` always from the bundle; a Supabase theme overrides the static copy of the same id; static-only themes keep working; visibility, season and order come from the `themes` row (not from the immutable manifest); a broken manifest is skipped, not the whole list.

   **Source of truth for a manifest is the database** (`theme_versions.manifest`), not a file in Storage: the database enforces immutability and publishing is one checked transaction; a Storage object can be overwritten in place and is not tied to `published_version`.
4. **Pickers** see the new theme after the background index refresh (next visit), and `?theme=<id>` refreshes on demand.
5. **Roll back** → `rollback_theme(id, m)` points `published_version` to an earlier published version. A device that already loaded the newer manifest keeps it until it reloads.

### Offline devices

- Media from the bucket are cached by the service worker (`soundscout-theme-media-v1`, cache-first; each version has its own path, so a cached file is never stale). The warm-up fetches all media of the active theme, Storage URLs included.
- The list of published themes comes from REST, which the service worker never caches. The app keeps the **last successful list in `localStorage`** (`soundscout:themes:published-v1`) and uses it when Supabase cannot be reached. So: one online visit with a published theme → that theme also opens offline.

### What happens if Supabase is down

| Situation | Student app | Dashboard |
|---|---|---|
| Supabase not configured | static themes only | login impossible (as for the teacher dashboard) |
| unreachable / 5xx / slower than 4 s | static themes + last seen published list; `basis` always | error in the list; nothing is saved |
| migration 043 not run (404 / `PGRST205` / `42P01`) | static themes; not retried this session | "local only" mode (banner) |
| a published manifest is invalid | that theme is skipped (its static copy, if any, is used) | shown with its errors |

## 5. CSP and service worker

- `public/.htaccess`: the project host `https://xpjutrzonnranyqyqfzj.supabase.co` was already in `connect-src`; it is now also in `img-src` and `media-src` (pictures and sounds of published themes). Exactly that host, no wildcard. It is the host of `VITE_SUPABASE_URL` in production; `.htaccess` is a static file and cannot read the variable, so if the project ever changes, edit all three directives. `src/pwa/__tests__/csp.test.ts` fails if they disagree.
- `vite.config.ts` / `src/pwa/swRouting.ts`: one new runtime rule, `isThemeBucketMedia` — GET only, path `/storage/v1/object/public/themes/…` with a media extension. Everything else of Supabase (REST, RPC, auth, other buckets) stays uncached; `e2e/sw` (d) and (i) prove both sides. The rule matches the path, not the host, because Workbox copies the function into `sw.js` as text and it cannot see the env variable.

## 6. Theme pack format

The importer accepts our own schema (`src/themes/manifest.ts`; JSON Schema in `public/themes/manifest.schema.json`), paths relative to the pack folder, no `assetBase`:

```
<id>.sspack (zip, optionally with one top folder)
├── manifest.json      required
├── credits.json       { "<path or file name>": { source, author, licence, url | licenceUrl, prompt | jobId } }
├── report.json        shown only
├── hotspots.json      ignored (positions belong in manifest.json)
├── images/…  audio/…  whatever paths the manifest names
└── …/masters/…        allowed, ignored
```

Fields the pipeline blueprint (`v2-theme-sinterklaas-pipeline.md` §4.1) uses that schema v1 does **not** have:

| Pipeline | Schema v1 | Effect on import |
|---|---|---|
| `visibility: "manual"` | `isPublic` (+ `season`), `status`, `version` | schema error (missing fields) |
| texts per entity (`location.texts`, `sample.texts`) | one top-level `texts` block per language | schema error |
| samples nested under locations | flat `samples[]` with `locationId` | schema error |
| image references without extension (`"plattegrond-nl"`) resolving to `images/derived/<name>-640/1280/1920.avif|webp|jpg` + blur placeholder | one file path per image | "file missing"; responsive variants not supported |
| `lengthSamples`, `bpm`, `bars` | — (length is measured) | silently dropped |
| `storyboards`, `praatplaten` | — (still `src/data/storyboards.ts`, `praatplaatImages.ts`) | dropped |
| credits `title`, `model`, `approved` | not stored (`theme_assets`: source, author, licence, licence_url, generation_prompt) | dropped |
| loudness / true peak in `report.json` | not measured by the dashboard | not checked |
| `hotspots.json` with `status: "draft"` | positions in `manifest.json` | ignored |

So the content track must write `manifest.json` in schema v1 (thema-studio Phase E, validated against `manifest.schema.json`).

## 7. Not done / known gaps

- **No "Nieuw thema" or "Locatie toevoegen"** in the editor: a new theme starts from a pack (import) or from an existing theme. The old `ThemeWizard` (idea → prompts → code export) has no counterpart; it stays in `/editor` (dev only, now with a banner pointing here).
- **No image derivatives** (AVIF/WebP in three widths) and **no loudness measurement**: the dashboard reports size and length; it never re-encodes.
- Compositions do not yet store the theme version (proposal §3.1), so a rollback or a new version changes what an already running assignment hears on its next load.
- Pickers in teacher chunks that read the theme list when the chunk loads (THEMES.md §8) see a newly published theme only after a reload.
- Rule detail texts from `rules.ts` are Dutch only; each issue's headline is translated.
- A draft with new local files can only be previewed after saving (blob URLs do not survive the page change).
- Storyboards, praatplaten, built-in lesson cards and the Luisterspiegel question bank (mockup sections) are not part of this step.
- The ≈ 17 kB of dashboard texts live in the shared `nl.json`/`en.json`, so they are in the main chunk (≈ 6 kB gzip).

## 8. Checklist for the product owner (not verified automatically)

- [ ] Migration 043 runs in the SQL Editor without errors; note whether the storage-policy warning appeared (then do §2 step 3).
- [ ] Log in at `/beheer`: you see the dashboard, not "Geen toegang". A second, non-admin teacher account sees "Geen toegang".
- [ ] Import a small real pack and save the draft: files appear in Storage under `themes/<id>/v1/`, a row in `theme_versions` with `published_at` empty.
- [ ] As the non-admin teacher, try an insert into `theme_versions` and an upload to the bucket (browser console on `/beheer`) — both refused.
- [ ] Publish: `/?theme=<id>` in a private window shows the theme; images and sounds load from `*.supabase.co` without CSP errors in the console.
- [ ] Try to edit the published version in the Table Editor → refused (`theme_version_immutable`).
- [ ] "Terug naar v1" after publishing v2; a private window shows v1 again.
- [ ] One online visit with the published theme, then offline (DevTools): the theme still opens and its sounds play.
- [ ] Real login on `/beheer` (only faked in tests).
