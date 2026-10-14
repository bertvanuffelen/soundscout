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
| 8 | Teksten NL + EN, handleiding/woordenlijst, CLAUDE.md | ✅ |
| 9 | Eindcontrole: alle flows in de testopstelling, telefoon, digibord, screenshots | ✅ |

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

### 14-10-2026 · Stap 8 — teksten en documentatie ✅
- **Handleiding** (`teacher.guide.sections`, NL + EN): 25 alinea's herschreven, zodat ze de nieuwe schermen beschrijven. Het gaat om *Aan de slag*, *Klassen beheren*, *Dashboard in één oogopslag*, *Opdracht-types*, *Opdrachtkaarten*, *Leskaarten*, *Templates*, *Praatplaat*, *Inzendingen*, *Tips voor de klas* en *Feedback-tips*. Nieuw daarin:
  - de drie stappen van de wizard;
  - de klaspagina met drie tabs;
  - klas verwijderen via *Meer opties*;
  - delen via het ⋯-menu;
  - *Feedback geven* met *Opslaan & volgende* (de sticker slaat niet meer direct op).

  Alle knopnamen in de teksten zijn gecontroleerd tegen de echte labels.
- **Uitlegblokken op het dashboard** (*Zo bouw je eigen materiaal*, *Zo werk je met lesideeën*): "in één klik activeren" is vervangen door kiezen, controleren en de code op het bord.
- **Titels van de inlogschermen** zonder Title Case: "Inloggen voor docenten" en "Maak een docentenaccount" (EN: "Teacher login", "Create a teacher account").
- **Niet aangeraakt:** de teksten van de docentenpagina `/teacher` (`teacherLanding.*`). Daar staat nog steeds "Activeer een praatplaat…", maar die pagina mag niet veranderen.
- **Woordenlijst:** lesideeën, eigen materiaal, uitleg voor leerlingen, klaarzetten, code op het bord, de vormnamen uit de wizard, "Klasgenoten laten luisteren", feedback geven en de betekenis van de sterren.
- **CLAUDE.md:** de sectie *Teacher Dashboard* is herschreven voor dashboard, wizard, klaspagina, feedback-werklijst, `useScrub` en de verwijderde componenten. Verwijzingen naar `ActivateAssignmentModal`, `AssignmentTypeCards` en `SubmissionCard` zijn bijgewerkt.
- **`docs/TEKSTEN.md`** is opnieuw gegenereerd (`npm run teksten:export`). NL/EN-pariteit: geen ontbrekende sleutels.
- **Bewust niet opgeruimd:** i18n-sleutels die alleen de verwijderde componenten gebruikten (bijvoorbeeld `teacher.classDetail.startChoiceLesson`). Ze kunnen geen kwaad. Er bestaan ook dynamische sleutels, waardoor automatisch verwijderen riskant is. Dit is een kleine opruimklus voor later.
- **Historische plandocumenten** (PLAN-*, LOGBOEK, TODO) noemen de oude componenten nog. Dat klopt: zij beschrijven toen.
- **Poort:** tsc 0 · 437/437 · lint 25/5.

### 14-10-2026 · Stap 9 — eindcontrole ✅
- **Productiebuild** (`npm run build`) slaagt.
  - De waarschuwing over een grote `main`-chunk bestond al: 809 kB vóór de bouw, nu 830 kB door de extra teksten.
  - Het docentendeel wordt apart geladen (`TeacherPage`: 143 → 179 kB).
  - De Tailwind-scan pakt alle nieuwe klassen op (onder andere de grid van het feedbackscherm uit stap 5–6).
- **Alle flows doorlopen tegen een productiebuild met de nep-database.**
  - Telefoon is 390 px, digibord 1920×1080.
  - De screenshots staan in [`mockups/gebouwd/`](mockups/gebouwd/).

  | # | Scherm | Formaat |
  |---|---|---|
  | 01 | dashboard | laptop |
  | 02–04 | klaspagina, alle drie de tabs, inclusief *Meer opties* | laptop |
  | 05 | feedback geven | laptop |
  | 06–07 | wizard stap 1 en 2 | laptop |
  | 08 | stap 3 *Code op het bord* | digibord |
  | 09 | presenteren met praatplaat (ongewijzigd) | digibord |
  | 10 | klaspagina | telefoon |
  | 11 | feedback met uitgeklapte kaart | telefoon |
  | 12 | wizard | telefoon |
  | 13 | code op het bord met binnengekomen namen | digibord |

- **Laatste verbetering:** op het codescherm staan de namen en de hulpregel nu groter op grote schermen (`lg:`). Op 1920 px waren ze te klein om vanaf achter in de klas te lezen.
- **Opgemerkt, geen fout:**
  - *Nu* kiest een nieuwe klas zonder opdracht als die de meest recente activiteit heeft. Dat past bij de regel "laatst geopend, anders meest recente activiteit". Open je een andere klas, dan wordt die de klas van *Nu*.
  - In de werklijst springt de eerste kaart naar "Beluisterd" zodra hij opent. Dat is bedoeld: openen telt als beluisterd.
- **Poort:** tsc 0 · 437/437 tests (27 bestanden; beginstand 414 in 23) · lint 25/5 (onveranderd).

---

## Voor Bert — stand en vervolg

**Alles uit het ontwerp (ronde 3b) is gebouwd.** De branch is `claude/docentenportaal-ombouw`, met één commit per stap. Er is niets naar `main` gepusht en er zijn geen migraties.

**Zelf bekijken:** start in deze worktree `npm run dev`, log in met je eigen testaccount en kies het docentendashboard. De echte database werkt ongewijzigd, want er is alleen gebruikgemaakt van bestaande RPC's en kolommen.

**Nog te doen of te besluiten:**
1. **Test met een echt account.** Ik heb alleen met de nep-database getest. Let vooral op deze punten:
   - de wizard per type (template, praatplaat, storyboard, vrij en een leskaart);
   - *Opslaan & volgende* in de werklijst;
   - *Opdracht stoppen*;
   - *Klas verwijderen*.
2. **Moment van mergen naar `main`.** De lancering is op 27-10. Volgens de oorspronkelijke afspraak bouwden we dit na de lancering. Kies zelf of dit vóór of na 27-10 live gaat.
3. **Kleine opruimklus:** i18n-sleutels die alleen de verwijderde componenten gebruikten.
4. **Docentenpagina `/teacher`:** daar staat nog "Activeer een praatplaat…" en "in één klik". Ik heb die pagina bewust niet aangeraakt.

---

## Ronde 4 — feedback Bert na eigen test (15-10-2026)

| # | Feedback | Wat ik deed |
|---|---|---|
| 1 | *Nieuwe leskaart* is formeel; bij "Bron" zie je alleen namen | De editor is omgebouwd: gekleurde vormkaarten zoals in de wizard en een **brontegel met afbeelding**. "Kies een bron" opent een **groot raster met alle bronnen en hun afbeelding**, in hetzelfde venster met *Terug naar de leskaart*. Een tweede venster eroverheen zou botsen met Escape en de focus. Het raster is hetzelfde onderdeel als in de wizard (`wizard/SourceGrid` + `wizard/useAssignmentSources`). |
| 2 | Live voorbeeld zoals elders | Rechts staat een **live voorbeeld** met een schakelaar: *Leskaart* (zo staat hij in Lesideeën: beeld, vorm, niveau, titel, lesdoel, fasen) en *Leerling* (de telefoon uit de wizard met de gekozen uitleg). Tik je op uitleg, dan springt het voorbeeld naar *Leerling*; werk je aan titel, lesdoel of fasen, dan naar *Leskaart*. Op een smal scherm staat het voorbeeld onder het formulier. |
| 3 | *Opdracht stoppen* uit *Meer opties* halen | Het staat nu direct onder *Andere opdracht kiezen* / *Zoals leerlingen het zien*, als rode omlijnde knop "Opdracht stoppen…" met de uitleg ernaast. *Klas verwijderen* blijft onder *Meer opties*: dat doe je zelden en het is onomkeerbaar. |
| 4 | Terug naar de klas is onopvallend | Rechts in de filterbalk staat nu een duidelijke knop **"Klaar? Terug naar de klas"**. Als er niets meer te doen is, krijgt de lege staat ook een knop *Terug naar de klas*. |
| 5 | Waar zie ik wat klasgenoten zeiden? | Mijn advies: **ja, ook in *Feedback geven***. Je wilt lezen wat klasgenoten vonden vóór je zelf reageert. Daarom staat er boven *1. Kies een compliment* een blok **"Wat klasgenoten zeiden"**: gemiddelde sterren per criterium, hoeveel klasgenoten reageerden en hun namen (alleen voor de docent zichtbaar). Het blok verschijnt alleen als er reacties zijn. Het overzicht met de top 3 blijft onder *Terugkijken*. Data via de bestaande RLS op `peer_feedback`, geen migratie (`getPeerFeedbackForSubmission` + pure `lib/peerSummary.ts`, 3 tests). |

- **Poort:** tsc 0 · 440/440 · lint 25/5.
- **Screenshots:** `mockups/gebouwd/14`–`18`.

### 15-10-2026 · Leerlingscherm "Luister naar klasgenoten" — Chromebook-fix ✅
- **Gevonden:** op een Chromebook (1366×650 zichtbaar) viel *Versturen en volgende* onder de rand. Het sterrenpaneel was begrensd op 40% van de hoogte en scrolde ongemerkt.
- **Eerste poging:** het paneel mocht hoger worden (60%), waarbij het beeld krimpt. De knop kwam in beeld, maar het beeld werd te klein: 215 px breed, en met 8 onderdelen 48–84 px.
- **Oplossing** (in `PresentationSurface`, alleen voor de peer-modus):
  - **Breed (vanaf 1024 px):** het sterrenpaneel staat als kolom van 380 px rechts naast het beeld, over de volle hoogte.
  - **Smal:** het paneel staat onder het beeld, met maximaal 60% van de hoogte.
  - De verstuurknop staat sticky onderaan het paneel en blijft dus altijd in beeld, ook bij 8 onderdelen.
- **Gecontroleerd op 9 formaten.** Bij alle formaten staat de knop in beeld en is hij klikbaar.

  | Formaat | Breedte beeld |
  |---|---|
  | Chromebook 1366×650, 3 onderdelen | 791 px |
  | Chromebook 1366×650, 8 onderdelen | 791 px |
  | Laptop 1280×720 | 848 px |
  | Klein scherm 1280×600 | 702 px |
  | iPad liggend 1024×700 | 592 px |
  | iPad staand 768×1024 | 728 px |
  | Telefoon 360×640 | 176 px |
  | Telefoon 390×844, 8 onderdelen | 222 px |
  | Groot scherm 1920×1080 | 1488 px |

  Op de telefoon is het beeld klein. Dat is bewust: daar gaat de ruimte naar de sterren, en met de vergrootknop kan de leerling het beeld groot bekijken.
- **Docentenscherm *Presenteren*:** visueel ongewijzigd (gecontroleerd op 1920×1080).
- **Besluiten Bert:**
  - Versturen zonder eerst te luisteren mag.
  - De woorden bij de sterren ("goed geprobeerd / goed gedaan / heel sterk" voor de leerling, "op weg / goed / top" voor de docent) passen we later aan via `docs/TEKSTEN.md`.
- **Poort:** tsc 0 · 440/440 · lint 25/5.
- **Screenshots:** `mockups/gebouwd/19`–`21`.

### 15-10-2026 · Vier kleine bevindingen uit het onderzoek ✅
1. **Feedbackkaart verwijderen vraagt nu om bevestiging.** De bevestiging staat in het paneel zelf (geen tweede venster), met een eerlijke uitleg. Bij deze opdracht schakelt de app over op de standaardkaart. Andere klassen die dezelfde kaart gebruiken, verliezen hun kaart door `ON DELETE SET NULL` (migratie 027). Daar stopt *Klasgenoten laten luisteren* dan, tot de docent een andere kaart kiest.
2. **Het tijdslot komt terug na herladen.** De database kent alleen de sluittijd, niet de gekozen duur. Daarom onthoudt elk apparaat de duur per opdracht. Op een ander apparaat leidt de app hem af: de kleinste optie die nog past. `lib/peerTimer.ts` heeft 5 tests.
3. **Datums volgen de taal van de app** (`common.dateLocale`). Dit is gerepareerd op drie plekken waar het vast op Nederlands stond: TemplateCard, CompositionCard (opgeslagen composities van de leerling) en de metaregel in de presentatie. Vier andere plekken gebruikten elk een eigen taalcheck; die gebruiken nu dezelfde sleutel.
4. **"Storyboard" heet overal storyboard** (besluit Bert 15-10). Vervangen zijn "Verhaal in beeld" (leerlingscherm), "Kies een verhaal" (wizard), "Verhaal in scènes" en "verhaal in beeld" in een uitleg, in NL en EN. Ook WOORDENLIJST en HANDLEIDING-BEHEER zijn bijgewerkt.
   - **Niet aangeraakt:** de docentenpagina `/teacher` (tag "Verhaal in scènes"). Die pagina mag niet veranderen; dit is een besluit voor Bert.
   - **Bewust gelaten:**
     - de activiteitszin in de wizard, "Een verhaal op muziek zetten", met het label *Storyboard*. Dat is een omschrijving, geen naam, en zo werkt de praatplaat-kaart ook;
     - het lesdoel van Verspringen, waarin "verhaal in beeld" gewone taal is.
- **Gecontroleerd in de testopstelling:**
  - bevestiging bij verwijderen;
  - tijdslot na het opnieuw openen van het paneel, met en zonder geheugen op het apparaat.
- **Poort:** tsc 0 · 445/445 · lint 25/5.
