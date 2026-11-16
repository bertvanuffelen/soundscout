# V2 staging — setup

A separate copy of SoundScout V2 for testing on real devices. The live site (soundscout.nl, `main`) is not touched; staging uses the production Supabase project with test-teacher accounts (§2).

## 1. Strato: use a subdomain, not a subfolder

**Use `staging.soundscout.nl`** (or `v2.soundscout.nl`; the name does not matter). A subfolder such as `soundscout.nl/v2/` does **not** work:

| Why a subfolder breaks | Detail |
|---|---|
| Absolute paths | The router uses `/kaart`, `/studio`, `/docent`; assets are loaded from `/assets/…`, theme files from `/themes/…`, audio from `/audio/…`. Under `/v2/` all of these point at production. |
| Service worker | It is registered for the scope `/` of its origin. Under a subfolder it would sit on the production origin and could cache staging files for production visitors. |
| `.htaccess` | The fallback to `index.html` and the cache rules assume the site root. |

A subdomain is a separate origin, which also gives the right isolation for testing:
- the staging service worker can never affect soundscout.nl;
- localStorage and IndexedDB on staging are separate from production on the same device, so testing never touches pupils' saved work.

**Steps in the Strato panel**
1. Domains → soundscout.nl → add subdomain `staging`.
2. Point it to its **own** web folder (e.g. `/staging`), not to the production folder.
3. Switch on SSL for the subdomain (HTTPS is required: service workers and the audio worklets only run on HTTPS).
4. Upload the contents of `dist/` from `npm run build:staging` into that folder, **including `.htaccess`** (hidden file). Upload `sw.js` last.

`npm run build:staging` (new) does two things on top of a normal build:
- if `VITE_SUPABASE_URL` points at another project than production, it puts that host in the CSP of `dist/.htaccess` (otherwise the browser blocks every Supabase call); with the production project nothing changes;
- it keeps staging out of search engines: `X-Robots-Tag: noindex, nofollow`, `robots.txt` with `Disallow: /`, no sitemap.

The production build (`npm run build`) is unchanged; this is checked.

## 2. Supabase: use the production project (recommended)

Staging runs against the **real Supabase project**, with dedicated test-teacher accounts. This is safe enough here, and it tests against the real data structure, including the built-in lesson cards and system templates:

| Check | Result |
|---|---|
| Does V2 need anything production lacks? | Only migration 043. Every other database function V2 calls already exists on production (checked against `schema.sql`, `templates.sql` and `migrations/002–042`). |
| Does 043 change V1 tables? | No. It only adds `admins`, `themes`, `theme_versions`, `theme_assets`, the view `published_themes`, two functions and the bucket `themes`. |
| Does the live V1 site read the new tables? | No. V1 has no code for them, so publishing a theme from staging changes nothing for pupils on soundscout.nl. |

**Conditions**
1. **Run migration 043 on production first** (`docs/v2/ADMIN-DASHBOARD.md` §2), then add your admin row.
2. **Use only test-teacher accounts** on staging (e.g. `bert+staging-a@…`, `bert+staging-b@…`), and test classes with clearly fake names. A pupil device on staging should only use the class codes of those test classes.
3. **Auth redirect:** Authentication → URL configuration → add `https://staging.soundscout.nl/**` to the redirect URLs. Leave the Site URL on `https://soundscout.nl`.
4. **Expect these side effects:**
   - anonymous usage counts (`usage_stats`) include your staging visits;
   - rate limits are shared with production (normal testing stays far below them);
   - compositions saved from staging may contain new V2 fields (tempo, Vervormen, melody). Only the test accounts see them.
5. **Clean up afterwards:**
   - delete the test-teacher accounts in Authentication → Users (their classes and hand-ins are deleted with them);
   - set the test theme to hidden in `/beheer`. A theme that was ever published cannot be deleted, by design; hidden and `isPublic: false` keeps it out of every picker.

`.env.staging` then holds the **production** URL and anon key; `npm run build:staging` leaves the CSP host as it is.

**If you later want a separate test project instead:** `supabase db dump` needs the Supabase CLI and Docker. Ask for a ready-to-paste SQL bundle (schema + built-in lesson cards + system template seed); it is not prepared now, because the production route above covers the test.

**The three loose SQL files in `supabase/`** (all from February 2026, before the numbered migrations):

| File | What it does | Already in `schema.sql`? |
|---|---|---|
| `migration-check-constraints.sql` | Length limits on teacher, class and submission text fields, 1 MB limit on composition data | Yes, the same constraints are inline in `schema.sql` |
| `migration-delen-met-link.sql` | Share links: `share_code` columns on `submissions`, `share_composition` / `get_shared_composition` functions, public-read policy | Not in `schema.sql`; later migrations (013, 031, 036) replace parts of it |
| `migration-max-classes.sql` | `teachers.max_classes` column and a trigger that enforces the class limit | The column yes, the trigger no |

They only matter for rebuilding a database from scratch. Production evidently has them (share links and the class limit work).

## 3. Build and upload

```bash
cp .env.staging.example .env.staging
```

Fill in the production URL and anon key (see §2), then:

```bash
npm run build:staging
```

Upload `dist/` to the staging folder, `sw.js` last. Check in a browser:
- `https://staging.soundscout.nl` opens the app;
- the response headers of `/sw.js`, `/index.html` and `/manifest.json` say `no-cache`;
- `/robots.txt` says `Disallow: /`.

For the upgrade test in the runbook (step A) you first need the **current production version** on staging. Build it from `main` with the same test settings:

```bash
git worktree add ../soundscout-v1-staging main
```

Copy `.env.staging` into that folder, then run there:

```bash
npm ci && npx vite build --mode staging
```

Upload that `dist/` first. Step A only uses local saving, so nothing reaches Supabase.

## 4. Afterwards

- Staging can stay for future releases. To switch a device back to a clean state: browser settings → site data for `staging.soundscout.nl` → delete.
- Clean up the test accounts and hide the test theme (§2, step 5).
