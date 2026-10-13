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
| 3 | Bouwstenen: vorm-meta met kleuren en iconen, bronnenlijst (platen, verhalen, templates, thema's) los van de oude modal | ✅ |
| 4 | Wizard: 1 Kies → 2 Controleer & pas aan → 3 Code op het bord (met instellingenpaneel) | ✅ |
| 5 | Klaspagina met tabs Klaarzetten · Tijdens de les · Terugkijken, plus *Meer opties* en automatisch verversen | ✅ |
| 6 | Feedback geven als werklijst (beeld boven de tijdlijn, uitklappen op de telefoon) | ✅ |
| 7 | Dashboard *Vandaag*, nieuwe klas → wizard, Lesideeën → wizard stap 2 | ✅ |
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

### 14-10-2026 · Stap 3 + 4 — wizard en codescherm ✅
- **Bouwstenen:**
  - `assignmentTypeMeta.ts` heeft nu per vorm een kleur, een gewone-taal-titel en een uitleg (teal/paars/amber/roze, Lucide-iconen, geen emoji's).
  - `lib/wizardActivation.ts` (6 tests) zet eerst klaar via de bestaande RPC's en daarna de instellingen door: duur, kaart, thema, klasgenoten. Een mislukte instelling blokkeert niets, maar wordt gemeld.
- **Wizard** (`components/teacher/wizard/AssignmentWizard.tsx`):
  - **Stap 1:** tabs *Zelf samenstellen* (eerst) en *Kant-en-klare les*. De vormkaarten hebben een kleur per vorm. Rechts staat "Zo ziet de leerling het" met de knoppen eronder, en die kolom schuift mee. Op de telefoon staat er een vaste knoppenbalk onderaan.
  - **Stap 2:** controleren en aanpassen, met *Uitleg voor leerlingen*, *Geluiden uit thema* (alleen bij een praatplaat), *Duur* en *Klasgenoten laten luisteren* ("Klasgenoten geven feedback aan elkaar."). De vervangmelding en de seizoensmelding staan in de flow.
  - **Stap 3:** `ClassCodeBoard`: code groot op het bord, de namen van leerlingen die bezig of klaar zijn (uit de inzendingsrijen, die sinds migratie 026 bij het eerste opslaan ontstaan, dus **zonder migratie**), volledig scherm, ⚙ Instellingen (paneel met `LiveAssignmentSettings`) en *Naar de klas*.
- **Navigatie:**
  - `TeacherPage` kent nu de weergave `wizard`.
  - Een nieuwe klas opent direct de wizard.
  - Op de klaspagina openen de typekaarten en de leskaartknop voorlopig de wizard; in stap 5 wordt de klaspagina helemaal omgebouwd.
- **PeerReviewSettings** heet nu "Klasgenoten laten luisteren", met het nieuwe uitlegzinnetje en een `bare`-weergave.
- **Gevonden bug in het design-systeem (gerepareerd):** 8 statuskleuren werden gebruikt maar bestonden niet als token. Die klassen deden niets, op dit moment in 40 plekken, bijvoorbeeld de oranje stip "Beluisterd" in de presentatie en `error-700` bij foutmeldingen. Aangevuld in `index.css`: success-700, warning-200/300/400/700/800, error-300/700.
- **Naam:** "Storyboard" overal (was ook "Verhaal in beeld").
- **Testopstelling:** de nep-database activeert leskaarten nu per type en onthoudt de instelling voor klasgenoten. Nieuw script `shoot-custom.mjs` (stappen uit JSON, toont paginafouten).
- **Visueel gecontroleerd:** stap 1, 2 en 3, het instellingenpaneel en de telefoon (stap 1 en 2, knoppenbalk onderaan). Geen paginafouten.
- **Poort:** tsc 0 · 429/429 · lint 25/5.

### 14-10-2026 · Stap 5 + 6 — klaspagina in tabs en feedback-werklijst ✅
- **Klaspagina (`ClassDetail.tsx`, herschreven):**
  - **Kop:** klascode + *Op het bord*, met daaronder de actieve opdracht met **Presenteren (n)** en **Feedback geven • x nieuw**.
  - **Tabs:**
    - *1 Klaarzetten* (`ClassPrepareTab`): de opdracht, *Andere opdracht kiezen* (de wizard), *Zoals leerlingen het zien* en *Meer opties* (uitleg, thema, duur, klasgenoten laten luisteren, opdracht stoppen, klas verwijderen).
    - *2 Tijdens de les* (`ClassLiveTab`): tellers voor ingeleverd en bezig, tegels met de nieuwste bovenaan. Ververst elke 20 s, alleen als het tabblad zichtbaar is.
    - *3 Terugkijken* (`ClassReviewTab`): "(Eerdere) opdrachten" met een gekleurd vorm-icoon, *Bekijk* en een ⋯-menu (*Delen met ouders*, *Opnieuw gebruiken*, *Uit de lijst halen*), plus "Wat klasgenoten ervan vonden" (top 3 met trofee/medaille/award-iconen).
  - De pagina opent vanzelf op *Tijdens de les* als er een opdracht loopt, en anders op *Klaarzetten*. Na de wizard opent hij altijd op *Tijdens de les*.
  - **Klas zonder opdracht:** één grote knop *Kies een opdracht* en een eerlijke uitleg over vrij componeren.
  - **Code op het bord** vanuit de kop: `ClassCodeBoard` (zonder stappenbalk) als overlay. Zonder opdracht valt hij terug op de bestaande `ClassCodeOverlay`.
  - **Zoals leerlingen het zien** (`StudentViewModal`) gebruikt **dezelfde RPC als de leerling** (`get_active_assignment`). Je ziet dus de echte uitleg, ook de ingesloten uitleg van een leskaart.
  - **Presenteren is ongewijzigd** (keuzemodal, polling, bord). Delen, het praatplaat-bord, de bewaartermijnmelding, verwijderen en opnieuw gebruiken (met vervangbevestiging) zijn allemaal meegenomen.
  - **Klas verwijderen** kan nu ook vanuit de klas. De gedeelde functie staat in `lib/classes.ts` (`deleteClassById`); `useClasses` gebruikt hem ook.
  - **Teksten:** de bevestiging bij *Opdracht stoppen* klopt nu ("leerlingen kunnen daarna alleen vrij componeren"). Voorheen stond er dat leerlingen niet meer konden werken.
- **Feedbackscherm (`FeedbackWorklist.tsx`, nieuw):**
  - Filters *Nog doen* · *Nieuw* · *Alles* en een opdrachtkeuze, zodat je ook eerdere opdrachten kunt nabespreken.
  - **Laptop:** lijst links, inzending rechts. **Telefoon:** het veld klapt open onder de kaart en scrolt naar de volgende.
  - **Beeld boven de tijdlijn:** bij een praatplaat de plaat met een gele stip op de plek van de leerling; bij een storyboard de scènes, waarbij de scène die nu klinkt oplicht.
  - **Echte audio** via `useCompositionPlayback`, met de alleen-lezen `Timeline` (sleepbaar, touch uit stap 2).
  - Stickers mét tekst, sterren met betekenis (*op weg · goed · top*), 5 tipzinnen, *Opslaan & volgende* en *Inzending verwijderen* (met bevestiging). Openen telt als "Beluisterd".
- **Verwijderd (vervangen door de wizard):** `ActivateAssignmentModal`, `LessonCardPickerModal` en `AssignmentTypeCards`. Er verdwijnt geen functie: alles kan nu in de wizard.
- **Testopstelling:** nep-RPC `get_active_assignment`. Eén vals alarm opgelost: de dev-server had de classes van het nieuwe bestand niet ingelezen (twee kolommen ontbraken). Na een herstart klopte het; de productiebuild scant alle bestanden (controle in stap 9).
- **Visueel gecontroleerd** (laptop + telefoon): alle tabs, *Meer opties*, het menu, *Zoals leerlingen het zien*, *Op het bord*, feedback bij praatplaat en storyboard, en het uitklappen op de telefoon.
- **Poort:** tsc 0 · 431/431 · lint 25/5.

### 14-10-2026 · Stap 7 — dashboard *Vandaag* ✅
- **Kop:** begroeting op het uur ("Goedemorgen, Bert") met de datum. Op de telefoon staan de knoppen nu op een eigen regel boven de titel; voorheen werd de titel afgekapt ("Goede…"). `TeacherPageHeader` wordt overal gedeeld; op de laptop verandert er niets.
- **Tabs:** *Mijn klassen* · *Lesideeën* · *Eigen materiaal*. Op de telefoon staan ze nu met drie naast elkaar, met het icoon boven het label. Twee tabs (de docentenpagina `/teacher`) houden hun vorm; die pagina is niet aangeraakt.
- **Mijn klassen (`dashboard/ClassesToday.tsx`):**
  - Kaart **Nu** met de klas van nu: de laatst geopende klas, en anders de klas met de meeste recente activiteit. Toont de actieve opdracht, het aantal ingeleverd en het aantal nieuw. Drie even grote knoppen: **Open klas** (blauw), **Presenteren**, **Code op het bord**. Zonder opdracht staat er **Opdracht kiezen**.
  - **Andere klassen** als rijen met code en opdracht (met vorm-icoon), plus *Opdracht kiezen* / *Open klas*.
  - **Nieuwe klas** met de teller "x van 8 klassen gebruikt". Bij het maximum staat er uitleg in plaats van een knop die vastloopt. Na het aanmaken gaat de docent direct naar de wizard.
  - **Eerste keer** (nog geen klassen): welkomstkaart, de drie stappen in de originele stijl en een link naar Lesideeën.
- **Gegevens:** `lib/classOverview.ts` (puur, 6 tests) en `hooks/useClassOverview.ts`. Twee queries voor alle klassen samen (`fetchActiveAssignmentsForClasses` + inzendingen), zonder migratie.
- **Lesideeën → wizard:** *Zet klaar voor een klas* vraagt alleen nog welke klas (of een nieuwe klas). Daarna opent de wizard op stap 2 *Controleer & pas aan*; er wordt niets meer met één klik blind geactiveerd. Kop en uitleg: "Lesideeën" en "kies er een, kies een klas en controleer wat je leerlingen zien".
- **Presenteren vanaf het dashboard** opent de klas en direct de bestaande presentatiekeuze.
- **Verwijderd:** `ClassCard` en `SubmissionCard` (vervangen door de rijen en tegels).
- **Visueel gecontroleerd:** vandaag, eerste keer, maximum bereikt, telefoon, de klaskeuze bij een les, Lesideeën → stap 2, nieuwe klas → wizard en presenteren.
- **Poort:** tsc 0 · 437/437 · lint 25/5 (onveranderd).
