# V2 staging — setup

A separate copy of SoundScout V2 for testing on real devices, with its own Supabase test project. Production (soundscout.nl, `main`) is not touched.

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
- it puts the **test project's** Supabase host in the CSP of `dist/.htaccess` (otherwise the browser blocks every Supabase call on staging);
- it keeps staging out of search engines: `X-Robots-Tag: noindex, nofollow`, `robots.txt` with `Disallow: /`, no sitemap.

The production build (`npm run build`) is unchanged; this is checked.

## 2. Supabase test project

Create a **new, separate project** (free tier allows two), e.g. `soundscout-staging`, in the same region as production. Never point staging at the production project: test accounts, test classes and test hand-ins would end up between real pupils' data.

**Schema: copy the structure, never the data.**

- **Option A (recommended): copy production's schema.** With the Supabase CLI and the production database password:
  ```bash
  supabase db dump --db-url "<production connection string>" --schema public -f staging-schema.sql
  ```
  Run `staging-schema.sql` in the test project's SQL editor. This copies tables, functions, policies and grants exactly as production has them, without any rows. Then run `supabase/migrations/043_theme_platform.sql` (the only migration production does not have yet).
- **Option B: rebuild from the repository.** `supabase/schema.sql`, then `supabase/migrations/002_…` up to `043_…` in number order. Risk: the loose files `supabase/migration-check-constraints.sql`, `migration-delen-met-link.sql` and `migration-max-classes.sql` may or may not have been applied to production at some point; option B can therefore drift from production. Use it only if option A is not possible.

**Before migration 035:** enable `pg_cron` (Database → Extensions). Option A needs it too if the dump contains the cleanup job.

**Then in the test project**
1. Authentication → URL configuration: Site URL `https://staging.soundscout.nl`; add `https://staging.soundscout.nl/**` to the redirect URLs (password reset mails link there).
2. Run the admin insert at the bottom of `043_theme_platform.sql` with your own e-mail (after you have registered as a teacher on staging, see the runbook).
3. Storage: check that bucket `themes` exists and is Public. If 043 logged a storage-policy warning, create the four policies by hand (`docs/v2/ADMIN-DASHBOARD.md` §2).
4. Copy the project URL and the **anon** key (Settings → API) into `.env.staging` (template: `.env.staging.example`, ignored by git).

The free tier's built-in e-mail sends only a few auth mails per hour. That is enough for one password-reset test.

## 3. Build and upload

```bash
cp .env.staging.example .env.staging
```

Fill in the test project's URL and anon key, then:

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

Upload that `dist/` first. V1's CSP still names the production Supabase host, so its online features are blocked on staging; that is fine, because step A only uses local saving.

## 4. Afterwards

- Staging can stay for future releases. To switch a device back to a clean state: browser settings → site data for `staging.soundscout.nl` → delete.
- The test project can be paused in Supabase when it is not in use.
