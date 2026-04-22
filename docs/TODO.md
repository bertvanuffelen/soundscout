# SoundScout — Todo's

**Laatst bijgewerkt**: 2026-04-15

---

## Inbox (handmatig toegevoegd)

> Plaats hier ideeën, bugs of verzoeken. Claude verwerkt ze later naar de juiste prioriteit.

[ ] Naaminconsistentie thema "basis": stadsplattegrond toont "MUZIEKLOKAAL" en "KINDERBOERDERIJ", maar i18n-labels zijn "De Muziekwinkel" en "De Boerderij". Alleen de weergavenamen in `src/i18n/locales/{nl,en}.json` aanpassen — IDs (`muziekwinkel`, `boerderij`) en bestandsnamen/paden blijven ongewijzigd. Voorstel: `locations.muziekwinkel.name` → "Het Muzieklokaal", `locations.boerderij.name` → "De Kinderboerderij". Ook description-teksten herzien (muziekwinkel heet nu "gezellige muziekwinkel vol instrumenten" — past bij lokaal net zo goed). EN-equivalenten eveneens bijwerken.
[ ] Waarom zijn de youtube video's niet in de sectie "Hoe werkt het" niet zichtbaar op mijn iPad. Wel een algemene play button, maar verder blijft het zwart.
[ ] In studio timeline is er nu onder 8e spoor een grijs vlak. Of in ieder geval wanneer je naar beneden scrollt dan zie je een grijs vlak. Kunnen we dit blokkeren dat dus spoor 8 gewoon aan de onderkant is en dat je niet verder kan scrollen.
[ ] De studio heeft 8 sporen. We moeten nadenken of we de optie willen inbouwen dat een leerling nog extra sporen kan toevoegen en zo ja, hoe?

---

## Ontwikkelbundels (voorstel)

> Issues gegroepeerd op samenhang en efficiëntie. Pak per bundel op voor focus.

### Bundel C — Mobile/touch hardening (~1 dag)
Vereist hands-on device testen (iPad, Android, Chromebook). Issues hangen samen.

| Issue | Titel | Complexiteit |
|-------|-------|-------------|
| #MOBILE-AUDIT-BLOKKER | Touch-targets + iOS video-export | Medium |
| #MOBILE-AUDIT-BELANGRIJK | Safe-area, autoscroll, overscroll | Klein-Medium |
| #16 | Touch gevoeligheid & autoplay (resterende items) | Medium-Hoog |
| #59-TEST | Template lock-opties hands-on testen | Laag |

### Bundel D — Code-kwaliteit quick wins (~3 uur)
Kleine verbeteringen die in rustiger momenten opgepakt kunnen worden.

| Issue | Titel | Complexiteit |
|-------|-------|-------------|
| #MOBILE-AUDIT-MONITOR | Aandachtspunten uit mobile audit | Klein-Medium |
| #38 | i18n review (terugkerend) | Laag |
| PERF-4 | Theme images ongeoptimaliseerd | Laag |

### Bundel E — Audio-opname infrastructuur + vervolgfeatures (volgorde belangrijk)
Bouw de opname-infra in #74, daarna worden #28 en #76 veel goedkoper.

| Stap | Issue | Titel | Complexiteit | Waarom deze volgorde |
|------|-------|-------|-------------|----------------------|
| 1 | #74 | Opname-Praatplaat (audio recording) | Hoog | Levert `useMicRecorder`, `RecordingPanel`, `audioFormat.ts` en Supabase Storage bucket op |
| 2a | #28 | Eigen Samples Opnemen | Medium → Laag | Hergebruikt recording-infra uit #74; resteert alleen: blob → sample, libraryStore, UI-knop |
| 2b | #76 | Custom Praatplaat-afbeeldingen Uploaden | Middel → Laag-Middel | Hergebruikt Supabase Storage bucket uit #74; resteert: upload UI, client-side resize, URL opslaan |

> Stap 2a en 2b zijn onafhankelijk van elkaar en kunnen parallel of in willekeurige volgorde.

---

## Open issues

### P1 — Hoogste prioriteit

#### #59-TEST — Template lock-opties uitgebreid testen ⏳ NA TESTEN
**Complexiteit:** Laag · **Bron:** Implementatie #59 (2026-03-14) · **Status:** Wacht op hands-on test

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

#### #MOBILE-AUDIT-BLOKKER — Blokkers uit mobile & device audit ⏳ NA TESTEN
**Complexiteit:** Medium · **Bron:** Audit (2026-04-14) · **Type:** UX + stabiliteit · **Status:** Wacht op hands-on device test
**Gerelateerd:** #MOBILE-AUDIT-BELANGRIJK (P2), #MOBILE-AUDIT-MONITOR (P3)

Moet opgelost of bewust geaccepteerd zijn vóór eerste studententest. Vereist hands-on testen op iPhone, Android en iPad.

- [ ] **Touch-targets Timeline header te klein (28×28 px)** — clip-edit + mute-toggle.
  - `src/components/studio/Timeline.tsx:385-407` — `min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px]`
  - `src/components/studio/VolumePopover.tsx:141-152` — mute 32×32 op alle formaten
  - Fix: `min-w-[40px] sm:min-w-[44px]` voor primaire acties; 44 px voor mute
- [ ] **Video-export faalt stil op iOS Safari** — WebCodecs niet ondersteund, fallback naar WebM wat Safari niet kan afspelen.
  - `src/utils/videoExportEngines.ts:55-87` — engine-detectie
  - `src/components/stage/StageView.tsx` + `StageActionsModal.tsx` — geen `unsupported`-state
  - Fix: feature-detect + `VideoExportState['unsupported']` + duidelijke boodschap naar gebruiker

**Testmatrix per toestel** (iPhone met notch / Android / iPad / Chromebook):

1. Volledige flow: klascode → map → locatie → studio → stage → save online → code op tweede device.
2. Studio: clip slepen, trimmen, volume/effects popover, eraser, scrollen tijdens drag.
3. Stage: MP3-export (moet overal werken), video-export (breekt naar verwachting op iOS Safari).
4. Feedback-modal: lange Nederlandse tekst typen; cursor-stabiliteit + toetsenbord-overlap.
5. Landscape-rotatie midden in compositie en terug.
6. iPhone op stil → speel af → hoor je iets? (silent-switch).
7. Netwerk uit tijdens "online bewaren" (Supabase timeout).

**Al oké (geen actie):** `dvh`/`svh` gebruik, AudioContext-unlock, Modal focus-restore (recent gefixt), clip-resize `transition-all` suppressie, memoization + `currentBeat`-val vermeden, `aspect-ratio` tegen layout shift, DnD collision.

---

### P2 — Hoge prioriteit

#### #MOBILE-AUDIT-BELANGRIJK — Belangrijke verbeteringen uit mobile audit ⏳ NA TESTEN
**Complexiteit:** Klein-Medium · **Bron:** Audit (2026-04-14) · **Type:** UX · **Status:** Wacht op hands-on device test
**Gerelateerd:** #MOBILE-AUDIT-BLOKKER (P1), #MOBILE-AUDIT-MONITOR (P3)

Geen blokker, maar duidelijk merkbare problemen op iOS/Android. Oppakken kort na eerste studententest of wanneer in de buurt.

- [ ] **`viewport-fit=cover` + safe-area CSS ontbreken** — notch/home-indicator kan UI bedekken.
  - `index.html:5` — viewport meta uitbreiden
  - `src/components/stage/StageActionsModal.tsx` — `pb-[env(safe-area-inset-bottom)]`
- [ ] **Geen auto-scroll naar focused input op iOS** — toetsenbord bedekt textarea/input.
  - `src/components/ui/Modal.tsx:74` — `preventScroll: true` herzien
  - `src/components/feedback/FeedbackModal.tsx:238-264`
  - Fix: `preventScroll: true` weglaten of na focus `scrollIntoView({ block: 'center' })`
- [ ] **Timeline mist `overscroll-behavior` + `touch-action`** — pull-to-refresh en bounce-scroll verstoren DnD.
  - `src/components/studio/Timeline.tsx:364`
  - Fix: `overscroll-behavior: contain; touch-action: pan-x pan-y;`
- [ ] **TouchSensor delay 200 ms voelt traag op iPad.**
  - `src/config.ts:80` — `TOUCH_ACTIVATION_DELAY_MS`
  - Fix: test 150 ms

---

#### #69 — Storyboard ↔ vrij modus wisselen zonder clips te verliezen
**Complexiteit:** Medium · **Status:** Concept · **Opgewaardeerd:** van P3 naar P2 (2026-04-14)

Momenteel wist `ComposeModeScreen` altijd de volledige timeline (`clearAllTracks` + `clearSections`) bij elke moduswissel. Gebruikers zouden vanuit de studio moeten kunnen wisselen tussen storyboard/image/vrij modus, waarbij clips behouden blijven en alleen secties + afbeeldingen resetten. Vereist een in-studio mode-switcher (momenteel alleen beschikbaar op het keuzescherm vóór de kaart).

**Docentenfeedback (2026-04-14):**
Docent meldt dat leerlingen geluiden uit meerdere thema's willen combineren (bijv. De Stad + Winterspelen). Dit raakt het bredere vraagstuk van cross-thema compositie: nu is een compositie gekoppeld aan één `themeId`. Verder uitdenken: is cross-thema pedagogisch wenselijk? Wordt het onoverzichtelijk voor jonge kinderen? Architectureel: meerdere locatiereeksen binnen één compositie, of een universele samplebibliotheek los van thema's.

**Verwant aan:** #41 ✅ (storyboard basis), #48 (video-storyboard), #78 (startscherm UX — confirmatie bij "Nieuwe compositie")

#### #28 — Eigen Samples Opnemen
**Complexiteit:** ~~Zeer Hoog~~ Medium (na #74) · **Afhankelijk van:** #74 (recording-infrastructuur)

Microfoon opname in de app: leerling neemt een geluid op en gebruikt het als sample in de studio (op de timeline slepen, trimmen, loopen, etc.).

**Gedeelde infrastructuur met #74 (wordt daar gebouwd):**
- `useMicRecorder` hook — MediaRecorder + getUserMedia, format detection, permission handling
- `RecordingPanel` component — universeel opname-UI (timer, waveform, start/stop/herluister)
- `audioFormat.ts` — WebM/Opus detectie met MP4/AAC fallback (Safari)

**Resterend werk na #74:**
- Opname-blob omzetten naar lokaal sample-object (audioUrl via `URL.createObjectURL`)
- Toevoegen aan `libraryStore` als custom sample (naast thema-samples)
- Opname-UI integreren in locatiescherm of studio (knop "Neem op" naast bestaande hotspots)
- Max 5 seconden, max 6 opnames (aansluitend bij bestaande recorder slots in libraryStore)
- Persist in localStorage (base64 of IndexedDB voor grotere blobs)

#### #74 — Opname-Praatplaat (Audio Recording op Beeld)
**Complexiteit:** Hoog · **Afhankelijk van:** #72 ✅ · **Status:** PRD compleet, klaar voor pre-development (2026-04-13)
**Document:** `docs/PLAN-OPNAME-PRAATPLAAT.md`

Nieuwe variant van de praatplaat waarbij leerlingen een kort geluid opnemen (max 15s) via de microfoon en dit plaatsen op een afbeelding. De docent speelt opnames af op het digibord. Laagdrempelig alternatief voor de volledige studio-compositieflow, gericht op groep 3-5.

**Kern:**
- Docent maakt opname-praatplaat aan (type-toggle naast bestaande compositie-praatplaat)
- Leerling: positie kiezen → opnemen (universeel `RecordingPanel` component) → indienen
- Docent: spots op afbeelding, tik = play, tik = stop (toggle-gedrag, geen afspeel-balk)
- Supabase Storage bucket voor audio-bestanden, signed upload URL pattern
- WebM/Opus primair, MP4/AAC fallback, eigen `useMicRecorder` hook (geen externe library)
- Feature flag / pilot bij 2-3 scholen, 8 weken evaluatie
- Soft delete retentie: 4 weken inactiviteit → markering, handmatige definitieve delete

**Alle 18 ontwerpbeslissingen zijn genomen.** Volgende stap: pre-development spikes (MediaRecorder device test, Supabase Storage POC, verwerkersovereenkomst).

**Verwant aan:** #28 (eigen samples opnemen — RecordingPanel is herbruikbaar), #44 (luister-en-plaats), #73 ✅ (deelbare praatplaat-link)

#### #63 — Collaboratief storyboard (leerlingen werken aan delen)
**Complexiteit:** Zeer Hoog · **Status:** Concept

Leerlingen werken aan verschillende afbeeldingen van een storyboard die later samengevoegd worden tot één geheel. Vereist: task-toewijzing per leerling, merge-logica, mogelijk Supabase Realtime sync. Verwant aan #42 (Ensemble-modus).

**Opmerking (2026-04-15):** Met de praatplaat (#72 ✅) is een asynchroon collaboratief model bewezen: leerlingen componeren onafhankelijk en koppelen hun werk aan een positie. #63 is de logische volgende stap: van asynchrone samenwerking naar een gedeeld storyboard waar leerlingen elk een deel componeren. De praatplaat-infrastructuur (Supabase, positie-toewijzing, clustering) kan als fundament dienen.

**Verwant aan:** #42 (Ensemble-modus), #72 ✅ (praatplaat — asynchroon collaboratief model als basis)

---

### P3 — Middel prioriteit

#### #MOBILE-AUDIT-MONITOR — Aandachtspunten uit mobile audit ⏳ NA TESTEN
**Complexiteit:** Klein-Medium · **Bron:** Audit (2026-04-14) · **Type:** Code-kwaliteit + robuustheid · **Status:** Wacht op hands-on device test
**Gerelateerd:** #MOBILE-AUDIT-BLOKKER (P1), #MOBILE-AUDIT-BELANGRIJK (P2)

Kleine nuisances en consistentie-items. Pak op wanneer in de buurt of bij klachten uit het veld.

- [ ] **Desktop-breakpoints (`md:`/`lg:`/`xl:`) doorbreken "alleen `sm:`"-filosofie** — iPads portrait krijgen inconsistente stijlen.
  - ~94 matches in codebase; voorbeelden: `StudioView.tsx:348`, `StartScreen.tsx:93-95`, `MapView.tsx:75`, `Modal.tsx:34`
  - Fix: per geval beslissen — migreren of CLAUDE.md bijwerken
- [ ] **Geen detectie iOS silent-switch** — studenten denken dat audio kapot is.
- [ ] **Supabase-calls zonder timeout** — UI hangt op trage netwerken.
  - `src/lib/praatplaat.ts`, `src/lib/submissions.ts`, saved compositions
  - Fix: 15s `AbortController` timeout + feedback
- [ ] **FeedbackModal categorie-grid krap op 320 px.**
  - `src/components/feedback/FeedbackModal.tsx:210` — `grid grid-cols-3`
  - Fix: `grid-cols-1 sm:grid-cols-3`

- **Bestanden:** `src/components/share/ShareCodeInput.tsx`, `src/components/share/ShareCodeModal.tsx`

- **Bestanden:** `src/components/teacher/TeacherDashboard.tsx`, `src/components/teacher/ClassDetail.tsx`, `src/components/admin/LocationEditor.tsx`

#### PERF-4 — Theme images ongeoptimaliseerd (860K-1.1M JPG)
**Complexiteit:** Laag · **Bron:** Externe frontend-analyse (2026-04-14) · **Type:** Performance

Alle thema-afbeeldingen in `public/images/themes/` zijn ongecomprimeerde JPG's van 860K–1.1M. Geen WebP, geen `loading="lazy"`. Op mobiel (primaire doelgroep: tablets/Chromebooks) maakt dit een significant verschil in laadtijd.

**Grootste bestanden:** `plattegrond.jpg` (1.1M), `bobsleebaan.jpg` (1.0M), `speeltuin.jpg` (1.0M), `winterdorp.jpg` (966K).

**Fix:**
1. Comprimeer JPG's (target 30-40% reductie) of converteer naar WebP met JPG fallback
2. Voeg `loading="lazy"` toe aan niet-kritieke afbeeldingen (locatie-achtergronden, kaart)
3. Overweeg responsive `<picture>` met kleinere versie voor mobiel

---

#### #81 — Praatplaat: docent-instelling "één plek per leerling"
**Complexiteit:** Medium · **Status:** Concept · **Bron:** Gebruikersfeedback (2026-04-15) · **Type:** Feature
**Afhankelijk van:** #72 ✅ (praatplaat basis)

Een docent kan bij het aanmaken of bewerken van een praatplaat instellen dat elke leerling maar één plek mag vullen. Als deze optie actief is, controleert het systeem of een leerling (op basis van `student_name`) al een submission heeft op die praatplaat en blokkeert een tweede.

**Scope:**
- [ ] Nieuw veld `single_spot_only BOOLEAN DEFAULT false` op `praatplaten` tabel (migratie)
- [ ] Toggle in `CreatePraatplaatModal` (en eventueel bewerkscherm): "Eén plek per leerling"
- [ ] Server-side validatie in `submit_praatplaat_composition` RPC: als `single_spot_only = true` en er al een submission bestaat met dezelfde `student_name`, geef duidelijke foutmelding terug
- [ ] Client-side foutafhandeling: toon melding aan leerling ("Je hebt al een plek op deze praatplaat")
- [ ] `usePraatplaten` hook: `single_spot_only` meegeven bij create/update
- [ ] `PraatplaatCard` / viewer: optioneel visuele indicator dat de beperking actief is

**Technische notities:**
De huidige flow staat toe dat dezelfde leerling meerdere composities op dezelfde of verschillende posities plaatst. De validatie moet server-side (in de RPC-functie) om manipulatie te voorkomen. Client-side controle is enkel voor UX (vroege foutmelding). De `student_name` is niet geauthenticeerd, dus de beperking is "best effort" — een leerling kan een andere naam invullen.

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

**Verwant aan:** #41 ✅ (storyboard basis), CONTENT-1 (content toevoegen), #72 (praatplaat)

#### CONTENT-1 — Content toevoegen/vernieuwen
**Status:** Doorlopend · **Type:** Content (geen code)

Verzamelissue voor alle content-gerelateerde toevoegingen: nieuwe storyboards (variabel aantal afbeeldingen, het systeem ondersteunt dit al), nieuwe praatplaat-afbeeldingen, nieuwe locaties/thema's, lesbrieven. Wordt opgepakt wanneer content beschikbaar is. Vervangt #71 en #43.

#### #77 — Docentenhandleiding uitbreiden (storyboard + compose-modi)
**Complexiteit:** Laag · **Bron:** Eigen observatie (2026-04-13) · **Type:** Content
**Status:** Deels geïmplementeerd (2026-04-14)

**✅ Gedaan:**
- Nieuwe sectie `compose-modes` ("Compositiemodi") in `TeacherGuideScreen.tsx` SECTIONS array, tussen `assignments` en `templates`.
- NL + EN vertalingen (5 paragrafen): drie modi uitgelegd, didactische verschillen, samenhang secties/storyboard, template + storyboard combinatie.

**Nog open — bijwerken bij toekomstige features:**
- Inhoud bijwerken wanneer nieuwe compose-modi, storyboards of afbeeldingen worden toegevoegd.
- Eventueel: video-id koppelen wanneer een uitlegvideo beschikbaar komt.
- Bestaande `templates`-sectie aanvullen met opmerking over storyboard-in-template wanneer die flow uitgebreider wordt.

**Verwant aan:** #41 ✅ (storyboard basis), #61 ✅ (vrije afbeeldingskeuze), CONTENT-1 (content toevoegen), #78 (compose-mode discoverability)

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

**Verwant aan:** #28 (microfoon opname), #68 (partituur-tool — beide starten vanuit beeld i.p.v. samples), #72 ✅ (praatplaat — asynchroon collaboratief model als verwante basis)

---

### P4 — Lage prioriteit

#### #68 — Visuele Partituur-Tool (omgekeerde compositie-workflow)
**Complexiteit:** Zeer Hoog · **Status:** Conceptfase — moet verder uitgedacht worden
**Document:** `docs/CONCEPT-PARTITUUR-TOOL.md`

Leerlingen kijken naar een beeld en tekenen eerst een visuele partituur (blokken op tijdlijn: lang/kort, veel/weinig). Pas daarna zoeken ze samples die bij hun ontwerp passen. Omgekeerde workflow: van structuur naar klank i.p.v. van klank naar structuur. Pedagogisch sterk: dwingt leerlingen om eerst na te denken over opbouw, timing en spanning. Technisch 80% hergebruik van bestaande SoundScout-componenten. **Open vraag:** moet dit een modus binnen SoundScout worden of een losstaande tool? Afhankelijk van #65 (clip-loop) voor de sample-koppeling.

#### #30 — Extra Locaties
**Status:** 5 locaties af, 4 nog gepland (Spookhuis, Strand, Markt, Ruimtestation)

#### #42 — Samenspel / Ensemble-modus
**Complexiteit:** Zeer Hoog · **Status:** Geparkeerd (concept)

Meerdere leerlingen op aparte devices dragen bij aan dezelfde compositie. Vereist real-time sync (Supabase Realtime), versioning, conflict resolution. Vervangt oud #32 (Multiplayer).

#### #76 — Custom Praatplaat-afbeeldingen Uploaden
**Complexiteit:** Middel · **Afhankelijk van:** #74 (Supabase Storage bucket bestaat dan al)

Docenten kunnen een eigen afbeelding uploaden voor een praatplaat in plaats van te kiezen uit de voorgedefinieerde set (9 SVGs + thema-locaties). Vereist: upload UI in `CreatePraatplaatModal`, image resize/compress client-side, opslag in Supabase Storage bucket (hergebruik van #74 infra), URL opslaan in `praatplaten` tabel.

#### #46 — Virtual Reality / 360° Locaties
**Complexiteit:** Zeer Hoog · **Status:** Geparkeerd (onderzoeksfase)

360° panorama of VR locaties met spatial audio. Vereist browser support research, performance testing, content-creatie haalbaarheid.

---

### P5 — Backlog

#### #38 — i18n Review (Terugkerend)
Periodiek nalopen na elke feature: hardcoded teksten, NL/EN pariteit, vertaaldekking.

#### TP3-4 — Alfanumerieke klas-codes
**Status:** Geparkeerd — pas nodig bij >1.000 actieve klassen. Vereist DB migratie.

#### TP4-1 — Split AudioService in sub-services
**Status:** Toekomstig — AudioService is een god-object. Split in AudioLoader, AudioPlayer, TimelineScheduler, AmbientAudioManager.

#### TP4-2 — Factory pattern voor AudioService
**Status:** Toekomstig — singleton maakt unit testing onmogelijk.

#### TP5-6 — StorageService migratiestrategie
**Bron:** Architectuur-analyse (P2) · `StorageService.ts` — `STORAGE_VERSION` is uitgecommentarieerd. Schema-wijzigingen veroorzaken stille data loss (composities die Zod-validatie falen worden stil gefilterd). Fix: implementeer `migrateIfNeeded()` met versioned transformers.

#### TP5-7 — Extraheer useCompositionPlayer() hook
**Bron:** Architectuur-analyse (P2) · `SharedPlayer.tsx` (381 regels) en `SubmissionPlayer.tsx` (353 regels) zijn ~95% identiek. Extraheer gedeelde playback-logica (data fetching, audio init, transport controls, beat tracking) naar een herbruikbare hook.

#### TP5-8 — Extraheer useCompositionData() hook
**Bron:** Architectuur-analyse (P2) · `StageView.tsx` assembleert compositie-data 3x voor verschillende modals. Extraheer naar een gedeelde hook die tracks + samples + metadata bundelt.

#### TP5-9 — Decompose Timeline.tsx
**Bron:** Architectuur-analyse (P3) · 582 regels, 19 hooks. Split in Timeline (core), TimelineHeader (edit toolbar + tools), ZoomControls. Verbetert leesbaarheid en testbaarheid.

#### TP5-13 — appStore opsplitsen (god store)
**Bron:** Externe architectuur-review (2026-04-14) · **Type:** Maintenance
**Status:** Geparkeerd — veroorzaakt geen bugs, maar 35 acties en 16 state-velden in één store is een onderhoudslast. `goToStart()` reset 16 velden. Splitsen naar navigation/session/assignment stores raakt ~30 bestanden. Oppakken bij volgende grote feature.

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
| SEC-1 Credentials in git | **False positive** — `.env.local` nooit gecommit, `.gitignore` correct, alleen `.env.example` (zonder secrets) in git |
| Cross-store sample validatie | **Reeds geïmplementeerd** — `addClip`, `moveClip`, `duplicateClip` valideren allemaal sampleId bestaan |
| Zod schema coverage | **Voldoende** — alle untrusted boundaries (localStorage, Supabase) hebben schemas. Interne types (Location, Hotspot) hoeven geen runtime validatie |
| UX-4 Kindvriendelijker vocabulaire | Bewust besluit: huidige termen (Compositie, Bibliotheek, Samples, Dupliceren) blijven behouden |
| LOAD-1 Export progress bar | **Reeds geïmplementeerd** — zowel MP3 als video export tonen percentage inline ("Exporting 45%") in StageActionsModal |

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
| #16 (code) | Touch & Autoplay — code-verbeteringen | 2026-03-12 | Web Audio autoplay unlock (App.tsx), touch tolerance 10px, touch-action:none op Track. **Resterende hands-on device tests staan nog open als #16 in P1** |
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
| #33 | Clip-effecten: Pitch + Reverb | 2026-03-18 | Per-clip `Tone.PitchShift` (-12 tot +12 halftonen) en `Tone.Reverb` (0-100%). Geïsoleerde effect chains (eigen `Tone.Player` + nodes) per clip met effecten — shared players blijven ongewijzigd. `clipEffectChainMap` voor seek-support zodat `startActiveClips()` de juiste player gebruikt. UI: oorspronkelijk EffectsPopover, later vervangen door EffectsModal (#79). Sparkles-icoon als indicator. Effecten meegekopieerd bij duplicate. Offline export bouwt per-clip effect chains |
| UX-9 | Studio mobiele indeling | 2026-03-18 | Toolbar crowding fix (sample info pill + zoom hidden op mobile), full-row drag targets voor samples in library, narrowere track labels op mobile (w-4 i.p.v. w-5) |
| #22 | Real-time geluiden toevoegen tijdens afspelen | 2026-03-19 | `audioVersion` counter in timelineStore (15 audio-relevante acties). `useRescheduleOnChange` hook detecteert wijzigingen tijdens playback. `rescheduleWhilePlaying()` op AudioService: stop players → reschedule → hervat vanaf zelfde beat. Alle timeline-wijzigingen (clips, volume, mute, trim, loop, pitch, reverb) klinken direct tijdens playback. Docs: `PLAN-22-REALTIME-CLIP-TOEVOEGEN.md` |
| #52 | Online bewaarcode (compositie overdracht) | 2026-03-19 | 6-karakter bewaarcode via `SaveOnlineModal` op podium. `save_composition_online` RPC → code + secret. Op ander apparaat: code invoeren → `load_saved_composition` + `claim_saved_composition` → laadt in studio. Secret in localStorage voor update-rechten. 60 dagen inactiviteit-expiry. Optioneel: klascode-koppeling + e-mail. Migratie: `004_save_codes.sql`. Docs: `PLAN-52-BEWAARCODE.md` |
| UX-10 | Podium UX refactor — actiemenu | 2026-03-19 | Podium teruggebracht naar 3 knoppen (Opslaan, Delen & Exporteren, Nieuwe compositie). Alle secundaire acties (bewaar online, deel link, deel met docent, export MP3, export video, template) verplaatst naar `StageActionsModal` — gegroepeerd met kopjes en hint-teksten. Modal slide-up op mobiel, gecentreerd op desktop. Design tokens (`bg-bg-surface`, `text-text-main`, `text-text-muted`) consistent met app |
| #54b | Tutorial als eigen scherm | 2026-03-24 | "Hoe werkt het?" modal vervangen door dedicated `TutorialScreen` (`'tutorial'` in GameScreen). Quick-start stappen (4 stappen, accent-kleur badges) + video-thumbnails per categorie ("Voor de componisten", "Voor de docenten"). Klik op thumbnail → inline YouTube player (geen 7 iframes tegelijk). Provider-onafhankelijk: `thumbnailUrl()` en `embedUrl()` zijn de enige YouTube-specifieke functies. Lazy-loaded |
| #70 | Storyboard-badge in docentenlijst | 2026-03-25 | `SubmissionCard` toont nu een accent-kleur badge met Image-icoon + "Storyboard" label als `composition_data.storyboardId` aanwezig is. Docenten zien in één oogopslag welke inzendingen een storyboard bevatten |
| #78 | Startscherm UX: opdracht-keuze + tussenscherm | 2026-04-14 | Sketch A (2 CTA's + modal code-input), ComposeModeModal flow, AssignmentLandingScreen (template/praatplaat preview + "Starten"), Route C herstelscherm, ShareCodeInput refactor (deferred init). Confirmatie-modal bij "Nieuwe compositie" |
| #52-FASE2 | Bewaarcode uitbreidingen | 2026-03-25 | Drie verbeteringen: (A) Auto-sync naar online bewaarcode bij lokaal opslaan via fire-and-forget `updateSavedComposition()` in `useStageSave`. (B) QR-code toggle in `SaveOnlineModal` success-scherm via `qrcode` npm package. (C) Teacher dashboard "In bewerking" tab in `ClassDetail` — splitst submissions op `save_code` aanwezigheid. WIP-kaarten tonen warning "In bewerking" badge + "Laatst bewerkt" datum |
| #72 | Praatplaat: Collaboratieve Klankkaart | 2026-03-26 | Basis-implementatie. Docent: CreatePraatplaatModal (naam + locatiekeuze), PraatplaatCard (thumbnail, toggle actief/inactief, verwijder), PraatplaatViewer (fullscreen presentatie met spots + clustering + klik-to-play via SubmissionPlayer). Leerling: ShareCodeInput detecteert 4-cijferige klascode → getActivePraatplaat() → PraatplaatSelectScreen (positie kiezen op afbeelding) → normaal componeren → auto-submit bij opslaan. Database: `praatplaten` tabel + 3 kolommen op `submissions`, 7 RPC functies, trigger voor 1 actieve per klas. Migratie: `005_praatplaten.sql`. Plan: `PLAN-72-PRAATPLAAT.md` |
| #73 | Deelbare Praatplaat-link (Publieke Viewer) | 2026-04-15 | Publieke praatplaat-viewer via `?pp-share=CODE`. Database: `share_code`, `share_expires_at`, `share_view_count` kolommen op `praatplaten`. `generate_praatplaat_share_code()` checkt beide tabellen (praatplaten + submissions) voor cross-collision avoidance. `share_praatplaat()` RPC (auth, rate limited) genereert/verlengt 30-dagen code. `get_shared_praatplaat()` RPC (anon, rate limited 30/min) retourneert JSONB met metadata + submissions. SharedPraatplaatViewer: state machine (loading → waiting-gesture → ready + error/not-found/expired), audio init via `Tone.start()`. Generic clustering utility (`praatplaatClustering.ts`) gedeeld met teacher PraatplaatViewer. ShareCodeInput: 8-char fallback chain (template → share → praatplaat-share → not found). "Deel link" button in zowel PraatplaatCard als ClassDetail active assignment. Docentenhandleiding (TeacherGuideScreen) uitgebreid met praatplaat-sectie + tussenkopjes in alle secties (NL+EN). Migratie: `012_praatplaat_share.sql` |
| #80 | Praatplaat: zoom naar gekozen positie in studio | 2026-04-15 | `StorytellingPanel` zoomt 2.5× in op de gekozen praatplaat-positie (x, y) via CSS `transform: scale()` + `transformOrigin`. Clamping (20%–80%) voorkomt crop buiten afbeelding. Toggle-knop (Crosshair/Maximize2) naast lightbox-knop. Default: ingezoomd. `CrossfadeImage` uitgebreid met `style` prop. Geen animatie, directe switch |
| #79 | Clip-effecten: Fade In & Fade Out | 2026-04-16 | `fadeIn`/`fadeOut` (seconden) op `ClipEffects`. `EffectsModal` met waveform + altijd-zichtbare draggable fade handles + pitch/reverb sliders + preview met alle effecten (`playSampleWithEffects()`). Symmetrische exponentiële fade-curves: fade-in `x²` (geleidelijke opbouw), fade-out `(1-x)²` (soepele afdaling). Via `setValueCurveAtTime()` op aparte `FadeGain` node (gescheiden van clip-volume). Chain: Player → PitchShift → Reverb → FadeGain → Volume → Destination. Seek in fade-zone berekent tussenliggend volume + schedult resterende curve. Loop-interactie: fade-in alleen eerste iteratie, fade-out alleen laatste. Trim+fade clamping: bij inkorten worden fades proportioneel teruggeschaald als `fadeIn + fadeOut > newDuration`. Waveform-visualisatie: bars schalen in hoogte + kleurtransitie naar neutral-400 in fade-zones. Offline export (MP3 + video) hergebruikt zelfde curves. Toolbar: label-icoon verplaatst naar direct na sample-naam. Design tokens: alle UI in `accent-*` kleuren. Zod `optional().default(0)` voor backward compat. Plan: `PLAN-79-FADE.md` |
| PERF-1 | Audio engine refactor: on-demand fire-and-forget players | 2026-04-22 | **Probleem**: zware composities (85 clips, 6 samples, 32 beats) veroorzaakten hoorbare audio dropouts, kraakjes en visuele playhead-vertraging. Oorzaak: 170+ permanente `Tone.Player` nodes (elk met eigen GainNode) overschreden het audio render quantum budget (128 samples @ 44.1kHz = ~2.9ms). **Oplossing**: (1) `ToneAudioBuffer`-gebaseerde sample opslag — buffers hebben nul audio-graph footprint vs. Players die permanente GainNodes aanmaken. (2) Track bus submix-architectuur — 8 `Tone.Gain` buses + 1 `Tone.Volume` master = 9 permanente nodes i.p.v. 170+. (3) On-demand fire-and-forget players — `createOnDemandPlayer()` maakt per clip-event een verse Player van de buffer, routeert via trackBus, en auto-disposed via `onstop` callback. `activeSources` Set trackt levenscyclus. (4) Pause/resume maakt verse players aan via Part callback (Part overleeft pause). (5) Seek via `startActiveClips()` maakt on-demand players voor actieve clips op seek-positie, met volledige fade-curve support. Verwijderd: `effectChains[]`, `clipEffectChainMap`, `sharedPlayerLastStart`. Gebaseerd op Tone.js maintainer-advies (marcelblum #982, jamescqcampbell #1076). Plan: `PLAN-AUDIO-REFACTOR.md` |

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
| TP5-1 | StorageService.getRaw() silent catch loggen | 2026-04-14 |
| TP5-2 | Bundle size: lazy-load Supabase (534→152KB main chunk) | 2026-04-14 |
| TP5-3 | Bundle size: dynamic import lamejs (-169KB) | 2026-04-14 |
| TP5-5 | Zod validatie op Supabase RPC responses | 2026-04-14 |
| TP5-11 | QuotaExceededError handling in StorageService | 2026-04-14 |
| TP5-12 | Bewaarcode sync feedback | 2026-04-14 |
| TP5-10 | Dode velden (isPlaying, currentBeat) uit TimelineState | 2026-04-14 |
| TP5-15 | Supabase error strings gecentraliseerd | 2026-04-14 |
| TP5-16 | `as any` verwijderd uit assignments.ts | 2026-04-14 |
| TP5-14 | timelineStore decoupling van libraryStore | 2026-04-14 |

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
| UX-DEST-5 | Praatplaat "Nieuwe plek" wist timeline zonder waarschuwing | 2026-04-15 | Confirmatie-modal + permanente "Nieuwe plek"-knop op podium. Bugfix: `praatplaatSubmitted` werd niet gezet in classSession-pad (2026-04-15) |
| UX-A11Y-1 | PraatplaatSelectScreen keyboard support | 2026-04-15 | onKeyDown handler + autoFocus zodat Enter/Spatie direct werkt |
| UX-EMP-1 | Lege sample library: hint naar kaart/locaties | 2026-04-14 | Educatieve hint-tekst toegevoegd |
| UX-FORM-1 | ShareCodeInput: geen uitleg codeformaten | 2026-04-14 | Helper-tekst toegevoegd ("4 cijfers = klascode, 6 tekens = bewaarcode") |
| UX-ERR-3 | PraatplaatViewer: playback errors tonen aan docent | 2026-04-14 | Foutmelding UI toegevoegd (rood randje + tooltip) |
| UX-DEST-1 | Confirmatie bij deactiveren opdracht | 2026-04-14 | Modal confirmatie toegevoegd in ClassDetail |
| UX-DEST-2 | Browser `confirm()` vervangen door styled Modal | 2026-04-14 | 5 plekken vervangen (TeacherDashboard 3×, ClassDetail 1×, LocationEditor 1×) |
| COLOR-1 | Kleurenaudit praatplaat + design system consistency | 2026-04-15 | 27 afwijkingen gefixt in 9 bestanden: teal→accent, red→error, gray→text-main/text-muted, amber→accent/warning, blue→warning, green→success. Button.tsx primary/danger variants op design tokens. Destructieve knoppen: `!text-white` voor leesbaarheid |

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
