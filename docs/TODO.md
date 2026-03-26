# SoundScout — Todo's

**Laatst bijgewerkt**: 2026-03-25

---

## Inbox (handmatig toegevoegd)

> Plaats hier ideeën, bugs of verzoeken. Claude verwerkt ze later naar de juiste prioriteit.

_(leeg — alle items verwerkt naar onderstaande prioriteiten)_

---

## Open issues

### P1 — Hoogste prioriteit

#### #59-TEST — Template lock-opties uitgebreid testen
**Complexiteit:** Laag · **Bron:** Implementatie #59 (2026-03-14)

De granulaire template vergrendelingsopties (#59) zijn geïmplementeerd maar nog niet hands-on getest. Testplan:

- [ ] Nieuwe template aanmaken: 4 checkboxes zichtbaar, standaard alles aan
- [ ] Template laden als leerling: clips vergrendeld, secties vergrendeld
- [ ] Template met "secties vergrendelen" UIT: secties wél aanpasbaar
- [ ] Template met "nieuwe clips toestaan" UIT: DnD vanuit library geblokkeerd
- [ ] Template met "bibliotheek vergrendelen" AAN: hotspots disabled op locatie + banner
- [ ] Template met "bibliotheek vergrendelen" UIT: leerling kan extra samples verzamelen
- [ ] Dashboard: lock-badges correct per template
- [ ] Bestaande templates (backward compat): laden nog steeds correct

---

#### #16 — Touch Gevoeligheid & Autoplay Issues
**Complexiteit:** Medium-Hoog · **Bron:** Docent feedback (2026-02-03)
**Status:** Code-verbeteringen doorgevoerd (2026-03-12) — wacht op hands-on device testen

Na eerste schooltest gemeld: op tablets en Chromebooks reageren drag-acties onvoorspelbaar — clips springen, touch wordt als scroll geïnterpreteerd, en autoplay wordt geblokkeerd door browser policy.

Doorgevoerde verbeteringen:
- [x] Web Audio autoplay unlock bij eerste user gesture (click/touchstart in App.tsx)
- [x] Touch sensor tolerance verhoogd naar 10px (meer vergevingsgezind op touch)
- [x] `touch-action: none` op Track containers (voorkomt scroll-interpretatie van drag)

Resterende items (vereisen hands-on testen op iPad, Android tablet, Chromebook):
- [ ] Valideer of sensor config nu correct aanvoelt op touch
- [ ] Touch targets evalueren (44px minimum) — vooral clips bij laag zoomniveau
- [ ] Dubbele touch events reproduceren en oplossen
- [ ] Testen autoplay unlock op Chromebook met beheerder-policies

---

### P2 — Hoge prioriteit

#### #44 — Luister-en-Plaats Modus (omgekeerd spel)
**Complexiteit:** Hoog · **Status:** Concept uitgebreid (2026-03-14)

Omgekeerde spelrichting: het kind hoort een geluid en plaatst het op de juiste plek op de afbeelding. Ideaal voor klassikale inzet met jongere kinderen.

**Klassikale flow:**
De juffrouw/meester speelt een geluid af (bijv. een aap, water, wind). De kinderen kijken naar de afbeelding en bepalen samen: "Waar hoort dit geluid thuis?" Ze slepen het geluid naar de juiste plek op de afbeelding, of wijzen aan waar het moet.

**Goed-fout systeem:**
Per geluid wordt een doelregio gedefinieerd op de afbeelding (cirkel, rechthoek of vrije zone). Plaatst het kind het geluid binnen die regio → goed (visuele + audio feedback). Erbuiten → opnieuw proberen. Dit maakt het speels en leerzaam.

**Combinatie met audio-opnemen (#28):**
De klas neemt samen geluiden op ("Wie kan het geluid van een aap nadoen?") en plaatst die opnames op de afbeelding. Zo ontstaat een zelfgemaakt klanklandschap. Zowel vooraf opgenomen samples als zelf-opgenomen geluiden kunnen geplaatst worden.

**Opslag:** Nog open — lokaal (localStorage) of database (Supabase). Beslissing later.

**Verwant aan:** #28 (microfoon opname), #68 (partituur-tool — beide starten vanuit beeld i.p.v. samples), #72 (praatplaat — verwante richting maar dan collaboratief: leerlingen componeren zelfstandig een soundscape en koppelen die aan een plek op een gedeelde afbeelding)

#### #28 — Eigen Samples Opnemen
**Complexiteit:** Zeer Hoog

Microfoon opname in de app: permissions, real-time waveform, max 5 seconden, encode naar MP3/WAV. Vereist MediaRecorder API.

#### #72 — Praatplaat: Collaboratieve Klankkaart
**Complexiteit:** Hoog · **Status:** Basis geïmplementeerd (2026-03-26) · **Document:** `docs/PLAN-72-PRAATPLAAT.md`

Klassikale activiteit waarbij leerlingen individueel een compositie/soundscape maken en die koppelen aan een specifieke plek (X,Y-positie) op een gedeelde afbeelding ("praatplaat"). De docent opent de praatplaat op het digibord en ziet iconen verschijnen op plekken waar leerlingen composities aan hebben gekoppeld. Door op een icoon te klikken speelt de compositie van die leerling af.

**Klassikale flow:**
1. **Docent** selecteert of uploadt een praatplaat-afbeelding (bijv. een boerderij, stadsplein, bos, schoolplein)
2. **Docent** deelt de praatplaat via een klascode met de klas
3. **Leerlingen** zien op hun eigen device (tablet/Chromebook) dezelfde praatplaat
4. **Leerling** klikt op een plek op de afbeelding: "Ik maak geluid voor dit stuk"
5. **Leerling** komt in de bestaande studio terecht en componeert een korte soundscape (bestaande samples + eventueel zelf opgenomen geluiden)
6. **Leerling** submit de compositie → gekoppeld aan de gekozen X,Y-positie
7. **Docent** opent de praatplaat op het digibord → op verschillende plekken verschijnen iconen (bijv. luidspreker-symbool of avatar) met de naam van de leerling
8. **Docent** klikt op een icoon → de compositie van die leerling speelt af

**Geavanceerd — simultaan afspelen:**
De docent kan meerdere iconen "activeren" en tegelijkertijd afspelen. Zo hoort de klas hoe alle individuele composities samensmelten tot één groot klanklandschap. Dit is het pedagogisch hoogtepunt: elk kind heeft een bijdrage geleverd aan het geheel.

**Open ontwerpvragen:**
- **Spot-claiming:** Mogen meerdere leerlingen dezelfde plek kiezen? (Ja lijkt logischer — vergelijk: 3 kinderen maken elk een ander geluid voor de vijver)
- **Spotgrootte:** Punt-marker (simpel) of een cirkelvormig gebied (visueel duidelijker)?
- **Afbeeldingsbron:** Gecureerde praatplaten bij thema's, of docent uploadt zelf een afbeelding?
- **Compositieduur:** Beperken tot bijv. 8-16 beats voor korte soundscapes, zodat simultaan afspelen niet chaotisch wordt?

**Technische haalbaarheid (~70% hergebruik):**
Bestaande systemen die hergebruikt worden:
- **Hotspot-systeem** (locatieschermen): X,Y-positionering op afbeeldingen bestaat al
- **Klascode-systeem** (Supabase): leerlingen koppelen aan docent/klas werkt al
- **Compositie-inzending**: `submit_composition` RPC + `submissions` tabel bestaan al
- **Compositie-afspelen**: `SharedPlayer` / `SubmissionPlayer` bestaan al
- **Docenten dashboard**: basis voor het tonen van ingezonden werk aanwezig

Nieuw te bouwen:
- **Praatplaat-modus**: nieuw scherm of tab in dashboard waar docent een praatplaat beheert
- **Spot-selectie UI**: leerling klikt op afbeelding om positie te kiezen (hergebruik van hotspot click-logica)
- **Praatplaat-viewer**: docentenweergave met iconen op posities, click-to-play per icoon
- **Simultaan afspelen**: meerdere composities tegelijk afspelen (meerdere `Tone.Player` instances, volume balancing)
- **Database**: nieuw veld `position_x`, `position_y` op submissions, of aparte `praatplaat`-tabel

**Pedagogische sterkte:**
- Verbindt geluid aan visuele betekenis ("hoe klinkt dit deel van het plaatje?")
- Elk kind draagt bij aan een geheel, maar werkt zelfstandig (geen real-time sync nodig!)
- Klassikaale afsluiting: samen luisteren naar het resultaat op het digibord
- Laagdrempelig: dezelfde studio die kinderen al kennen

**Verwant aan:** #44 (luister-en-plaats — verwant maar omgekeerd: daar plaatst het kind een bestaand geluid, hier componeert het kind nieuw geluid voor een plek), #63 (collaboratief storyboard — praatplaat is eenvoudiger alternatief zonder real-time sync), #42 (ensemble — praatplaat is asynchroon i.p.v. real-time), #28 (eigen samples opnemen — mooie combinatie)

---

### P3 — Middel prioriteit

#### #48 — Video-Storyboard (Compositie bij Video)
**Complexiteit:** Zeer Hoog · **Afhankelijk van:** #41 ✅ · **Status:** Onderzoeksfase

Video afspelen i.p.v. stilstaande afbeeldingen in het storyboard-systeem. De natuurlijke evolutie van het huidige storyboard: "componeer een soundtrack bij dit filmfragment."

**Pedagogische waarde:**
Kinderen leren muziek/geluid koppelen aan bewegend beeld — een stap dichter bij echte filmmuziek-compositie. Korte clips (15-30 seconden) van natuur, stadsleven, sport, etc. werken het beste om focus te houden.

**Content-bottleneck:**
De grootste uitdaging is niet technisch maar inhoudelijk: wie levert de video's? Opties: (a) gecureerde clipbibliotheek meeleveren met thema's, (b) docent uploadt eigen clips, (c) koppeling met vrij beschikbare educatieve video's. Dit verschuift het product richting een film-scoring tool — bewuste keuze nodig of dat gewenst is.

**Technische uitdagingen:**
- HTML5 `<video>` synchronisatie met Tone.js transport (play, pause, seek)
- Video hosting en bandbreedte (te groot voor statische hosting op Strato)
- Performance op tablets/Chromebooks (video + audio tegelijk)
- Mobile autoplay restricties (vergelijkbaar met audio autoplay, maar strenger voor video)

**Verwant aan:** #41 ✅ (storyboard basis), #71 (variabel aantal afbeeldingen), #72 (praatplaat)

#### #71 — Storyboard: variabel aantal afbeeldingen (3-5 keuze)
**Complexiteit:** Laag · **Status:** Geparkeerd — systeem klaar, wacht op content (2026-03-25)

Het storyboard-systeem ondersteunt al dynamisch elk aantal afbeeldingen (secties, image sync, viewers, video export werken allemaal met variabele aantallen). Er is geen code-aanpassing nodig. Wat ontbreekt is **content**: nieuwe afbeeldingen voor storyboards met 4 of 5 scènes. Twee richtingen overwogen: (a) verhalende storyboards met actie (schooldag, marktdag), (b) zoekplaten per dagdeel (dezelfde locatie op verschillende momenten). Nieuwe storyboards worden handmatig in code toegevoegd (route 1) wanneer afbeeldingen beschikbaar zijn.

**Verwant aan:** #41 ✅ (storyboard basis), #48 (video-storyboard), #69 (moduswisseling)

#### UX-9 — Studio pagina indeling herbekijken
**Status:** Grotendeels afgerond (2026-03-18)

Afgerond: timeline hoogte + image padding (2026-03-12), toolbar crowding fix (sample info pill + zoom hidden op mobile), full-row drag targets voor samples, narrowere track labels op mobile (2026-03-18).

Eventueel resterend: verdere verhouding-verbeteringen op zeer kleine schermen indien nodig.

#### #69 — Storyboard ↔ vrij modus wisselen zonder clips te verliezen
**Complexiteit:** Medium · **Status:** Concept

Momenteel wist `ComposeModeScreen` altijd de volledige timeline (`clearAllTracks` + `clearSections`) bij elke moduswissel. Gebruikers zouden vanuit de studio moeten kunnen wisselen tussen storyboard/image/vrij modus, waarbij clips behouden blijven en alleen secties + afbeeldingen resetten. Vereist een in-studio mode-switcher (momenteel alleen beschikbaar op het keuzescherm vóór de kaart).

---

### P4 — Lage prioriteit

#### #68 — Visuele Partituur-Tool (omgekeerde compositie-workflow)
**Complexiteit:** Zeer Hoog · **Status:** Conceptfase — moet verder uitgedacht worden
**Document:** `docs/CONCEPT-PARTITUUR-TOOL.md`

Leerlingen kijken naar een beeld en tekenen eerst een visuele partituur (blokken op tijdlijn: lang/kort, veel/weinig). Pas daarna zoeken ze samples die bij hun ontwerp passen. Omgekeerde workflow: van structuur naar klank i.p.v. van klank naar structuur. Pedagogisch sterk: dwingt leerlingen om eerst na te denken over opbouw, timing en spanning. Technisch 80% hergebruik van bestaande SoundScout-componenten. **Open vraag:** moet dit een modus binnen SoundScout worden of een losstaande tool? Afhankelijk van #65 (clip-loop) voor de sample-koppeling.

#### #63 — Collaboratief storyboard (leerlingen werken aan delen)
**Complexiteit:** Zeer Hoog · **Status:** Concept — mogelijk vervangen door #72 (praatplaat)

Leerlingen werken aan verschillende afbeeldingen van een storyboard die later samengevoegd worden tot één geheel. Vereist: task-toewijzing per leerling, merge-logica, mogelijk Supabase Realtime sync. Verwant aan #42 (Ensemble-modus).

**Opmerking (2026-03-25):** Het praatplaat-concept (#72) biedt een eenvoudiger en concreter alternatief voor collaboratieve compositie. Waar #63 real-time sync en merge-logica vereist, werkt de praatplaat volledig asynchroon: leerlingen componeren onafhankelijk en koppelen hun werk aan een positie. Geen conflict resolution nodig. Overweeg om #72 als eerste stap te implementeren en #63 te parkeren.

#### #30 — Extra Locaties
**Status:** 5 locaties af, 4 nog gepland (Spookhuis, Strand, Markt, Ruimtestation)

#### #42 — Samenspel / Ensemble-modus
**Complexiteit:** Zeer Hoog · **Status:** Geparkeerd (concept)

Meerdere leerlingen op aparte devices dragen bij aan dezelfde compositie. Vereist real-time sync (Supabase Realtime), versioning, conflict resolution. Vervangt oud #32 (Multiplayer).

#### #46 — Virtual Reality / 360° Locaties
**Complexiteit:** Zeer Hoog · **Status:** Geparkeerd (onderzoeksfase)

360° panorama of VR locaties met spatial audio. Vereist browser support research, performance testing, content-creatie haalbaarheid.

---

### P5 — Backlog

#### #38 — i18n Review (Terugkerend)
Periodiek nalopen na elke feature: hardcoded teksten, NL/EN pariteit, vertaaldekking.

#### #43 — Lesbrieven & Werkvormen
Content-creatie (geen code): 4 lesbrieven met concrete muziektaken, reflectie en luisteropdrachten.

#### TP3-4 — Alfanumerieke klas-codes
**Status:** Geparkeerd — pas nodig bij >1.000 actieve klassen. Vereist DB migratie.

#### TP4-1 — Split AudioService in sub-services
**Status:** Toekomstig — AudioService is een god-object. Split in AudioLoader, AudioPlayer, TimelineScheduler, AmbientAudioManager.

#### TP4-2 — Factory pattern voor AudioService
**Status:** Toekomstig — singleton maakt unit testing onmogelijk.

#### TP5-5 — Zod validatie op Supabase RPC responses
**Bron:** Architectuur-analyse (P2) · `src/lib/submissions.ts`, `src/lib/templates.ts` — localStorage reads worden gevalideerd met Zod, maar Supabase RPC returns worden gecast zonder validatie. Schema-wijzigingen op de server kunnen stille runtime failures veroorzaken. Fix: voeg Zod schemas toe voor alle RPC return types.

#### TP5-6 — StorageService migratiestrategie
**Bron:** Architectuur-analyse (P2) · `StorageService.ts` — `STORAGE_VERSION` is uitgecommentarieerd. Schema-wijzigingen veroorzaken stille data loss (composities die Zod-validatie falen worden stil gefilterd). Fix: implementeer `migrateIfNeeded()` met versioned transformers.

#### TP5-7 — Extraheer useCompositionPlayer() hook
**Bron:** Architectuur-analyse (P2) · `SharedPlayer.tsx` (381 regels) en `SubmissionPlayer.tsx` (353 regels) zijn ~95% identiek. Extraheer gedeelde playback-logica (data fetching, audio init, transport controls, beat tracking) naar een herbruikbare hook.

#### TP5-8 — Extraheer useCompositionData() hook
**Bron:** Architectuur-analyse (P2) · `StageView.tsx` assembleert compositie-data 3x voor verschillende modals. Extraheer naar een gedeelde hook die tracks + samples + metadata bundelt.

#### TP5-9 — Decompose Timeline.tsx
**Bron:** Architectuur-analyse (P3) · 582 regels, 19 hooks. Split in Timeline (core), TimelineHeader (edit toolbar + tools), ZoomControls. Verbetert leesbaarheid en testbaarheid.

#### TP5-10 — Verwijder dode velden uit TimelineState
**Bron:** Architectuur-analyse (P3) · `isPlaying` en `currentBeat` in `TimelineState` worden altijd hardcoded naar `false`/`0` in `getTimelineState()`. Verwijder uit het type en pas serialisatie/deserialisatie aan.

#### TP5-1 — StorageService.getRaw() silent catch loggen
**Bron:** Architectuur-analyse · `StorageService.ts:311-318` — JSON.parse fout wordt stil geslikt zonder logging. Callers loggen wél validatiefouten, maar JSON-corruptie is onzichtbaar. Voeg `logger.warn` toe in catch block.

#### TP5-2 — Bundle size: lazy-load Supabase
**Bron:** Architectuur-analyse · Main chunk 534KB (gzip 160KB). Supabase (167KB) is alleen nodig voor docentenflow. Lazy-load via dynamic import achter teacher-login guard.

#### TP5-3 — Bundle size: dynamic import lamejs
**Bron:** Architectuur-analyse · `audio-export` chunk is 169KB. lamejs encoder alleen laden wanneer export daadwerkelijk wordt getriggerd.

#### TP5-4 — Security headers voor productie
**Bron:** Architectuur-analyse · CSP, X-Frame-Options, HSTS headers toevoegen aan hosting config (Strato). DEPLOY-5 markeerde dit als afgerond maar bevestiging nodig op productie.

#### TP4-4 — Tier 2 tests: services met Tone.js mock
#### TP4-5 — Tier 3 tests: component integratie

---

## Niet implementeren

| Item | Reden |
|------|-------|
| Locked locaties | Niet nodig, vrije toegang gewenst |
| Achievements & Badges | Niet gewenst |
| Bulk afspelen | Overkill |
| CSV export | Overkill |
| Volume slider ambient | Alleen on/off nodig |
| UX-5 Studio cognitive load (auto-collapse tracks) | 8 tracks gewenst — leerlingen moeten meerstemmigheid zien |
| UX-6 StageView knoppen hiërarchie | Huidige layout voldoende |
| A11Y-5 ZoomableView keyboard | Alleen kleine schermen, geen prioriteit |
| A11Y-6 Audio zonder visueel alternatief | Niet geschikt voor deze app |
| PERF-4 Image optimalisatie | Geen merkbare laadproblemen in praktijk |
| SEC-1 Credentials in git | **False positive** — `.env.local` nooit gecommit, `.gitignore` correct, alleen `.env.example` (zonder secrets) in git |
| Cross-store sample validatie | **Reeds geïmplementeerd** — `addClip`, `moveClip`, `duplicateClip` valideren allemaal sampleId bestaan |
| Zod schema coverage | **Voldoende** — alle untrusted boundaries (localStorage, Supabase) hebben schemas. Interne types (Location, Hotspot) hoeven geen runtime validatie |
| UX-4 Kindvriendelijker vocabulaire | Bewust besluit: huidige termen (Compositie, Bibliotheek, Samples, Dupliceren) blijven behouden |

---

## Afgerond

### Technische beslissingen

| Beslissing | Keuze | Motivatie |
|---|---|---|
| State management | Zustand | Lightweight, eenvoudige API, geen boilerplate |
| Drag & Drop | dnd-kit | Moderne API, goede a11y, actief onderhouden |
| Styling | Tailwind CSS v4 | Snelle development, consistent design system |
| Audio | Tone.js | Robuuste Web Audio abstractie, scheduling |
| Build tool | Vite | Snelle HMR, optimale productie builds |
| i18n | react-i18next | Industriestandaard, lazy loading, NL als default |

### Features (per issue)

| # | Titel | Datum | Notities |
|---|-------|-------|----------|
| #1 | Nieuwe Locaties & Stadskaart | 2026-02-01 | Theme systeem, 5 locaties, voortgangsindicator |
| #2 | Audio Export als MP3 | 2026-02-01 | Tone.js Offline + lamejs, 128kbps stereo |
| #3 | Lokaal Opslaan & Beheren | 2026-02-01 | localStorage, max 10 composities |
| #4 | Responsive Design | 2026-02-01 | sm: breakpoint (640px), 44px touch targets |
| #5 | Studio Layout | 2026-02-01 | 8 tracks, timeline onderaan, flex-wrap library |
| #6 | Nieuwe Locaties Assets | 2026-02-01 | Boerderij, Speeltuin, Gymzaal, Muziekwinkel |
| #7 | Design System & Styling | 2026-02-02 | 60-30-10 kleurregel, "Club" → "Stage" |
| #8 | Teacher Dashboard Verbeteringen | 2026-02-02 | Read-only timeline, fullscreen modal |
| #9 | StartScreen Branding | 2026-02-02 | Logo, favicon, footer, social links |
| #10 | Klas-code Systeem | 2026-02-03 | Supabase auth, RLS, 4-cijferige codes |
| #11 | Hotspot Animaties | 2026-02-03 | Pulse, hover, active, collected states |
| #12 | Clip Trimming & Smart Snap | 2026-02-03 | 7-fase roadmap, waveform, modal. Docs: `ROADMAP-CLIP-TRIMMING.md` |
| #13 | Thema Selectie Modal | 2026-02-10 | Grid met kaartjes, hover effect |
| #14 | Delen met Link | 2026-02-27 | Share codes (8 chars), 30 dagen geldig. Docs: `PLAN-DELEN-MET-LINK.md` |
| #15 | Emergency/Feedback Systeem | 2026-02-05 | EmailJS, rate limiting, context collectie |
| #17 | Playhead Seeking | 2026-02-04 | Hybride aanpak: actieve clips direct + Tone.Part. Docs: `ROADMAP-PLAYHEAD-SEEKING.md`, `TONEJS-KENNISBANK.md` |
| #18 | Ambient Audio | 2026-02-03 | Tone.Player, -15dB, fade in/out |
| #20 | Vereenvoudigde Transport Controls | 2026-02-05 | Play/Pause + Rewind + Loop |
| #21 | Template Systeem voor Docenten | 2026-02-28 | Docent maakt template, leerling laadt in |
| #23 | Getrimde Clip Kopiëren/Dupliceren | 2026-02-05 | Ctrl+D, smart snap plaatsing |
| #26 | Ambient Audio Cleanup & Pause/Stop Fix | 2026-02-26 | Fade timeout leak fix |
| #31 | Beat Ruler met Maatnummers | 2026-02-27 | Maatnummers 1-32 boven timeline |
| #34 | Sample Wis Knop UI | 2026-02-27 | |
| #35 | Tweetalig Systeem (i18n Audit) | 2026-02-27 | ~150 keys, LanguageSwitcher, localStorage |
| #36 | Playhead Seeking Docenten Viewer | 2026-02-27 | Hergebruik Playhead in read-only |
| #37 | Grijs Leeg Gedeelte Verwijderen | 2026-02-27 | `min-h-screen` → `h-dvh overflow-hidden` |
| #39 | Volume per Track + Clip Volume/Mute | 2026-02-27 | dB-based, geen persistent Gain nodes |
| #40 | Scène-markering op Timeline | 2026-02-28 | SectionBar, flags, labels, kleuren |
| #41 | Soundscape Storytelling (Volledig) | 2026-03-12 | Fase A–D + D.4 template-integratie + D.7 edge cases (17 tests, shared utility, MAX_SECTIONS guard). Docs: `PLAN-41-STORYTELLING.md` |
| #45 | Wis Tijdlijn Knop | 2026-03-11 | Eraser icon, inline confirm |
| #47 | Sectie Drag Resize | 2026-03-12 | Drag handles op sectie-grenzen, vrij slepen (0.5 beat snap), min 2 beats, werkt in storyboard- én vrije modus |
| #51 | Feedback-knop Prominenter | 2026-03-12 | "Hulp nodig of bug melden?" link onder "Hoe werkt het" op startscherm |
| #27 | Locatie Editor Verbeteringen | 2026-03-12 | MP3 upload per hotspot met auto-duration, drag-and-drop herpositionering, audio preview, edit bestaande hotspots, alle thema's in dropdown, split theme/location dropdowns, i18n fix, handleiding-modal |
| #54 | YouTube Uitlegvideo's in Tutorial | 2026-03-12 | Links naar "Uitleg SoundScout" en "Uitleg docent dashboard" in "Hoe werkt het?" modal |
| #53 | Zoom Functie Timeline | 2026-03-12 | Fit-to-width default (desktop), vrij zoomen (0.25× stappen, 0.5×–4.0×), zoom centreert op playhead, mobiel start ingezoomd |
| #16 | Touch & Autoplay — code-verbeteringen | 2026-03-12 | Web Audio autoplay unlock (App.tsx), touch tolerance 10px, touch-action:none op Track. Rest wacht op device testen |
| #49 | Storyboard in Docentenviewer + Deellink | 2026-03-12 | StoryboardViewer component (props-driven, geen store), geïntegreerd in SubmissionPlayer (docent dashboard) en SharedPlayer (publieke deellink). Toont afbeeldingen gesynchroniseerd met beat/secties |
| #50 | Export Storyboard als Video (MP4/WebM) | 2026-03-13 | Dual-engine: WebCodecs + Mediabunny (MP4, H.264+AAC) primary, MediaRecorder (WebM, VP8+Opus) fallback. Multi-profiel H.264 detectie (Main→High→Baseline) + hardware/software fallback. 1080p, 30fps, 0.5s crossfade. Video-duur = max(audio, timeline) zodat stille secties ook getoond worden |
| SEC-2 | Server-side Rate Limiting | 2026-03-13 | `rate_limits` tabel + `check_rate_limit()` helper in PostgreSQL. submit: 60/min per klascode, share: 10/min per sessie, get_shared: 30/min per code. Migratie: `002_rate_limiting.sql` |
| SEC-3b | Defense-in-depth class delete | 2026-03-12 | `.eq('teacher_id', user.id)` toegevoegd aan delete-query in `useClasses.ts` |
| #55 | DnD: Sample plakt aan spoor 1 + zoom positie | 2026-03-14 | Custom collision detection (`pointerWithin` + `closestCenter` fallback), `MeasuringStrategy.WhileDragging`, real-time pointer tracking i.p.v. activatorEvent+delta |
| #56 | Sectiemarkeringen niet vergrendeld bij template | 2026-03-14 | `sectionsResizable` nu `false` wanneer `activeTemplate !== null`, voorheen was resize mogelijk bij template+storyboard combinatie |
| #57 | Playhead klikken op ruler + seek tijdens playback | 2026-03-14 | Ruler click zone toegevoegd (seek naar geklikte positie), drag ook tijdens playback mogelijk, `isPlaying` guard verwijderd |
| #58 | SharedPlayer: layout + ontbrekende features | 2026-03-16 | (1) Metadata compact in header-balk, info bar verwijderd. (2) `sections` prop op Timeline zodat read-only players secties tonen. (3) `onSeek` + `handleSeek` in SharedPlayer voor playhead drag/click. (4) Stop-icoon → SkipBack in beide players. (5) Transport iconen (Play/SkipBack) gelijk gemaakt in SharedPlayer + SubmissionPlayer. (6) Playback-bugs gefixed: altijd reschedule + play(currentBeat) zodat seek-positie wordt gerespecteerd, `audioService.seek()` i.p.v. directe transport-manipulatie. (7) Transport buttons verkleind naar studio-formaat (w-10/sm:w-12 play, w-9/sm:w-11 stop) |
| #59 | Template vergrendelingsopties uitbreiden | 2026-03-14 | `clipsLocked` boolean → `TemplateLockOptions` object met 4 granulaire opties: clips, secties, bibliotheek, nieuwe clips. Standaard alles vergrendeld. SaveAsTemplateModal toont 4 checkboxes. Backward compat via `parseLockOptions()`. Supabase: `lock_options` JSONB kolom + RPC update. Migratie: `003_template_lock_options.sql` |
| #60 | Storyboard afbeelding vergroten (lightbox) | 2026-03-16 | ZoomIn-knop op alle storyboard-afbeeldingen (StoryboardViewer, StorytellingPanel, StorytellingDisplay). Herbruikbaar `ImageLightbox` component: fullscreen overlay, escape/backdrop-click sluiten, play/pause/stop transport controls in lightbox, spatiebalk sneltoets |
| #62 | Crossfade bij afbeeldingwissel (live) | 2026-03-16 | Herbruikbaar `CrossfadeImage` component: oude afbeelding fadeout op top-layer, nieuwe afbeelding direct zichtbaar eronder. 500ms ease-in-out. Wrapper div met `relative max-h-full` lost positioning-glitch op (overlay vulde parent container i.p.v. image area bij `object-contain`). Toegepast in StoryboardViewer, StorytellingPanel, StorytellingDisplay. Tijdelijk test-storyboard "Test Locaties" (3 locatie-afbeeldingen) toegevoegd |
| #61 | Vrije afbeelding: locatiekeuze bij compositiemodus | 2026-03-16 | Bij "Afbeelding"-modus toont picker alle locatieafbeeldingen uit het thema. Virtueel single-image storyboard (`location-{id}`) hergebruikt bestaand storyboard-systeem. `findStoryboardById()` uitgebreid voor `location-` prefix. Kaartjes vereenvoudigd (alleen titel + afbeelding). `containerClassName` prop op CrossfadeImage voor correcte studio-sizing |
| #64 | "Ga verder" knop op startscherm | 2026-03-16 | Wanneer tijdlijn clips bevat verschijnt "Ga verder" knop boven "Nieuwe Compositie". Detectie via `selectHasClips()`. Navigeert direct naar studio |
| #66 | Clip-labels (tekst op clip) | 2026-03-16 | `label?: string` op Clip interface. Tag-icoon in clip edit toolbar opent inline tekstveld (max 30 chars). Label vervangt sample-naam op de clip. Persist via Zod schema + localStorage. Duplicate kopieert label mee |
| #67 | Track-kleuren (visuele groepering) | 2026-03-16 | `color?: string` op Track interface + `TRACK_COLORS` palette (8 kleuren). Hele track-achtergrond krijgt lichte tint (~7% opacity), track-label iets sterker (~15%). Kleurkiezer geïntegreerd in track volume-popover met "geen kleur" optie. Persist via Zod schema + localStorage |
| P1-A | Audio stop bij undo/redo | 2026-03-16 | `audioService.stop()` vóór state-restore in `useUndoRedoTimeline`. Voorkomt desync waarbij oude clips doorspelen na Ctrl+Z |
| P1-B | AbortController op sample loading | 2026-03-16 | AbortController toegevoegd aan `useStudioPlayback` en `StagePlayback` sample loading. Voorkomt stale loads bij snelle navigatie |
| #65 | Clip-loop (sample herhaalt binnen clip-duur) | 2026-03-18 | `loop`/`loopDurationBeats` op Clip interface. Resize handle (pointer events, niet dnd-kit) op rechterrand van geselecteerde clip. Loop genereert meerdere ClipEvents in `scheduleTimeline()`. Loop-aware seek via modulo-berekening. Loop-aware collision detection, duplicatie, export. Lichtere tint overlay voor herhalingen. `transition-all` uitgeschakeld tijdens resize om visuele jitter te voorkomen |
| #33 | Clip-effecten: Pitch + Reverb | 2026-03-18 | Per-clip `Tone.PitchShift` (-12 tot +12 halftonen) en `Tone.Reverb` (0-100%). Geïsoleerde effect chains (eigen `Tone.Player` + nodes) per clip met effecten — shared players blijven ongewijzigd. `clipEffectChainMap` voor seek-support zodat `startActiveClips()` de juiste player gebruikt. EffectsPopover (portal-based, violet accent). Sparkles-icoon als indicator. Effecten meegekopieerd bij duplicate. Offline export bouwt per-clip effect chains |
| UX-9 | Studio mobiele indeling | 2026-03-18 | Toolbar crowding fix (sample info pill + zoom hidden op mobile), full-row drag targets voor samples in library, narrowere track labels op mobile (w-4 i.p.v. w-5) |
| #22 | Real-time geluiden toevoegen tijdens afspelen | 2026-03-19 | `audioVersion` counter in timelineStore (15 audio-relevante acties). `useRescheduleOnChange` hook detecteert wijzigingen tijdens playback. `rescheduleWhilePlaying()` op AudioService: stop players → reschedule → hervat vanaf zelfde beat. Alle timeline-wijzigingen (clips, volume, mute, trim, loop, pitch, reverb) klinken direct tijdens playback. Docs: `PLAN-22-REALTIME-CLIP-TOEVOEGEN.md` |
| #52 | Online bewaarcode (compositie overdracht) | 2026-03-19 | 6-karakter bewaarcode via `SaveOnlineModal` op podium. `save_composition_online` RPC → code + secret. Op ander apparaat: code invoeren → `load_saved_composition` + `claim_saved_composition` → laadt in studio. Secret in localStorage voor update-rechten. 60 dagen inactiviteit-expiry. Optioneel: klascode-koppeling + e-mail. Migratie: `004_save_codes.sql`. Docs: `PLAN-52-BEWAARCODE.md` |
| UX-10 | Podium UX refactor — actiemenu | 2026-03-19 | Podium teruggebracht naar 3 knoppen (Opslaan, Delen & Exporteren, Nieuwe compositie). Alle secundaire acties (bewaar online, deel link, deel met docent, export MP3, export video, template) verplaatst naar `StageActionsModal` — gegroepeerd met kopjes en hint-teksten. Modal slide-up op mobiel, gecentreerd op desktop. Design tokens (`bg-bg-surface`, `text-text-main`, `text-text-muted`) consistent met app |
| #54b | Tutorial als eigen scherm | 2026-03-24 | "Hoe werkt het?" modal vervangen door dedicated `TutorialScreen` (`'tutorial'` in GameScreen). Quick-start stappen (4 stappen, accent-kleur badges) + video-thumbnails per categorie ("Voor de componisten", "Voor de docenten"). Klik op thumbnail → inline YouTube player (geen 7 iframes tegelijk). Provider-onafhankelijk: `thumbnailUrl()` en `embedUrl()` zijn de enige YouTube-specifieke functies. Lazy-loaded |
| #70 | Storyboard-badge in docentenlijst | 2026-03-25 | `SubmissionCard` toont nu een accent-kleur badge met Image-icoon + "Storyboard" label als `composition_data.storyboardId` aanwezig is. Docenten zien in één oogopslag welke inzendingen een storyboard bevatten |
| #52-FASE2 | Bewaarcode uitbreidingen | 2026-03-25 | Drie verbeteringen: (A) Auto-sync naar online bewaarcode bij lokaal opslaan via fire-and-forget `updateSavedComposition()` in `useStageSave`. (B) QR-code toggle in `SaveOnlineModal` success-scherm via `qrcode` npm package. (C) Teacher dashboard "In bewerking" tab in `ClassDetail` — splitst submissions op `save_code` aanwezigheid. WIP-kaarten tonen blauw "In bewerking" badge + "Laatst bewerkt" datum |
| #72 | Praatplaat: Collaboratieve Klankkaart | 2026-03-26 | Basis-implementatie. Docent: CreatePraatplaatModal (naam + locatiekeuze), PraatplaatCard (thumbnail, toggle actief/inactief, verwijder), PraatplaatViewer (fullscreen presentatie met spots + clustering + klik-to-play via SubmissionPlayer). Leerling: ShareCodeInput detecteert 4-cijferige klascode → getActivePraatplaat() → PraatplaatSelectScreen (positie kiezen op afbeelding) → normaal componeren → auto-submit bij opslaan. Database: `praatplaten` tabel + 3 kolommen op `submissions`, 7 RPC functies, trigger voor 1 actieve per klas. Migratie: `005_praatplaten.sql`. Plan: `PLAN-72-PRAATPLAAT.md` |

### Technische schuld (afgerond)

| ID | Titel | Datum |
|----|-------|-------|
| TP0-1 | Vervang `any` door `CompositionData` | 2026-02-27 |
| TP0-2 | Rate limiting submissions | 2026-02-27 |
| TP0-3 | CHECK constraints Supabase | 2026-02-27 |
| TP0-4 | max_classes enforcement | 2026-02-27 |
| TP1-1 | Split StageView.tsx | 2026-02-27 |
| TP1-2 | Ambient audio fade timeout leak | 2026-02-27 |
| TP1-3 | Error handling async hooks | 2026-02-27 |
| TP1-4 | Feature-level Error Boundaries | 2026-02-27 |
| TP1-5 | Orchestratie compositionInit | 2026-02-27 |
| TP2-1 | gameStore → appStore migratie | 2026-02-27 |
| TP2-2 | libraryStore redundante state | 2026-02-27 |
| TP2-3 | SmartSnapResult error context | 2026-02-27 |
| TP2-4 | Extraheer usePanZoom() | 2026-02-27 |
| TP2-5 | Extraheer useStudioKeyboardShortcuts() | 2026-02-27 |
| TP2-6 | timelineStore parameter bloat | 2026-02-27 |
| TP2-7 | Zod data validatie | 2026-02-27 |
| TP3-1 | Memoized selectors timelineStore | 2026-02-27 |
| TP3-2 | Player cache opschoning | 2026-02-27 |
| TP3-3 | StorageService faal-feedback | 2026-02-27 |
| TP3-5 | Gevoelige data uit console.error | 2026-02-27 |
| TP4-3 | Tier 1 tests (209 tests) | 2026-02-27 |

### UX & Accessibility (afgerond)

| ID | Titel | Datum |
|----|-------|-------|
| UX-2 | Undo/Redo (Ctrl+Z) | 2026-02-27 |
| UX-3 | Succes-animatie sample verzamelen | 2026-02-27 |
| UX-7 | EditToolbar touch targets 44px | 2026-02-27 |
| UX-8 | Klascode projector-modus | 2026-02-27 |
| A11Y-1 | DnD keyboard alternatief | 2026-02-27 |
| A11Y-2 | Playhead accessible (role=slider) | 2026-02-27 |
| A11Y-3 | Timeline screen reader | 2026-02-27 |
| A11Y-4 | Clips role + keyboard | 2026-02-27 |
| A11Y-7 | Quick wins (aria, focus trap, labels) | 2026-02-27 |

### Performance & Deployment (afgerond)

| ID | Titel | Datum |
|----|-------|-------|
| PERF-1 | Route-level code splitting | 2026-02-27 |
| PERF-2 | currentBeat re-render fix | 2026-02-27 |
| PERF-3 | Vite build manualChunks | 2026-02-27 |
| PERF-5 | Timeline grid memoization | 2026-02-27 |
| DEPLOY-1 | SEO meta tags + Open Graph | 2026-02-27 |
| DEPLOY-2 | PWA manifest | 2026-02-27 |
| DEPLOY-3 | Caching headers audio | 2026-02-27 |
| DEPLOY-4 | `<html lang="nl">` | 2026-02-27 |
| DEPLOY-5 | Content Security Policy | 2026-02-27 |
| DEPLOY-6 | Favicon pad fix | 2026-02-27 |
| DEPLOY-7 | Environment-specifieke builds | 2026-02-27 |
| DEPLOY-8 | Eerste deploy naar Strato | 2026-03-12 | Live op productie |

### Initiële implementatie (Stap 0–12)

Alle stappen van het oorspronkelijke project (31-01-2026):
types, data, stores, audio engine, startscherm, locatie-scherm, studio, podium, navigatie, styling, code review.
Zie git history voor details.
