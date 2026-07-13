# Logboek — Masterplan "De meest fantastische versie" (6 weken)

> **Doel van dit bestand**: de actuele tussenstand van het 6-wekenplan bijhouden.
> Elke werksessie wordt hier bijgewerkt: wat is af, wat is bezig, wat is de volgende stap.
> Volledig plan: `~/.claude/plans/ik-wil-dat-je-prancy-sunbeam.md` · Notion-verslag: SoundScout-pagina (Prof Dev workspace).

**Branch**: `worktree-masterplan-6-weken` (git worktree, `main` blijft onaangeroerd)
**Werkwijze**: commit per logische stap · elke stap groen op `npx tsc -b --noEmit` + `npm run test:run` · migraties additief/idempotent, Bert voert ze zelf uit in de Supabase SQL Editor.

---

## Statusoverzicht

| Week | Thema | Status |
|---|---|---|
| 1 | Fundament & fixes (reset-flow, SEO, CI, modals, bundle, analytics) | ✅ Af (code-kant; migratie 025 + Supabase-redirect-check bij Bert) |
| 2 | Docent-feedback (kernfeature) + inzendingen-workflow | ⏳ Gepland |
| 3 | Leerlingflow & studio-onboarding | ⏳ Gepland |
| 4 | Thema-wizard (admin-editor) + content-pipeline | ⏳ Gepland |
| 5 | Content-sprint + peer-feedback + landingspagina | ⏳ Gepland |
| 6 | Monetisatie-voorbereiding, internationaal, PWA, eind-QA | ⏳ Gepland |

## Week 1 — Fundament & fixes

| # | Stap | Status | Commit |
|---|---|---|---|
| 1.1 | Wachtwoord-reset repareren (`?screen=reset-password`-flow + `TeacherResetPassword`) + "bevestigingsmail opnieuw sturen" | ✅ Af | `1bda39d` |
| 1.2 | SEO-basis: robots.txt, sitemap.xml, JSON-LD, og-image 1200×630, summary_large_image, aparte `/teacher`-meta (Vite MPA) + CSP-fix frame-src (YouTube/animatie was geblokkeerd!) | ✅ Af | `e638d9e` |
| 1.3 | CI: GitHub Actions — tsc + tests + build blokkerend, lint rapporterend (30 bestaande react-hooks-v6-errors → backlog eind-QA) | ✅ Af | `fb8ec06` |
| 1.4 | Modal-a11y: `useModalBehavior`-hook (focus-trap, Escape, scroll-lock, focus-restore) op alle 7 handgerolde modals + role=dialog | ✅ Af | `8432f3f` |
| 1.5 | Bundle-trim: LocationEditor (dev-only!), wizard/ComposePreview en FeedbackModal/EmailJS lazy — main 718→679 kB (gzip 218→207). <500 kB vergt locale-split + zod/mini → backlog | ✅ Af | `84c40b8` |
| 1.6 | Opruiming: gecommitte oude worktree (333 bestanden) uit index, `htaccess kopie` weg. Besluit: ComposeModeScreen blijft (fallback), Card blijft (in gebruik) | ✅ Af | `c913cd3` |
| 1.7 | Anonieme analytics: migration 025 (`usage_stats` — alleen event+dag+teller), kale-fetch-util (geen supabase-chunk-load), DNT gerespecteerd, privacytekst NL/EN eerlijk bijgewerkt | ✅ Af | `a4bc0ec` |

## Besluitenlog

- **2026-07-13** — Plan geaccepteerd. Keuzes: freemium (ruime gratis laag) · NL-first, internationaal voorbereiden · thema's code-first + begeleide wizard · docent-feedback = kernfeature incl. peer-feedback (anonieme complimenten-chips, geen vrije tekst).
- **2026-07-13** — Werkomgeving: git worktree `masterplan-6-weken`, dit logboek, Notion-verslag op de SoundScout-pagina.

## Voor Bert (acties buiten de code)

- **Migration 025 uitvoeren** in de Supabase SQL Editor (`supabase/migrations/025_anonymous_analytics.sql`) — daarna verschijnen de eerste tellingen in de tabel `usage_stats`.
- **Supabase Auth → URL Configuration**: controleer dat de Redirect URLs `https://soundscout.nl/*` (of expliciet `https://soundscout.nl/?screen=reset-password`) bevatten, anders weigert Supabase de nieuwe reset-redirect. De volledige reset-flow (echte e-mail → nieuw wachtwoord) één keer end-to-end testen na deploy.
- **Deploy-notitie**: bij de eerstvolgende deploy ook de bijgewerkte `.htaccess` mee-uploaden (teacher-rewrite + frame-src-fix) én `dist/teacher.html`.
- **Hoofdrepo `.claude/launch.json`**: er is een `dev-worktree`-configuratie toegevoegd (poort 5199) zodat de browser-verificatie tegen de worktree kan draaien. Dit is de enige wijziging in `main`; na de 6 weken terug te draaien of te behouden.
- **Opruimkandidaat ontdekt**: de oude worktree `.claude/worktrees/competent-neumann-1ac6a2/` staat volledig in git gecommit (honderden bestanden incl. mp3's). Verwijderen in stap 1.6.

## Openstaande vragen / blokkades

- Migraties (v.a. week 2) moeten door Bert in de Supabase SQL Editor worden uitgevoerd.
- Analytics (1.7): keuze Plausible (betaald/zelf-gehost) vs. minimale eigen telling — voorstel volgt bij stap 1.7.
- FTP-deploy-stap in CI (1.3): vereist Strato FTP-secrets in GitHub — alleen inrichten als Bert dat wil.

## Sessielog

### Sessie 1 — 2026-07-13
- Codebase-doorlichting met 3 verkenningsagenten (docent / leerling+studio / infra+SEO+thema's).
- 6-wekenplan geschreven en geaccepteerd.
- Worktree + logboek + Notion-verslag opgezet.
- **Week 1 volledig uitgevoerd** (stappen 1.1–1.7, zes commits `1bda39d`…`a4bc0ec`), elke stap groen op tsc + 227 tests en waar mogelijk in de browser geverifieerd.
- Onverwachte vondsten: CSP blokkeerde alle iframes in productie (YouTube-tutorials + onboarding-animatie — mogelijk de "YouTube zwart op iPad"-bug uit TODO.md); oude worktree stond met 333 bestanden in git; LocationEditor zat in de productie-bundle.
- Volgende sessie: Week 2 — docent-feedback (migration 026, feedback-UI in SubmissionPlayer/SubmissionCard, leerling-kant via bewaarcode) + peer-feedback-ontwerp.
