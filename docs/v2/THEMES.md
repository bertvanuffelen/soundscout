# Themes as data (V2 Phase 3 — theme platform)

> Status: implemented 16-11-2026. Themes are read from manifests; the three old TypeScript themes remain only as test fixtures until the separate deletion step (§7).
> Gates: `src/themes/__tests__/equivalence.test.ts` (manifest = old TS theme, every text identical in nl and en), `e2e/themes.spec.ts`, `e2e/sw/offline.sw.ts` (h).

## 1. Files

| What | Where | Made by |
|---|---|---|
| Manifest per theme | `public/themes/<id>/manifest.json` | conversion (once), later the dashboard; by hand is possible |
| Theme index (picker metadata) | `public/themes/index.json` | `npm run themes:index` — never edit by hand |
| JSON Schema of the manifest | `public/themes/manifest.schema.json` | same script (from the Zod schema) — for `check-pakket.py` |
| Bundle copies | `src/themes/bundled/basis.manifest.json`, `src/themes/bundled/index.json` | same script (Vite cannot import from `public/`) |
| Schema + types | `src/themes/manifest.ts` | |
| Content rules (safe zone, spacing, durations, integrity) | `src/themes/rules.ts` | |
| Manifest → runtime `ThemeConfig` / `ThemeSummary` / i18n keys | `src/themes/mapping.ts` | |
| Source of themes (interface + static implementation) | `src/themes/repository.ts` | |
| Sync cache, i18n registration, `loadTheme` | `src/themes/registry.ts` | |
| Public API for the app (unchanged names) | `src/data/themes/index.ts` | |
| Script | `scripts/export-theme-manifests.mjs` (`--from-ts`, `--check`) | runs TS through Vite `runnerImport`, no extra tools |

Media did not move: `assetBase: "/"` keeps `audio/themes/...` and `images/themes/...` at their current URLs.

## 2. Manifest format (schemaVersion 1)

```jsonc
{
  "schemaVersion": 1,
  "id": "winterspelen",
  "version": 1,                       // immutable once published; a change = a new version
  "status": "published",              // "draft" is not put in the index
  "isPublic": true,                   // false = only via link / assignment / save code
  "season": { "from": "11-15", "until": "01-15" },   // optional, may cross new year
  "sort": 20,                         // picker order (low first)
  "assetBase": "/",                   // optional; omitted = the manifest's own folder
  "colors": { "primary": "#3B82F6", "accent": "#60A5FA", "mapBackground": "#E0F2FE" },
  "map": {
    "image": { "nl": "images/themes/winterspelen/plattegrond.jpg", "en": "…-en.jpg" },  // nl required
    "positions": [{ "locationId": "winterdorp", "x": 83.2, "y": 78.8 }]
  },
  "locations": [{
    "id": "winterdorp", "image": "images/themes/winterspelen/winterdorp.jpg",
    "ambient": "…",                   // optional
    "hotspots": [{ "id": "winterdorp-hond", "x": 45.3, "y": 87.1, "sampleId": "winterdorp-hond", "visualHint": "pulse" }]
  }],
  "samples": [{
    "id": "winterdorp-hond", "locationId": "winterdorp", "file": "audio/themes/…/hond.mp3",
    "duration": 4.0, "icon": "Dog", "color": "#FB923C",
    "kind": "sfx"                     // optional: "sfx" | "loop"; unknown for the migrated themes
  }],
  "texts": {
    "nl": { "name": "Winterspelen", "description": "…", "locations": { "winterdorp": { "name": "Winterdorp", "description": "…" } }, "samples": { "winterdorp-hond": "Hond" } },
    "en": { "name": "Winter Games", "…": "gaps allowed, fall back to nl" }
  }
}
```

- Paths are relative to `assetBase` (or to the manifest folder); an absolute path or URL is used as is.
- Any language code may be added under `texts` without code changes; `nl` must be complete.
- `textKeys` (location) / `textKey` (sample) exist only for `basis`: its old i18n keys (`locations.boerderij.name`, `samples.boerderij-lach`) are stored inside saved compositions and libraries and must keep resolving. New themes omit them and get `themes.<id>.name`, `themes.<id>.description`, `themes.<id>.locations.<loc>`, `…<loc>_desc`, `themes.<id>.samples.<sid>`.

### Content rules (`checkManifest`)

| Rule | Severity | Migrated themes (basis / winterspelen / piraten) |
|---|---|---|
| integrity: duplicate id, hotspot → unknown sample, map → unknown location, missing nl text | error, **loader refuses** | 0 / 0 / 0 |
| location without map position | error | 0 / 0 / 0 |
| hotspot outside safe zone 12–88 % vertical | error | 0 / 2 / 3 |
| hotspots overlap on the smallest scene (373×210 px, 44 px targets) | error | 3 / 1 / 6 |
| map markers overlap on the smallest scene | warning | 0 / 0 / 0 |
| sfx outside 2–8 s, loop ≠ 8.0 s (kind known) | error | n/a (no kind recorded) |
| duration outside 2–8 s, kind unknown | warning | 0 / 1 / 4 |
| missing translation, sample without/with multiple hotspots, hotspot in another location than its sample | warning | 0 / 0 / 0 |

Design rules (safe zone, spacing, duration) are for the dashboard to enforce on new work; the loader only refuses integrity errors, so the existing themes keep working.

## 3. How the app resolves a theme

1. **Start-up (synchronous):** the registry parses the bundled `basis` manifest and the bundled index copy, registers their texts in i18next, and renders. Pickers, assignments and the praatplaat catalogue use `ThemeSummary` (names, map image, season, visibility, location list) and never need a full manifest.
2. **Background:** `refreshThemeIndex()` fetches `/themes/index.json`; a newly published theme appears in pickers opened after that.
3. **`?theme=<id>` or `setTheme(id)`:** known id → `loadTheme(id)` fetches `/themes/<id>/manifest.json` (Zod + integrity check), maps it to `ThemeConfig`, registers its texts, caches it. Unknown id → refresh the index once, else `basis`. AppShell shows "Laden…" until the initial theme is there; `setTheme` returns a Promise (the latest call wins).
4. **i18n:** manifest texts are added with `i18n.addResources` under the same keys the app already uses; for the three migrated themes they are identical to `nl.json`/`en.json` (which still contain them — see §7).

`ThemeRepository` (`listThemes`, `getManifest`, `getTheme`) is the seam for the Supabase Storage implementation: `setThemeRepository(createSupabaseThemeRepository(...))`, same return shapes, versioned URLs such as `themes/<id>/v<n>/manifest.json` with `assetBase` omitted.

## 4. Caching and offline

- Service worker rule `isThemeData` (`/themes/**.json`, same origin) → **NetworkFirst**, cache `soundscout-themes-v1`, 4 s network timeout. Online always the published version (a publish is visible on the next load, never stale "forever"); offline the last seen one.
- Warm-up (`src/pwa/warmThemeCache.ts`) fetches `/themes/index.json` and the active theme's manifest together with its media, so one online visit is enough even when the first page load happened before the service worker took control.
- `basis` needs no network at all (bundled).
- `/themes` is on the navigation deny-list.

## 5. Adding a theme without code (today)

1. Put media under `public/audio/themes/<id>/…` and `public/images/themes/<id>/…` (or next to the manifest and omit `assetBase`).
2. Write `public/themes/<id>/manifest.json` (validate against `manifest.schema.json`).
3. `npm run themes:index` — validates, prints the rule report, refuses manifests with integrity errors or `status: "draft"`, writes `index.json` and the bundle copies.
4. Upload `themes/` (index last). Already-built apps pick the theme up from the refreshed index; a rebuild only matters for the bundled copy.

Later the Administrator Dashboard replaces steps 2–4 (draft → checks → publish an immutable version).

## 6. Mapping to the `.sspack` (v2-theme-sinterklaas-pipeline §4)

| `.sspack` | Here |
|---|---|
| `manifest.json` | same file, this schema; `assetBase` omitted so `audio/derived/x.mp3` resolves inside the pack/version folder |
| `"kind": "sfx" \| "loop"` | same field name |
| `"visibility": "manual"` | `isPublic` + optional `season`; the manual switch is `isPublic` |
| `texts` per entity (`location.texts.nl.name`, `sample.texts.nl`) | **one top-level `texts` block per language** (adding a language = one block) |
| samples nested under locations | **flat `samples[]` with `locationId`** (keeps order, matches runtime) |
| `map.image: { nl, en }`, `map.positions` | same |
| `lengthSamples`, `bpm`, `bars` | not in schema v1 (checks use `duration`); can be added as optional fields |
| `credits.json`, `hotspots.json`, `report.json`, image/audio masters/derived | not part of the manifest; for the dashboard import |
| storyboards, praatplaten | still in `src/data/storyboards.ts` / `praatplaatImages.ts` (later the same pattern) |

## 7. Deleting the TypeScript themes (separate, reviewed step)

Files that can then be deleted: `src/data/themes/basis/*`, `src/data/themes/winterspelen/*`, `src/data/themes/piraten/*` (keep `piraten/BRONNEN.md` content elsewhere), `src/themes/export/legacyThemes.ts`, `src/themes/convert.ts` (only if `--from-ts` is no longer needed).

Still importing them: `src/themes/export/legacyThemes.ts` (conversion + equivalence fixture), `src/data/themes/__tests__/mapLocale.test.ts` (`piratenTheme`), `e2e/harness/presentationHarness.tsx` (basis `samples`), `src/utils/themeCodegen.ts` (writes new TS themes — to be replaced by manifest output). At the same time the theme strings can leave `nl.json`/`en.json` (they come from the manifests), after deciding how teacher views show sample names of a theme that is not loaded (load the composition's theme first).

## 8. Not done / open

- Compositions do not yet store the theme version (§3 of the proposal).
- Pickers read the list when they render; a module-level list in a teacher chunk (`ClassDetail`, `ActivateAssignmentModal`, `LessonCardEditorModal`) is taken when that chunk loads (normally after the index refresh).
- Sample names of a non-loaded, newly added theme (no strings in `nl.json`) show as keys in teacher views until that theme is loaded.
