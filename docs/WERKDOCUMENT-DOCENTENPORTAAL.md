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
| 1 | Snelle reparaties: meervoud (`_plural` → `_one/_other`), dubbel getal op de klaskaart, label "Storyboard" bij praatplaat, label "Opdracht" → "Template", sorteren op inleveren, max-klassen (melding vast + teller) | ⏳ |
| 2 | Tijdlijn slepen met touch (`Playhead`) | ⏳ |
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
