# Werkdocument — ombouw docentenportaal

**Gestart:** 14-10-2026 · **Opdracht (Bert):** bouw het gekozen ontwerp (ronde 3b) veilig in een worktree, in kleine stappen, met dit document als logboek. Blijf werken en testen tot alles werkt.

**Ontwerp:** [UX-DOCENTENPORTAAL-ONTWERP.md](UX-DOCENTENPORTAAL-ONTWERP.md) · mockup [`mockups/docentenportaal-flow.html`](mockups/docentenportaal-flow.html)

---

## Veiligheid

| Wat | Waarde |
|---|---|
| Worktree | `.claude/worktrees/praatplaat-leerling-visibility-f004ea` |
| Bouwbranch | `claude/docentenportaal-ombouw` (afgetakt van de onderzoeksbranch, die op `main` @ `14acaf2` staat) |
| Backup-tag | `backup/voor-docentenportaal-ombouw-2026-10-14` (= `77d4e35`, stand vóór de bouw) |
| Main | **niet aangeraakt**, niets gepusht |
| Database | **geen migraties**; alleen bestaande RPC's en kolommen. Alles wat een migratie zou vragen, staat onder "Bewust niet gebouwd" |
| Terugdraaien | `git switch claude/teacher-portal-ux-research-389785`, of `git reset --hard backup/voor-docentenportaal-ombouw-2026-10-14` op de bouwbranch |

## Kwaliteitspoort per stap

1. `npx tsc -b --noEmit` → 0 fouten
2. `npm run test:run` → alles groen (beginstand: **23 bestanden, 414 tests**)
3. `npm run lint` → **geen nieuwe** fouten (beginstand: 25 errors en 5 warnings, allemaal buiten de docentschermen)
4. Visuele controle in de testopstelling (`.ux-harness/`: de echte app met een nep-database en voorbeelddata), op laptop- en telefoonbreedte
5. Commit per stap

---

## Plan (stappen)

| # | Stap | Status |
|---|---|---|
| 0 | Onderzoek, beginstand, werkdocument, backup | ✅ |
| 1 | Snelle reparaties: meervoud (`_plural` → `_one/_other`), dubbel getal op de klaskaart, label "Storyboard" bij praatplaat, label "Opdracht" → "Template", sorteren op inleveren, max-klassen (melding vast + teller) | ✅ |
| 2 | Tijdlijn slepen met touch (`Playhead`) | ✅ |
| 3 | Bouwstenen: vorm-meta met kleuren en iconen, bronnenlijst (platen, verhalen, templates, thema's) los van de oude modal | ⏳ |
| 4 | Wizard: 1 Kies → 2 Controleer & pas aan → 3 Code op het bord (met instellingenpaneel) | ⏳ |
| 5 | Klaspagina met tabs Klaarzetten · Tijdens de les · Terugkijken, plus *Meer opties* en automatisch verversen | ⏳ |
| 6 | Feedback geven als werklijst (beeld boven de tijdlijn, uitklappen op de telefoon) | ⏳ |
| 7 | Dashboard *Vandaag*, nieuwe klas → wizard, Lesideeën → wizard stap 2 | ⏳ |
| 8 | Teksten NL + EN, handleiding/woordenlijst, CLAUDE.md | ⏳ |
| 9 | Eindcontrole: alle flows in de testopstelling, telefoon, digibord, screenshots | ⏳ |

## Bewust niet gebouwd (vraagt een migratie of een besluit van Bert)

- **Live namen op het codescherm** ("Yara is begonnen"): de server kent een leerling pas na het eerste opslaan. Het codescherm toont daarom wel het aantal inzendingen dat binnenkomt, maar geen namen van leerlingen die net begonnen zijn.
- **Batch-RPC voor "x nieuw" per klas** op het dashboard: in plaats daarvan doe ik één query op `submissions` voor alle klassen tegelijk (RLS beperkt die al tot de eigen klassen).

---

## Logboek

### 14-10-2026 · Stap 0 — onderzoek en voorbereiding
- **Backup en branch:** backup-tag en bouwbranch gemaakt; de onderzoeksdocumenten (ronde 1–3b) staan al gecommit.
- **Beginstand:** tsc 0 fouten · 414/414 tests · lint 25 errors en 5 warnings (in CompositionsView, sequencer, studio, LocationEditor en dergelijke; **geen** in `components/teacher`).
- **Gelezen:** `TeacherPage`, `TeacherDashboard`, `ClassDetail` (1.290 regels), `ClassCard`, `SubmissionCard`, `FeedbackPanel`, `PresentationSurface`, `ActivateAssignmentModal`, `LessonCardPickerModal`, `PeerReviewSettings`, `useClassAssignment`, `useSubmissions`, `useClasses`, `lib/assignments`, `lib/lessonCards`, `lib/peerFeedback`, `Playhead`.
- **Gevonden bouwvoorwaarden:**
  - **Opdracht activeren:** `activateAssignment` en `activatePraatplaatFromCatalog` geven het id terug of herladen daarna. `activateLessonCard` regelt de opdrachtkaart zelf (via `card_inline`). Wizard stap 2 kan instellingen daarom **na** het activeren doorzetten met de bestaande functies `updateAssignmentCard`, `updateAssignmentDuration`, `updatePraatplaatTheme` en `setAssignmentPeerReview`. **Geen migratie nodig.**
  - **Klasgenoten laten luisteren:** `setAssignmentPeerReview(id, true, null)` kiest op de server zelf de standaardkaart (migratie 028).
  - **Tests:** er zijn geen tests voor docentcomponenten; nieuwe pure logica krijgt eigen unit-tests.

### 14-10-2026 · Stap 1 — snelle reparaties ✅
- **Meervoud:** `teacher.classCard.compositionCount` en `teacher.classDetail.compositionCount` gebruikten nog `_plural`, terwijl i18next v25 `_one/_other` verwacht. Omgezet in NL en EN. De klaskaart toonde het getal bovendien twee keer (`<strong>` + de vertaling); de `<strong>` is weg. Resultaat: "28 composities".
- **Volgorde:** nieuw `src/lib/submissionDisplay.ts`. `sortSubmissionsNewestFirst` sorteert op inleveren > laatst bewerkt > eerste keer opslaan, en wordt toegepast in `useSubmissions`.
- **Vorm-label:** `getSubmissionShape` maakt onderscheid tussen praatplaat, storyboard, losse afbeelding (`pp-`/`location-`), template en vrij. `SubmissionCard` geeft een praatplaat-inzending geen label "Storyboard" meer. Nieuw label "Afbeelding"; "Opdracht" heet nu "Template"; de presentatiestatus "Gezien" heet nu "Beluisterd", net als op de kaart.
- **Max klassen (BUG-MAXCLASSES-MODAL):** de melding komt nu uit i18n (`errors.classes.maxReached`, NL+EN). `TeacherDashboard.handleCreateClass` gooit de fout door, zodat `CreateClassModal` hem **in de modal** toont en de laadstand loslaat. Visueel gecontroleerd: de melding staat in het venster en *Annuleren* werkt.
- **Tests:** +6 (`submissionDisplay.test.ts`). Poort: tsc 0 · 420/420 · lint 25/5 (gelijk aan de beginstand).
- **Teller "x van 8 klassen":** volgt in stap 7 (dashboard).

### 14-10-2026 · Stap 2 — tijdlijn slepen met touch ✅
- **Eerste reparatie (niet genoeg):** `touch-none` stond alleen tíjdens het slepen aan. Nu staat het altijd aan op liniaal en handvat, en kun je over de hele liniaal slepen.
- **Echte touch-test:** via CDP (`Input.dispatchTouchEvent`, tablet 1024×768) bleek de liniaal met een vinger nauwelijks te raken. Hij is maar **16 px** hoog, en Chrome verplaatst een vingertik naar het grotere spoor eronder (*touch adjustment*). Met de muis werkte het wel (tel 38).
- **Oplossing:**
  - Nieuwe hook `src/hooks/useScrub.ts`, gedeeld door handvat, liniaal en een nieuw **sleepvlak over de sporen** in de alleen-lezen tijdlijn (presentatie en beluisteren).
  - Het sleepvlak gebruikt `touch-action: pan-y` en start het zoeken pas bij een horizontale beweging of een tik, zodat verticaal scrollen niets verzet.
  - Seeks worden per animatieframe gebundeld, zodat de audio-engine niet bij elke beweging herstart.
  - De tel komt uit de rechthoek van het sleepvlak zelf. Daardoor klopt hij ook bij een gescrolde tijdlijn en bij de smallere labelkolom op de telefoon; voorheen was dat een vaste 24 px.
- **Touch-testresultaten** (64 tellen):

  | Handeling | Resultaat |
  |---|---|
  | Liniaal 10%→60% | tel 38 ✓ |
  | Sporen 60%→25% | tel 16 ✓ |
  | Verticaal vegen | blijft 16 ✓ |
  | Tik op 50% | tel 32 ✓ |

- **Studio:** geen sleepvlak in de bewerkmodus, dus blokjes slepen werkt als voorheen.
- **Tests en poort:** +3 tests (`useScrub.test.ts`). Poort: tsc 0 · 423/423 · lint 25/5 (de meldingen in `Timeline.tsx` bestonden al, alleen verschoven).
