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
| 1 | Fundament & fixes (reset-flow, SEO, CI, modals, bundle, analytics) | 🔄 Bezig |
| 2 | Docent-feedback (kernfeature) + inzendingen-workflow | ⏳ Gepland |
| 3 | Leerlingflow & studio-onboarding | ⏳ Gepland |
| 4 | Thema-wizard (admin-editor) + content-pipeline | ⏳ Gepland |
| 5 | Content-sprint + peer-feedback + landingspagina | ⏳ Gepland |
| 6 | Monetisatie-voorbereiding, internationaal, PWA, eind-QA | ⏳ Gepland |

## Week 1 — Fundament & fixes

| # | Stap | Status | Commit |
|---|---|---|---|
| 1.1 | Wachtwoord-reset repareren (`?screen=reset-password`-flow + `TeacherResetPassword`) + "bevestigingsmail opnieuw sturen" | ✅ Af | `1bda39d` |
| 1.2 | SEO-basis: robots.txt, sitemap.xml, JSON-LD, summary_large_image, betere title/description | 🔄 Bezig | — |
| 1.3 | CI: GitHub Actions (tsc + lint + vitest) | ⏳ | — |
| 1.4 | Modal-a11y: StageActionsModal, TrimModal, EffectsModal, share-modals → gedeelde `<Modal>` of `useModalBehavior` | ⏳ | — |
| 1.5 | Bundle-trim: ComposePreview lazy, doel main < 500 KB | ⏳ | — |
| 1.6 | Opruiming: `htaccess kopie`, `ComposeModeScreen`-besluit, `Card`-besluit | ⏳ | — |
| 1.7 | Privacyvriendelijke analytics + privacyverklaring bijwerken | ⏳ | — |

## Besluitenlog

- **2026-07-13** — Plan geaccepteerd. Keuzes: freemium (ruime gratis laag) · NL-first, internationaal voorbereiden · thema's code-first + begeleide wizard · docent-feedback = kernfeature incl. peer-feedback (anonieme complimenten-chips, geen vrije tekst).
- **2026-07-13** — Werkomgeving: git worktree `masterplan-6-weken`, dit logboek, Notion-verslag op de SoundScout-pagina.

## Voor Bert (acties buiten de code)

- **Supabase Auth → URL Configuration**: controleer dat de Redirect URLs `https://soundscout.nl/*` (of expliciet `https://soundscout.nl/?screen=reset-password`) bevatten, anders weigert Supabase de nieuwe reset-redirect. De volledige reset-flow (echte e-mail → nieuw wachtwoord) één keer end-to-end testen na deploy.
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
- Gestart met Week 1.
