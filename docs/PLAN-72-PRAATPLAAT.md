# Plan #72 — Praatplaat: Collaboratieve Klankkaart

**Status:** Plan klaar — wacht op goedkeuring
**Datum:** 2026-03-25
**Geschatte effort:** 16-24 uur (4-5 fasen)

---

## Samenvatting

De praatplaat is een klassikale activiteit waarbij leerlingen individueel een compositie/soundscape maken en die koppelen aan een specifieke plek (X,Y-positie) op een gedeelde afbeelding. De docent opent de praatplaat op het digibord en ziet iconen verschijnen op plekken waar leerlingen composities aan hebben gekoppeld. Door op een icoon te klikken speelt de compositie van die leerling af. Optioneel kan de docent de volledige timeline bekijken.

De praatplaat-flow is een **los pad** naast de bestaande compositie-modi (Vrij / Bij een afbeelding / Storyboard). De leerling komt erin via de klascode — als er een actieve praatplaat is, wordt de leerling direct naar de praatplaat-flow gestuurd, net als bij templates. De bestaande modus "Bij een afbeelding" blijft ongewijzigd voor individueel gebruik.

---

## UX-besluit: praatplaat als los pad (Hypothese C)

### Probleemstelling

De bestaande modus "Bij een afbeelding" op het `ComposeModeScreen` en de praatplaat gebruiken beide locatie-afbeeldingen als visuele context voor het componeren. De vraag was: moeten we deze twee samenvoegen, of als aparte paden behandelen?

### Overwogen hypotheses

| Hypothese | Aanpak | Afgewezen omdat |
|-----------|--------|-----------------|
| **A** | Praatplaat vervangt "Bij een afbeelding" wanneer klascode actief is | Verwarrend: dezelfde knop doet soms iets anders. Klascode moet al vóór het moduscherm ingevuld zijn |
| **B** | Praatplaat als vierde modus-kaart op ComposeModeScreen | Vier kaarten schaalt niet, mobiel wordt druk. Klascode moet al op startscherm ingevuld zijn |
| **C** ✅ | Praatplaat als eigen ingang, los van moduscherm | Gekozen — zie hieronder |
| **D** | "Bij een afbeelding" IS altijd de praatplaat (positie-keuze verplicht) | Dwingt een interactie af die niet altijd gewenst is bij solo-gebruik |
| **E** | Klascode als mode-switcher die het moduscherm aanpast | Complexe contextuele logica, dezelfde kaart gedraagt zich anders |

### Waarom Hypothese C

De praatplaat is **docent-gestuurd**: de docent activeert een praatplaat, de leerling voert de klascode in en belandt direct in de praatplaat-flow. Dit past in het bestaande patroon van templates — code invoeren → de app stuurt de leerling het juiste pad in. Het kind hoeft niet te kiezen, de docent heeft al gekozen.

"Bij een afbeelding" blijft een aparte, individuele modus voor vrij gebruik zonder klascode.

### Code-overlap analyse

De twee paden zijn **gescheiden aan de randen maar delen de kern**:

| Laag | "Bij een afbeelding" | Praatplaat | Overlap? |
|------|---------------------|------------|----------|
| **Ingang** | ComposeModeScreen → kies locatie-kaart | Klascode → `getActivePraatplaat()` → PraatplaatSelectScreen | ❌ Geen |
| **Afbeelding-selectie UI** | `StoryboardCard`-grid met locatie-thumbnails | Fullscreen afbeelding met klik-om-positie | ❌ Geen |
| **Locatie-afbeeldingen** | Bestaande location images uit thema | Dezelfde afbeeldingen | ✅ Data gedeeld (geen code-duplicatie) |
| **Kaart → locaties → studio** | Bestaande flow | Bestaande flow | ✅ Volledig gedeeld |
| **Studio + timeline** | Bestaand, afbeelding boven timeline via `activeStoryboard` | Bestaand, eventueel ook via `activeStoryboard` | ✅ Volledig gedeeld |
| **Podium** | Lokaal opslaan | Auto-submit met positie | ❌ Verschilt (kleine toevoeging) |
| **Docenten-viewer** | N.v.t. | PraatplaatViewer (nieuw) | ❌ Geen equivalent |

**Conclusie:** Er is geen relevante code-duplicatie. De praatplaat-specifieke code (positie-selectie, auto-submit, viewer) heeft geen equivalent in de afbeelding-modus. Alle gedeelde infrastructuur (studio, audio, kaart) wordt al door alle modi gedeeld.

---

## Onderzoeksresultaten

### Hergebruik van bestaande systemen (~70%)

| Bestaand systeem | Hergebruik voor #72 | Bron |
|------------------|---------------------|------|
| **Hotspot X,Y-positionering** | Leerling klikt op afbeelding om positie te kiezen. Zelfde percentage-based positionering (0-100%) als hotspots | `LocationScene.tsx`, `Hotspot.tsx` |
| **Locatie-afbeeldingen** | Praatplaat-afbeeldingen = bestaande locatie background images (`/images/themes/{themeId}/{locationId}.jpg`) | `locations.ts`, `themeStore.ts` |
| **Klascode-systeem** | Docent koppelt praatplaat aan klas via bestaand class/code systeem | `classes` tabel, `useClasses` hook |
| **`submit_composition` flow** | Leerling submit compositie naar klas, nu met extra positie-metadata | `ShareWithTeacherModal`, `lib/submissions.ts` |
| **`SubmissionPlayer`** | Docent speelt individuele composities af via bestaande player (timeline-weergave) | `SubmissionPlayer.tsx` |
| **`ComposeModeScreen`** | Plek waar locatie-afbeeldingen al getoond worden als keuzekaarten (via `locationToStoryboard()`) | `ComposeModeScreen.tsx` |
| **`CompositionData` JSONB** | Compositiedata-structuur blijft identiek — geen schema-wijziging nodig | `types/index.ts` |
| **Rate limiting** | Hergebruik van `check_rate_limit()` voor praatplaat RPC functies | `002_rate_limiting.sql` |
| **RLS policies** | Zelfde patronen als `templates` en `submissions` tabellen | `schema.sql`, `templates.sql` |

### Onderzochte code-flows

**1. Code-invoer flow (StartScreen → ShareCodeInput)**

De `ShareCodeInput` component op het startscherm herkent codes op basis van lengte:
- 4 cijfers → klascode
- 6 alfanumeriek → bewaarcode (#52)
- 8 alfanumeriek → template of share code

Voor praatplaat voegen we een **nieuwe stap toe in de klascode-flow**: na het invoeren van een 4-cijferige klascode checkt de app of die klas een actieve praatplaat heeft. Zo ja → praatplaat-flow. Zo nee → bestaande submit-flow.

**2. Template-flow als referentiepatroon**

Templates werken via: code invoeren → `getTemplateByCode()` → `initializeFromTemplate()` → studio. De praatplaat volgt een vergelijkbaar patroon maar met een extra stap (positie kiezen) en een ander navigatiedoel (kaart i.p.v. studio):

```
Klascode invoeren → checkActivePraatplaat() → praatplaat-afbeelding tonen
→ positie kiezen → opslaan in store → kaart → studio → podium → auto-submit
```

**3. ComposeModeScreen architectuur**

Het moduscherm gebruikt al `locationToStoryboard()` om locatie-afbeeldingen als keuzekaarten te tonen. De `StoryboardCard` component (met cover image + titel) is direct herbruikbaar voor het tonen van de praatplaat-afbeelding voordat de leerling een positie kiest.

**4. Submission pipeline**

`submitComposition()` roept Supabase RPC `submit_composition` aan met `p_class_code`, `p_student_name`, `p_composition_name`, `p_composition_data`. Voor praatplaat breiden we dit uit met optionele `p_praatplaat_id`, `p_position_x`, `p_position_y` parameters.

**5. Docenten dashboard**

`ClassDetail` toont submissions per klas. `SubmissionPlayer` opent als modal met timeline + afspeel-functionaliteit. Voor praatplaat voegen we een `PraatplaatViewer` component toe naast de bestaande lijst-weergave.

---

## Database-ontwerp

### Nieuwe tabel: `public.praatplaten`

```sql
CREATE TABLE public.praatplaten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  theme_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Waarom een aparte tabel?**
- Praatplaat heeft eigen metadata (welke afbeelding, actief/inactief) die niet in `submissions` thuishoort
- Een docent kan meerdere praatplaten per klas hebben (maar slechts één actief)
- Archivering: oude praatplaten met hun composities blijven beschikbaar
- Scheiding van concerns: `submissions` wordt niet breder belast

**Kolommen:**
- `class_id` + `teacher_id`: dubbele referentie (RLS vereist teacher_id voor ownership check)
- `theme_id` + `location_id`: verwijzing naar thema-locatie voor afbeelding-resolutie
- `image_url`: directe URL naar de afbeelding (e.g. `/images/themes/basis/boerderij.jpg`)
- `is_active`: slechts één per klas actief (enforced via trigger)

### Nieuwe kolommen op `public.submissions`

```sql
ALTER TABLE public.submissions
  ADD COLUMN praatplaat_id UUID REFERENCES public.praatplaten(id) ON DELETE SET NULL,
  ADD COLUMN position_x REAL CHECK (position_x IS NULL OR (position_x >= 0 AND position_x <= 1)),
  ADD COLUMN position_y REAL CHECK (position_y IS NULL OR (position_y >= 0 AND position_y <= 1));
```

**Waarom op `submissions`?**
- Een praatplaat-compositie IS een submission — het is werk van een leerling, gekoppeld aan een klas
- De docent ziet het in het dashboard, kan het afspelen, kan het verwijderen
- Geen dubbele opslag nodig — alleen 3 extra nullable kolommen

### Constraint: één actieve praatplaat per klas

```sql
CREATE UNIQUE INDEX idx_praatplaten_active_per_class
  ON public.praatplaten (class_id)
  WHERE is_active = TRUE;
```

Dit is een partial unique index: er mag maximaal één rij met `is_active = TRUE` bestaan per `class_id`.

---

## Flows

### Flow A: Docent — praatplaat aanmaken

```
Docent Dashboard → Klas detail → [Nieuwe Praatplaat] knop
         ↓
CreatePraatplaatModal opent:
  ├─ Naam: [tekstveld, verplicht]
  ├─ Kies een locatie-afbeelding: [grid met locatie-thumbnails uit actief thema]
  └─ [Aanmaken] knop
         ↓
RPC: create_praatplaat(p_class_id, p_name, p_theme_id, p_location_id, p_image_url)
         ↓
Praatplaat verschijnt in lijst (inactief)
Docent klikt "Activeer" → RPC: activate_praatplaat(p_praatplaat_id)
  └─ Deactiveert automatisch de huidige actieve praatplaat van deze klas
```

### Flow B: Docent — praatplaat presenteren (viewer)

```
Docent Dashboard → Klas detail → praatplaat-kaart → [Bekijk] knop
         ↓
PraatplaatViewer opent (fullscreen):
  ├─ Achtergrondafbeelding vult scherm
  ├─ Iconen op X,Y-posities waar leerlingen submissions hebben
  │   ├─ Enkel icoon: luidspreker-symbool met initiaal
  │   └─ Meerdere op zelfde plek: luidspreker met getal (bijv. "3")
  ├─ Hover op icoon → naam leerling verschijnt
  ├─ Klik op icoon:
  │   ├─ Enkel: compositie speelt direct af
  │   └─ Meerdere: dropdown met namen → kies → speelt af
  ├─ Tijdens afspelen:
  │   ├─ Icoon pulseert/gloeit
  │   ├─ Subtiele balk onderin: naam + [Stop] + [Bekijk timeline]
  │   └─ [Bekijk timeline] opent bestaande SubmissionPlayer als overlay
  ├─ Klik op actief icoon → stop afspelen
  └─ [Sluiten] knop (kruisje rechtsboven)
```

### Flow C: Leerling — praatplaat-compositie maken

```
Startscherm → klascode invoeren (4 cijfers)
         ↓
ShareCodeInput herkent 4-cijferige code
         ↓
Nieuw: checkActivePraatplaat(classCode) via RPC
         ↓
┌─ Geen actieve praatplaat → bestaand gedrag (submit-flow later op podium)
└─ Wél actieve praatplaat:
         ↓
PraatplaatSelectScreen (nieuw scherm):
  ├─ Fullscreen afbeelding van de praatplaat
  ├─ Instructie: "Klik op een plek om geluid voor te maken"
  ├─ Bestaande spots van andere leerlingen zichtbaar (semi-transparant, niet klikbaar)
  ├─ Leerling klikt op lege plek → marker verschijnt
  ├─ Bevestigingsmoment: "Jij maakt geluid voor dit stukje!" met [Ga verder] knop
  └─ Positie + praatplaat_id opgeslagen in appStore
         ↓
Kaart (bestaand) → locaties verkennen → samples verzamelen
         ↓
Studio (bestaand) → componeren
         ↓
Podium → [Opslaan] → compositie submit naar klas
  ├─ Automatisch: praatplaat_id + position_x + position_y meegegeven
  ├─ Leerling hoeft NIET handmatig "Deel met docent" te kiezen
  └─ Submit gebeurt via aangepaste submitComposition() met extra velden
```

### Flow D: Leerling — feedback na submit

```
Podium → submit succesvol
         ↓
Succesbericht: "Je compositie staat op de praatplaat!"
  ├─ Optioneel: mini-preview van praatplaat met eigen marker highlighted
  └─ [Nieuw geluid maken] of [Terug naar start]
```

---

## Component-architectuur

### Nieuwe componenten

| Component | Locatie | Verantwoordelijkheid |
|-----------|---------|---------------------|
| `PraatplaatSelectScreen` | `src/components/praatplaat/PraatplaatSelectScreen.tsx` | Leerling kiest positie op afbeelding |
| `PraatplaatViewer` | `src/components/praatplaat/PraatplaatViewer.tsx` | Docent bekijkt praatplaat met iconen + afspelen |
| `PraatplaatSpot` | `src/components/praatplaat/PraatplaatSpot.tsx` | Individueel icoon op de praatplaat (hergebruikt positionerings-CSS van Hotspot) |
| `CreatePraatplaatModal` | `src/components/teacher/CreatePraatplaatModal.tsx` | Docent maakt nieuwe praatplaat aan |
| `PraatplaatCard` | `src/components/teacher/PraatplaatCard.tsx` | Praatplaat-kaart in docenten dashboard |

### Aangepaste bestaande componenten

| Component | Wijziging |
|-----------|-----------|
| `ShareCodeInput` | 4-cijferige codes: check eerst op actieve praatplaat |
| `ClassDetail` | Derde tab: "Praatplaat" met viewer-link + praatplaat-beheer |
| `appStore` | Nieuwe state: `activePraatplaat`, `praatplaatPosition` |
| `compositionInit.ts` | Nieuwe functie: `initializeFromPraatplaat()` |
| `StageView` / `useStageSave` | Detecteer praatplaat-context → auto-submit met positie |
| `App.tsx` | Nieuwe screen case: `'praatplaat-select'` |

### Nieuwe Zustand state (appStore)

```typescript
// Praatplaat context (set na klascode-check, cleared bij goToStart)
activePraatplaat: {
  id: string;
  name: string;
  imageUrl: string;
  classId: string;
  classCode: string;
} | null;

praatplaatPosition: {
  x: number;  // 0-1
  y: number;  // 0-1
} | null;

// Navigatie
goToPraatplaatSelect: () => void;  // → 'praatplaat-select' screen
```

---

## Database: RPC functies

### `create_praatplaat(p_class_id, p_teacher_id, p_name, p_theme_id, p_location_id, p_image_url)`

- Maakt nieuwe praatplaat aan (standaard `is_active = FALSE`)
- Valideert: class_id behoort tot teacher_id
- Rate limit: 10/min per teacher

### `activate_praatplaat(p_praatplaat_id)`

- Zet `is_active = TRUE` voor de gegeven praatplaat
- Zet `is_active = FALSE` voor alle andere praatplaten van dezelfde klas (via trigger of in functie)
- Valideert: alleen eigen praatplaten

### `deactivate_praatplaat(p_praatplaat_id)`

- Zet `is_active = FALSE`
- Valideert: alleen eigen praatplaten

### `delete_praatplaat(p_praatplaat_id)`

- Verwijdert praatplaat (submissions worden NIET verwijderd, `praatplaat_id` wordt NULL via ON DELETE SET NULL)
- Valideert: alleen eigen praatplaten

### `get_active_praatplaat(p_class_code)`

- Publieke functie (voor leerlingen)
- Zoekt klas op via code → checkt of er een actieve praatplaat is
- Returns: `{ praatplaat_id, name, image_url, theme_id, location_id }` of null
- Rate limit: 30/min per code

### `submit_praatplaat_composition(p_class_code, p_praatplaat_id, p_position_x, p_position_y, p_student_name, p_composition_name, p_composition_data)`

- Uitbreiding van `submit_composition` met positie-data
- Slaat op in `submissions` met `praatplaat_id`, `position_x`, `position_y`
- Rate limit: 60/min per class code (zelfde als bestaand)

### `get_praatplaat_submissions(p_praatplaat_id)`

- Voor docenten: haalt alle submissions op voor een specifieke praatplaat
- Returns: array met `{ id, student_name, composition_name, composition_data, position_x, position_y, created_at }`
- Gefilterd op teacher ownership via RLS

---

## RLS Policies

### Tabel `praatplaten`

```sql
-- Docenten kunnen eigen praatplaten lezen
CREATE POLICY praatplaten_select ON public.praatplaten
  FOR SELECT USING (auth.uid() = teacher_id);

-- Iedereen kan actieve praatplaten opvragen (via RPC, niet direct)
-- → Geen publieke SELECT policy, alleen via SECURITY DEFINER RPC

-- Docenten kunnen eigen praatplaten aanmaken
CREATE POLICY praatplaten_insert ON public.praatplaten
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- Docenten kunnen eigen praatplaten wijzigen
CREATE POLICY praatplaten_update ON public.praatplaten
  FOR UPDATE USING (auth.uid() = teacher_id);

-- Docenten kunnen eigen praatplaten verwijderen
CREATE POLICY praatplaten_delete ON public.praatplaten
  FOR DELETE USING (auth.uid() = teacher_id);
```

### Uitbreiding `submissions` policies

Bestaande policies hoeven niet te wijzigen — `praatplaat_id`, `position_x`, `position_y` zijn nullable kolommen die meegaan in de bestaande SELECT/INSERT/DELETE policies.

---

## i18n sleutels (NL + EN)

```json
{
  "praatplaat": {
    "title": "Praatplaat",
    "selectPosition": "Klik op een plek om geluid voor te maken",
    "confirmTitle": "Jij maakt geluid voor dit stukje!",
    "confirmButton": "Ga verder",
    "otherSpots": "{{count}} andere compositie(s) op deze plek",
    "submitSuccess": "Je compositie staat op de praatplaat!",
    "newSound": "Nog een geluid maken",
    "backToStart": "Terug naar start"
  },
  "teacher": {
    "praatplaat": {
      "title": "Praatplaten",
      "new": "Nieuwe Praatplaat",
      "chooseName": "Naam",
      "chooseNamePlaceholder": "Bijv. Geluiden op de boerderij",
      "chooseImage": "Kies een locatie-afbeelding",
      "create": "Aanmaken",
      "creating": "Aanmaken...",
      "activate": "Activeer",
      "deactivate": "Deactiveer",
      "active": "Actief",
      "inactive": "Inactief",
      "view": "Bekijk praatplaat",
      "deleteConfirm": "Weet je zeker dat je deze praatplaat wilt verwijderen? Composities van leerlingen blijven bewaard.",
      "submissions": "{{count}} compositie(s)",
      "emptyViewer": "Nog geen composities. Deel de klascode met je leerlingen!",
      "playerBar": "Bekijk timeline"
    }
  }
}
```

---

## Implementatieplan — Fasen

### Fase 1: Database + Server (2-3 uur)

**Doel:** Praatplaat-tabel, RPC functies, RLS policies.

1. SQL-migratie schrijven: `005_praatplaten.sql`
   - `praatplaten` tabel met alle kolommen, constraints en indices
   - Drie extra kolommen op `submissions`: `praatplaat_id`, `position_x`, `position_y`
   - Partial unique index voor één actieve praatplaat per klas
   - Trigger `enforce_single_active_praatplaat` (bij UPDATE naar `is_active = TRUE`)
   - RLS policies
   - RPC functies: `create_praatplaat`, `activate_praatplaat`, `deactivate_praatplaat`, `delete_praatplaat`, `get_active_praatplaat`, `submit_praatplaat_composition`, `get_praatplaat_submissions`
   - Rate limits voor publieke functies

2. Client-side lib functies: `src/lib/praatplaat.ts`
   - `createPraatplaat(params)` → returns praatplaat object
   - `activatePraatplaat(id)` → returns success
   - `deactivatePraatplaat(id)` → returns success
   - `deletePraatplaat(id)` → returns success
   - `getActivePraatplaat(classCode)` → returns praatplaat info of null
   - `submitPraatplaatComposition(params)` → returns submission id
   - `getPraatplaatSubmissions(praatplaatId)` → returns submissions array

3. TypeScript types uitbreiden: `src/types/index.ts`
   - `Praatplaat` interface
   - `PraatplaatPosition` interface
   - `'praatplaat-select'` toevoegen aan `GameScreen`
   - `Submission` interface uitbreiden met optionele `praatplaat_id`, `position_x`, `position_y`

### Fase 2: Docent — praatplaat beheren (3-4 uur)

**Doel:** Docent kan praatplaten aanmaken, activeren en verwijderen.

1. `usePraatplaten` hook: CRUD operaties (fetch, create, activate, deactivate, delete)
2. `CreatePraatplaatModal`: naam invoer + locatie-afbeelding grid (hergebruikt thumbnail-patroon van `StoryboardCard`)
3. `PraatplaatCard`: kaart in dashboard met naam, afbeelding-thumbnail, actief/inactief badge, toggle-knop, verwijder-knop, "Bekijk" knop
4. `ClassDetail` uitbreiden: praatplaat-sectie onder bestaande tabs (aparte sectie, niet als tab — praatplaten zijn een ander concept dan submissions)
5. i18n sleutels toevoegen (NL + EN)

### Fase 3: Leerling — positie kiezen (3-4 uur)

**Doel:** Leerling ziet de praatplaat en kiest een positie.

1. `appStore` uitbreiden: `activePraatplaat`, `praatplaatPosition`, `goToPraatplaatSelect()`
2. `ShareCodeInput` aanpassen: bij 4-cijferige klascode → `getActivePraatplaat(code)` aanroepen → als gevonden, praatplaat-flow starten
3. `PraatplaatSelectScreen` (nieuw scherm):
   - Fullscreen afbeelding (hergebruik 16:9 container-patroon van `LocationScene`)
   - Bestaande spots van andere leerlingen semi-transparant tonen (via `getPraatplaatSubmissions`)
   - Klik op afbeelding → marker op positie
   - Bevestigingsmoment met [Ga verder] knop
   - Navigeert naar `goToMap()` na bevestiging
4. `compositionInit.ts` uitbreiden: `initializeFromPraatplaat()` — zet thema, reset state, navigeer naar compose-mode of map
5. `App.tsx`: case `'praatplaat-select'` met lazy import
6. i18n sleutels

### Fase 4: Leerling — auto-submit op podium (2-3 uur)

**Doel:** Compositie wordt automatisch gekoppeld aan de praatplaat-positie bij het opslaan.

1. `StageView` / `useStageSave` aanpassen: detecteer `activePraatplaat` in appStore
   - Bij praatplaat-context: "Opslaan" knop roept `submitPraatplaatComposition()` aan i.p.v. lokaal opslaan
   - Alternatief: Opslaan doet lokaal + submit in één stap (zodat compositie ook lokaal bewaard is)
2. Success-feedback aanpassen: "Je compositie staat op de praatplaat!" in plaats van standaard save-bevestiging
3. Verberg irrelevante actieknoppen bij praatplaat-context (bijv. "Deel met docent" is overbodig want dat gebeurt automatisch)
4. Cleanup: `goToStart()` cleared `activePraatplaat` en `praatplaatPosition`

### Fase 5: Docent — praatplaat-viewer (4-5 uur)

**Doel:** Docent bekijkt de praatplaat met iconen en speelt composities af.

1. `PraatplaatViewer` component:
   - Fullscreen afbeelding met positioned iconen
   - `PraatplaatSpot` component: gepositioneerd via percentage (hergebruik CSS-patroon van `Hotspot.tsx`)
   - Meerdere submissions op dezelfde plek: icoon met getal + dropdown bij klik
   - Hover → naam tonen
   - Klik → afspelen via `audioService` (laden van samples + scheduling, vergelijkbaar met `SubmissionPlayer`)
   - Actief icoon pulseert (CSS animation)
   - Bottom bar tijdens afspelen: naam + stop-knop + "Bekijk timeline" link
2. "Bekijk timeline" opent bestaande `SubmissionPlayer` als overlay
3. Clustering-logica: submissions groeperen op basis van nabijheid (bijv. binnen 5% radius = zelfde spot)
4. Preloading: bij openen viewer worden sample-URLs geresolved, samples lazy geladen bij eerste klik (gecached in `AudioService`)
5. Responsive: werkt op groot scherm (digibord) + tablet

### Fase 6: Afronden (1-2 uur)

1. Build + lint + TypeScript check
2. Handmatig testen van volledige flow (docent + leerling)
3. CLAUDE.md bijwerken met praatplaat-architectuur
4. TODO.md bijwerken

---

## Clustering van spots

Wanneer meerdere leerlingen op (bijna) dezelfde positie klikken, moeten de iconen niet overlappen. Clustering-logica:

```typescript
const CLUSTER_RADIUS = 0.05; // 5% van afbeeldingsbreedte

function clusterSubmissions(submissions: PraatplaatSubmission[]): Cluster[] {
  // Groepeer submissions waarvan position_x en position_y
  // binnen CLUSTER_RADIUS van elkaar liggen
  // → Eén icoon per cluster, met count en lijst van submissions
}
```

Een cluster toont:
- **1 submission**: enkel icoon met initiaal van leerling
- **2+ submissions**: icoon met getal → bij klik dropdown met namen

---

## Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Performance bij veel submissions (15+) | Medium — veel iconen + audio lazy loading | Clustering reduceert visuele load. Samples gecached in AudioService |
| Afbeelding niet geladen op leerling-device | Laag — fallback naar gradient (bestaand patroon in LocationScene) | Graceful degradation |
| Partial unique index niet ondersteund | Laag — standaard PostgreSQL feature, Supabase ondersteunt dit | Alternatief: trigger-based enforcement |
| Leerling lost klascode kwijt na positie-kiezen | Medium — sessie-state is ephemeral | Praatplaat-context bewaren in appStore (overleeft navigatie, niet refresh). Leerling kan opnieuw beginnen |
| Docent wisselt actieve praatplaat terwijl leerling bezig is | Laag — leerling heeft context al in-memory | Submit werkt nog (praatplaat_id is vast). Volgende leerling krijgt nieuwe praatplaat |

---

## Toekomstige uitbreidingen (NIET in scope)

- **Simultaan afspelen**: meerdere composities tegelijk afspelen op de praatplaat (fase 2 — mixer-achtige interface)
- **Docent uploadt eigen afbeelding**: image upload + storage (vereist Supabase Storage of externe hosting)
- **Eigen geluiden opnemen** (#28): mooie combinatie met praatplaat, maar apart feature
- **Real-time updates**: Supabase Realtime om nieuwe submissions live te tonen op de praatplaat (leuk voor klassikale sessies)
- **Praatplaat-export**: afbeelding + alle geluiden exporteren als interactieve HTML of video

---

## Relatie met andere issues

| Issue | Relatie |
|-------|---------|
| #44 (Luister-en-Plaats) | Verwant maar omgekeerd: daar plaatst het kind een bestaand geluid, hier componeert het kind nieuw geluid |
| #63 (Collaboratief storyboard) | Praatplaat is eenvoudiger alternatief zonder real-time sync. Overweeg #63 te parkeren |
| #42 (Ensemble-modus) | Praatplaat is asynchroon i.p.v. real-time. Minder complex, vergelijkbaar pedagogisch doel |
| #28 (Eigen samples opnemen) | Mooie toekomstige combinatie — eigen opnames als geluid op de praatplaat |
| #52 (Bewaarcode) | Niet gecombineerd in fase 1: praatplaat-composities worden direct gesubmit, niet bewaard met code |
