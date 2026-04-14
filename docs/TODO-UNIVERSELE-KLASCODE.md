# TODO: Universele Klascode-flow

> Implementatie-checklist bij `docs/PLAN-UNIVERSELE-KLASCODE-FLOW.md`
> Elke stap bevat **wat**, **waarom** en **welke bestanden** geraakt worden.

---

## Fase 1 — Database & backend (eerst uitvoeren, alles hangt hiervan af)

### 1. Migratie: `assignment_id` + `assignment_type` op submissions
- [x] `supabase/migrations/010_submission_assignment_tracking.sql`
- **Wat:** Twee nieuwe kolommen op `submissions`: `assignment_id UUID`, `assignment_type TEXT`.
- **Waarom:** Docent moet zien bij welke opdracht (template/praatplaat) een submission hoort. Zonder dit zijn submissions niet te groeperen per opdracht.
- **Risico's gedekt:** R5 (opdracht-herkomst), H5 (docent ziet badge)
- **Bestanden:** Alleen migratie-SQL

### 2. Migratie: `submit_or_update_composition` RPC
- [x] `supabase/migrations/011_submit_or_update_rpc.sql`
- **Wat:** Nieuwe UPSERT-functie die INSERT doet bij eerste submit (met client-UUID) en UPDATE bij volgende keren. Vervangt de losse `submit_composition` + `submitPraatplaatComposition` calls.
- **Waarom:** Eén submission per leerling per opdracht. Idempotent door `ON CONFLICT (id) DO UPDATE`. Praatplaat-positie zit er meteen in.
- **Parameters:** `p_class_code`, `p_student_name`, `p_composition_name`, `p_composition_data`, `p_client_id UUID`, `p_assignment_id UUID`, `p_assignment_type TEXT`, `p_praatplaat_position_x REAL`, `p_praatplaat_position_y REAL`
- **Risico's gedekt:** R9 (rapid-fire), R13 (response verloren → idempotent), H10, H17
- **Bestanden:** Migratie-SQL + `src/lib/submissions.ts` (nieuwe client-functie)

---

## Fase 2 — State management (fundament voor alle UI-wijzigingen)

### 3. AppStore: classSession + submissionId + submissionSynced + isSubmitting
- [x] `src/stores/appStore.ts`
- **Wat:** Vier nieuwe velden in appStore:
  - `classSession: { classCode, classId, className, assignmentType, assignmentId, assignmentName } | null`
  - `submissionId: string | null`
  - `submissionSynced: boolean`
  - `isSubmitting: boolean`
- **Waarom:** Klascode-context moet de hele sessie meegaan (studio → stage → heropenen). Zonder dit verliest de app de context en kan auto-submit niet werken.
- **Reset:** `goToStart()` wist alle vier.
- **Risico's gedekt:** R1 (persistentie), R4 (klas-wissel), R9 (lock)
- **Bestanden:** `src/stores/appStore.ts`

### 4. ShareCodeInput: classSession opslaan bij entry + saveOnlineInfo wissen
- [x] `src/components/share/ShareCodeInput.tsx`
- **Wat:** Na succesvolle 4-digit klascode-validatie: vul `classSession` in appStore met alle klas- en opdracht-info. Wis `saveOnlineInfo` uit localStorage.
- **Waarom:** Dit is het startpunt van de klascode-flow. Alles daarna leunt op deze context. SaveOnlineInfo wissen voorkomt dat een oude bewaarcode-compositie per ongeluk wordt overschreven.
- **Risico's gedekt:** R3 (bewaarcode conflict), R10 (data-corruptie), H3, H15
- **Bestanden:** `src/components/share/ShareCodeInput.tsx`, `src/services/StorageService.ts`

### 5. compositionInit: classSession doorgeven in template-flow
- [x] `src/utils/compositionInit.ts` — Niet nodig: classSession wordt al gezet in ShareCodeInput vóór initializeFromTemplate()
- **Wat:** `initializeFromTemplate()` krijgt optioneel `classSession` parameter. Als aanwezig: zet in appStore.
- **Waarom:** Huidige template-flow verliest de klascode na entry. Dit is het kernprobleem dat deze hele refactor motiveert.
- **Risico's gedekt:** R1, H1
- **Bestanden:** `src/utils/compositionInit.ts`

### 6. StorageService + types: classSession + submissionId persisteren bij compositie
- [x] `src/types/index.ts` — `SavedComposition` interface uitbreiden
- [x] `src/services/StorageService.ts` — serialisatie/deserialisatie
- **Wat:** `SavedComposition` krijgt optionele velden: `classSession` + `submissionId`. Bij lokaal opslaan worden deze mee geserialiseerd.
- **Waarom:** Na browser-herstart en heropenen vanuit "Mijn composities" moet de context hersteld worden.
- **Risico's gedekt:** R1 (persistentie na herstart), H1, H8
- **Bestanden:** `src/types/index.ts`, `src/services/StorageService.ts`, `src/hooks/useStageSave.ts`

### 7. CompositionsView: classSession herstellen bij openen
- [x] `src/components/compositions/CompositionsView.tsx`
- **Wat:** `handleOpenComposition` herstelt `classSession` + `submissionId` vanuit `SavedComposition` naar appStore.
- **Waarom:** Zonder dit verliest een heropende compositie de klas-context: badge verdwijnt, opslaan maakt een nieuwe submission i.p.v. update.
- **Risico's gedekt:** R1, H8 (oude compositie openen)
- **Bestanden:** `src/components/compositions/CompositionsView.tsx`

---

## Fase 3 — Kernlogica (de belangrijkste wijziging)

### 8. useStageSave: universele auto-submit + isSubmitting lock
- [x] `src/hooks/useStageSave.ts`
- **Wat:** Herschrijf `performSave`:
  1. Lokaal opslaan (altijd)
  2. Als `classSession` actief:
     - Check `isSubmitting` lock
     - Eerste keer (`submissionId === null`): genereer client-UUID, call `submit_or_update_composition`, sla `submissionId` op
     - Volgende keren: call met bestaande `submissionId`
     - Succes → `submissionSynced = true` + groene feedback
     - Fout → `submissionSynced = false` + rode feedback + retry bij volgende save
  3. Geen classSession + wel saveOnlineInfo: bewaarcode-sync (ongewijzigd)
  4. Praatplaat-positie meesturen als `assignmentType === 'praatplaat'`
- **Waarom:** Dit is het hart van de universele flow. Eén codepath voor template, praatplaat en toekomstige types.
- **Risico's gedekt:** R3, R6, R9, R13, H3, H6, H10, H17
- **Bestanden:** `src/hooks/useStageSave.ts`, `src/lib/submissions.ts`

---

## Fase 4 — UI-componenten

### 9. ClassSessionBadge component (studio + stage header)
- [x] `src/components/ui/ClassSessionBadge.tsx` (nieuw)
- [x] Integreren in `StudioView.tsx` + `StageView.tsx`
- **Wat:** Kleine badge "Klas: [naam] · code: [1234]" in de header. Subtiel, niet-klikbaar, slateblauw.
- **Waarom:** Leerling moet weten dat het werk naar een klas gaat. Zonder visuele indicator denkt de leerling dat het lokaal is.
- **Risico's gedekt:** R8 (gedeeld apparaat — toont naam), H7 (zichtbare context)
- **Bestanden:** Nieuw component + `StudioView.tsx`, `StageView.tsx`

### 10. Submit feedback toast/banner
- [x] `src/components/ui/SubmitFeedback.tsx` (nieuw) of bestaand toast-systeem
- [x] Integreren in `StageView.tsx`
- **Wat:** Na elke auto-submit: korte melding.
  - Succes: "Ingeleverd bij [klasnaam]" (groen, 3s)
  - Mislukt: "Inleveren mislukt — wordt opnieuw geprobeerd" (rood, blijft)
- **Waarom:** Fire-and-forget is niet acceptabel bij klascode-flow. Leerling MOET weten of het gelukt is.
- **Risico's gedekt:** R6 (offline feedback), H6
- **Bestanden:** Nieuw component + `StageView.tsx`

### 11. StageActionsModal: knoppen verbergen in klascode-flow
- [x] `src/components/stage/StageActionsModal.tsx`
- **Wat:** Als `classSession` actief: verberg "Inleveren bij docent" en "Online bewaren". Optioneel: toon "Ingeleverd bij [klasnaam]" statusregel.
- **Waarom:** Deze handmatige flows zijn overbodig in klascode-flow en verwarren de leerling.
- **Als GEEN classSession:** alle knoppen blijven zichtbaar (fallback voor vrije composities en 8-karakter codes).
- **Risico's gedekt:** R7 (fallback), H7, H16
- **Bestanden:** `StageActionsModal.tsx`

### 12. SubmissionCard: assignment badge
- [x] `src/components/teacher/SubmissionCard.tsx`
- **Wat:** Klein badge/icoon op elke submission:
  - Template: 📄 + template-naam
  - Praatplaat: 📍 + praatplaat-naam
  - Vrij (geen assignment): geen badge
- **Waarom:** Docent kan in één oogopslag zien bij welke opdracht een compositie hoort.
- **Risico's gedekt:** R5, H5
- **Bestanden:** `SubmissionCard.tsx`, eventueel `useSubmissions.ts` (assignment-naam ophalen)

### 13. ClassDetail: assignment-geschiedenis
- [x] `src/components/teacher/ClassDetail.tsx`
- **Wat:** Onder "Actieve opdracht" een sectie "Eerdere opdrachten" met lijst van gedeactiveerde assignments. Elke entry toont naam, type, aantal submissions, en een "Bekijk" knop.
- **Waarom:** Docent moet oudere opdrachten en hun submissions kunnen bekijken zonder opnieuw te activeren.
- **Risico's gedekt:** Sectie H in plan, H5
- **Bestanden:** `ClassDetail.tsx`, eventueel `src/hooks/useClassAssignment.ts`

---

## Fase 5 — Praatplaat-specifiek

### 14. Praatplaat "Nieuw spotje": reset flow
- [x] `src/components/stage/StageView.tsx` (of nieuw component)
- **Wat:** Knop "Nieuw spotje" (alleen zichtbaar bij praatplaat-flow):
  1. Huidige compositie opslaan + submitten
  2. Timeline + library resetten
  3. `submissionId` resetten → volgende save maakt NIEUWE submission
  4. Terug naar praatplaat-select voor nieuwe positie
- **Waarom:** Leerling moet meerdere spots kunnen vullen met VERSCHILLENDE composities. Zonder reset wordt dezelfde compositie overschreven.
- **Risico's gedekt:** R2, H2
- **Bestanden:** `StageView.tsx`, `src/stores/appStore.ts`, `src/stores/timelineStore.ts`

---

## Fase 6 — Veiligheidsmaatregelen

### 15. Verwijder-waarschuwing voor actieve opdrachten
- [x] `src/components/teacher/TeacherDashboard.tsx`
- [x] `src/components/teacher/ClassDetail.tsx` (bij klas-verwijdering)
- **Wat:** Bij verwijderen van een praatplaat/template die actief is in een klas: waarschuwing met klas-naam + aantal submissions dat mee verwijderd wordt.
- **Waarom:** CASCADE delete verwijdert alles. Docent moet weten wat de impact is.
- **Risico's gedekt:** R12, H14
- **Bestanden:** Dashboard + ClassDetail, eventueel `src/lib/praatplaat.ts` of `src/lib/assignments.ts` (check actief)

---

## Fase 7 — Testen

### 16. Alle hypothese-casussen doorlopen
- [ ] H1: Compositie heropenen na herstart → classSession hersteld
- [ ] H2: Praatplaat meerdere spots → elk spot = nieuwe compositie
- [ ] H3: Bewaarcode + klascode mogen niet samengaan
- [ ] H4: Terug naar start → klas-wissel → oude context weg
- [ ] H5: Submission toont assignment badge in docenten dashboard
- [ ] H6: Opslaan bij netwerkfout → foutmelding + retry
- [ ] H7: Vrije compositie → handmatige inlevering nog beschikbaar
- [ ] H8: Oude compositie uit "Mijn composities" → context hersteld
- [ ] H9: Gedeeld apparaat → studentnaam zichtbaar in badge
- [ ] H10: 5x snel opslaan → slechts 1 submission
- [ ] H11: Praatplaat in 2 klassen → submissions apart per klas
- [ ] H12: Navigatie studio → map → terug → geen crash
- [ ] H13: Template met libraryLocked → (later, niet in scope)
- [ ] H14: Docent verwijdert actieve opdracht → leerling krijgt melding
- [ ] H15: SaveOnlineInfo wordt gewist bij klascode-entry
- [ ] H16: 8-karakter code (zonder klas) → handmatige flow werkt
- [ ] H17: Response verloren → retry met zelfde UUID → geen dubbel

---

## i18n sleutels (doorlopend)

Nieuwe vertaalsleutels die nodig zijn (toevoegen aan `src/i18n/locales/{nl,en}.json`):

| Sleutel | NL | EN |
|---------|----|----|
| `classSession.badge` | `Klas: {{name}}` | `Class: {{name}}` |
| `classSession.code` | `code: {{code}}` | `code: {{code}}` |
| `submit.success` | `Ingeleverd bij {{className}}` | `Submitted to {{className}}` |
| `submit.updated` | `Bijgewerkt bij {{className}}` | `Updated at {{className}}` |
| `submit.failed` | `Inleveren mislukt — wordt opnieuw geprobeerd` | `Submission failed — will retry` |
| `submit.classGone` | `Klas niet meer gevonden` | `Class no longer found` |
| `assignments.previousTitle` | `Eerdere opdrachten` | `Previous assignments` |
| `assignments.viewSubmissions` | `Bekijk` | `View` |
| `assignments.submissionCount` | `{{count}} composities` | `{{count}} compositions` |
| `stage.newSpot` | `Nieuw spotje` | `New spot` |
| `submission.fromTemplate` | `Opdracht: {{name}}` | `Assignment: {{name}}` |
| `submission.fromPraatplaat` | `Praatplaat: {{name}}` | `Sound map: {{name}}` |

---

## Volgorde-advies

**Kritiek pad:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 16

Stappen 12–15 zijn "should" en kunnen parallel of erna.

**Publicatie-strategie:** Na stap 11 is de kernflow werkend en testbaar. Stappen 12–15 zijn verbeteringen die later kunnen.
