# SoundScout — Volledige analyse (juni 2026)

Datum: 9 juni 2026
Scope: volledige codebase-audit, UI/UX- en mobile-audit, didactische analyse, promotiekansen NL. Technische kernbevindingen zijn geverifieerd tegen de broncode (niet alleen tegen CLAUDE.md). De projectchats uit deze map (o.a. de pre-release audit van 23 mei) zijn meegenomen als context.

---

## 0. Managementsamenvatting

SoundScout is voor een solo-project opvallend volwassen: strikte TypeScript met vrijwel geen `any`, consequente i18n, Zod-validatie op Supabase-responses, een doordachte audio-engine-refactor (PERF-1, van 170+ naar ~9 permanente audio-nodes) en lazy loading die de main chunk van 534KB naar 152KB bracht. De praatplaat (collaboratieve klankkaart) is functioneel uniek in de Nederlandse markt.

Daar staan drie zaken tegenover:

1. **Eén kritiek beveiligingslek (geverifieerd)**: de RLS SELECT-policies op `submissions` maken `save_secret`, leerlingnamen en leerling-e-mails leesbaar voor iedereen met de publieke anon-key — zonder dat die persoon een code hoeft te kennen. Dit moet vóór verdere verspreiding dicht. Zie §3.1.
2. **Touch targets onder de eigen norm**: de studio-toolbar gebruikt 28px-knoppen op mobiel, terwijl de eigen richtlijn 44px is. Op de primaire doelapparaten (iPad/Chromebook) is dit de grootste UX-frictie.
3. **Testdekking stopt bij utils en stores**: de 1468 regels AudioService, alle 18 hooks en alle componenten zijn ongetest. Geen blocker nu, wel het grootste risico bij toekomstige wijzigingen.

Strategische context (uit de projectchats, mei 2026): de code is "af", de app is bewijsstuk voor de spreker-/workshoppositionering, budget ~2u/week. Deze analyse respecteert dat: §9 onderscheidt het ene punt dat wél code-aandacht verdient (security) van alles wat kan wachten op echte gebruikersvraag.

---

## 1. Architectuur

### Sterk

- Heldere lagenscheiding: `stores/`, `services/`, `hooks/`, `components/` (per feature), `lib/`, `utils/`, `data/`. Zeven Zustand-stores met enkelvoudige verantwoordelijkheid; `timelineStore` accepteert `samples` als parameter in plaats van een afhankelijkheid op `libraryStore` — nette decoupling.
- AudioService on-demand fire-and-forget architectuur is goed gedocumenteerd (`docs/audio/archief/PLAN-AUDIO-REFACTOR.md`) en lost een echt gemeten probleem op (render quantum budget).
- Alle zware schermen zijn `React.lazy()`; Tone.js, dnd-kit, lamejs en Supabase zitten in aparte chunks; Supabase wordt pas geladen bij eerste gebruik via `getSupabase()`.

### Zwak

- **God-class `src/services/AudioService.ts` (1468 regels)**: sample loading, scheduling, seek, ambient audio en waveform-cache in één klasse. Grootste risicoconcentratie van de codebase. Logische splitsing: `SampleLoader`, `Scheduler`, `AmbientController`.
- **Grote componenten**: `Timeline.tsx` (695r, vier verantwoordelijkheden), `ClassDetail.tsx` (565r), `StageView.tsx` (534r), `TeacherDashboard.tsx` (525r).
- **Duplicatie**: `SubmissionPlayer.tsx` (360r) en `SharedPlayer.tsx` (381r) bevatten ~200 regels vrijwel identieke audio-init/playback-logica. Een gedeelde `useCompositionPlayer`-hook ontbreekt.
- **`appStore.goToStart()`** reset ~15 velden in één monolithische `set({})`. Elk nieuw scherm vergroot de kans op een "vergeten veld"-bug bij schermovergangen.
- **Singleton-conflict**: `PraatplaatViewer` en `SubmissionPlayer` delen dezelfde `audioService`; als een docent beide tegelijk opent, stoppen ze elkaars audio.
- **Migratie-hygiëne**: geen `001_`-migratie; basistabellen leven in het handmatige `schema.sql`. Daarnaast liggen drie losse migratiescripts buiten de genummerde map (`migration-check-constraints.sql`, `migration-delen-met-link.sql`, `migration-max-classes.sql`). Bij een reset of CI/CD is de volgorde niet gegarandeerd.

---

## 2. Codekwaliteit

- **TypeScript**: uitstekend. `strict`, `noUnusedLocals`, `noUnusedParameters`; slechts ~5 `any`-achtige casts, geconcentreerd in `src/lib/submissions.ts` rond RPC-responses (deels afgedekt door Zod).
- **Tests**: 6 testbestanden, allemaal utils/stores (`timelineStore`, `audio`, `clipCollision`, `schemas`, `storytelling`, `waveform`). **Niet getest**: AudioService (1468r), alle 18 hooks (waaronder `useStageSave`, `useStudioDnD`, `useUndoRedoTimeline` — kritieke user flows), alle componenten, alle `src/lib/` Supabase-clients, `compositionInit.ts` (439r).
- **Error handling**: consistent `try/catch` + `logger`; `QuotaExceededError`-detectie; gecentraliseerde Supabase-errorconstanten. Twee `console.*`-lekken in `themeStore.ts` (r86, r93).
- **`audioDiagnostics.ts` (650r)**: onbegrensde `scheduleHistory`-array (groeit bij lange sessies), directe `console.*`-calls, niet achter een dev-flag.

---

## 3. Security & Supabase

### 3.1 KRITIEK — RLS-policies lekken secrets en leerlinggegevens — **OPGELOST 2026-06-10**

> **Status**: live geverifieerd (pg_policies + anonieme curl-test), gedicht via `supabase/migrations/013_fix_public_read_policies.sql`, fix bevestigd met hertest (`[]`). Op het moment van dichten waren 620 actieve deelcodes en 16 actieve bewaarcodes blootgesteld. Hetzelfde patroon op `praatplaten` ("Anyone can read shared praatplaten" lekte share-codes) is gedicht via `014_fix_praatplaat_public_read.sql`, eveneens live bevestigd. Overige tabellen gebruiken `auth.uid()`-policies en hebben dit patroon niet. Beschrijving hieronder blijft staan als documentatie.

In `supabase/schema.sql` (r124–128) en `supabase/migrations/004_save_codes.sql` (r29–34) staan SELECT-policies op `submissions` met als predicaat alleen:

```sql
USING (share_code IS NOT NULL AND ...)   -- schema.sql
USING (save_code IS NOT NULL AND ...)    -- 004_save_codes.sql
```

RLS-policies filteren **rijen**, geen kolommen, en deze predicaten eisen niet dat de client de code kent — alleen dat de kolom gevuld is. Gevolg: iedereen met de publieke anon-key (staat in de JS-bundle) kan via PostgREST direct doen:

```
supabase.from('submissions').select('*')
```

en krijgt álle gedeelde/bewaarde composities terug, inclusief `save_secret` (waarmee composities van leerlingen overschreven kunnen worden), `student_name` en `student_email`. De nette SECURITY DEFINER RPC's (`get_shared_composition`, `load_saved_composition`) bestaan al en geven alleen de juiste kolommen terug — maar de brede tabel-policies omzeilen ze.

**Fix (~1 uur, nieuwe migratie `013_`)**: drop beide brede SELECT-policies; alle publieke leestoegang loopt al via de RPC's, dus de app blijft gewoon werken. Controleer daarna ook of `praatplaten` een vergelijkbare brede policy heeft. Dit is het enige punt in dit rapport dat de "code is af"-lijn doorbreekt: het raakt leerlinggegevens en moet vóór elke vorm van promotie dicht.

### 3.2 Overige punten

- **`/editor` (LocationEditor.tsx, 643r) is in productie bereikbaar zonder auth.** Interne tool; minimaal afschermen met een env-flag of simpele toegangscode.
- **`claim_saved_composition` rate limit is per code, niet per IP/sessie** — parallel brute-forcen van veel codes wordt niet geremd. Laag risico in de praktijk, maar makkelijk aan te scherpen.
- **`rate_limits`-tabel heeft geen cleanup**: elke API-call schrijft erin; bij groei wordt dit een hotspot. Een periodieke `DELETE` (pg_cron of in de check-functie zelf) is voldoende.
- **`save_secret` in localStorage zonder recovery-pad**: leerling die localStorage kwijtraakt verliest schrijftoegang. `claim_saved_composition` vangt dit op een nieuw device op — gedrag is acceptabel, maar documenteer het in de docentenhandleiding.

---

## 4. UI/UX

### Sterk

- Consequent design-token-systeem (60-30-10), eigen `Button`/`Modal`/`Card`, state-based destructive confirmations (geen `window.confirm`), `readOnly`-modus voor docentweergave.

### Frictie en inconsistenties

1. **Twee modals achter elkaar bij "Nieuwe compositie"** (`ComposeModeModal` → `ThemeSelectionModal`/`StoryboardPickerModal`): voor groep 4–6 een cognitieve drempel — twee abstracte keuzes voordat er één geluid klinkt. Eén wizard-modal met terugknop is rustiger.
2. **Custom modals omzeilen het eigen Modal-component**: `StageActionsModal` en `ComposeModeModal` hebben geen `role="dialog"`, `aria-modal`, focustrap of Escape-handler. Refactor naar `<Modal>` lost vier problemen tegelijk op.
3. **`Modal.tsx` gebruikt een hardcoded `id="modal-title"`**: StageView kan zes modals tegelijk in de DOM hebben → dubbele id's, kapotte `aria-labelledby`. Fix: `useId()`.
4. **Raw Tailwind-kleuren in strijd met de eigen conventie**: `teal-*`/`purple-*` in `ComposeModeModal.tsx` (r103–109) en `ComposeModeScreen.tsx` (r222–229); `text-purple-400` in `StagePlayback.tsx` (r41). Tokens voor "mode-kleuren" ontbreken in `index.css`.
5. **Hardcoded strings buiten i18n**: `'Docent'`-fallback (`TeacherDashboard.tsx` r61), `"Location not found"` (`LocationScene.tsx` r159).
6. **AssignmentLandingScreen heeft vier knoppen naar dezelfde bestemming** (`goToStart`), en de studio-terugknop heet "Terug naar locatie" maar gaat naar de kaart.
7. **Kind-UX**: hotspots zijn cirkels zonder zichtbaar label (hover-title werkt niet op touch); de drag-hint in de lege timeline is klein en italic; het keyboard-alternatief (selecteren + plus) is onontdekbaar. Een eenmalige "eerste keer"-hint in de studio zou veel oplossen.
8. **Docent-UX**: klascode is niet prominent op het dashboard zelf (alleen via ClassDetail → overlay), en de "In bewerking"-tab is zonder uitleg verwarrend ("waarom staat deze leerling niet bij Ingeleverd?"). Eén regel uitlegtekst in de tab volstaat.

---

## 5. Mobile / responsive

1. **Touch targets**: studio-toolbar (`Timeline.tsx`) heeft `min-w-[28px] min-h-[28px]` op mobiel voor 10+ knoppen (trim, duplicate, volume, effects, delete, flag, eraser, zoom, undo/redo); `StorytellingPanel.tsx` (r213, r226) heeft 28px overlay-knoppen. Eigen norm én Apple/Google-norm is 44px. **Dit is het belangrijkste mobile-punt.**
2. **Dubbele event-binding in `PraatplaatSelectScreen.tsx` (r126–127)**: zowel `onClick` als `onTouchStart` op dezelfde handler → dubbele positie-selectie op tablets. Verwijder `onTouchStart` (click werkt ook op touch).
3. **Timeline-hoogte in storyboard-modus** (`max-h-[40dvh]`): op een Chromebook in landscape (~720px hoog) blijft ~288px over voor 8 tracks — krap, vooral met zoom.
4. **LocationScene in landscape op lage viewports**: canvas-breedteformule + absolute RecorderBar kan hotspots onderaan onbereikbaar maken.
5. **iOS Safari audio-unlock**: shared views hebben een nette waiting-gesture-state; de hoofdapp leunt op een globale listener. Een visuele fallback in de studio ("tik om geluid te activeren") ontbreekt als de unlock mist.
6. Uit TODO.md nog open: `BUG-YOUTUBE` (tutorial zwart op iPad), iPhone/Android-testmatrix (`#MOBILE-AUDIT-BLOKKER`) — niet blokkerend zolang scholen iPad/Chromebook gebruiken, wat de chats bevestigen.

---

## 6. Performance & schaal

- **Re-render hotspot**: `Timeline.tsx` (r118) abonneert reactief op `currentBeat` (~20×/sec) → de hele 695-regelcomponent re-rendert elke beat. Isoleer de playhead in een mini-component met eigen subscription. Zelfde patroon: `StudioView` op `tracks`.
- **Assets zonder CDN**: alle MP3's en thema-afbeeldingen in `/public/`. Bij een klas van 30 die tegelijk start is de hostingserver de bottleneck; bij 10× gebruik is Supabase Storage/CDN of een service worker met sample-cache nodig. `PERF-4` (WebP-compressie) staat terecht al in TODO.md.
- **Thema's worden allemaal bij startup geregistreerd** — groeit lineair; on-demand laden wordt pas relevant bij 5+ thema's.
- **Geen offline-modus**: schoolwifi is wisselvallig; een service worker die samples cachet na eerste load is de goedkoopste robuustheidswinst voor de klaspraktijk.

---

## 7. Professioneler maken — gebruikersmogelijkheden

Geordend op (didactische waarde × inspanning), rekening houdend met "features wachten op echte vraag":

1. **Eigen geluiden opnemen (#28/#74)** — de meest gevraagde categorie in elk vergelijkbaar product en de grootste didactische sprong (luisteren naar je eigen omgeving = de kern van soundscape-pedagogiek, à la Murray Schafer). PRD bestaat al. Dit is de feature die SoundScout van "componeren met samples" naar "componeren met je éigen wereld" tilt. Pas bouwen bij bevestigde vraag, maar dit is de kandidaat om docentvraag actief op te peilen.
2. **Reflectie-laag voor de docent**: een leerling kan nu inleveren zonder ooit te verwoorden wát hij gemaakt heeft. Eén optioneel tekstveld ("Vertel over je compositie") bij inleveren + zichtbaar in het dashboard maakt de inzending beoordeelbaar als leerproces in plaats van alleen als product. Klein bouwwerk, grote didactische winst.
3. **Klas-presentatiemodus**: de praatplaat heeft al een digibord-viewer; een vergelijkbare "luistercarrousel" voor gewone inzendingen (afspeellijst van de klas, één klik per compositie) maakt de afsluitende les rond — presenteren en bespreken is didactisch het belangrijkste moment.
4. **Galerij/voorbeeldcomposities**: lege start is nu een koud begin; 3–5 voorbeeldcomposities ("luister wat kan") verlagen de drempel en zetten een kwaliteitsanker.
5. **Export/portfolio**: MP3- en video-export bestaan al — dat is professioneler dan de meeste concurrenten. Quick win: een nette bestandsnaam (leerlingnaam + titel) en een download-alles-knop voor de docent.

---

## 8. Didactisch sterker — aantrekkelijker voor (muziek)docenten

De drempel voor adoptie is bij groepsleerkrachten niet de app maar hun eigen muzikale onzekerheid. Alles wat de docent ontzorgt, verlaagt die drempel:

1. **Kant-en-klare lesbrieven per opdrachttype** (PDF, 1 A4: lesdoel, tijdsindeling, kerndoelkoppeling, reflectievragen). Het verschil tussen "leuke tool" en "inzetbare les" — en precies wat 123ZING groot heeft gemaakt. Koppel aan de bestaande templates en praatplaten.
2. **Expliciete koppeling aan kerndoelen/SLO-leerlijn muziek** (kerndoel 54/55, en de curriculumherziening die in 2026 landt). Eén pagina "SoundScout en de leerlijn muziek" maakt de app legitimeerbaar richting directie en ICC'er — belangrijk omdat CMK-gelden (±€30,66 per leerling in 2026) via penvoerders en cultuurcoaches lopen die op die taal selecteren.
3. **Differentiatie zichtbaar maken**: de bouwstenen bestaan al (templates met lock-opties, vrije modus, storyboard, praatplaat) maar zijn niet als niveaus geframed. Presenteer ze als leerlijn: groep 4–5 praatplaat/template → groep 6–7 storyboard → groep 8 vrij componeren met effecten.
4. **Luisteropdracht-modus (#44)** staat al in concept: "luister en plaats" draait de rol om van maken naar gericht luisteren — auditief analyseren is een kerndoel-element dat nu onderbelicht is. Valideren met docenten vóór bouwen.
5. **Beoordelingsondersteuning**: een simpele rubric (3 niveaus × 3 criteria: opbouw, variatie, samenspel met beeld) in het dashboard bij inzendingen. Docenten die zich muzikaal onzeker voelen, krijgen zo houvast bij het bespreken.
6. **PABO als vermenigvuldiger**: studenten gebruiken de app al zelfstandig (bevestigd in de chats). Een "PABO-pakket" (lesbrief + opdracht voor studenten zelf + reflectiemodel) maakt van elke student een ambassadeur richting stagescholen.

---

## 9. Promotie en bereik in Nederland

Context uit kort onderzoek (juni 2026): componeren is het onderbelichte domein in het muziekonderwijs en wordt juist nu landelijk geagendeerd — Méér Muziek in de Klas draait met Samsung het project "Digitaal Componeren in de Klas" met tientallen workshops door het land en publiceerde onderzoek dat digitaal componeren creativiteit en betrokkenheid stimuleert. De tools die daar genoemd worden (123ZING, BandLab, GarageBand, Soundtrap, Chrome Music Lab, Incredibox) zijn óf betaald, óf Engelstalig, óf missen een docentendashboard met klascodes. SoundScout zit precies in dat gat: gratis, Nederlands, browser-based, mét klasbeheer en een unieke praatplaatvorm.

Kanalen, geordend op kosten/baten bij ~2u/week:

1. **Méér Muziek in de Klas / "Digitaal Componeren in de Klas"** — het meest directe doelwit: zij zoeken actief content en workshopvormen rond exact dit thema, inclusief PABO-bereik en een inspiratietour in 2026. Eén gerichte mail met de app + een voorbeeldles is de hoogste-ROI-actie van dit hele hoofdstuk.
2. **CMK-penvoerders en cultuurcoaches** (CMK 2025–2028, landelijk dekkend netwerk per gemeente/provincie): zij adviseren scholen waar het cultuurbudget heen gaat. De kerndoelen-pagina uit §8.2 is hiervoor de toegangskaart; het workshopaanbod (al in de chats uitgewerkt) is het verdienmodel erachter.
3. **Vakcommunity's**: Gehrels Muziekeducatie (publiceert al over muziektechnologie in de basisschool, tijdschrift De Pyramide), KlasCement (Vlaanderen — gratis bereik, app is al tweetalig voorbereid), Facebook-groepen muziekonderwijs PO, LessonUp-community.
4. **De LinkedIn-lijn die al loopt** (wekelijkse dinsdagpost, docent-voor-docenten-toon): consistent volhouden; de app op de achtergrond, observaties uit de klas op de voorgrond. Dit is al goed neergezet in de chats — geen wijziging nodig, wel: elke post eindigen met soundscout.nl in het eerste comment.
5. **PrimaOnderwijs / JSW / vakbladen**: "Componeren is te leren"-achtige artikelen verschijnen daar al; een gastartikel van een muziekdocent-die-bouwt is voor die redacties aantrekkelijke kopij.
6. **Praatplaat als PR-haakje**: het digibord-moment (klas luistert samen naar de klankkaart) is visueel en uniek — dat is de demo voor elke presentatie, video en post, niet de timeline (die kennen mensen van GarageBand).

Volgorde-advies: eerst §3.1 fixen (leerlinggegevens), dan de kerndoelen-één-pager (§8.2), dan de mail naar Méér Muziek in de Klas (§9.1). Alles daarna is uitbouw.

Bronnen: [Méér Muziek in de Klas — Digitaal Componeren](https://www.meermuziekindeklas.nl/nl/nieuws/creativiteit-en-mediawijsheid-stimuleren-met-digitaal-componeren/2114/), [onderzoek digitaal componeren](https://www.meermuziekindeklas.nl/nl/nieuws/onderzoek-digitaal-componeren/2308/), [workshop-landingspagina](https://www.meermuziekindeklas.nl/nl/landings/digitaal-componeren-in-de-klas/751/), [Gehrels — Muziektechnologie in de basisschool](https://www.gehrelsmuziekeducatie.nl/artikelen/muziektechnologie-de-basisschool), [PrimaOnderwijs — Componeren is te leren](https://www.primaonderwijs.nl/tips-inspiratie/componeren-is-te-leren), [CMK 2025–2028 regeling](https://cultuurparticipatie.nl/subsidie-aanvragen/96/cultuureducatie-met-kwaliteit-2025-2028), [123ZING](https://123zing.nl/muziekmethode/).

---

## 10. Prioriteiten

| Prio | Actie | Inspanning | Type |
|---|---|---|---|
| ~~NU~~ ✓ | §3.1 RLS-lek gedicht (migratie 013, live bevestigd 2026-06-10) | gedaan | Security |
| **NU** | §3.2 `/editor` afschermen | ~0,5 uur | Security |
| Hoog | Touch targets 28→44px (Timeline-toolbar, StorytellingPanel) | ~2 uur | Mobile |
| Hoog | Kerndoelen-één-pager + mail Méér Muziek in de Klas | ~3 uur | Promotie |
| Middel | Dubbele touch-event PraatplaatSelectScreen; Modal `useId()`; custom modals → `<Modal>` | ~3 uur | UX/a11y |
| Middel | Lesbrieven bij bestaande templates/praatplaten (3 stuks) | doorlopend | Didactiek |
| Middel | Reflectieveld bij inleveren + uitlegregel "In bewerking"-tab | ~3 uur | Didactiek |
| Laag | Playhead-isolatie (re-renders), rate_limits-cleanup, migratie-hygiëne | ~4 uur | Tech |
| Laag/parkeren | AudioService splitsen, hook-tests, useCompositionPlayer-dedup | bij pijn | Tech debt |
| Wachten op vraag | #28/#74 opnemen, #44 luistermodus, galerij | — | Features |

De rode draad: één uur security-werk is nu echt nodig; daarna ligt de grootste winst niet in code maar in de didactische verpakking (lesbrieven, kerndoelen) en één gerichte promotie-actie. Dat spoort met de strategische lijn uit de chats: de app is het bewijsstuk, niet het product.
