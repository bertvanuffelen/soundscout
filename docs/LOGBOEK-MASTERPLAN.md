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
| 2 | Docent-feedback (kernfeature) + inzendingen-workflow | ✅ Af (code-kant; migratie 026 + E2E-test bij Bert) |
| 3 | Leerlingflow & studio-onboarding | ✅ Af (animatie-item 3.5 doorgeschoven naar aparte sessie) |
| 4 | Thema-wizard (admin-editor) + content-pipeline | ✅ Af |
| 5 | Content-sprint + peer-feedback + landingspagina | ✅ Peer-feedback + landing af; content-sprint = Bert |
| 5½ | Feedback 2.0 (sterren/cap/timer), presentatiemodus, feedback-overzicht+top 3, sessie-herstel, Lucide-iconen | ✅ Af (migratie 028 + E2E bij Bert) |
| 5¾ | DAW-ronde: grijze-vlak-fix, +8 maten, +sporen/solo, sectie-loop, mobiele zoom, technische hygiëne + kansen-brainstorm | ✅ Af |
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

## Week 2 — Docent-feedback (kernfeature)

| # | Stap | Status | Commit |
|---|---|---|---|
| 2.1 | Migratie 026: feedbackkolommen + `submitted_at`, `set_submission_feedback`, `mark_submission_seen`, `submit_or_update_composition_v2` (mint bewaarcode), `load_saved_composition` + feedbackvelden | ✅ Af | `74ca552` |
| 2.2 | Client-lib: v2-submit met v1-fallback (PGRST202), feedback-RPC's, review-status (new/seen/reviewed), classSaveCode-opvang in useStageSave | ✅ Af | `62cf327` |
| 2.3 | Docent-UI: FeedbackPanel (sticker + 1-3 sterren + tekst) in SubmissionPlayer, gezien-stempel, Nieuw/Beoordeeld-badges, "{n} nieuw"-teller, WIP-splitsing op `submitted_at` | ✅ Af | `011fe9a` |
| 2.4 | Leerling-kant: code-kaart op het podium, FeedbackBanner in de studio, 💌-melding + modal op het startscherm (stille check, geruisloos falen) | ✅ Af | `aab50c1` |
| 2.5 | Peer-feedback-ontwerp vastgelegd (feedbackkaarten, docent-instelbaar — keuze Bert) in `docs/PLAN-FEEDBACK.md`; bouw in week 5 | ✅ Af | zie 2.5-commit |

**E2E-testscript voor Bert** (na migratie 026): zie `docs/PLAN-FEEDBACK.md` §"E2E-test" — 5 stappen van inleveren t/m RLS-check.

## Week 3 — Leerlingflow & studio-onboarding

| # | Stap | Status | Commit |
|---|---|---|---|
| 3.1 | First-run intro: "In 4 stappen"-animatie bij de allereerste "Nieuwe compositie" (modal → "Aan de slag" → wizard), eenmalig | ✅ Af | `a2f0549` |
| 3.2 | Studio-hint: eenmalige tip dat clip-tools (knippen/effecten/volume) achter clip-selectie zitten; vervalt bij eerste selectie | ✅ Af | `a2f0549` |
| 3.3 | Taal-pas: neutrale taal voor alle leeftijden (géén kindertaal — besluit Bert): "juf of meester" → "docent", volwassen formuleringen | ✅ Af | `a2f0549` |
| 3.4 | Kaart-hint: "Klik op een locatie om geluiden te verzamelen", vervalt bij eerste locatiebezoek | ✅ Af | `a2f0549` |
| 3.5 | Nieuwe uitleg-animaties (studio-tools, delen/inleveren) via de soundscout-animatie-skill | ⏭️ Doorgeschoven — eigen sessie (standalone HTML-maakwerk), kan parallel aan week 4 |

## Week 4 — Thema-wizard + content-pipeline

| # | Stap | Status | Commit |
|---|---|---|---|
| 4.1 | Seizoensrooster: `activeFrom`/`activeUntil` ('MM-DD') op thema's, filtering in publieke kiezers, `?theme=` blijft altijd werken, jaargrens-wrap-around + 10 tests | ✅ Af | `8032380` |
| 4.2 | themeCodegen: conceptmodel, beeldprompt-generatie (stijlprofiel + soort-specs), geluid-zoekpakketten (freesound), validatie, code-export (4 themabestanden + i18n-fragmenten + Claude-opdracht) + 16 tests | ✅ Af | `f87ce61` |
| 4.3 | Wizard-UI: 4 stappen op `/editor` (EditorHub met tabs wizard/locatie-editor), localStorage-draft, klik-op-kaart-positionering, export-gate achter validatie | ✅ Af | `5aabcd0` |
| 4.4 | Toegang: bewust dev-only gebleven (lokaal; de output gaat tóch via code/deploy) — besluit conform plan | ✅ | — |

**Workflow voor Bert (nieuw thema)**: `/editor` → Thema-wizard → stap 1-2 invullen → stap 3 prompts naar Claude/beeldgenerator + freesound → assets in `/public/...` plaatsen → stap 4 kaartposities klikken → export kopiëren → aan Claude Code geven ("plaats dit thema") → hotspots per locatie via de Locatie-editor-tab.

## Week 5 — Peer-feedback (gebouwd) + content-sprint + landingspagina

| # | Stap | Status | Commit |
|---|---|---|---|
| 5.1 | Migratie 027: feedback_cards (5 ingebouwde + docent-eigen), peer_review-instelling op class_assignments, peer_feedback-tabel, RPC's (batch/submit/complimenten/instellen), get_active_assignment + peer_review-kolom | ✅ Af — **door Bert uit te voeren ná 026** | `a82bfb1` |
| 5.2 | Client: PeerReviewModal (leerling-luisterflow op het podium), PeerReviewSettings (docent-toggle + kaartkeuze + eigen-kaart-editor in ClassDetail), complimenten in FeedbackBanner via bewaarcode, ClassSession.peerReview-doorvoer | ✅ Af | `1f1f584` |
| 5.3 | Content-sprint: 6-8 praatplaten, 2-3 storyboards, winterspelen-leerlingcontent — via de Thema-wizard | ⏳ Wacht op Bert (thema-ideeën + beelden/geluiden maken) |
| 5.4 | Landingspagina-uitbreiding: trust-strip, USP's, feedback-cirkel, actuele-thema's (leest seizoensrooster), FAQ-accordion + FAQPage JSON-LD, privacyband + footerlinks (hergebruik PrivacyModal/FeedbackModal), seizoenschip op startscherm. Testimonials weglaten + pricing geparkeerd (keuzes Bert) | ✅ Af | `c4c77d1` |
| 5.5 | Volledig testplan (`docs/TESTPLAN-MASTERPLAN.md`) voor week 1-5 | ✅ Af | — |

**E2E-test peer-feedback (Bert, na migratie 027)**: (1) activeer een opdracht → zet "Klasgenoten luisteren" aan in het klasscherm; (2) lever met 2+ browsers/apparaten in via de klascode; (3) na inleveren verschijnt "Luister naar klasgenoten" op het podium → beluister + kies chips; (4) laad een inzending via de bewaarcode → banner toont "Complimenten van klasgenoten".

## Week 5½ — Feedback 2.0 + presentatiemodus + iconen (7 punten Bert)

| # | Stap | Status | Commit |
|---|---|---|---|
| A | Lucide-iconen overal: stickerMap (patroon iconMap) + 13 emoji/unicode/hand-SVG-plekken vervangen | ✅ Af | `1c45b44` |
| B | Migratie 028: ratings JSONB (1-3 sterren per criterium), max 3 beoordelingen p.p., server-side toggle+timer (peer_review_closes_at), get_peer_compliments→gemiddelden, load_saved_composition+class_code | ✅ Af — **door Bert uit te voeren ná 027** | `0efa900` |
| C | Client 2.0: sterren-UI in PeerReviewModal, timer+aftelklok in PeerReviewSettings, gemiddelde-sterren in FeedbackBanner | ✅ Af | `d5447ed` |
| D | Sessie-herstel (bug Bert): submissionSynced hersteld bij heropenen; bewaarcode herstelt volledige klas-sessie (classSessionFromAssignment) | ✅ Af | `283d328` |
| E | PeerFeedbackOverview: top 3 podium + ontvangen/gegeven-tabs (client-side join via RLS) | ✅ Af | `e16c93b` |
| F | ClassPresentationView: universeel digibord-scherm met playlist, auto-advance, per-vorm-visuals, toetsenbord, feedbackrij; top-3-koppeling | ✅ Af | `53c0966` |
| G | docs/ANIMATIES-EN-PROMO.md (animatielijst + promo-script) + testplan §6 | ✅ Af | zie docs-commit |

**Besluiten Bert (2026-07-13):** peer-feedback = sterren per criterium (geen losse chips meer) · vast maximum 3 · toggle + optionele timer · presentatie = nieuw universeel scherm met playlist, ook voor praatplaat.

## Week 5¾ — DAW-ronde + kansen-brainstorm

| # | Stap | Status | Commit |
|---|---|---|---|
| A | KANSEN-BRAINSTORM.md: site-besluit (app-first, geen blog; leskaart-pagina's als SEO-kans), microfoon geparkeerd (rationale Bert), storyboard-verdeling "Samen één verhaal" als concreet ontwerp, kansen-voorraad | ✅ Af | `1ad179a` |
| B0 | Technische hygiëne: bpm-veld door het export-pad (latente bug), iPad-sleepvertraging 200→150ms, 3 studio-lint-fouten (EditToolbar/Clip/StorytellingDisplay) | ✅ Af | `bc65a19` |
| B1 | BUG-TIMELINE-GRIJS opgelost: wrapper min-h-full + flex-vulling, gridlijnen lopen door; overscroll-contain | ✅ Af | `d75a167` |
| B2 | "+ 8 maten"-tegel (sticky pill), extendTimeline tot 256 beats/64 maten, +2 tests | ✅ Af | `5dcbd94` |
| B3 | "+ spoor" tot 12 + solo in volume-popover; audio-buses grow-only (spoor 9+ was zonder mute-controle); solo = sessie-state, live gains; +3 tests | ✅ Af | `1c0753f` |
| B4 | Sectie-loop via SectionPopover (hergebruik sectie-concept), loop-regio in store + engine (reschedule-proof); zoomknoppen op touch; +3 tests | ✅ Af | `a3e8b34` |
| B5 | Testplan §7, CLAUDE.md-correcties (128 beats/dynamische buses), logboek + Notion | ✅ Af | zie docs-commit |
| B6 | Feedbackronde Bert: échte oorzaak grijs vlak gevonden (playhead-lijn `h-[500px]` creëerde scrollruimte → lijn nu wrapper-niveau `bottom-0`, "spoor toevoegen" is de onderste rij); sticky pill vervangen door "+8"/"−8" in de werkbalk (16–64 maten, inkorten beschermt clips/secties); sectie-loop-voorwaarde gedocumenteerd in docentengids; +3 tests (263) | ✅ Af | `4e315b7` |
| B7 | Losse UX-fix (UX-LANDSCAPE): eenmalige "draai je apparaat"-banner (`LandscapeHint`) globaal in `App.tsx` — alleen touch + portret + brede compositie-schermen; orientatie via CSS `landscape:hidden`, dismissal via `firstRun`. Geen studio-bestanden geraakt. | ✅ Af | deze commit |

**Eenvoud-eis Bert geborgd**: progressive disclosure — beide "+"-elementen zijn subtiel, verdwijnen op hun maximum en in read-only; solo zit ín de bestaande popover; sectie-loop hergebruikt het sectie-concept.

## Testronde 1 (16-7) — fixronde na Berts test t/m week 2

| Fix | Oorzaak | Status |
|---|---|---|
| **Bewaarcode "niet gevonden"** (2c, kritiek) | Migratie 028: retourkolom `class_code TEXT` vs kolom `CHAR(4)` → élke load faalde met 42804; client maskeerde dat als "niet gevonden". Live gereproduceerd met code BBD6KD. | ✅ Migratie **029** klaar (Bert draait) + foutmaskering client-side opgeheven (`share.loadFailed`, `submissions.dataInvalid`, Zod-issues gelogd, feedback-load non-fataal) |
| **'Beluisterd' ontbrak** (2b) | Status werd wél gezet; er bestond geen badge-tak voor `seen` in SubmissionCard | ✅ Grijze badge + koptelefoon-icoon, i18n NL/EN |
| **EffectsModal Tab-lek** (1c) | Focus-trap telde disabled knoppen mee als laatste element (Toepassen start disabled) | ✅ `:not([disabled])` in FOCUSABLE_SELECTOR — geldt voor alle modals |
| **Escape bij inzendingen** (2b) | SubmissionPlayer = handgerolde overlay zonder keydown | ✅ `useModalBehavior` (Escape + trap + scroll-lock) + role=dialog |
| **Reset-link naar oude site** (1a) | Supabase Redirect URLs mist localhost → terugval op Site URL | 🔧 Bert-actie (zie "Voor Bert") — code was al correct |
| Quick-wins | — | ✅ "Klasgenoten luisteren" → "Peer feedback"; privacytekst noemt bewaarcode (AVG-vraag); testplan geannoteerd; bundle-check 1d ✅ (main 151,8 kB) |

**Nieuwe wensen uit Berts testnotities (→ redesign-ronde 2)**: herbruikbare Tip-modal (de kaart/studio-hints vallen nu niet op); samen een definitielijst/woordenlijst opstellen voor consistente taal; plus de Notion-punten (landingsscherm-herindeling, storyboard-pijltjes, platen passend in viewport, ClassDetail-herindeling met prominente Presenteren/Feedback-knoppen, "Jouw code"-blok prominenter). Later: custom SMTP-afzender voor Supabase-mails.

## Testronde 2 (16-7) — grote fixronde na Berts test t/m week 6

Bert stopte met testen ("ik val in dezelfde fouten"); alles uit testplan + Notion in één ronde. Rode draad: **foutmaskering structureel opgeruimd** — fouten werden geslikt en als leeg/succes getoond.

| Stap | Wat | Commit |
|---|---|---|
| 1+3 | **Peer-feedback dubbel gemaskeerd (6d)**: leerling zag altijd confetti, ook bij serverweigering (ronde gesloten/max); docent-overzicht toonde fout als "leeg". Nu getypeerde fouten (PeerFeedbackError), eerlijk 'blocked'-scherm, retry in overzicht; live-probe bevestigt dat submit_v2 in de DB staat. + resterende "Klasgenoten luisteren"-teksten → "Peer feedback" | `bd4d3cd` |
| 2 | **Oude "Jouw code" (5b)**: codeblok las localStorage van de vórige leerling; nu gebonden aan submissionId + schoon bij nieuwe klas-start (gedeelde Chromebooks!) | `4c8fe0f` |
| 4 | **Beeld in "Luister naar klasgenoten" (5b)**: storyboard meebewegend / praatplaat-plek in de peer-modal (hergebruik StoryboardViewer/presentatie-patroon; batch had de data al) | `a06a6c4` |
| 5 | **Podium = feedback-thuis (ontwerp Bert)**: keuzescherm Studio/Podium na bewaarcode; vast feedbackblok + code-badge op het podium (alleen mét inhoud); reactie-melding → podium; "Naar het podium"-knop op start. End-to-end geverifieerd met echte code BBD6KD (bewijst ook migratie 029) | `7fcb8de` |
| 6 | **Leerling-landingsscherm**: header → grote afbeelding (storyboard-pijltjes + teller) → klascode/klas-labels → opdrachtkaart; uitlegzin alleen zonder docent-kaart | `38c1800` |
| 7 | **ClassDetail**: Presenteren (+teller) en Feedback-overzicht als grote knoppen bovenaan; pill-knoppen weg (PeerReviewSettings klapte al uit — "is nu al", aldus Bert) | `74ee9c3` |
| 8+9 | **TipModal** (kaart + studio, zelfde firstRun-flags) + `docs/WOORDENLIJST.md`-aanzet | `a244c29` |

**Hertest-lijst** staat bovenaan `docs/TESTPLAN-MASTERPLAN.md`. Geparkeerd: "docent bepaalt tijdsduur"-vermelding (vergt migratie + activatie-UI).

## Universeel presentatiescherm — fase 1 (16-7, ontwerpsessie Bert)

Ontwerp: één presentatiescherm voor digibord-presentatie, docent-review, publieke luisterlink en peer-luisteren, met schakelbare elementen (zijpaneel met naam/vorm-icoon/peer-sterren + docent-feedback-status-toggle, feedback-invoer, naam-overlay, doorspelen). Podium blijft eigen scherm + krijgt later een "Presenteren"-knop. Stijlvoorstel: donkere podium-achtergrond met lichte inhoudskaart (Bert beslist op zijn mockup-afbeelding; prompt-spec geleverd). Vrij/template-visual: meebewegende tijdlijn.

**Fase 1 gebouwd (onzichtbaar fundament, 6 commits `861dd9d`…`b6fcb9b`):**
- `useCompositionPlayback`-hook: laden (AbortController + progress) → schedule → play, pause/resume via bestaande Part, beat-tracking ~30fps met loop-modulo, onEnded (auto-advance), opties respectLoop/autoLoad (gesture-gate).
- `resolveStoryboard`-util + `PraatplaatMarker`-component.
- Alle vier de oppervlakken overgezet (PeerReviewModal, SubmissionPlayer, SharedPlayer, ClassPresentationView) — gedrag identiek, end-to-end geverifieerd via verse luisterlink 9XRC6C6M (gesture → laden → afspelen → pauze → hervatten).
- Lint verbeterde van 31 naar 28 (dode code + twee sluimerende hook-issues opgeruimd).

**Fase 2 (wacht op Berts mockup):** `PresentationSurface`-UI met feature-props; wrappers; Presenteren-knop op het podium; later PraatplaatViewer-samenvoeging.

## Universeel presentatiescherm — fase 2 (17-7, na mockup-akkoord Bert)

Mockup goedgekeurd + drie aanvullende eisen van Bert: zijpaneel volledig in/uit schuifbaar (randknop met positie-badge) · fullscreen-knop altijd aanwezig (browser-Fullscreen API) · montagelijn-toggle (alleen bij beeld-vormen; uitklappen maakt het beeld lager). Vier vervolgkeuzes: toggle alleen bij beeld-vormen · defaults presentatie/publiek/peer ingeklapt + docent-review uitgeklapt · ingeklapt zijpaneel = volledig weg + randknop · echte browser-fullscreen.

**Fase 2 gebouwd (8 commits `dc32be6`…`5e9e0f3`):**
- `useFullscreen`-hook (nieuw; incl. webkit-varianten iPad, Escape-guard via `isDocumentFullscreen()`).
- Migratie **030** `get_peer_stars_for_class` (batch peer-sterren per klas, alleen eigenaar-docent) + client `getPeerStarsForClass()` — fire-and-forget, zonder 030 blijven sterren gewoon weg.
- `PresentationSurface` (`src/components/presentation/`): één scherm voor vier modi (teacher-present / teacher-review / public / peer) in mockup-stijl — lichte kaart op brand-900, "Nu te horen"-pill, montagelijn-toggle, schuifbaar zijpaneel met vorm-icoon + peer-sterren + feedback-status-toggle (stip: nieuw/gezien/beoordeeld), fullscreen (knop + F-toets), toetsenbord/announce/doorspelen uit fase 1 behouden.
- Vier thin wrappers: ClassPresentationView (haalt peer-sterren, geeft classId door vanuit ClassDetail) · SubmissionPlayer (review, montagelijn default uitgeklapt, gezien-stempel intact) · SharedPlayer (data-schil + gesture-gate blijft; audio-fase = surface) · PeerReviewModal (luisterstap = surface met sterren-rij als ratingSlot; stappenflow + eerlijke foutafhandeling blijven).
- **Presenteren-knop op het podium** (Opslaan & Delen → kolom "Voor de klas"): snapshot van de live compositie in de surface, geen opslag.
- Browser-geverifieerd: luisterlink (gesture → surface → afspelen → beeldsync → montagelijn-toggle) en podium → Presenteren → sluiten. Gates: tsc OK · 266 tests · lint 27 (-1 t.o.v. baseline) · i18n-pariteit · productie-build OK.

**Hertest Bert (fase 2):** docent-presentatie met ≥2 inzendingen (zijpaneel schuiven, randknop-badge, feedback-status-toggle, peer-sterren ná migratie 030) · docent-review-inzending (montagelijn default uitgeklapt, feedbackpaneel, gezien-stempel) · peer-flow op leerling-device · fullscreen op het digibord (knop, F, Escape verlaat éérst fullscreen).

**Later (apart):** PraatplaatViewer + SharedPraatplaatViewer samenvoegen tot één surface-variant. *(→ gedaan in het opdrachten-model hieronder, M5.)*

## Opdrachten-model herontwerp (17-7, usecases-brainstorm Bert)

Aanleiding: Berts vraag "waarom staan praatplaten in Mijn opdrachten?" → brainstorm met flowchart, 10 usecases en 3 dashboard-indelingen (in chat). Besluiten: **indeling B + thema-filter** (Mijn klassen = doe-wereld · Leskaarten = dé kiesplek mét thema/niveau-filter · Mijn materiaal = alleen eigen bouwstenen) · **seizoensregel** (badge + zachte bevestiging, nooit blokkeren/verbergen aan docent-kant; leerling-kiezers blijven filteren; lopende opdrachten breken nooit) · thema wordt **afgeleid** uit de inhoud (geen migratie) · "Bewaar als leskaart" meteen mee · praatplaat-presentatie op de surface · uploads buiten beschouwing.

**Gebouwd (6 commits `efd294a`…`e458f61` + afronding):**
- M1 "Mijn materiaal": praatplaten-sectie (klas-data!) en storyboards-bladerlijst weg; PraatplaatCard/CreatePraatplaatModal/teacher-StoryboardCard verwijderd.
- M2 Leskaarten-kiesplek: `getLessonCardThemeId` (afgeleid thema), filterchips, `ThemeSeasonBadge`, zachte seizoensbevestiging; docent-kiezers tonen buiten-seizoen thema's (`getTeacherThemes`).
- M3 Klaslokaal: startkeuze (leskaart-picker `LessonCardPickerModal` met klascode-succes / zelf samenstellen) + historie-rijen praatplaat met Bekijken/Delen/Verwijderen.
- M4 "Bewaar als leskaart": editor-prefill vanaf template-kaart én podium-succes.
- M5 Praatplaat-bord: `interactiveBoard`-stand op PresentationSurface (geclusterde klikbare spots, keuzemenu); beide praatplaat-viewers zijn dunne schillen.
- Gates overal groen (tsc · 266 tests · lint 27 · i18n-pariteit · build). Hertest-lijst "Opdrachten-model" bovenaan het testplan (alles docent-login).

## Routekaart ná het masterplan (17-7, backlog-brainstorm Bert)

Prioriteiten Bert: **R1 deploy-ronde** → **R2 freemium/betaalflow** (volledige betaalflow gewenst; provider-onderzoek doet Bert extern met geleverde prompt; grenzen beslist hij via `docs/FREEMIUM-OPTIES.md`) → **R3 leerling-codes + groepjes** (nieuw fundament, ontwerp in `docs/ONTWERP-LEERLING-CODES.md`; daarna "Samen één verhaal") → **R4 klas-album + publieke leskaart-pagina's** → **R5 luister-en-plaats** (klassikaal eerst, ontwerp in `docs/ONTWERP-LUISTER-EN-PLAATS.md`). Microfoon-lijn geparkeerd tot na deploy; analytics = eigen usage_stats uitbouwen. R0 (drie ontwerpdocumenten) geleverd in commit `0b86605`.

## R0b + R4 — Ontwerpbesluiten leerling-codes · klas-album · leskaart-pagina's (17-7)

**R0b — leerling-codes besloten** (Berts inline feedback verwerkt, `docs/ONTWERP-LEERLING-CODES.md` → v2): codeformaat **2 letters + 4 cijfers** (~5,8M combinaties met veilig alfabet) · leerlingen voeren nooit een eigen naam in (pseudoniem-systeem blijft; de code maakt het pseudoniem persistent per kind) · labels niet hernoembaar · verloop 31 juli + toggle "Bewaar deze klas voor volgend jaar" · verlopen-melding "Jouw code is niet meer actief" · klascode-flow blijft parallel. Scope-knip: **v1 = individueel (bouw R3)**; groepjes/samenwerken en "Samen één verhaal" volledig uitgedacht als toekomst-docs: `docs/ONTWERP-GROEPJES-SAMENWERKEN.md` (F1/F2/F3) en `docs/ONTWERP-SAMEN-EEN-VERHAAL.md`.

**R4 gebouwd (4 commits `a6ed057` · `0a48c59` · `807e1ba` · `1b5e295` + lint-fix):**
- D2 **Klas-album**: migratie **031** (album-deelcode op `class_assignments`, centrale `generate_share_code_v2()` die alle drie de 8-char-codespaces checkt, RPC's `share_class_album`/`get_shared_class_album` met rate-limits en per-type submissions-resolutie, alleen formeel ingeleverd) + `src/lib/albums.ts`.
- D3 **Album-viewer + deelknop**: `SharedAlbumViewer` (statemachine + gesture-gate → PresentationSurface public, klikbaar bord bij praatplaat-albums), `?album=CODE`-route, stap 5 in de ShareCodeInput-keten, "Deel album"-knop op de actieve opdracht én elke historie-rij (`ShareAlbumModal` met link/QR/30 dagen).
- D4 **Statische leskaart-pagina's** `/les/<key>`: generator `scripts/generate-les-pages.mjs` (prebuild-hook) → pure-HTML SEO-pagina's (JSON-LD LearningResource, CTA-deeplink naar het dashboard), sitemap-verversing, "Bekijk de leskaart"-links op de landing; lesfases voor verspringen/vrij-basis/drumbeat aangevuld in nl+en.
- Browser-geverifieerd: `/les/robotfabriek` + `/les/drumbeat` renderen volledig; `?album=FAKECODE` toont nette not-found-staat. Happy path album vergt Berts login + migratie 031 → hertest-lijst "R4" bovenaan het testplan. Gates groen (tsc · 266 tests · lint terug op baseline 27 · i18n-pariteit).

## Deploy-voorbereidingen V1-V3 (18-7)

Drie punten uit de R1-deploylijst naar voren gehaald (commits `0925ceb` · `d206f7a` · `1dd9a2f` + lint-fix):
- **V1 BUG-YOUTUBE**: `playsinline=1` op alle drie de YouTube-embeds (tutorial, docentengids, landing-video's). iOS blokkeert autoplay-met-geluid en rendert de geblokkeerde embed zonder playsinline zwart. Hertest op échte iPad nodig.
- **V2 Touch-targets 44px**: de 16 tijdlijn-werkbalkknoppen krijgen een 44px-raakvlak via een `::after`-hit-area (visueel 28/32px — de dichte werkbalk blijft passen); transport mobiel naar 44×44; spoor-volumeknop vult de rail; clip-resize-handle 2× zo breed op touch. Browser-geverifieerd op 375px.
- **V3 Statistieken-dashboardje**: `UsageStatsPanel` (grafiekje sessies/dag + tabel vandaag/7/30 dagen) op `usage_stats` (migratie 025, RLS authenticated). Knop in de dashboard-header alleen voor accounts in `VITE_ADMIN_EMAILS` (aan `.env.local` toegevoegd met Berts adres). Geen migratie nodig.
- Gates groen (tsc · 266 tests · lint 27 · i18n-pariteit). Hertest-blok "Deploy-voorbereidingen" bovenaan het testplan.

## EN compleet + volledige QA-doorloop (18-7)

**EN-vertaling af** (commits `ee0c2ac` + `2cb1ce2`): en.json bleek al volledig; het echte gat waren ~39 hardcoded NL-foutmeldingen in src/lib + src/hooks → nieuwe `errors.*`-sectie (NL+EN) via `i18n.t()` (werkt ook buiten React). Plus `LanguageSwitcher` op /teacher-landing en in de dashboard-header (wie via SEO binnenkwam kon nooit wisselen).

**QA-doorloop** ([USECASES-QA.md](TESTPLAN-MASTERPLAN.md) → USECASES-QA.md): 30 leerling- + 26 docent-usecases; 37 volledig groen in de browser doorlopen (leerling: alle vormen, studio-gereedschap, bewaarcode+QR, MP3, deellink, EN; docent in Berts sessie: klas 7107 → leskaart-activatie → leerling-inzending → feedback-lus → presentatie → praatplaat-catalogus → album-deelcode V56MS34H publiek afgespeeld → statistieken → opruimen). Bevindingen QA-1 t/m QA-9: **2 direct gefixt** (loop-resize-botsing `02d3cd8`, album-gate-tekst `d18722c`), 5 open met voorstel (sectie-knop stille no-op, lege podium-naam na bewaarcode, max-8-klassenlimiet niet gehandhaafd, template-opdracht toont praatplaat-defaultkaart, praatplaat-viewer lege staat klein beeld) en 2 content-keuzes voor Bert (Winterspelen zonder seizoensvenster, Piraten nog isPublic).

## Restpuntenronde + dashboard/landing-wensen (18-7 avond)

Antwoord op Berts controlevraag "hebben we alles geïmplementeerd?": volledige sweep gedaan (docs, code-TODO's, audits, lint, Notion) — daarna twee rondes:

**Restpunten (F)**: piraten blijft publiek (besluit) · "Markeer deel" disabled+hint op beat 0 (QA-2) · naam voorgevuld na bewaarcode + saveOnlineInfo-wis bij nieuwe compositie (QA-3, dichtte latente auto-sync-bug) · **migratie 032**: inline-opdrachtkaart matcht op titel én bullets (QA-7 — alle built-ins heten "Zo werkt deze opdracht", waardoor de praatplaat-kaart aan Drum beat hing) · QA-9 bleek meetartefact (viewer-beeld is wél maximaal) · AUDIT #7 bleek al gedekt (solo gaat uit bij Naar Podium, B3) · klassenlimiet bestaat wél (`max_classes`, Berts account onbeperkt).

**Dashboard/landing-wensen (G, Berts lijst 18-7)**: "Mijn opdrachtkaarten"/"Mijn templates"-titels · leskaartenlijst gegroepeerd (standaard/eigen) · **niveau-buckets** groep 1-2/3-4/5-6/7-8, EN toont leeftijden (besluit Bert; editor = select, legacy-teksten genormaliseerd) · /teacher-hero toont de 4-stappen-animatie en "Drie manieren" is kolom+live-preview · presentatiescherm: aankondiging 2,5s→1,2s (de "grijze montagelijn" wás die overlay — geen laadtijd), "Open montage"-knop in de controls-rij, sticker/sterren-feedback slaat direct op · album blijft per opdracht (besluit; Berts 1-van-6 klopte dus) · album-gate-tekst gefixt.

Gates overal groen; hertest-blok "Restpunten + dashboard/landing" bovenaan het testplan. **Voor Bert: migratie 032 draaien.**

## Notion-testpagina-controle (18-7 laat): laatste open wensen gebouwd (H-ronde)

Bert vroeg de hele Notion-testpagina "Test sessie 16-7" na te lopen. Alles wat nog open en bouwbaar was is gebouwd: **per-tab dashboard-uitleg** ("Zo bouw je eigen materiaal" / "Zo werk je met leskaarten" — testronde 3-punt) · **tijdsduur-vermelding** (migratie 033: `duration_label`, instel-veld op de actieve kaart, klok-weergave op de leerling-landing — testronde 1-wens) · **gids-content**: nieuwe sectie "Tips voor feedback geven" (met voorbeeldzinnen + GuideLink vanuit het inzendingenblok) en organisatie-tips in "Tips voor de klas" (NL+EN — testronde 2-wensen). De Notion-pagina zelf is bijgewerkt met een ✅-blok per wens; blijft bij Bert: exports-controle per vorm, content-sessie extra opdrachtkaarten, woordenlijst-aanvullingen, migraties 032+033.

## Testronde 4-fixronde (19-7): I-ronde + testplan-herstructurering

Bert leverde het testplan terug met x/-/?-annotaties en vulde op Notion "Test-ronde 4". Alles wat daaruit bouwbaar was is gedaan (twaalf punten, elk met browser-verificatie en een eigen commit):

**Bugs**: publieke albumviewer toonde geen afspeellijst (`hasPlaylistUi` gold alleen voor `teacher-present`; nu ook `public`, mét status-toggle docent-only) · albumcode was te klein in de deel-modal (nu even groot als de klascode) · "Bekijk de leskaart" opende de app i.p.v. de lespagina (Vite dev kent geen directory-index → expliciet `/les/<key>/index.html` + nieuw tabblad) · **EffectsModal focus-trap ontsnapte nóg steeds**: de eerdere disabled-fix was niet genoeg — als het gefocuste element uit de DOM verdween (reset-knop bij waarde 0) stond de focus op `body` en liet de trap Tab passeren; nu vangt hij focus-buiten-de-modal af · historie-rijen misten "Bekijk inzendingen" bij niet-praatplaat-types (nieuwe helper `submissionMatchesAssignment` matcht template/praatplaat op UUID en storyboard/free op `assignment_ref`).

**Wensen**: montagelijn-achtergrond wit in readOnly · ververs-knop in het presentatiescherm + 20s-polling met append-aan-het-eind (playback onverstoord; `presentMode` onderscheidt actief/alles/vast) · Presenteren-keuzemodaal "Actieve opdracht / Alle composities" (alleen als die keuze iets toevoegt) · klaslokaal-startkeuze: vier type-kaarten meteen open, "Stel zelf samen" vervallen, leskaart als knop eronder · "Beluister" → "Open code" · echte **"Lever in"**-knop in de kolom Voor de klas + "Presenteren op het digibord" alleen voor de ingelogde docent · leskaart-cover in het landing-detailpaneel.

**Beheer + teksten (Berts twee vragen)**: er is géén admin-scherm; in plaats van een tweede beheerdoc is `HANDLEIDING-BEHEER.md` uitgebreid met **§4b "Wat staat waar aan/uit"** — een tabel met per schakelaar het exacte bestand (thema-`isPublic`, `activeFrom`/`activeUntil`, `LANDING_LESSON_KEYS`, praatplaat-catalogus, storyboards, built-in-seeds, `VITE_ADMIN_EMAILS`, `max_classes`, /editor) plus een uitgewerkt toekomst-blokje voor een echte admin-werkruimte. Voor de teksten: `npm run teksten:export` genereert **docs/TEKSTEN.md** (1593 teksten, 44 secties, tabel sleutel|NL|EN), Bert bewerkt de kolommen, `npm run teksten:import` schrijft alleen gewijzigde waarden terug — round-trip getest (één wijziging → exact één regel per json-bestand).

**Testplan**: volledig geherstructureerd — actieve testen nu gegroepeerd per activiteit (leerling-basisflow · studio · podium & delen · klascode/praatplaat · klaslokaal · materiaal & leskaarten · presentatiescherm · landing & SEO · apparaten), afgevinkte punten compact naar "✅ Afgerond" onderaan, Berts [?]-vragen in-place beantwoord (o.a. wat "bewaarcode → podium" precies inhoudt, wat de lespagina's zijn en hoe je de SEO-checks concreet uitvoert) en zijn twee acties bovenaan (Supabase Redirect URL voor soundscout.techindeles.nl + migraties 032/033).

**Werkfout gecorrigeerd**: één commit landde per ongeluk in de hoofdrepo (git-commando zonder `-C` naar de worktree) en nam Berts ongecommitte piraten-/instellingenbestanden mee; teruggedraaid met `reset --soft` zodat de hoofdrepo weer exact op `d6884f7` staat met dezelfde ongecommitte wijzigingen als bij sessiestart.

## Nacontrole testronde 4 (19-7 middag): vier bevindingen van Bert

Bert liep het herstructureerde testplan na en zette er vier opmerkingen bij. Drie waren echte bugs die ik eerder had gemist of half had opgelost:

- **Lege tijdlijn na bewaarcode (A3)** — Berts vraag was "wordt de tijdlijn wel opgeslagen?"; het schrijven klopte (8 sporen, 2 clips, 2 samples in de database), het teruglezen niet. `StudioView` gaf de `Timeline` geen `samples`-prop, waardoor `Track` terugviel op `themeGetSampleById`. Open je een piraten-compositie op een apparaat waar thema 'basis' draait, dan werd élke clip overgeslagen: volle data, lege tijdlijn. Gereproduceerd (0 clips getekend) en na de fix opnieuw gemeten (2 clips, juiste posities/kleuren). Trof niet alleen bewaarcodes maar elke compositie in een andere themacontext.
- **"Grijs bij laden" was de aankondiging** — ik had eerder alleen `ANNOUNCE_MS` verlaagd (2,5 → 1,2s) in plaats van te stoppen met dimmen. De overlay lag als `bg-brand-900/85` over de héle kolom. Nu een zwevend kaartje bovenin; gemeten tijdens de aankondiging: omhullende laag transparant, kaartje eindigt op 276px, tijdlijn begint op 303px — geen overlap.
- **Presenteren-keuze verscheen niet** — mijn extra voorwaarde ("alleen als de actieve opdracht al inzendingen heeft") sloeg de vraag stilzwijgend over bij Berts net geactiveerde praatplaat (0 eigen inzendingen, 8 van eerdere opdrachten). Voorwaarde eruit; de lege optie staat nu zichtbaar-maar-uitgeschakeld met uitleg.
- **Praatplaat-bord ontbrak bij presenteren** — Berts vervolgvraag legde bloot dat het gedeelde album al `interactiveBoard` doorgaf, maar `ClassPresentationView` niet. Nu gelijk, mits je de áctieve opdracht presenteert (bij "alle composities" horen andere inzendingen niet op dat bord).

**Transport vs. navigatie (19-7, tweede nacontrole)**: Bert merkte op dat ⏮/⏭ in het presentatiescherm de *playlist* bedienden, terwijl datzelfde icoon in de studio (`TransportControls`) en op het podium "terug naar het begin" betekent — en dat de studio helemaal géén ⏭ kent. Zijn voorstel (transport = huidige compositie, wisselen via het zijpaneel) overgenomen: ⏮ = `seekComposition(0)`, ⏭ verwijderd, `teacher.presentation.previous/next` opgeruimd. Wisselen blijft via zijpaneel-klik, ←/→ en Doorspelen.

Daarnaast Berts besluiten uitgevoerd: **taalknop vast rechtsboven** op élk docentscherm (`TeacherPageHeader` draagt hem nu zelf; dubbele knop uit het dashboard) · **browsertaal bij een eerste bezoek** (`detectInitialLanguage`, opgeslagen keuze wint altijd; vier gevallen nagerekend) · **één "Delen"-knop per opdrachtrij** — bij een praatplaat vraagt een keuzemodaal bord-of-afspeellijst, want daar zijn écht twee dingen te delen; historie-rijen zijn nu uniform (oog + delen, prullenbak alleen bij praatplaat). Kleiner: "Opslaan" sluit de Opslaan & Delen-modal.

## Besluitenlog

- **2026-07-13** — Plan geaccepteerd. Keuzes: freemium (ruime gratis laag) · NL-first, internationaal voorbereiden · thema's code-first + begeleide wizard · docent-feedback = kernfeature incl. peer-feedback (anonieme complimenten-chips, geen vrije tekst).
- **2026-07-13** — Werkomgeving: git worktree `masterplan-6-weken`, dit logboek, Notion-verslag op de SoundScout-pagina.
- **2026-07-13 (week 2)** — Keuzes Bert: feedback = sticker + **1-3 sterren** + tekstje · terugweg = **digibord + automatische bewaarcode** (elke klas-inzending mint een code) · peer-feedback via **docent-instelbare feedbackkaarten** (bouw week 5) · geen printblad.
- **2026-07-13 (week 2)** — Architectuur: `submit_or_update_composition_v2` als nieuwe functie naast v1 (return-type wijzigen zou live clients breken); WIP-splitsing verplaatst van save_code-aanwezigheid naar `submitted_at` (elke v2-inzending heeft nu een code).
- **2026-07-13 (week 3)** — Besluit Bert: **geen kindertaal** — neutrale, heldere taal die alle leeftijden aanspreekt. Toegepast op alle nieuwe teksten en de week-2-feedbackteksten.
- **2026-07-13 (week 3)** — Migraties 025+026 kunnen samen in één keer gedraaid worden (beide additief/idempotent, geen invloed op bestaande docent-data; live oude frontend blijft werken).

## Voor Bert (acties buiten de code)

- **Supabase Redirect URL voor de testserver**: Authentication → URL Configuration → voeg `https://soundscout.techindeles.nl/*` toe. Zonder deze regel eindigt elke reset-mail op `otp_expired` (precies wat testronde 4 liet zien). Daarna een vérse mail aanvragen.
- **Migraties 032 + 033 uitvoeren** (`032_fix_lesson_card_inline_match.sql` — juiste uitlegkaart bij template-leskaarten · `033_assignment_duration_label.sql` — tijdsduur-veld). Zonder 033 geeft het tijdsduur-veld een nette foutmelding bij opslaan.
- **Migratie 031 uitvoeren** (`supabase/migrations/031_class_album_share.sql`) — klas-album delen (R4). Zonder deze migratie geeft "Deel album" een nette foutmelding; al het andere werkt.
- **Deploy-notitie (R4)**: bij de eerstvolgende deploy ook **`dist/les/`** mee-uploaden (statische leskaart-pagina's; worden automatisch gegenereerd bij `npm run build` via de prebuild-hook). Apache serveert `/les/robotfabriek` dan via DirectoryIndex.
- **Migratie 030 uitvoeren** (`supabase/migrations/030_peer_stars_batch.sql`) — batch peer-sterren voor het zijpaneel van het presentatiescherm. Zonder deze migratie werkt de presentatie gewoon, alleen zonder sterren per inzending.
- **Migratie 029 uitvoeren** (`supabase/migrations/029_fix_load_saved_composition_class_code.sql`) — fixt de testronde-1-bug "bewaarcode niet gevonden": migratie 028 had een typefout (`class_code TEXT` vs kolom `CHAR(4)`) waardoor élke bewaarcode-load faalde. Verifieer daarna met `SELECT * FROM load_saved_composition('BBD6KD');` of door de code in de app in te voeren.

- **Migration 025 uitvoeren** in de Supabase SQL Editor (`supabase/migrations/025_anonymous_analytics.sql`) — daarna verschijnen de eerste tellingen in de tabel `usage_stats`.
- **Migration 026 uitvoeren** (`supabase/migrations/026_submission_feedback.sql`, ná 025) en daarna het E2E-testscript in `docs/PLAN-FEEDBACK.md` doorlopen (leerling levert in → code-kaart → docent geeft feedback → leerling ziet banner + 💌-melding).
- **Lokaal testen**: dev-server starten vanuit de wórktree-map (`cd .claude/worktrees/masterplan-6-weken && npm run dev`) — de gewone projectmap draait de oude code.
- **Supabase Auth → URL Configuration** (⚠️ bevestigd door testronde 1: reset-mail landde op de oude live-site): voeg aan *Redirect URLs* toe: `http://localhost:5199/*`, `http://localhost:5173/*` én `https://soundscout.nl/*`. Zonder localhost-entries valt Supabase bij lokaal testen terug op de Site URL (= oude deploy zonder reset-scherm). Daarna een vérse reset-mail aanvragen en direct klikken (oude links zijn verbruikt/verlopen). De volledige reset-flow (echte e-mail → nieuw wachtwoord) één keer end-to-end testen na deploy.
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
