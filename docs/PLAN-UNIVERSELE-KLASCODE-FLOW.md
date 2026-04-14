# Plan: Universele Klascode-flow

> Eén consistente flow voor template-, praatplaat- en toekomstige opdracht-typen.
> Leerling voert klascode in → werkt aan compositie → opslaan = inleveren.

## Huidige situatie (problemen)

| # | Probleem |
|---|---------|
| 1 | Template-flow verliest klascode na entry — geen auto-submit mogelijk |
| 2 | Praatplaat-flow heeft wél auto-submit, maar andere logica dan templates |
| 3 | "Inleveren bij docent" is een aparte handmatige flow die de klascode opnieuw vraagt |
| 4 | Bewaarcode + klascode kan dubbele submissions opleveren |
| 5 | Na browser-herstart is klascode-context weg — leerling kan niet updaten |
| 6 | Geen visuele indicator dat leerling in klascode-flow zit |
| 7 | Geen feedback of inlevering is gelukt/mislukt |
| 8 | Docent ziet niet bij welke opdracht een submission hoort |
| 9 | Geen assignment-geschiedenis per klas |

## Ontwerp

### Kernprincipe

**Eén submission per leerling per opdracht.** De eerste keer "Opslaan" maakt een submission aan (INSERT). Elke volgende keer "Opslaan" werkt dezelfde submission bij (UPDATE). Geen dubbele records.

### A. Klascode-context (appStore + localStorage)

**Nieuw in appStore:**
```typescript
// Klascode-sessie: gezet bij entry via ShareCodeInput
classSession: {
  classCode: string;      // 4-digit code
  classId: string;        // UUID van de klas
  className: string;      // Naam voor display
  assignmentType: 'template' | 'praatplaat';
  assignmentId: string;   // template_id of praatplaat_id
  assignmentName: string; // Voor display
} | null;

// Submission tracking
submissionId: string | null;       // UUID na eerste succesvolle submit
submissionSynced: boolean;         // true = server heeft laatste versie
```

**Persistentie:** `classSession` + `submissionId` worden opgeslagen als onderdeel van `SavedComposition` in localStorage (via `storageService`). Wanneer een leerling een compositie heropent vanuit "Mijn composities", wordt de context hersteld en verschijnt de ClassSessionBadge weer.

**Reset:** `goToStart()` wist `classSession`, `submissionId` en `submissionSynced`.

**SaveOnlineInfo wissen:** Bij het instellen van `classSession` wordt bestaande `saveOnlineInfo` in localStorage expliciet gewist. Dit voorkomt data-corruptie waarbij een bewaarcode-compositie onbedoeld wordt overschreven met template-data (zie R10).

### B. Visuele indicator

**Studio + Stage header:** Kleine badge zichtbaar wanneer `classSession` actief is:

```
┌─────────────────────────────────────┐
│ Studio              [Klas: Groep 5] │
│                      code: 4821     │
└─────────────────────────────────────┘
```

Subtiel, niet-klikbaar, slateblauw achtergrond. Toont klasnaam + code zodat de leerling weet waar het werk naartoe gaat. Zichtbaar in zowel studio als stage — ook na heropenen vanuit "Mijn composities".

### C. Universele auto-submit in useStageSave

**Bij "Opslaan" (performSave):**

```
0. Check isSubmitting lock → als true: alleen lokaal opslaan, skip submit
   (voorkomt dubbele submissions bij rapid-fire clicks)

1. Lokaal opslaan (altijd, zoals nu)

2. Als classSession actief:
   a. Eerste keer (submissionId === null):
      → Zet isSubmitting = true
      → submit_or_update_composition(classCode, compositionData, clientId, ...)
      → Retourneert submissionId
      → Sla submissionId op in appStore + localStorage
      → Toon feedback: "Ingeleverd bij [klasnaam]" (groen)
      → Zet isSubmitting = false

   b. Volgende keren (submissionId !== null):
      → Zet isSubmitting = true
      → submit_or_update_composition(classCode, compositionData, submissionId, ...)
      → Toon feedback: "Bijgewerkt bij [klasnaam]" (groen)
      → Zet isSubmitting = false

   c. Bij fout:
      → Toon feedback: "Inleveren mislukt — wordt opnieuw geprobeerd" (rood)
      → submissionSynced = false
      → isSubmitting = false
      → Bij volgende "Opslaan" opnieuw proberen

3. Als GEEN classSession maar WEL saveOnlineInfo (bewaarcode):
   → Bewaarcode-sync zoals nu (fire-and-forget)

4. Praatplaat-positie:
   → Als classSession.assignmentType === 'praatplaat':
     positie (x,y) wordt meegestuurd in submit_or_update_composition
   → Geen aparte submitPraatplaatComposition meer nodig
```

**Belangrijk:** Bewaarcode en klascode-submit zijn NIET tegelijk actief. Bij classSession: bewaarcode-mechanisme is uitgeschakeld, "Online bewaren" knop verborgen.

### D. Nieuwe Supabase RPC: submit_or_update_composition

```sql
CREATE FUNCTION submit_or_update_composition(
  p_class_code TEXT,
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB,
  p_client_id UUID DEFAULT NULL,         -- Client-gegenereerde UUID voor idempotency
  p_assignment_id UUID DEFAULT NULL,     -- template_id of praatplaat_id
  p_assignment_type TEXT DEFAULT NULL,    -- 'template' of 'praatplaat'
  p_praatplaat_position_x REAL DEFAULT NULL,
  p_praatplaat_position_y REAL DEFAULT NULL
)
RETURNS UUID  -- submission ID
```

**Gedrag:**
- `p_client_id` → Client genereert een UUID bij eerste submit. Server doet `INSERT ... ON CONFLICT (id) DO UPDATE`. Dit maakt de operatie **idempotent**: als de response verloren gaat maar de INSERT slaagde, stuurt de client dezelfde UUID opnieuw en krijgt een UPDATE in plaats van een duplicate (zie R13).
- Retourneert altijd de submission UUID.
- Praatplaat-positie wordt meteen meegenomen (geen aparte RPC nodig).
- Rate limit: max 30 per minuut per class_code.

### E. Nieuwe kolommen op submissions: assignment tracking

```sql
ALTER TABLE submissions
  ADD COLUMN assignment_id UUID,       -- template_id of praatplaat_id
  ADD COLUMN assignment_type TEXT;      -- 'template' of 'praatplaat'
```

Hierdoor kan de docent zien bij welke opdracht een submission hoort. In de UI: klein badge/icoon op de SubmissionCard.

**Let op:** `assignment_id` is puur voor labeling/groepering. Filtering in de klas blijft altijd op `class_id`. Als dezelfde praatplaat in twee klassen wordt gebruikt, worden de submissions gescheiden gehouden via `class_id` (zie R11).

### F. Praatplaat: meerdere spots = meerdere composities

Huidige flow: één praatplaat-submission per "sessie" (via `praatplaatSubmitted` flag).

**Gewenste flow:** Een leerling kan meerdere spots vullen, maar elke spot krijgt een EIGEN compositie. "Nieuw spotje" moet:
1. De huidige compositie opslaan + submitten (als dat nog niet was gedaan)
2. De timeline + library resetten (lege compositie)
3. `submissionId` resetten (null) → volgende "Opslaan" maakt een NIEUWE submission
4. Teruggaan naar praatplaat-select voor nieuwe positie

Dit voorkomt dat dezelfde compositie op meerdere spots staat. Elke spot = verse start.

### G. "Inleveren bij docent" + "Online bewaren" in StageActionsModal

**Als `classSession` actief:**
- Verberg "Inleveren bij docent" (auto-submit regelt het)
- Verberg "Online bewaren" (klascode-submit is het enige mechanisme)
- Optioneel: toon in plaats daarvan een statusindicator "Ingeleverd bij [klasnaam]"

**Als GEEN `classSession`:**
- Toon alle knoppen zoals nu — de handmatige flow blijft als fallback
- Dit is het geval bij vrije composities en bij 8-karakter template-codes (zonder klas)

### H. Assignment-geschiedenis per klas (docent-zijde)

**Database:** `class_assignments` behoudt ALLE koppelingen (niet alleen de actieve). Bij activeren van een nieuwe opdracht: zet de vorige op `is_active = false`, maar verwijder niet.

**ClassDetail UI:**
```
┌──────────────────────────────────────────┐
│ Actieve opdracht                          │
│ [Praatplaat B] ● Actief  [Open] [Wijzig] │
├──────────────────────────────────────────┤
│ Eerdere opdrachten                        │
│ [Template A]  · 12 composities  [Bekijk] │
│ [Praatplaat C] · 5 composities  [Bekijk] │
└──────────────────────────────────────────┘
```

Submissions worden gegroepeerd per assignment (via `assignment_id` kolom). Klikken op een eerdere opdracht toont de submissions ervan.

### I. CompositionsView: classSession herstellen

Wanneer een leerling een compositie opent vanuit "Mijn composities" (`handleOpenComposition`), moet naast timeline + library ook de `classSession` + `submissionId` worden hersteld vanuit de `SavedComposition`. Dit zorgt ervoor dat:
- De ClassSessionBadge weer verschijnt
- "Opslaan" de bestaande submission update (niet een nieuwe maakt)
- De leerling weet dat het werk naar de klas gaat

### J. Verwijder-waarschuwing voor actieve opdrachten

Wanneer een docent een praatplaat of template verwijdert die actief is in een of meer klassen, moet de bevestigingsmodal dit vermelden:
- "Deze praatplaat is actief in klas [naam]. X composities worden ook verwijderd."
- Vereist een check: is dit assignment gekoppeld aan een `class_assignments` record?

## Risico-analyse

### R1: Context-persistentie na herstart (H1, H8)

**Risico:** Leerling sluit browser, opent app later, laadt compositie uit "Mijn composities" — classSession is weg.

**Oplossing:** `classSession` + `submissionId` worden opgeslagen als onderdeel van `SavedComposition` in localStorage. Bij het openen wordt de context hersteld.

**Edge case:** Klas inmiddels verwijderd? De update-RPC faalt graceful (log warning, melding "Klas niet meer gevonden", lokale opslag werkt gewoon door).

### R2: Meerdere spots met verschillende composities (H2)

**Risico:** Leerling plaatst dezelfde compositie op meerdere spots.

**Oplossing:** "Nieuw spotje" reset timeline + library + submissionId. Elke spot begint met een lege compositie.

### R3: Bewaarcode + klascode conflict (H3, H15)

**Risico:** Een submission kan niet twee mechanismes tegelijk gebruiken.

**Oplossing:** In de klascode-flow wordt het bewaarcode-systeem NIET gebruikt. "Online bewaren" is verborgen. Er is geen bewaarcode nodig — de compositie wordt al automatisch bijgehouden via de klascode-submit.

### R4: Reset bij klas-wissel (H4)

**Risico:** Leerling gaat terug naar start, voert andere klascode in — oude context hangt nog.

**Oplossing:** `goToStart()` reset alle klascode-gerelateerde state (classSession, submissionId, submissionSynced).

### R5: Opdracht-herkomst op submissions (H5)

**Risico:** Docent ziet submissions maar weet niet van welke opdracht ze komen.

**Oplossing:** `assignment_id` + `assignment_type` op submissions. SubmissionCard toont klein badge:
- Template: bestandsicoon + template-naam
- Praatplaat: pin-icoon + praatplaat-naam
- Vrij (geen assignment): geen badge

### R6: Feedback bij offline submit (H6)

**Risico:** Submit faalt maar leerling weet het niet.

**Oplossing:** Niet meer fire-and-forget. Toast/banner na submit:
- Succes: "Ingeleverd bij [klasnaam]" (groen, verdwijnt na 3s)
- Mislukt: "Inleveren mislukt — wordt opnieuw geprobeerd bij volgende opslaan" (rood, blijft tot dismissed)

`submissionSynced` houdt de status bij. Retry bij volgende "Opslaan".

### R7: Handmatige inlevering als fallback (H7, H16)

**Risico:** Leerling zonder klascode-context kan niet inleveren.

**Oplossing:** "Inleveren bij docent" blijft beschikbaar wanneer er GEEN `classSession` is. Dit geldt ook voor composities geladen via 8-karakter template-code (zonder klas).

### R8: Gedeeld apparaat (H9)

**Risico:** Leerling B opent compositie van leerling A vanuit "Mijn composities" en overschrijft diens submission.

**Oplossing:** Als een compositie met classSession wordt geopend, toon de studentnaam (indien beschikbaar) in de ClassSessionBadge. De leerling ziet "Klas: Groep 5 — door [naam]". Dit maakt duidelijk van wie het werk is. Geen harde blokkade — op een gedeeld apparaat is dit een acceptabel risico. Eventueel later: bevestigingsdialoog.

### R9: Rapid-fire saves → dubbele submissions (H10)

**Risico:** Meerdere snelle kliks op "Opslaan" voor de eerste response terug is → meerdere INSERTs.

**Oplossing:** `isSubmitting` lock in useStageSave. Zolang een submit in flight is: lokaal opslaan gaat door, maar submit wordt overgeslagen. Gecombineerd met client-UUID + UPSERT (R13) als extra vangnet.

### R10: SaveOnlineInfo data-corruptie (H15)

**Risico:** `saveOnlineInfo` van een vorige bewaarcode-sessie staat nog in localStorage. Bij opslaan in klascode-flow wordt de oude bewaarcode-compositie overschreven met nieuwe data.

**Oplossing:** Bij het instellen van `classSession` (in ShareCodeInput/compositionInit) wordt `saveOnlineInfo` expliciet gewist via `storageService.clearSaveOnlineInfo()`. De twee systemen zijn exclusief.

### R11: Dashboard vs. klas: praatplaat submissions filteren (H11)

**Risico:** Dezelfde praatplaat in twee klassen → submissions door elkaar.

**Oplossing:** `assignment_id` is puur label. Filtering is ALTIJD op `class_id`. Dashboard = geen submissions (preview only). Klas = submissions gefilterd op class_id. Dit is al zo en verandert niet.

### R12: Verwijderde opdracht terwijl leerlingen bezig zijn (H14)

**Risico:** Docent verwijdert actieve opdracht. Leerlingen met geladen template/praatplaat kunnen niet meer submitten.

**Oplossing:** Submit-RPC faalt graceful. Leerling krijgt melding "Inleveren mislukt". Lokale opslag werkt door. Verwijder-bevestiging in dashboard vermeldt als opdracht actief is in een klas + hoeveel composities worden verwijderd.

### R13: Submit-response verloren — race condition (H17)

**Risico:** Server verwerkt INSERT, maar response komt niet terug. Client retried met `submissionId = null` → dubbele submission.

**Oplossing:** Client genereert een UUID (`p_client_id`) bij eerste submit. Server doet `INSERT ... ON CONFLICT (id) DO UPDATE`. Bij retry stuurt de client dezelfde UUID → UPDATE in plaats van INSERT. Idempotent.

### R14: Template zonder thema-context (H13)

**Risico:** `initializeFromTemplate()` zet themaStore niet. Bij heropenen mist locatie-info in UI.

**Impact:** Laag. Samples spelen af ongeacht thema. UI-labels kunnen afwijken maar functionaliteit werkt. Niet in scope voor deze iteratie.

## Implementatie-volgorde

| Stap | Wat | Ernst | Geschatte omvang |
|------|-----|-------|-----------------|
| 1 | DB: `assignment_id` + `assignment_type` kolommen op submissions | Must | Migratie |
| 2 | DB: `submit_or_update_composition` RPC (met UPSERT) | Must | Migratie |
| 3 | AppStore: `classSession` + `submissionId` + `submissionSynced` + `isSubmitting` | Must | Klein |
| 4 | ShareCodeInput: sla classSession op bij entry + wis saveOnlineInfo | Must | Klein |
| 5 | compositionInit: geef classSession door in template-flow | Must | Klein |
| 6 | StorageService + types: persisteer classSession + submissionId bij compositie | Must | Klein |
| 7 | CompositionsView: herstel classSession bij openen bestaande compositie | Must | Klein |
| 8 | useStageSave: universele auto-submit logica + isSubmitting lock | Must | Kernwijziging |
| 9 | UI: ClassSessionBadge component (studio + stage header) | Must | Klein |
| 10 | UI: Submit feedback toast/banner (succes/mislukt) | Must | Klein |
| 11 | UI: Verberg "Inleveren bij docent" + "Online bewaren" in klascode-flow | Must | Klein |
| 12 | UI: SubmissionCard assignment badge (type + naam) | Should | Klein |
| 13 | UI: ClassDetail assignment-geschiedenis (eerdere opdrachten) | Should | Medium |
| 14 | Praatplaat "Nieuw spotje": reset timeline + submissionId | Should | Klein |
| 15 | Verwijder-waarschuwing voor actieve opdrachten | Should | Klein |
| 16 | Testen: alle hypothese-casussen doorlopen | Must | Kritiek |

## Niet in scope (later)

- Soft-delete / prullenbak (bewust uitgesteld)
- Notificaties aan docent bij nieuwe submission
- Real-time updates in docenten dashboard (polling is voldoende)
- Bewaarcode integratie met klascode-flow (bewust gescheiden gehouden)
- Session recovery na browser-crash (bestaand probleem, niet specifiek voor deze feature)
- Bevestigingsdialoog bij gedeeld apparaat (laag risico)
- Thema-context bij template-initialisatie (latent bug, niet-kritiek)

## Hypotheses (test-casussen)

Alle 17 hypotheses staan gedocumenteerd in de chat-geschiedenis. Samengevat:

| H# | Casus | Gedekt door |
|----|-------|-------------|
| H1 | Leerling heropent compositie na herstart | R1, stap 6+7 |
| H2 | Praatplaat meerdere spots | R2, stap 14 |
| H3 | Bewaarcode + klascode tegelijk | R3+R10, stap 4 |
| H4 | Leerling wisselt van klas | R4, stap 3 |
| H5 | Docent wisselt opdracht terwijl leerlingen bezig zijn | R12, stap 15 |
| H6 | Leerling offline bij opslaan | R6, stap 10 |
| H7 | Vrije compositie inleveren bij docent | R7, stap 11 |
| H8 | Oude compositie openen vanuit "Mijn composities" | R1, stap 7 |
| H9 | Gedeelde iPad — twee leerlingen | R8 |
| H10 | Rapid-fire saves | R9, stap 8 |
| H11 | Praatplaat in meerdere klassen | R11 |
| H12 | Navigatie studio → map → terug | Geen actie (bestaand) |
| H13 | Template met libraryLocked | R14 (later) |
| H14 | Docent verwijdert actieve opdracht | R12, stap 15 |
| H15 | Bewaarcode data-corruptie | R10, stap 4 |
| H16 | 8-karakter template-code (zonder klas) | R7, stap 11 |
| H17 | Submit-response verloren | R13, stap 2 |
