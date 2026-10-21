# Bouwplan: leerling-workflow (openingsscherm → podium)

> **Status:** fase 0 ✅ afgerond 21-10-2026 (wacht op review en merge naar `main` vóór 27-10) · fase 1 🔄 (branch `claude/leerling-fase1`) · gestart 21-10-2026 · branch `claude/soundscout-podium-workflow-2268b6`
>
> **Bron (ontwerp en besluiten):** Kennis-map `soundscout/`
> - `workflow-leerling.md`: hoofddocument; bevindingen B1–B38, besluitenlog
> - `workflow-leerling-ronde4.md`: ronde 4; besluiten van 21-10, Engels-audit, woordenlijst, advies voor het openingsscherm
> - `workflow-leerling-podium-v4.html`: het klikbare doelontwerp
>
> **Werkwijze:**
> - Elke stap is één commit.
> - Elke stap sluit af met `npx tsc -b --noEmit` + `npm run test:run` groen.
> - Na elke stap wordt dit document bijgewerkt: de statuskolom, het commit-hash en de verificatie.
> - Migraties zijn additief en idempotent; Bert voert ze uit in de Supabase SQL Editor.
>
> **Legenda:** ⬜ open · 🔄 bezig · ✅ klaar · ⏸️ geparkeerd

---

## Overzicht

| Fase | Doel | Wanneer | Migratie |
|---|---|---|---|
| **0** | Fouten eruit (context, audio, data, podium-UI, Engelse sleutels) | **vóór 27-10** | nee |
| **1** ✅ | Openingsscherm opgeschoond + A1–A3, soundscape-termen, Engelse teksten | november (klaar 21-10, branch `claude/leerling-fase1`) | nee |
| **2** | Podium v4 ("Jouw soundscape", schermvullend) | dec–jan | nee |
| **3** | Titelinstelling van de docent + Engelse data (schuilnamen, feedbackkaarten) | daarna | **ja (klein)** |
| **4** | Live meenemen van docentwijzigingen · leerlingcodes (bestaand ontwerp `ONTWERP-LEERLING-CODES.md`) | later | ja |

---

## Fase 0: fouten eruit (vóór de lancering)

| Stap | Bevinding | Wat | Bestanden | Status | Commit |
|---|---|---|---|---|---|
| 0.1 | B21 | **Context wissen bij openen** via bewaarcode, "Mijn composities" en template. Zo wordt geen andere lokale compositie overschreven, gaat er niets naar een oude klas en blijven oude feedback en template niet hangen. | `utils/compositionInit.ts` (nieuw `openLocalComposition`), `components/compositions/CompositionsView.tsx`, `components/share/ShareCodeInput.tsx` | ✅ | 7cc08be |
| 0.2 | B22, B23 | **Podium speelt altijd de volledige mix, zonder loop.** Solo (store + engine) en de transport-loop worden gereset bij het openen van het podium en bij elk afspelen daar. | `components/stage/StageView.tsx`, `components/stage/StagePlayback.tsx` (de lichtbak profiteert via de reset bij het openen) | ✅ | 91f0dd7 |
| 0.3 | B24, B25 | **Nieuwe compositie begint schoon:** secties, sequences, lengte en loop terug naar de standaard. De wizard zet de modus pas bij de definitieve keuze. | `stores/timelineStore.ts` (`resetTimeline`), `utils/compositionInit.ts`, `hooks/useStageModals.ts`, `components/stage/StageView.tsx`, `components/start/NewCompositionWizard.tsx`, `components/StartScreen.tsx` | ✅ | f6ed998 |
| 0.4 | B26 | **Volledige data** bij Bewaar online, Deel link, Deel met docent en Opslaan als opdracht (sequences + praatplaat + positie). Eén gedeelde builder in plaats van vier kopieën. | nieuw `utils/buildCompositionData.ts`, `components/stage/StageView.tsx`, `hooks/useStageSave.ts` | ✅ | 90b2cdf |
| 0.5 | B1, B2, B3, B5, B10, B18 | **Podium-UI:** feedbackblok op mobiel zonder overloop · opslaan zonder naam geeft zichtbare uitleg · label "Opnieuw inleveren" na het inleveren + statustekst "Klik op Lever in" · geen layout-sprong bij "Nu speelt" · ondertitels niet afgekapt · aria-labels op de speelknoppen | `components/common/FeedbackBanner.tsx`, `components/stage/StageActionsModal.tsx`, `components/stage/StagePlayback.tsx`, `i18n/locales/*.json`, `docs/TEKSTEN.md` | ✅ | a55525c |
| 0.6 | B33, B34 | **Ontbrekende sleutels** `errors.networkTimeout`, `composeMode.noImages/noStoryboards` (NL + EN) · **onzichtbare ghost-knoppen** op het desktop-startscherm en het opdrachtscherm (eerst in de browser bevestigen) | `i18n/locales/*.json`, `components/start/StoryboardPicker.tsx`, `components/studio/Clip.tsx`, `components/StartScreen.tsx`, `components/assignment/AssignmentLandingScreen.tsx`, `components/teacher/SharePraatplaatModal.tsx` | ✅ | 3d89be6 |
| 0.7 | — | **Eindcontrole fase 0:** browserdoorloop (klasroute, bewaarcode, Mijn composities, zelf beginnen), `npm run build`, `npm run lint` | — | ✅ | zie logboek |

**Bewust níet in fase 0:**
- B30 (storyboardpijlen springen niet in de muziek) en B31 (de lichtbak slaat sequences over). Die vervallen of veranderen in fase 2, omdat de presentatiemodus de lichtbak vervangt.
- B32 (persistentie bij herladen). Dat is A1 in fase 1.

## Fase 1: openingsscherm (november) ✅

> **Branch:** `claude/leerling-fase1` (gestapeld op fase 0 / PR #5).
> **Volgorde:** eerst de structuur (1.2–1.4), dan A3, A2 en A1, en als laatste de tekstrondes (1.1 en 1.8). Zo krijgen nieuwe teksten meteen de goede woorden.

| Stap | Wat | Bestanden | Status | Commit |
|---|---|---|---|---|
| 1.2 | Startscherm opgeschoond: "Ben je docent?" als link, tabtitel "SoundScout", wizard zonder dubbele code-ingang | `StartScreen.tsx`, `start/NewCompositionWizard.tsx`, `App.tsx` | ✅ | 0f12077 |
| 1.3 | Codevenster: één kop "Typ je code" + uitleg per codesoort, "Open" met tekst op mobiel | `share/ShareCodeModal.tsx`, `share/ShareCodeInput.tsx`, i18n | ✅ | 0f12077 |
| 1.4 | Klas zonder opdracht: "Andere code proberen" opent het codevenster, "Vrij componeren" opent de wizard (O7) | `assignment/AssignmentLandingScreen.tsx`, `stores/appStore.ts` (`goToStartWith`), `StartScreen.tsx` | ✅ | 0f12077 |
| 1.7 | **A3** Uitleg één keer na "Starten" in de klasroute | `assignment/AssignmentLandingScreen.tsx` | ✅ | feecccb |
| 1.6 | **A2** Klasbewuste "Nieuwe soundscape" (startscherm + podium): "Nog één voor deze opdracht" / "Zelf iets nieuws" | `StartScreen.tsx`, `stage/StageView.tsx`, `common/NewWorkChoiceModal.tsx`, `compositionInit.ts` (`startAnotherForCurrentAssignment`) | ✅ | 7b49ca8 |
| 1.5 | **A1** Verder-kaart: werk + `classSession` lokaal bewaren, zodat ze herladen overleven (B32) | nieuw `services/workInProgress.ts`, `App.tsx`, `StartScreen.tsx` | ✅ | b74ef7c |
| 1.1 | Soundscape-termen in alle leerlingteksten (NL + EN) volgens de woordenlijst in ronde 4 §7; geen verkleinwoorden | i18n, `docs/TEKSTEN.md` | ✅ | b59c3e8 |
| 1.8 | Engelse teksten volgens de audit (ronde 4 §6): termen, zinsletters, VK-spelling, meervouden `_one/_other` + ClassCard-dubbeltelling, Engelse privacylink, harde teksten via i18n | i18n, `ClassCard.tsx`, `PrivacyModal.tsx`, `TeacherRegister.tsx`, `useClasses.ts`, `useSubmissions.ts`, `TeacherPage.tsx`, `App.tsx`, `LocationScene.tsx`, `SectionBar.tsx`, `ImageLightbox.tsx` | ✅ | fbbdb5d, ed8fe0a, 7e0e6f1 |

## Fase 2: podium v4 ✅

> **Branch:** `claude/leerling-fase2` (gestapeld op fase 1).

| Stap | Wat | Status | Commit |
|---|---|---|---|
| 2.1 | Schermvullende layout: beeld links, kolom "Jouw soundscape" rechts (360 px); op mobiel onder elkaar | ✅ | f9aabbb |
| 2.2 | Stappencomponent met statusafleiding (luisteren · titel · plek · inleveren/bewaren · feedback · klasgenoten · exporteren), in vrije volgorde | ✅ | 9349416, f9aabbb |
| 2.3 | Opdrachtkaart en tijdsduur meenemen in `ClassSession`, tonen als "Opdracht" | ✅ | 61e4317, f9aabbb |
| 2.4 | Presentatiemodus voor "Luister" (PresentationSurface hergebruiken) | ✅ | f9aabbb |
| 2.5 | Beeldvlak per situatie: storyboard met strip (springt in de muziek), afbeelding, praatplaat met pin + zoom, tijdlijn als beeld | ✅ | f9aabbb |
| 2.6 | Feedback klasgenoten op het volle scherm (links compositie, rechts sterren) | ✅ | f9aabbb |
| 2.7 | Muziekkaart (code + QR); één inleverpad (klascode zet de klassessie); "Bewaar" zonder naam | ✅ | f9aabbb |
| 2.8 | Versies: "Lever versie N in" bij wijzigingen sinds het inleveren | ✅ | 9349416, f9aabbb |

**Besluiten tijdens het bouwen**
- De titel staat in de appStore (`compositionTitle`): hij blijft tussen studio en podium en gaat mee in het onthouden werk (A1).
- Inleveren of bewaren zonder titel kiest automatisch een titel (`randomTitles`).
- Online bewaren stuurt een schuilnaam mee (de server wil een naam); de leerling typt geen naam meer.
- "Kies een andere plek" verzet de pin van dezelfde soundscape (`praatplaatReturnToStage`). Een nieuwe soundscape op een andere plek loopt via "Nieuwe soundscape → Nog één op een andere plek".
- **Delen in de klas staat aan.** De mockup toonde "staat uit in de klas", maar zonder docentinstelling zou dat een functie weghalen. → Open vraag voor Bert (zie onder).
- Weggehaald: het venster "Opslaan & Delen", het publiek onder het podium, de losse opslagwaarschuwing en de praatplaat-succesmodal (vervangen door de stappen).

**Open vragen**
- Moet "Delen" (luisterlink) in de klas uit kunnen? Zo ja: als docentinstelling in fase 3.
- Een leerling die thuis begon en via "Heb je een klascode?" bij een **praatplaat**-klas wil inleveren, krijgt de melding dat dit via "Ik heb een code" moet (er hoort een plek bij).

## Fase 3: instellingen en data (migratie) ✅

> **Branch:** `claude/leerling-fase3` (gestapeld op fase 2).

| Stap | Wat | Status | Commit |
|---|---|---|---|
| 3.1 | Migratie 037: `class_assignments.students_type_title BOOLEAN NOT NULL DEFAULT TRUE` + mee in de payload van `get_active_assignment` | ✅ (bestand) · ⏳ Bert draait hem | 99fb476 |
| 3.2 | Docent-UI: schakelaar op de actieve opdracht in ClassDetail (verschijnt pas na de migratie); leerling: automatische titel, invoerveld alleen-lezen, geen dobbelsteen | ✅ | 99fb476 |
| 3.3 | Engelse schuilnamen (`generateRandomName`) + vertaalde ingebouwde feedbackkaarten (`peerChipLabel`, alleen weergave) | ✅ | 2b0e129 |

**Besluiten**
- Feedbackkaarten vertalen we in de weergave, niet in de database: sterren worden per criterium-tekst opgeslagen. Zo tellen NL- en EN-beoordelingen samen. Geen migratie nodig.
- De titelinstelling wordt in de app afgedwongen (geen invoerveld). De server overschrijft de titel niet; wie de app omzeilt, kan nog een titel sturen. Dat is voor nu voldoende.
- **Privacytekst aangepast** (app, `/privacy/`, `/privacy/en/`): online bewaren gaat met een automatische schuilnaam, de leerling typt geen naam meer. → Bert even nalezen.

## Fase 4: live meenemen en leerlingcodes ✅

> **Branch:** `claude/leerling-fase4` (gestapeld op fase 3).

| Stap | Wat | Status | Commit |
|---|---|---|---|
| 4.1 | Live meenemen: het podium haalt de opdracht bij openen en elke minuut opnieuw op (alleen als het tabblad zichtbaar is); kaart, tijdsduur, peer-feedback en titelinstelling komen mee; een andere opdracht geeft een melding | ✅ | 2a93811 |
| 4.2 | Leerlingcodes volgens `ONTWERP-LEERLING-CODES.md` v2: migratie 038 (tabel, kolom, 7 RPC's, RLS), inloggen via het codeveld, vaste schuilnaam bij inleveren, "Verder met je laatste soundscape", docentblok met codes maken, lijst, nieuwe code, aan/uit, verlengen en printbare kaartjes | ✅ (bestand) · ⏳ Bert draait 038 | e72b0f1 |
| 4.3 | Mijn soundscapes per klas gegroepeerd, met de code om verder te werken (besluit "lokaal sterker") | ✅ | 2abd024 |

**Besluiten**
- Migratie 038 is getest in PGlite (Postgres in WebAssembly) met een nagebootste `classes`/`submissions`: rechten per docent, inloggen (ook met streepje), koppelen alleen met het geheim van de inzending, laatste werk, verlengen, nieuwe code, uit en verlopen. Dubbel draaien gaat goed.
- Schuilnamen voor leerlingcodes maakt de app van de docent, in diens taal. De server maakt de codes (2 letters zonder I/O + 4 cijfers) en checkt botsingen met bestaande bewaarcodes.
- Een code als `LK4827` wordt eerst als leerlingcode geprobeerd, anders als bewaarcode. Zonder migratie valt alles stil terug op de bestaande routes.
- Groepjes en "wie heeft nog niet ingeleverd" blijven buiten v1 (zoals in het ontwerp).

**Nog te doen door Bert (fase 3 en 4)**
1. Migraties **037** en **038** draaien in Supabase (in die volgorde).
2. Privacyverklaring aanvullen met leerlingcodes (code + schuilnaam, geldig tot 31 juli, verwijderd met de klas). De tekst over online bewaren is al aangepast.
3. Testen met een echte klas: inleveren, versie 2, feedback klasgenoten, "Heb je een klascode?", titelinstelling, leerlingcodes maken, printen en inloggen.

---

## Logboek

| Datum | Stap | Commit | Verificatie |
|---|---|---|---|
| 21-10-2026 | Bouwplan opgesteld | c50b00d | — |
| 21-10-2026 | 0.1 B21 context wissen bij openen. Extra: "Nieuwe compositie maken" in Mijn composities gaat nu naar start in plaats van met de oude staat naar de kaart | 7cc08be | tsc ✓ · 437 tests ✓ (nieuw: `openComposition.test.ts`, 2) · lint: alleen de bestaande fout `set-state-in-effect` in CompositionsView (al vóór deze stap) |
| 21-10-2026 | 0.2 B22/B23 solo en loop uit op het podium | 91f0dd7 | tsc ✓ · 437 tests ✓ · lint ✓ · gedrag nog nalopen in de browser bij 0.7 |
| 21-10-2026 | 0.3 B24/B25 schone tijdlijn bij nieuw (incl. praatplaat-opdracht en nieuwe plek), modus pas bij de keuze. Extra gevonden: "Kies een nieuwe plek" liet `currentCompositionId` staan, waardoor Opslaan de vorige compositie overschreef; opgelost | f6ed998 | tsc ✓ · 438 tests ✓ (nieuw: resetTimeline) · lint ✓ |
| 21-10-2026 | 0.4 B26 één builder voor alle deel-, bewaar- en presenteerroutes; Opslaan als opdracht laat de praatplaat bewust weg | 90b2cdf | tsc ✓ · 440 tests ✓ (nieuw: buildCompositionData, 2) · lint: alleen de bestaande fout in useStageSave |
| 21-10-2026 | 0.5 podium-UI: B1 banner volle breedte, B2 Opslaan uit zonder naam + melding bovenaan, B3 "Opnieuw inleveren" + statustekst, B5 vaste regel "Nu speelt", B10 uitleg niet afgekapt, B18 aria-labels. `useStageSave` hoefde niet te veranderen (de knop staat nu uit) | a55525c | tsc ✓ · 440 tests ✓ · lint ✓ · TEKSTEN.md opnieuw gegenereerd · browsercontrole bij 0.7 |
| 21-10-2026 | 0.6 B33 sleutels (`networkTimeout`, `noImages`, `noStoryboards`, plus `studio.startBeat` en `common.duration`, die in NL Engels toonden) · B34 ghost-knoppen: in de code bevestigd. Extra gevonden: de QR-knoppen in "Praatplaat delen" (docent) waren ook wit op wit | 3d89be6 | tsc ✓ · 440 tests ✓ · lint ✓ · browsercontrole bij 0.7 |
| 21-10-2026 | 0.7 eindcontrole fase 0 | — | `npm run build` ✓ · `npm run lint`: 30 meldingen, allemaal bestaande lintschuld (react-hooks-regels in o.a. Timeline, Track, CompositionsView, useStageSave), geen nieuwe · **browser** (1366×768 en 375×812): B22/B23 solo en loop uit na binnenkomst buiten de studio om (engine + Tone-transport gecontroleerd) · B2 Opslaan uit + melding bovenaan · B5 0 px verschuiving bij afspelen · B10 uitleg loopt over twee regels · B34 "Mijn Composities" donker op de witte kaart · B25 modus blijft na "Volgende" + sluiten · B24 vrije compositie na storyboard: 0 secties, 128 tellen · B21 Mijn composities → afspelen wist oude klas, feedback en compositie-id · B1 feedbackblok binnen 375 px · B3 "Opnieuw inleveren" na inzending |

### Nog te doen door Bert (fase 0)
- Review van [PR #5](https://github.com/bertvanuffelen/soundscout/pull/5) (branch `claude/soundscout-podium-workflow-2268b6`) en merge naar `main`, dan de build uploaden vóór 27-10.
- Korte eigen check op een echt apparaat: inleveren met klascode (Tier 1 #6), openen via bewaarcode, en "Kies een nieuwe plek" bij een praatplaat. Die routes raken de server, en die heb ik niet gebruikt.
| 21-10-2026 | 1.2–1.4 startscherm, codevenster, klas zonder opdracht | 0f12077 | tsc ✓ · 440 tests ✓ · lint ✓ · browser 1366×768: tabtitel "SoundScout", docentlink klein, codevenster met drie regels, Route C → codevenster / uitleg + wizard |
| 21-10-2026 | 1.7 A3 uitleg één keer in de klasroute | feecccb | tsc ✓ · tests ✓ · browser: eerste "Starten" toont de uitleg, tweede keer niet |
| 21-10-2026 | 1.6 A2 klasbewuste nieuwe soundscape | 7b49ca8 | tsc ✓ · 442 tests ✓ (2 nieuw) · lint ✓ · browser 1366×768: podium praatplaat → "Nog één op een andere plek" houdt klas + praatplaat, gaat naar plekkiezer; "Zelf iets nieuws" wist klas en opent de wizard; startscherm vrije opdracht toont "nog niet ingeleverd". Niet getest: "Nog één voor deze opdracht" tegen de echte server (opdracht ophalen) |
| 21-10-2026 | 1.5 A1 werk overleeft herladen | b74ef7c | tsc ✓ · 446 tests ✓ (4 nieuw) · lint ✓ · browser: clip + 2 geluiden + klas Groep 6b → echte herlaadbeurt → startscherm "Ga verder / Groep 6b" + "Naar het podium" → studio toont alles terug; resetten wist de snapshot. Let op: op een gedeeld apparaat ziet de volgende leerling het open werk van de vorige tot die opnieuw begint (zelfde als bij Mijn composities). Een template-sessie herstelt `activeTemplate`; een bewaarcode-koppeling blijft (die stond al in localStorage) |
| 21-10-2026 | 1.1 soundscape-termen | b59c3e8 | 67 sleutels NL+EN · tsc ✓ · 446 tests ✓ · browser: startscherm "Nieuwe soundscape". Bewust niet: docentteksten (teacher, lessonCards, templates, submissions, about, album-deeltekst), werkwoord "componeren". `sharedPraatplaat.submissionCount` ("compositie(s)") gaat mee in 1.8 (meervoud) |
| 21-10-2026 | 1.8 Engelse teksten (a: harde teksten + privacylink, b: meervouden, c: termen/zinsletters/VK) | fbbdb5d, ed8fe0a, 7e0e6f1 | tsc ✓ · 446 tests ✓ · meervouden gecontroleerd (1 composition / 5 compositions, "Listened to once", NL "8 klassen") · browser EN: "New soundscape", privacylink /privacy/en/. Standaard-opdrachtkaart heet nu "Opdracht"/"Assignment". **Niet gedaan, verschoven naar fase 3:** Engelse schuilnamen en vertaalde peer-criteria (komen uit de database, migratie 027-data). Ook nog open (lage prioriteit): `public/les/*` en meta-titels van de statische pagina's alleen NL |
| 21-10-2026 | 2.1–2.8 podium v4 | 9349416, 61e4317, f9aabbb, eefb4bf, HEAD | tsc ✓ · 457 tests ✓ (11 nieuw) · lint ✓ · browser 1024 + 375 px: vrij zonder klas (afspelen + voortgang, titel-suggestie, Luister → presentatie, Bewaar → echte bewaarcode Z7B4FC, wijziging → "bewaar opnieuw" → bijgewerkt, muziekkaart met QR), praatplaat in klas (opdrachtkaart, pin + zoom, plek verzetten → terug naar podium met zelfde werk), nagebootste inlevering (versie 1 → wijziging → "lever versie 2 in", peer ontgrendeld, docentfeedback-stap), storyboard met strip, klascode-venster (onbekende code → melding), Engels. **Niet getest tegen de server:** echt inleveren, feedback klasgenoten (batch ophalen + sterren rechts), "Heb je een klascode?" met een echte klas |
| 21-10-2026 | 3.1–3.3 titelinstelling, Engelse data | 99fb476, 2b0e129 | tsc ✓ · 462 tests ✓ (5 nieuw) · lint ✓ · browser: klas met instelling uit → titel automatisch, kop alleen-lezen met slot, stap "Je docent kiest de titels automatisch". **Niet getest:** de schakelaar in ClassDetail (vraagt een docentlogin en de migratie) |
| 21-10-2026 | 4.1–4.3 live, leerlingcodes, Mijn soundscapes | 2a93811, e72b0f1, 2abd024 | tsc ✓ · 470 tests ✓ (8 nieuw) · build ✓ (main 791 → 820 kB) · PGlite: 037 + 038 ✓ · browser: melding bij andere opdracht, codeveld LK-4827 valt zonder migratie terug op "Code niet gevonden", Mijn soundscapes per klas met code. **Niet getest tegen de server:** leerlingcodes (vraagt migratie 038 en een docentlogin) |
