# PRAATPLAAT — Complete Feature Documentation

> **Doel van dit document:** één zelfdragende referentie waarin alles staat over de praatplaat-functie van SoundScout — werkwijze, architectuur, codering, docent-flow, leerling-flow, public sharing, database, security, edge cases en geplande uitbreidingen. Bedoeld voor handover aan een andere AI of nieuwe ontwikkelaar.
>
> **Versie:** 2026-05-01 — gebaseerd op SQL-migraties 005, 006, 008, 009, 010, 011, 012 en alle frontend-code per die datum.
>
> **Bronnen:** [PLAN-72-PRAATPLAAT.md](./PLAN-72-PRAATPLAAT.md), [PLAN-OPNAME-PRAATPLAAT.md](./PLAN-OPNAME-PRAATPLAAT.md), [PLAN-UNIVERSELE-KLASCODE-FLOW.md](./PLAN-UNIVERSELE-KLASCODE-FLOW.md), [PLAN-OPDRACHTEN-ARCHITECTUUR.md](./PLAN-OPDRACHTEN-ARCHITECTUUR.md), [TODO-UNIVERSELE-KLASCODE.md](./TODO-UNIVERSELE-KLASCODE.md), [TESTEN.md](./TESTEN.md), [CONTENT-THEMA.md](./CONTENT-THEMA.md), [HANDLEIDING-BEHEER.md](./HANDLEIDING-BEHEER.md), `CLAUDE.md`, en de complete codebase.

---

## Inhoudsopgave

1. [Executive Summary](#1-executive-summary)
2. [Concept & Architecturele Beslissingen](#2-concept--architecturele-beslissingen)
3. [End-to-End Workflows](#3-end-to-end-workflows)
4. [Database Schema](#4-database-schema)
5. [RPC Functions](#5-rpc-functions)
6. [Rate Limiting](#6-rate-limiting)
7. [TypeScript Types](#7-typescript-types)
8. [State Management — appStore](#8-state-management--appstore)
9. [Library Layer — `src/lib/praatplaat.ts`](#9-library-layer--srclibpraatplaatts)
10. [Hooks](#10-hooks)
11. [Frontend Components — Teacher](#11-frontend-components--teacher)
12. [Frontend Components — Student & Public](#12-frontend-components--student--public)
13. [Utilities](#13-utilities)
14. [Routing & Deep Links](#14-routing--deep-links)
15. [Studio Integratie (#80 — Zoom)](#15-studio-integratie-80--zoom)
16. [Stage Integratie](#16-stage-integratie)
17. [Persistence & Hydration](#17-persistence--hydration)
18. [i18n Keys](#18-i18n-keys)
19. [Security & RLS](#19-security--rls)
20. [Edge Cases & Known Risks](#20-edge-cases--known-risks)
21. [File Index](#21-file-index)
22. [Migration Order](#22-migration-order)
23. [Future Extensions (Opname-Praatplaat & meer)](#23-future-extensions-opname-praatplaat--meer)
24. [Live Content Inventory](#24-live-content-inventory)

---

## 1. Executive Summary

Een **praatplaat** ("talking plate") is een collaboratieve klankkaart: een afbeelding waarop leerlingen klikken om er hun eigen audiocompositie aan te koppelen, op een specifieke X,Y-positie. De docent toont de praatplaat fullscreen op het digibord en klikt op spots om individuele composities af te spelen.

**Doelgroep:** basisschool-klassen (groep 5-8). De docent kiest een afbeelding uit een bibliotheek of locatie-thema, activeert de praatplaat voor één klas, en deelt de klascode (4 cijfers). Leerlingen voeren de code in, kiezen een plek op de afbeelding, maken hun compositie via het normale studio-proces, en bij opslaan wordt de compositie automatisch ingediend met positie-metadata.

**Twee deelbare URL-modes (#73):**
- `?pp=KLASCODE` — directe deeplink voor leerling-deelname (4-digit klascode)
- `?pp-share=CODE` — publieke listening-page (8-char share code, 30 dagen geldig)

**Status van de feature:** Volledig live in productie, inclusief #73 (sharing), #80 (studio-zoom op gekozen plek), en multi-spot flow (#52-FASE2 sync). De variant **opname-praatplaat (#28)** is uitgebreid ontworpen maar nog niet gebouwd — zie sectie 23.

---

## 2. Concept & Architecturele Beslissingen

### 2.1 Wat is een praatplaat (didactisch)

Eén gedeelde afbeelding (bv. boerderij, stad, sportveld, koningsdag) waar leerlingen elk een geluid/compositie aan koppelen op een gekozen plek. Het resultaat is een collectief kunstwerk: één plaat met meerdere klankcontexten. De docent presenteert het werk klassikaal en kan elke leerlingbijdrage afspelen.

**Pedagogisch ontwerp:**
- **Lage drempel:** leerlingen kiezen geen mode — de docent heeft de opdracht al bepaald
- **Visuele context:** door anderen geplaatste spots zien geeft motivatie en ruimtelijk besef
- **Collaboratief artefact:** één plaat met meerdere bijdragen creëert een gezamenlijk gevoel
- **Docent-controle:** maximaal één actieve praatplaat per klas
- **Auto-submit:** elimineert de "deel-met-docent"-beslissing

### 2.2 Hypothesis C — aparte entry, niet via "Bij een afbeelding"

Tijdens het ontwerp zijn vijf hypotheses overwogen:

| Hypo | Aanpak | Status | Reden |
|---|---|---|---|
| A | Praatplaat vervangt "Bij een afbeelding" wanneer klascode actief is | Verworpen | Verwarrend: dezelfde knop doet verschillende dingen. Code moet vóór mode-keuze ingevoerd worden. |
| B | Praatplaat als vierde modekaart op `ComposeModeScreen` | Verworpen | Slechte mobile-scaling. Code moet vóór mode-keuze. |
| **C** ✅ | Praatplaat als aparte entry, ontkoppeld van mode-screen | **Gekozen** | Docent-gestuurd: klascode → app routet leerling automatisch. Consistent met template-patroon. |
| D | "Bij een afbeelding" IS altijd de praatplaat | Verworpen | Verplicht positie-keuze ook voor solo gebruik. |
| E | Klascode als mode-switcher | Verworpen | Complexe contextuele logica. |

**Waarom C:** de praatplaat is **docent-geïnitieerd**. Entry is identiek aan templates: code invoeren → app routet leerling naar correcte flow → geen leerling-beslissing nodig.

### 2.3 Code-overlap analyse

| Laag | "Bij een afbeelding" | Praatplaat | Overlap |
|---|---|---|---|
| Entry | `ComposeModeScreen` → location card | Klascode → `getActiveAssignment()` → `PraatplaatSelectScreen` | ❌ Nee |
| Image-keuze UI | StoryboardCard-grid met locatie-thumbs | Fullscreen image + click-to-position | ❌ Nee |
| Locatie-images | Bestaande theme location images | Zelfde theme images | ✅ Gedeelde data |
| Map → locaties → studio | Bestaand | Bestaand | ✅ Volledig gedeeld |
| Studio + timeline | Bestaand via `activeStoryboard` | Bestaand via `activeStoryboard` (virtueel) | ✅ Volledig gedeeld |
| Podium / opslaan | localStorage | Auto-submit met positie | ❌ Verschilt (kleine toevoeging) |
| Docent-viewer | n.v.t. | `PraatplaatViewer` (nieuw) | ❌ Geen equivalent |

**Conclusie:** geen materiële code-duplicatie. Praatplaat-specifieke code (positie-keuze, auto-submit, viewer) heeft geen equivalent in "Bij een afbeelding". Alle gedeelde infrastructuur is al multi-modaal via de virtuele storyboard-conversie (zie [`praatplaatStoryboard.ts`](#132-praatplaatstoryboardts)).

### 2.4 Polymorfe assignment-architectuur (migratie 006)

Templates en praatplaten zijn beide **opdrachten** die een docent aan een klas kan koppelen. De originele aanpak (één `is_active`-vlag per resource-type) werd vervangen door een polymorfe `class_assignments`-tabel met exclusieve foreign keys naar `templates` of `praatplaten`. Eén actieve opdracht per klas wordt afgedwongen via partial unique index + trigger. Resources zelf zijn nu docent-niveau (klas-onafhankelijk), wat hergebruik mogelijk maakt.

---

## 3. End-to-End Workflows

### 3.1 Docent — praatplaat aanmaken

```
TeacherDashboard → ClassDetail → Praatplaat-sectie → [Nieuwe Praatplaat]
  ↓
CreatePraatplaatModal:
  ├─ Naam (verplicht, max 200 chars; auto-fallback "{imageNaam} - dd-mm-yyyy")
  ├─ Selecteer afbeelding:
  │   ├─ Bibliotheek (universele praatplaat-images)
  │   └─ Of: thema-locaties (collapsible, per thema gegroepeerd)
  └─ [Aanmaken]
  ↓
RPC create_praatplaat(name, theme_id, location_id, image_url, class_id?)
  ├─ Rate limit: 10/min per docent
  ├─ Valideert class-ownership als class_id meegegeven
  └─ Returnt nieuwe praatplaat UUID
  ↓
PraatplaatCard verschijnt in ClassDetail (initieel inactief)
  ↓
Docent klikt "Activeer" → useClassAssignment.activatePraatplaatAssignment()
  → RPC activate_assignment(class_id, p_praatplaat_id := id)
  → Trigger enforce_single_active_assignment deactiveert eventueel andere actieve opdracht
```

### 3.2 Docent — presenteren op digibord (PraatplaatViewer)

```
ClassDetail → PraatplaatCard → [Open Praatplaat]
  ↓
PraatplaatViewer (fullscreen overlay, z-50):
  ├─ Header: praatplaat-naam, refresh-knop, close-knop
  ├─ Achtergrond: praatplaat-afbeelding (aspect-video, gecentreerd)
  ├─ getPraatplaatSubmissions(praatplaatId, classId) wordt aangeroepen
  ├─ clusterSubmissions() groepeert dichtbije inzendingen (5%-threshold)
  └─ Per cluster: PraatplaatSpot icoon (Volume2 + count-badge bij ≥2)
  ↓
Docent klikt op spot:
  ├─ 1 inzending → playSubmission() — direct afspelen
  └─ 2+ inzendingen → dropdown opent met leerling-namen → klik = afspelen
  ↓
Tijdens afspelen:
  ├─ Spot pulseert (animate-pulse + scale-110)
  ├─ Onderaan playback-bar: "naam — compositie" + [Toon timeline] + [Stop]
  └─ [Toon timeline] → SubmissionPlayer overlay (read-only timeline + storyboard-image)
  ↓
Klik op actieve spot = toggle off (stop)
[X] sluit viewer + cleanup audio
```

### 3.3 Docent — delen via 8-char share code (#73)

```
PraatplaatCard → [Share]-knop (alleen zichtbaar als classCode bekend)
  ↓
SharePraatplaatModal (size="sm"):
  ├─ Sectie 1: Klascode-link
  │   ├─ URL: ${origin}${pathname}?pp=${classCode}
  │   ├─ [Copy] knop met clipboard-feedback (auto-clear na 2s)
  │   └─ [Toon QR] toggle → QRCode.toDataURL() (280x280, margin 2)
  ├─ Sectie 2: Listening-page (publiek, voor luisteraars zonder klascode)
  │   ├─ Initieel: [Genereer share-link]-knop
  │   ├─ Klik → sharePraatplaat(praatplaatId) RPC
  │   │   ├─ Rate limit: 10/min per docent
  │   │   ├─ Genereert 8-char code via generate_praatplaat_share_code()
  │   │   ├─ Cross-collision check: tegen praatplaten.share_code EN submissions.share_code
  │   │   ├─ share_expires_at = NOW() + 30 dagen
  │   │   └─ Hercall = verlengt expiry, returnt bestaande code
  │   ├─ URL: ${origin}${pathname}?pp-share=${shareCode}
  │   ├─ [Copy] + [Toon QR] (zelfde patroon)
  │   └─ Tekst: "Link verloopt over 30 dagen"
  └─ [Sluit]
```

### 3.4 Leerling — klascode → positie → componeren → auto-submit

```
StartScreen → "Ik heb een code" → ShareCodeInput
  ↓
4-cijferige code ingevoerd → lookupAndRouteAssignment(code)
  → getActiveAssignment(code) RPC (rate limit 30/min per code)
  ↓
Result: { assignment_type: 'praatplaat', praatplaat_id, name, image_url, theme_id, location_id, class_id, class_name }
  ↓
goToAssignmentLanding({ classCode, assignment })
  → AssignmentLandingScreen (preview + [Starten]-knop)
  ↓
[Starten] → activatePendingAssignment()
  ├─ setClassSession({ classCode, classId, className, assignmentType: 'praatplaat', assignmentId, assignmentName })
  ├─ setPraatplaat({ id, name, imageUrl, themeId, locationId, classCode, classId })
  └─ goToPraatplaatSelect()
  ↓
PraatplaatSelectScreen (fullscreen):
  ├─ Achtergrond: praatplaat-afbeelding (aspect-video, crosshair-cursor)
  ├─ Klik / tap op afbeelding:
  │   ├─ getBoundingClientRect() → normalize naar 0-1
  │   ├─ Clamp [0, 1] op beide assen
  │   └─ MapPin-marker met bounce-animatie op gekozen positie
  ├─ Keyboard a11y: Enter/Space = center (0.5, 0.5) als nog niets gekozen
  └─ [Bevestigen]:
      ├─ setPraatplaatPosition({ x, y })
      ├─ praatplaatToStoryboard(activePraatplaat) → virtuele Storyboard
      ├─ setActiveStoryboard(virtualStoryboard)
      ├─ setComposeMode('image')
      └─ goToMap()
  ↓
Map → location → samples verzamelen → Studio (normaal flow)
  ├─ Studio toont praatplaat-image als achtergrond (StorytellingPanel)
  └─ Met 2.5× zoom op gekozen positie (#80) — toggle-knop voor full view
  ↓
Studio → Stage (normaal)
  ↓
Stage → [Save] → useStageSave.performSave():
  ├─ Lokaal opslaan (altijd, met praatplaat + praatplaatPosition snapshot)
  ├─ classSession actief?
  │   └─ JA: submit_or_update_composition(...)
  │       ├─ classCode, studentName, compositionName, compositionData
  │       ├─ clientId (UUID, persisted in localStorage voor idempotentie)
  │       ├─ assignmentId = praatplaatId, assignmentType = 'praatplaat'
  │       └─ praatplaatPositionX, praatplaatPositionY
  ├─ Op success: setPraatplaatSubmitted(true)
  │   → activeert StageView success-modal
  └─ Online-bewaarcode (#52) auto-sync indien aanwezig
```

### 3.5 Leerling — nieuwe plek kiezen na inzending

```
Stage → success-modal "Je compositie is op de praatplaat geplaatst!"
  ├─ [Ga verder met deze compositie] → modal sluit
  └─ [Kies een nieuwe plek] → handleNewSpot:
      ├─ stopAll() (audio uit)
      ├─ clearAllTracks() (timeline leeg)
      ├─ useAppStore.setState({
      │     praatplaatPosition: null,
      │     submissionId: null,
      │     submissionSynced: false
      │  })
      ├─ useLibraryStore.getState().clearLibrary() (samples weg)
      ├─ setPraatplaatSuccessDismissed(true)
      └─ goToPraatplaatSelect()
  ↓
Belangrijk: activePraatplaat én classSession blijven behouden!
Leerling herhaalt: positie → map → studio → stage → save → NIEUWE submission
```

Permanente knop "Kies een nieuwe plek" blijft op stage zichtbaar zolang `praatplaatSubmitted && activePraatplaat` waar zijn (los van de success-modal).

### 3.6 Publiek — shared praatplaat bekijken (`?pp-share=CODE`)

```
URL met ?pp-share=ABCD1234 (8-char alfanumeriek)
  ↓
App.tsx detecteert query-param → goToSharedPraatplaat(code)
  → currentScreen = 'shared-praatplaat', sharedPraatplaatCode = code
  ↓
SharedPraatplaatViewer (lazy-loaded):
  ├─ State machine: loading → ready (via tussenliggende states)
  ├─ getSharedPraatplaat(code) RPC (rate limit 30/min per code)
  │   ├─ uppercase + trim
  │   ├─ Server-side: code lookup, expiry check, view_count++
  │   └─ Returnt { praatplaat, submissions[] } of throw bij verlopen
  ├─ Bij not-found → state 'not-found', toon foutmelding + back
  ├─ Bij verlopen (error message bevat 'verlopen'/'expired') → state 'expired'
  ├─ Anders → clusterSubmissions() + state 'waiting-gesture'
  ↓
State 'waiting-gesture' (browser-policy compliance):
  └─ Toont praatplaat-naam + submission-count + [Luister naar de praatplaat]-knop
      → handleStartListening:
         ├─ await Tone.start()  ← user gesture vereist
         ├─ await audioService.initialize()
         └─ state = 'ready'
  ↓
State 'ready' = identiek aan PraatplaatViewer maar zonder docent-features:
  ├─ Image + clustered PraatplaatSpot icons
  ├─ Klik spot → playSubmission() (single) of dropdown (multiple)
  ├─ Playback bar onderaan met [Toon timeline] + [Stop]
  └─ SubmissionPlayer overlay als 'Toon timeline' geactiveerd
```

---

## 4. Database Schema

Alle praatplaat-tabellen leven in `public` schema in Supabase. Migratie-bestanden onder [`supabase/migrations/`](../supabase/migrations/).

### 4.1 Tabel `praatplaten` (migratie 005, met aanpassingen 008 + 012)

```sql
CREATE TABLE IF NOT EXISTS public.praatplaten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,  -- nullable sinds 008
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  theme_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,  -- vervangen door class_assignments sinds 006
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- toegevoegd in 012:
  share_code VARCHAR(8) UNIQUE,
  share_expires_at TIMESTAMPTZ,
  share_view_count INT DEFAULT 0 CONSTRAINT chk_share_view_count_positive CHECK (share_view_count >= 0)
);

CREATE INDEX idx_praatplaten_class ON public.praatplaten(class_id);
CREATE INDEX idx_praatplaten_teacher ON public.praatplaten(teacher_id);
-- Partial index op share_code (alleen non-NULL geïndexeerd):
CREATE INDEX idx_praatplaten_share_code ON public.praatplaten(share_code) WHERE share_code IS NOT NULL;
```

**Belangrijke kolommen:**
- `id` — UUID, auto-gegenereerd
- `class_id` — sinds migratie 008 nullable (resource is op docent-niveau eigendom; per-klas activatie via `class_assignments`)
- `teacher_id` — verplicht voor RLS-eigendom
- `theme_id` / `location_id` — text-IDs naar het theme-systeem (bv. `'basis'` / `'boerderij'`)
- `image_url` — directe URL naar achtergrondafbeelding
- `is_active` — sinds 006 vervangen door `class_assignments.is_active`; mag legacy blijven staan
- `share_code` — 8-char (sinds 012), UNIEK in beide praatplaten + submissions
- `share_expires_at` — default 30 dagen na sharing
- `share_view_count` — opgehoogd bij elke `get_shared_praatplaat`-call

**Partial unique index (migratie 005, opgeruimd in 006):**
```sql
-- Origineel (verwijderd in 006):
CREATE UNIQUE INDEX idx_praatplaten_active_per_class
  ON public.praatplaten (class_id) WHERE is_active = TRUE;
```
Sinds 006 zit deze constraint op `class_assignments` ipv `praatplaten`.

### 4.2 Submissions-extensie (migratie 005, FK aangepast in 009, kolommen toegevoegd in 010)

```sql
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS praatplaat_id UUID
    REFERENCES public.praatplaten(id) ON DELETE CASCADE,  -- CASCADE sinds 009 (was SET NULL)
  ADD COLUMN IF NOT EXISTS position_x REAL
    CHECK (position_x IS NULL OR (position_x >= 0 AND position_x <= 1)),
  ADD COLUMN IF NOT EXISTS position_y REAL
    CHECK (position_y IS NULL OR (position_y >= 0 AND position_y <= 1)),
  -- toegevoegd in 010:
  ADD COLUMN IF NOT EXISTS assignment_id UUID,    -- géén FK (intentioneel)
  ADD COLUMN IF NOT EXISTS assignment_type TEXT
    CHECK (assignment_type IS NULL OR assignment_type IN ('template', 'praatplaat'));

CREATE INDEX idx_submissions_praatplaat
  ON public.submissions(praatplaat_id) WHERE praatplaat_id IS NOT NULL;
CREATE INDEX idx_submissions_assignment
  ON public.submissions(assignment_id) WHERE assignment_id IS NOT NULL;
```

**Waarom op `submissions` ipv aparte tabel?** Een praatplaat-bijdrage IS een inzending — werk van een leerling gekoppeld aan een klas. De docent ziet 'm in het dashboard, kan 'm afspelen, kan 'm verwijderen. Slechts 3 nullable kolommen toevoegen.

**Waarom `assignment_id` géén FK?** Bij delete cascadeert de praatplaat/template automatisch de submission. Een dangling reference kan niet ontstaan. Het veld is puur voor labeling/filtering in de teacher dashboard.

### 4.3 Tabel `class_assignments` (migratie 006 — unified architectuur)

```sql
CREATE TABLE IF NOT EXISTS public.class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  -- Polymorfe FK: exact één van deze is NOT NULL
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
  praatplaat_id UUID REFERENCES public.praatplaten(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_assignment_type CHECK (
    (template_id IS NOT NULL AND praatplaat_id IS NULL) OR
    (template_id IS NULL AND praatplaat_id IS NOT NULL)
  )
);

-- Maximaal 1 actieve opdracht per klas:
CREATE UNIQUE INDEX idx_class_assignments_active
  ON public.class_assignments (class_id) WHERE is_active = TRUE;

CREATE INDEX idx_class_assignments_class ON public.class_assignments(class_id);
CREATE INDEX idx_class_assignments_teacher ON public.class_assignments(teacher_id);
```

**Polymorfe FK met CHECK:** garandeert dat elke rij precies één type opdracht referenceert.

**Trigger:**
```sql
CREATE OR REPLACE FUNCTION enforce_single_active_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE public.class_assignments
    SET is_active = FALSE
    WHERE class_id = NEW.class_id
      AND id != NEW.id
      AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_active_assignment
  BEFORE INSERT OR UPDATE OF is_active ON public.class_assignments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_assignment();
```

**Data-migratie naar nieuwe tabel (migratie 006):**
```sql
INSERT INTO public.class_assignments (class_id, teacher_id, praatplaat_id, is_active, activated_at)
SELECT class_id, teacher_id, id, TRUE, created_at
FROM public.praatplaten
WHERE is_active = TRUE AND class_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Cleanup oude trigger + index:
DROP TRIGGER IF EXISTS trg_enforce_single_active_praatplaat ON public.praatplaten;
DROP FUNCTION IF EXISTS enforce_single_active_praatplaat();
DROP INDEX IF EXISTS idx_praatplaten_active_per_class;
```

### 4.4 Hard-delete cascade (migratie 009)

```sql
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_praatplaat_id_fkey,
  ADD CONSTRAINT submissions_praatplaat_id_fkey
    FOREIGN KEY (praatplaat_id) REFERENCES public.praatplaten(id)
    ON DELETE CASCADE;

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_class_id_fkey,
  ADD CONSTRAINT submissions_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id)
    ON DELETE CASCADE;
```

**Trade-off:** schoner schema, geen dangling refs, maar inzendingen verdwijnen mee bij delete. Docent ziet expliciete waarschuwing in delete-dialog.

---

## 5. RPC Functions

Alle praatplaat-RPCs zijn `SECURITY DEFINER` (draaien met postgres-rol, niet caller-rol) zodat anonieme callers (leerlingen) ze ook kunnen uitvoeren met server-side ownership checks.

### 5.1 Overzicht

| Functie | Caller | Migratie | Vervangen door |
|---|---|---|---|
| `create_praatplaat(name, theme_id, location_id, image_url, class_id?)` | docent (auth) | 005 → 008 | — |
| `activate_praatplaat(id)` | docent (auth) | 005 | `activate_assignment` (006) |
| `deactivate_praatplaat(id)` | docent (auth) | 005 | `deactivate_class_assignment` (006) |
| `delete_praatplaat(id)` | docent (auth) | 005 | — |
| `get_active_praatplaat(class_code)` | publiek (anon) | 005 | wrapper rond `get_active_assignment` (006) |
| `submit_praatplaat_composition(...)` | publiek (anon) | 005 | `submit_or_update_composition` (011) |
| `get_praatplaat_submissions(praatplaat_id, class_id?)` | docent (auth) | 005 | — |
| `activate_assignment(class_id, template_id?, praatplaat_id?)` | docent (auth) | 006 | — |
| `deactivate_class_assignment(class_id)` | docent (auth) | 006 | — |
| `get_active_assignment(class_code)` | publiek (anon) | 006 | — |
| `submit_or_update_composition(...)` | publiek (anon) | 011 | — |
| `share_praatplaat(praatplaat_id)` | docent (auth) | 012 | — |
| `get_shared_praatplaat(code)` | publiek (anon) | 012 | — |
| `generate_praatplaat_share_code()` | intern | 012 | — |

### 5.2 `create_praatplaat` (signature na migratie 008)

```sql
CREATE OR REPLACE FUNCTION create_praatplaat(
  p_name TEXT,
  p_theme_id TEXT,
  p_location_id TEXT,
  p_image_url TEXT,
  p_class_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
```

**Logica:**
1. Rate limit `check_rate_limit('create_praatplaat', auth.uid()::text, 10, 60)` — max 10/min per docent
2. Indien `p_class_id` opgegeven: valideer dat klas eigendom is van `auth.uid()`
3. INSERT in `praatplaten` met `teacher_id := auth.uid()`, `is_active := FALSE`
4. Returnt nieuwe `id`

**Grant:** `GRANT EXECUTE ... TO authenticated`

### 5.3 `activate_praatplaat` / `deactivate_praatplaat` (legacy)

Beide valideren ownership (`auth.uid() = teacher_id`), zetten `is_active` op TRUE/FALSE. Sinds migratie 006 vervangen door `activate_assignment` voor alle nieuwe code.

### 5.4 `delete_praatplaat`

```sql
CREATE OR REPLACE FUNCTION delete_praatplaat(p_praatplaat_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
```

Valideert ownership, doet `DELETE FROM praatplaten WHERE id = ...`. Door FK CASCADE (sinds 009) worden bijbehorende submissions ook verwijderd.

### 5.5 `get_active_praatplaat` (publiek, sinds 006 een wrapper)

```sql
CREATE OR REPLACE FUNCTION get_active_praatplaat(p_class_code TEXT)
RETURNS TABLE (
  praatplaat_id UUID,
  praatplaat_name TEXT,
  image_url TEXT,
  theme_id TEXT,
  location_id TEXT,
  class_id UUID,
  class_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER
```

**Logica:**
1. Rate limit: 30/min per code (`'code:' || p_class_code`)
2. Sinds 006: query op `class_assignments` JOIN `classes` JOIN `praatplaten` waar `is_active = TRUE` en `assignment_type = 'praatplaat'`
3. Bij geen actieve praatplaat: lege resultaat-set (geen error — leerling-flow gaat normaal door)

**Grant:** `GRANT EXECUTE ... TO anon`

### 5.6 `get_active_assignment` (publiek, polymorf)

```sql
CREATE OR REPLACE FUNCTION get_active_assignment(p_class_code TEXT)
RETURNS TABLE (
  assignment_type TEXT,  -- 'template' | 'praatplaat'
  -- Template-velden (nullable)
  template_id UUID, template_name TEXT, template_description TEXT, template_teacher_name TEXT,
  composition_data JSONB, instructions TEXT, lock_options JSONB,
  -- Praatplaat-velden (nullable)
  praatplaat_id UUID, praatplaat_name TEXT, image_url TEXT, theme_id TEXT, location_id TEXT,
  -- Gedeeld
  class_id UUID, class_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER
```

Universele lookup — leerling-app roept deze één keer aan na klascode-invoer. Returns OF template-velden OF praatplaat-velden gevuld, ander veld NULL.

### 5.7 `submit_praatplaat_composition` (legacy)

```sql
CREATE OR REPLACE FUNCTION submit_praatplaat_composition(
  p_class_code TEXT,
  p_praatplaat_id UUID,
  p_position_x REAL,
  p_position_y REAL,
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
) RETURNS UUID
```

**Logica:** rate limit 60/min per class code, valideert klas + praatplaat-koppeling, valideert positie [0,1], INSERT in `submissions` met praatplaat-velden ingevuld. Sinds migratie 011 vervangen door `submit_or_update_composition`.

### 5.8 `submit_or_update_composition` (idempotent universeel — migratie 011)

```sql
CREATE OR REPLACE FUNCTION submit_or_update_composition(
  p_class_code TEXT,
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB,
  p_client_id UUID DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL,
  p_assignment_type TEXT DEFAULT NULL,
  p_praatplaat_position_x REAL DEFAULT NULL,
  p_praatplaat_position_y REAL DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
```

**Idempotentie:** Client genereert UUID, server doet `INSERT ... ON CONFLICT (id) DO UPDATE`. Verloren response → retry met zelfde UUID = UPDATE ipv duplicate.

**Auto-mapping:**
```sql
praatplaat_id := CASE WHEN p_assignment_type = 'praatplaat' THEN p_assignment_id ELSE NULL END
position_x / position_y := p_praatplaat_position_x / p_praatplaat_position_y
```

**Logica:**
1. Rate limit: 60/min per klascode
2. Klas-lookup + actief-check
3. Validatie van `assignment_type` indien meegegeven
4. UPSERT in submissions
5. Default `student_name` → `'Anoniem'` indien leeg
6. Returnt submission UUID

### 5.9 `get_praatplaat_submissions`

```sql
CREATE OR REPLACE FUNCTION get_praatplaat_submissions(
  p_praatplaat_id UUID,
  p_class_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID, student_name TEXT, composition_name TEXT, composition_data JSONB,
  position_x REAL, position_y REAL, created_at TIMESTAMPTZ
)
```

Ownership-check op `auth.uid() = teacher_id`, returnt alle submissions voor de praatplaat ORDER BY `created_at DESC`. Optionele `p_class_id`-filter wordt door client meegegeven.

**Grant:** `GRANT EXECUTE ... TO authenticated`

### 5.10 `share_praatplaat` (#73)

```sql
CREATE OR REPLACE FUNCTION share_praatplaat(p_praatplaat_id UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
```

**Logica:**
1. Rate limit: 10/min per docent
2. Ownership check
3. Indien `share_code` al bestaat: zet `share_expires_at = NOW() + 30 days`, returnt bestaande code
4. Anders: genereer via `generate_praatplaat_share_code()`, set expiry, reset `share_view_count = 0`
5. Returnt code (8 chars)

### 5.11 `get_shared_praatplaat` (publiek)

```sql
CREATE OR REPLACE FUNCTION get_shared_praatplaat(p_code VARCHAR) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
```

**Logica:**
1. Rate limit: 30/min per code (`'pp:' || code`)
2. Lookup `WHERE share_code = p_code`; bij niets → exception "not found"
3. Expiry-check: indien `share_expires_at < NOW()` → exception "Link verlopen"
4. `share_view_count++`
5. Fetch alle submissions van deze praatplaat (ORDER BY created_at DESC)
6. Returnt JSON:
```json
{
  "praatplaat": { "id", "name", "image_url", "theme_id", "location_id" },
  "submissions": [{ "id", "student_name", "composition_name", "composition_data", "position_x", "position_y", "created_at" }, ...]
}
```

### 5.12 `generate_praatplaat_share_code` (intern, cross-collision avoidance)

```sql
CREATE OR REPLACE FUNCTION generate_praatplaat_share_code() RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- geen I, L, O, 1
  new_code VARCHAR(8) := '';
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check tegen BEIDE tabellen:
    SELECT EXISTS(
      SELECT 1 FROM public.praatplaten WHERE share_code = new_code
      UNION ALL
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

Karakter-set is base-32 zonder ambigue tekens (geen I/L/O/1) — beter voor mondelinge / handgeschreven communicatie in een klaslokaal.

### 5.13 `activate_assignment` / `deactivate_class_assignment` (migratie 006)

```sql
CREATE OR REPLACE FUNCTION activate_assignment(
  p_class_id UUID,
  p_template_id UUID DEFAULT NULL,
  p_praatplaat_id UUID DEFAULT NULL
) RETURNS UUID
```

**Logica:**
1. Klas-ownership check
2. Valideer dat exact één van template_id/praatplaat_id is opgegeven
3. Resource-ownership check (template of praatplaat)
4. INSERT in `class_assignments` met `is_active = TRUE`
5. Trigger deactiveert anderen
6. Returnt nieuwe assignment-id

`deactivate_class_assignment(p_class_id)` zet huidige actieve assignment van klas op `is_active = FALSE`.

---

## 6. Rate Limiting

Alle public RPCs gaan door `check_rate_limit(bucket, identifier, max_count, window_seconds)`. Tabel `rate_limits` (migratie 002).

| Functie | Limiet | Window | Identifier |
|---|---|---|---|
| `create_praatplaat` | 10 | 60s | `auth.uid()` (docent) |
| `share_praatplaat` | 10 | 60s | `auth.uid()` (docent) |
| `get_active_praatplaat` | 30 | 60s | `'code:' || p_class_code` |
| `get_active_assignment` | 30 | 60s | `'code:' || p_class_code` |
| `get_shared_praatplaat` | 30 | 60s | `'pp:' || p_code` |
| `submit_praatplaat_composition` | 60 | 60s | `'class:' || p_class_code` |
| `submit_or_update_composition` | 60 | 60s | `'classcode:' || p_class_code` |

In de client (`src/lib/praatplaat.ts`) worden rate-limit-fouten gedetecteerd via `matchesError(error, ERR_RATE_LIMIT)` en omgezet naar i18n-string `'errors.rateLimit'`.

---

## 7. TypeScript Types

Alle types in [`src/types/index.ts`](../src/types/index.ts).

### 7.1 Domain types

```typescript
export interface Praatplaat {
  id: string;
  classId: string;
  teacherId: string;
  name: string;
  themeId: string;
  locationId: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface ActivePraatplaat {
  id: string;
  name: string;
  imageUrl: string;
  classId: string;
  classCode: string;
  themeId: string;
  locationId: string;
}

export interface PraatplaatPosition {
  x: number;  // 0-1 normalized
  y: number;  // 0-1 normalized
}

export interface ClassSession {
  classCode: string;
  classId: string;
  className: string;
  assignmentType: 'template' | 'praatplaat';
  assignmentId: string;
  assignmentName: string;
}
```

### 7.2 Snapshot in opgeslagen composities

```typescript
export interface SavedComposition {
  // ... overige velden
  /** Snapshot van praatplaat-context (#72) — persistent zodat heropenen werkt. */
  praatplaat?: ActivePraatplaat;
  /** Positie op de praatplaat (0-1 normalized), indien van toepassing. */
  praatplaatPosition?: PraatplaatPosition;
}

export interface CompositionData {
  // ... overige velden
  praatplaat?: ActivePraatplaat;
  praatplaatPosition?: PraatplaatPosition;
}
```

Bij heropenen ziet `compositionInit.hydrateCompositionContext` deze velden en bouwt de praatplaat-context volledig op. De `storyboardId` van zo'n compositie is `'praatplaat-{id}'`.

### 7.3 GameScreen-uitbreidingen

```typescript
export type GameScreen =
  | ... // bestaande screens
  | 'praatplaat-select'      // student-positie-keuze
  | 'shared-praatplaat'      // public viewer
  | ...;
```

### 7.4 Library-side types (in `src/lib/praatplaat.ts`)

```typescript
export interface PraatplaatRow {
  id: string;
  class_id: string | null;
  teacher_id: string;
  name: string;
  theme_id: string;
  location_id: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export interface PraatplaatSubmission {
  id: string;
  student_name: string;
  composition_name: string;
  composition_data: CompositionData;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface ActivePraatplaatInfo {
  praatplaatId: string;
  praatplaatName: string;
  imageUrl: string;
  themeId: string;
  locationId: string;
  classId: string;
  className: string;
}

export interface SharedPraatplaatData {
  praatplaat: {
    id: string;
    name: string;
    image_url: string;
    theme_id: string;
    location_id: string;
  };
  submissions: Array<{
    id: string;
    student_name: string;
    composition_name: string;
    composition_data: CompositionData;
    position_x: number;
    position_y: number;
    created_at: string;
  }>;
}
```

> **Naming convention:** server-side returns gebruiken `snake_case`, client-side domain-types `camelCase`. De `getActivePraatplaat()` lib-functie doet de transformatie.

---

## 8. State Management — appStore

Alle praatplaat-velden in [`src/stores/appStore.ts`](../src/stores/appStore.ts).

### 8.1 State

```typescript
// Praatplaat (#72)
activePraatplaat: ActivePraatplaat | null;
praatplaatPosition: PraatplaatPosition | null;

// Public sharing (#73)
sharedPraatplaatCode: string | null;

// Universal class session (migratie 006/011)
classSession: ClassSession | null;
submissionId: string | null;
submissionSynced: boolean;
isSubmitting: boolean;

// pending assignment (#78 — landing screen)
pendingAssignment: { classCode, assignment } | null;
```

### 8.2 Acties

| Actie | Effect |
|---|---|
| `setPraatplaat(praatplaat: ActivePraatplaat)` | Zet `activePraatplaat` |
| `setPraatplaatPosition(position: PraatplaatPosition)` | Zet `praatplaatPosition` |
| `clearPraatplaat()` | Beide naar `null` |
| `goToPraatplaatSelect()` | Navigeer naar screen `'praatplaat-select'` |
| `goToSharedPraatplaat(code)` | Navigeer naar `'shared-praatplaat'` + `sharedPraatplaatCode = code` |
| `goToStart()` | Volledige reset: clears praatplaat-context, sharedPraatplaatCode, classSession, submissionId, etc. |

### 8.3 Persistence in tabellen

`activePraatplaat`, `praatplaatPosition` en `classSession` worden NIET in localStorage gehouden (ephemeral). `submissionId` (klascode-flow) wel — voor idempotente updates over sessies heen. Een refresh tijdens praatplaat-positie-keuze betekent: opnieuw klascode invoeren.

---

## 9. Library Layer — `src/lib/praatplaat.ts`

Alle Supabase-RPC-wrappers met i18n-error-translation, sanitization en validatie.

### 9.1 Functies

```typescript
// Docent-functies (auth required)
createPraatplaat(params: { classId?: string; name: string; themeId: string; locationId: string; imageUrl: string }): Promise<string>
activatePraatplaat(praatplaatId: string): Promise<boolean>
deactivatePraatplaat(praatplaatId: string): Promise<boolean>
deletePraatplaat(praatplaatId: string): Promise<boolean>
fetchPraatplaten(classId?: string): Promise<PraatplaatRow[]>
getPraatplaatSubmissions(praatplaatId: string, classId?: string): Promise<PraatplaatSubmission[]>

// Publieke functies (anon)
getActivePraatplaat(classCode: string): Promise<ActivePraatplaatInfo | null>
submitPraatplaatComposition(params: { classCode, praatplaatId, positionX, positionY, studentName?, compositionName, compositionData }): Promise<string>

// Sharing (#73)
sharePraatplaat(praatplaatId: string): Promise<string>
getSharedPraatplaat(code: string): Promise<SharedPraatplaatData | null>
```

### 9.2 Sleutel-implementatiedetails

- **Naam-trim:** `name.trim()` voor verzending
- **Code-uppercase:** `code.toUpperCase().trim()` voor share-code lookups
- **Random Dutch name:** `submitPraatplaatComposition` roept `generateRandomDutchName()` aan als `studentName` ontbreekt
- **Composition validation:** Per-submission validatie via `parseCompositionData()` (Zod). Ongeldige inzendingen worden gefilterd (NIET getoond) en met `logger.warn` gelogd
- **Snake↔camel transform:** `getActivePraatplaat` mapt server `praatplaat_id` → client `praatplaatId`, etc.
- **Rate limit detectie:** `matchesError(error, ERR_RATE_LIMIT)` → throw rate-limit-specifieke i18n-error
- **Soft errors:** `getSharedPraatplaat` retourneert `null` bij not-found (geen throw); `getActivePraatplaat` idem
- **Error logging:** `sanitizeError()` strips PII voor `logger.error` calls

---

## 10. Hooks

### 10.1 `usePraatplaten(classId?)` — [`src/hooks/usePraatplaten.ts`](../src/hooks/usePraatplaten.ts)

CRUD met optimistic updates. Volgt `useTemplates`-patroon.

```typescript
interface UsePraatplatenReturn {
  praatplaten: PraatplaatRow[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  create(params): Promise<void>;
  activate(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  refetch(): Promise<void>;
}
```

**Optimistische updates:**
- `create`: prepend nieuwe `PraatplaatRow` met defaults vóór server-response
- `activate`: map alle items, zet `is_active = true` voor target, `false` voor anderen (matcht server-trigger)
- `deactivate`: enkel target naar `false`
- `remove`: filter target uit lijst

**Re-fetch trigger:** `useEffect([fetch])` → bij elke `classId`-change wordt `fetch` opnieuw aangemaakt en data herladen.

### 10.2 `useClassAssignment` — [`src/hooks/useClassAssignment.ts`](../src/hooks/useClassAssignment.ts)

Beheert actieve opdracht per klas. Exposeert `activeAssignment` (template OF praatplaat) en methodes:
- `activateTemplateAssignment(templateId)`
- `activatePraatplaatAssignment(praatplaatId)`
- `deactivateAssignment()`

Beide activate-methodes roepen `activate_assignment` RPC aan en triggeren `refetch`.

### 10.3 `useStageSave` — [`src/hooks/useStageSave.ts`](../src/hooks/useStageSave.ts)

Centraal punt voor opslag op de stage. Combineert lokale opslag, online-bewaarcode-sync, en klascode-submission.

**Praatplaat-relevante state:**
```typescript
const [praatplaatSubmitted, setPraatplaatSubmitted] = useState(false);
```

**Logica (vereenvoudigd):**
```typescript
async function performSave() {
  // 1. Lokale opslag (altijd) — inclusief praatplaat snapshot
  saveCompositionLocally({
    ...,
    praatplaat: activePraatplaat ?? undefined,
    praatplaatPosition: praatplaatPosition ?? undefined,
  });

  // 2. Online-bewaarcode auto-sync (#52-FASE2)
  if (saveOnlineInfo) await updateSavedComposition(...);

  // 3. Klascode-pad (universele flow, sinds migratie 011)
  if (classSession) {
    const result = await submitOrUpdateComposition({
      classCode: classSession.classCode,
      studentName,
      compositionName,
      compositionData,
      clientId: getOrCreateClientId(),
      assignmentId: classSession.assignmentId,
      assignmentType: classSession.assignmentType,
      ...(classSession.assignmentType === 'praatplaat' && praatplaatPosition ? {
        praatplaatPositionX: praatplaatPosition.x,
        praatplaatPositionY: praatplaatPosition.y,
      } : {}),
    });
    if (classSession.assignmentType === 'praatplaat') {
      setPraatplaatSubmitted(true);  // triggert StageView success-modal
    }
    return;
  }

  // 4. Legacy fire-and-forget pad (compatibility)
  if (activePraatplaat && praatplaatPosition && !praatplaatSubmitted) {
    submitPraatplaatComposition({...}).then(() => setPraatplaatSubmitted(true));
  }
}
```

> **Belangrijk:** zowel het universele klascode-pad als het legacy-pad MOETEN `setPraatplaatSubmitted(true)` aanroepen, anders verschijnt de StageView success-modal niet.

---

## 11. Frontend Components — Teacher

### 11.1 `PraatplaatCard.tsx` — [`src/components/teacher/PraatplaatCard.tsx`](../src/components/teacher/PraatplaatCard.tsx)

```typescript
interface PraatplaatCardProps {
  praatplaat: PraatplaatRow;
  submissionCount?: number;
  classCode?: string;
  onDelete: () => void;
  onView: () => void;
}
```

**State:** `showShareModal: boolean`

**UI:**
- Rounded-xl card, hover:shadow-lg
- Thumbnail (`aspect-video`)
- Titel (truncate) + datum (`dd MMM yyyy`, locale `nl-NL`)
- Optionele submissions-count
- Acties (flex gap-2):
  - **Open Praatplaat** (primary, flex-1, `Volume2` icoon)
  - **Share** (ghost, `Share2`) — alleen rendered als `classCode` truthy
  - **Delete** (ghost, error-styling, `Trash2`)
- `<SharePraatplaatModal>` mounted indien `classCode` aanwezig

### 11.2 `CreatePraatplaatModal.tsx` — [`src/components/teacher/CreatePraatplaatModal.tsx`](../src/components/teacher/CreatePraatplaatModal.tsx)

```typescript
interface CreatePraatplaatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate(params: { name; themeId; locationId; imageUrl }): Promise<void>;
}
```

**Internal type:**
```typescript
interface SelectedImage {
  source: 'library' | 'theme';
  id: string;
  imageUrl: string;
  displayName: string;
  themeId?: string;  // alleen bij source='theme'
}
```

**State:** `name`, `selected`, `showThemeImages`, `saving`, `error`, `previewImage`

**UI-secties:**
1. Naam-input (max 200 chars, optioneel — auto-fallback bij leeg)
2. **Bibliotheek-grid:** universele praatplaat-images (`praatplaatImages.ts` met `availableFor: 'teacher' | 'both'`)
3. **Thema-images sectie** (collapsible, ChevronDown rotatie):
   - Per thema: groep-header + locaties-grid
   - Per location: aspect-video thumbnail met selected-state border + ZoomIn-preview-knop
4. Foutmelding (indien)
5. Acties: Cancel + Create (primary, disabled bij `!selected || saving`)

**ImageLightbox-overlay** voor zoom-preview vóór selectie.

**Submit-logica:**
```typescript
const finalName = name.trim() || `${selected.displayName} - ${dd-mm-yyyy}`;
const themeId = selected.source === 'theme' ? selected.themeId! : 'general';
const locationId = selected.id;
await onCreate({ name: finalName, themeId, locationId, imageUrl: selected.imageUrl });
```

### 11.3 `SharePraatplaatModal.tsx` — [`src/components/teacher/SharePraatplaatModal.tsx`](../src/components/teacher/SharePraatplaatModal.tsx)

```typescript
interface SharePraatplaatModalProps {
  isOpen, onClose, classCode, praatplaatName, praatplaatId
}
```

**State (twee parallelle sets):**
- Klascode-link: `copied`, `showQr`, `qrDataUrl`
- Share-link (#73): `shareCode`, `shareLoading`, `shareError`, `shareCopied`, `shareQrDataUrl`, `showShareQr`

**Computed URLs:**
```typescript
const shareUrl   = `${origin}${pathname}?pp=${classCode}`;
const shareUrl2  = `${origin}${pathname}?pp-share=${shareCode}`;
```

**Effects:**
- QR-generatie (twee parallel) via `QRCode.toDataURL(url, { width: 280, margin: 2 })`
- Reset state effect bij `isOpen=false` om stale state te voorkomen

**Handlers:**
- `handleCopy()` / `handleCopyShareLink()`: clipboard-API met fallback (temp input + execCommand)
- `handleGenerateShareLink()`: roept `sharePraatplaat(praatplaatId)` aan, set state, toont expiry-info

**UI-secties:**
1. Klascode-link: code-display, copy-knop, QR-toggle
2. Share-link (`border-t pt-4`): generate-knop OF code-display + copy + expiry-tekst + QR

### 11.4 `PraatplaatViewer.tsx` — [`src/components/praatplaat/PraatplaatViewer.tsx`](../src/components/praatplaat/PraatplaatViewer.tsx)

```typescript
interface PraatplaatViewerProps {
  praatplaat: PraatplaatRow;
  classId?: string;
  onClose: () => void;
}
```

**State:** `submissions`, `loading`, `error`, `playingSubmissionId`, `audioLoading`, `errorSubmissionId`, `timelineSubmission`, `clusters`, `dropdownCluster`

**Effects:**
1. **Data fetch:** `getPraatplaatSubmissions(praatplaat.id, classId)` → `clusterSubmissions(data)`. Indien `classId` ontbreekt: skip (preview-mode, alleen image)
2. **Playback-end listener:** abonneer op `audioService.onPlaybackEnd()` → `playingSubmissionId = null`
3. **Unmount cleanup:** `audioService.stop()`

**Belangrijke handlers:**

**`playSubmission(sub)`:**
```typescript
audioService.stop();
if (sub.id === playingSubmissionId) { setPlayingSubmissionId(null); return; }
setPlayingSubmissionId(sub.id);
setAudioLoading(true);
await audioService.initialize();
const { samples = [], tracks = [], totalBeats = 32, isLooping = false } = sub.composition_data;
if (samples.length > 0) await audioService.loadSamples(samples);
audioService.scheduleTimeline(tracks, samples);
audioService.setLoop(isLooping, totalBeats);
audioService.play(0);
setAudioLoading(false);
// error-pad: setErrorSubmissionId, auto-clear na 3s
```

**`handleSpotClick(cluster)`:** 1 → playSubmission; 2+ → setDropdownCluster

**`handleShowTimeline()`:** stopt audio, snapshot `playingSubmission` naar `timelineSubmission` (ontkoppelde lifecycle voor SubmissionPlayer-overlay; voorkomt unmount op playback-end)

**UI-structuur:**
- Fixed overlay (inset-0, z-50, zwarte achtergrond)
- Header (absolute top): naam links, refresh + close rechts (gradient zwart→transparant)
- Centraal: image container (aspect-video), met PraatplaatSpot-cluster mappings
- Dropdown bij multi-cluster: backdrop + menu min-w-[160px]
- Playback-bar (absolute bottom): "naam — compositie" + Toon timeline + Stop
- Empty-state (gecentreerd) wanneer geen submissions
- SubmissionPlayer-overlay (mount op `timelineSubmission`)

---

## 12. Frontend Components — Student & Public

### 12.1 `PraatplaatSelectScreen.tsx` — [`src/components/praatplaat/PraatplaatSelectScreen.tsx`](../src/components/praatplaat/PraatplaatSelectScreen.tsx)

Geen props (leest uit appStore).

**State:** `selectedPos`, `imageRef`

**Handlers:**

**`handleImageClick(e)`:** ondersteunt mouse + touch:
```typescript
const rect = imageRef.current.getBoundingClientRect();
const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
setSelectedPos({ x, y });
```

**`handleKeyDown(e)`:** Enter/Space → center (0.5, 0.5) of confirm

**`handleConfirm()`:**
```typescript
setPraatplaatPosition(selectedPos);
const storyboard = praatplaatToStoryboard(activePraatplaat);
setActiveStoryboard(storyboard);
setComposeMode('image');
goToMap();
```

**UI:**
- Gradient brand-900 → brand-800
- Header: back-knop (goToStart), titel, spacer
- Instructie: dynamisch (kies plek vs. bevestig)
- Image container: aspect-video, crosshair-cursor, `pointer-events-none` op `<img>`, `select-none`, role=button, tabIndex=0, autoFocus
- Selected marker: MapPin (accent-500) met bounce-animatie + driehoek-pointer
- Footer: Bevestig-knop (primary) of tap-hint

### 12.2 `SharedPraatplaatViewer.tsx` — [`src/components/praatplaat/SharedPraatplaatViewer.tsx`](../src/components/praatplaat/SharedPraatplaatViewer.tsx)

```typescript
interface SharedPraatplaatViewerProps {
  code: string;
  onBack: () => void;
}
```

**State machine:**
```typescript
type ViewerState = 'loading' | 'waiting-gesture' | 'ready' | 'error' | 'not-found' | 'expired';
```

**Effects:**
1. **Data fetch:** `getSharedPraatplaat(code)` met cancel-flag → null = `'not-found'`, error message bevat 'verlopen'/'expired' = `'expired'`, success = `'waiting-gesture'`
2. **Playback-end listener** (idem PraatplaatViewer)
3. **Unmount cleanup:** `audioService.stop()`

**`handleStartListening()` (kritisch voor browser-policy):**
```typescript
await Tone.start();              // user gesture compliance
await audioService.initialize();
setViewerState('ready');
```

**Render-states:** elke state heeft eigen UI:
- `'loading'`: spinner + "Laden..."
- `'not-found'`: foutmelding + back
- `'expired'`: link verlopen + back
- `'error'`: error message + back
- `'waiting-gesture'`: praatplaat-naam + count + [Luister naar de praatplaat]-knop + back link
- `'ready'`: zelfde UI als PraatplaatViewer maar zonder docent-features

**Verschillen t.o.v. PraatplaatViewer:**
- Publieke toegang, geen auth
- Vereist user gesture voor audio-init (`Tone.start()`)
- State machine ipv losse booleans
- Geen refresh-knop (data is statisch per page-load, plus view_count++ server-side)

### 12.3 `PraatplaatSpot.tsx` — [`src/components/praatplaat/PraatplaatSpot.tsx`](../src/components/praatplaat/PraatplaatSpot.tsx)

```typescript
interface PraatplaatSpotProps {
  submissions: PraatplaatSubmission[];
  x: number;  // 0-1
  y: number;  // 0-1
  isPlaying: boolean;
  hasError?: boolean;
  onClick: () => void;
}
```

**State:** `isHovered: boolean` (voor tooltip)

**UI:**
- Outer container: `absolute`, positioned via `left: x*100%`, `top: y*100%`, `-translate-x/y-1/2`, z-10
- Knop (`w-10 h-10 sm:w-12 sm:h-12`, `rounded-full`, `border-3`):
  - **Error:** `bg-error-100 border-error-400`
  - **Playing:** `bg-accent-500 border-accent-600 scale-110 animate-pulse` + accent-glow
  - **Default:** `bg-white/40 backdrop-blur-sm border-accent-400 hover:scale-110`
  - Icon: `Volume2` (default) of `AlertCircle` (error)
  - Count-badge bij ≥2 submissions: `absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-accent-500 text-white text-xs font-bold` (white bg + accent text bij playing)
- Hover-tooltip: `absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg`
  - Inhoud: error-text, single student-naam, of "naam1, naam2, ..."

**A11y:** `type="button"`, `aria-label` met error/student/count info.

---

## 13. Utilities

### 13.1 `praatplaatClustering.ts` — [`src/utils/praatplaatClustering.ts`](../src/utils/praatplaatClustering.ts)

```typescript
export interface ClusterableSubmission { position_x: number; position_y: number }
export interface SpotCluster<T extends ClusterableSubmission> { x: number; y: number; submissions: T[] }

const CLUSTER_THRESHOLD = 0.05;  // 5% van afbeeldings-dimensies

export function clusterSubmissions<T extends ClusterableSubmission>(submissions: T[]): SpotCluster<T>[]
```

**Algoritme:**
1. Itereer submissions in ontvangst-volgorde
2. Voor elke submission: zoek bestaande cluster binnen `CLUSTER_THRESHOLD` (Chebyshev-distance: `Math.abs(cluster.x - sub.x) < 0.05 && Math.abs(cluster.y - sub.y) < 0.05`)
3. Match → push naar cluster, herbereken centroid: `x = sum(all_x)/count`, idem y
4. Geen match → nieuwe cluster met `submissions = [submission]`
5. Returnt array van clusters

**Eigenschappen:**
- Chebyshev-distance (max van absolute delta's), niet Euclidisch
- O(n²) worst-case (acceptabel voor klasgroottes ~30)
- Volgorde-afhankelijk: vroege submissions definiëren initiële cluster-centra
- Generiek getypt — gedeeld tussen `PraatplaatViewer` (teacher) en `SharedPraatplaatViewer` (public)

### 13.2 `praatplaatStoryboard.ts` — [`src/utils/praatplaatStoryboard.ts`](../src/utils/praatplaatStoryboard.ts)

```typescript
export function praatplaatToStoryboard(
  praatplaat: Pick<ActivePraatplaat, 'id' | 'name' | 'imageUrl' | 'themeId'>
): Storyboard
```

Converteert een praatplaat naar een **virtuele Storyboard**:
```typescript
{
  id: `praatplaat-${praatplaat.id}`,
  themeId: praatplaat.themeId,
  name: praatplaat.name,
  description: 'Praatplaat',
  coverImage: praatplaat.imageUrl,
  images: [{
    id: praatplaat.id,
    url: praatplaat.imageUrl,
    label: praatplaat.name,
  }],
}
```

**Doel:** bestaande studio-UI kan praatplaat-image renderen zonder dedicated code-pad. Slechts 1 image in `images`-array (single image mode). Storyboard-ID begint met `'praatplaat-'` om te onderscheiden van template-storyboards.

**Gebruik:**
1. `PraatplaatSelectScreen.handleConfirm` na positie-keuze
2. `compositionInit.hydrateCompositionContext` bij heropen van saved composition

---

## 14. Routing & Deep Links

### 14.1 Screens (in `App.tsx`)

```typescript
const PraatplaatSelectScreen   = lazy(() => import('./components/praatplaat/PraatplaatSelectScreen'));
const SharedPraatplaatViewer   = lazy(() => import('./components/praatplaat/SharedPraatplaatViewer'));
```

Twee nieuwe `GameScreen`-cases: `'praatplaat-select'` en `'shared-praatplaat'`. Beide lazy-loaded met `<Suspense>` + `FeatureErrorBoundary`.

### 14.2 Deep links (App.tsx queryparam-handling)

**`?pp=KLASCODE` (4-digit):**
```typescript
if (ppCode) {
  // URL meteen schoonmaken (geen rest in adresbalk)
  cleanUrl();
  await lookupAndRouteAssignment(ppCode);  // routet via AssignmentLandingScreen (#78)
  // Bij failure: terug naar start
}
```

**`?pp-share=CODE` (8-char):**
```typescript
if (ppShareCode) {
  cleanUrl();
  goToSharedPraatplaat(ppShareCode);  // → currentScreen = 'shared-praatplaat', sharedPraatplaatCode
}
```

### 14.3 Code-fallback chain in `ShareCodeInput.tsx`

```typescript
if (/^\d{4}$/.test(code)) {
  await lookupAndRouteAssignment(code);     // 4-digit klascode
} else if (/^[A-Z0-9]{6}$/i.test(code)) {
  await loadSavedComposition(code);         // 6-char bewaarcode
} else if (/^[A-Z0-9]{8}$/i.test(code)) {
  // 8-char fallback chain:
  const tpl = await getTemplateByCode(code);
  if (tpl) { /* template */ }
  else {
    const shared = await getSharedComposition(code);
    if (shared) { /* compositie share */ }
    else {
      const ppShare = await getSharedPraatplaat(code);
      if (ppShare) { goToSharedPraatplaat(code); }
      else { /* not found */ }
    }
  }
}
```

### 14.4 Document title-updates (App.tsx)

Per screen worden er `document.title`-mappings ingesteld voor `'praatplaat-select'` en `'shared-praatplaat'`.

---

## 15. Studio Integratie (#80 — Zoom)

[`src/components/studio/storytelling/StorytellingPanel.tsx`](../src/components/studio/storytelling/StorytellingPanel.tsx)

**Detectie:**
```typescript
const hasPraatplaatZoom = !!praatplaatPosition;
const [isZoomed, setIsZoomed] = useState(hasPraatplaatZoom);  // default: ingezoomd
```

**Zoom-berekening:**
```typescript
const ZOOM_LEVEL = 2.5;
// Clamp transformOrigin om crop binnen image te houden:
const minOrigin = (1 / ZOOM_LEVEL) / 2;  // 0.2 (20%)
const maxOrigin = 1 - minOrigin;          // 0.8 (80%)
const originX = Math.max(minOrigin, Math.min(maxOrigin, position.x)) * 100;
const originY = Math.max(minOrigin, Math.min(maxOrigin, position.y)) * 100;
const transform = `scale(${ZOOM_LEVEL})`;
const transformOrigin = `${originX}% ${originY}%`;
```

**Toggle-knop:**
- Alleen rendered als `hasPraatplaatZoom`
- Icon wisselt tussen `Crosshair` (zoom in) en `Maximize2` (full view)
- i18n-keys `studio.praatplaatZoomIn` / `studio.praatplaatZoomOut`
- Top-right gepositioneerd

---

## 16. Stage Integratie

[`src/components/stage/StageView.tsx`](../src/components/stage/StageView.tsx)

### 16.1 Success-modal trigger

```typescript
const showPraatplaatSuccess = praatplaatSubmitted && !!activePraatplaat && !praatplaatSuccessDismissed;
```

Modal opent automatisch zodra `praatplaatSubmitted` van `useStageSave` op `true` springt. Toont een MapPin-icoon, message via `stage.praatplaatSuccessMessage`, twee acties:
- **[Ga verder met deze compositie]** — sluit modal (dismissed=true)
- **[Kies een nieuwe plek]** — opent confirmation modal voor nieuwe-spot-flow

### 16.2 Permanente "Nieuwe plek"-knop

```typescript
{praatplaatSubmitted && activePraatplaat && (
  <Button variant="ghost" onClick={openNewSpotModal}>
    {t('stage.praatplaatNewSpot')}
  </Button>
)}
```

Blijft zichtbaar zolang submission geslaagd is en praatplaat-context actief.

### 16.3 `handleNewSpot()` flow

```typescript
const handleNewSpot = useCallback(() => {
  stopAll();
  clearAllTracks();
  useAppStore.setState({
    praatplaatPosition: null,
    submissionId: null,
    submissionSynced: false,
  });
  useLibraryStore.getState().clearLibrary();
  setPraatplaatSuccessDismissed(true);
  goToPraatplaatSelect();
}, [...]);
```

Cruciaal: `activePraatplaat` en `classSession` blijven behouden. Alleen positie + submissionId + library worden gereset zodat de volgende save een NIEUWE submission op een nieuwe plek wordt.

---

## 17. Persistence & Hydration

### 17.1 Snapshot in opgeslagen composities

Zowel `SavedComposition` (localStorage) als `CompositionData` (Supabase) bevatten optionele `praatplaat` + `praatplaatPosition` velden. Deze worden gevuld door `useStageSave` bij elke save als de praatplaat-context actief is.

### 17.2 `compositionInit.ts.hydrateCompositionContext`

[`src/utils/compositionInit.ts`](../src/utils/compositionInit.ts)

```typescript
export interface CompositionContextInput {
  praatplaat?: ActivePraatplaat;
  praatplaatPosition?: PraatplaatPosition;
  storyboardId?: string;
  // ...
}

export function hydrateCompositionContext(input: CompositionContextInput) {
  // Praatplaat heeft VOORRANG op storyboard:
  if (input.praatplaat) {
    setPraatplaat(input.praatplaat);
    if (input.praatplaatPosition) setPraatplaatPosition(input.praatplaatPosition);
    setActiveStoryboard(praatplaatToStoryboard(input.praatplaat));
    setComposeMode('image');
    return;
  }
  // Anders: detecteer orphaned praatplaat-* storyboard ID
  if (input.storyboardId?.startsWith('praatplaat-')) {
    logger.warn('Orphaned praatplaat-storyboard detected; resetting');
    return;  // val terug op default behavior
  }
  // Normale storyboard restoration...
}
```

### 17.3 Class-code submissions met praatplaat

De backend bewaart `praatplaat_id`, `position_x`, `position_y`, `assignment_id` en `assignment_type` op de submission. Bij heropen van submissions in de docent-dashboard wordt deze metadata gebruikt voor labels en filtering.

---

## 18. i18n Keys

Locaties: [`src/i18n/locales/nl.json`](../src/i18n/locales/nl.json) en [`src/i18n/locales/en.json`](../src/i18n/locales/en.json).

### 18.1 Studio-zoom (#80)

| Key | NL | EN |
|---|---|---|
| `studio.praatplaatZoomIn` | "Zoom naar mijn plek" | "Zoom to my spot" |
| `studio.praatplaatZoomOut` | "Toon volledige afbeelding" | "Show full image" |

### 18.2 Stage feedback

| Key | NL |
|---|---|
| `stage.praatplaatSubmitted` | "Je compositie staat op de praatplaat!" |
| `stage.praatplaatSuccessTitle` | "Gelukt!" |
| `stage.praatplaatSuccessMessage` | "Je compositie is op de praatplaat geplaatst. De docent kan deze nu afspelen op het digibord!" |
| `stage.praatplaatContinue` | "Ga verder met deze compositie" |
| `stage.praatplaatNewSpot` | "Kies een nieuwe plek" |

### 18.3 Leerling-positie-keuze

| Key | NL |
|---|---|
| `praatplaat.select.instruction` | "Klik op de plaats waar je de compositie wilt plaatsen" |
| `praatplaat.select.confirmHint` | "Druk op de knop om te bevestigen" |
| `praatplaat.select.confirm` | "Bevestigen" |
| `praatplaat.select.tapHint` | "Tik op de afbeelding om een plek te kiezen" |
| `praatplaat.select.imageAria` | (a11y label) |

### 18.4 AssignmentLanding (#78)

| Key | NL |
|---|---|
| `assignmentLanding.praatplaat.kind` | "Opdracht: Praatplaat" |
| `assignmentLanding.praatplaat.description` | "Plaats je compositie op de praatplaat. Klik op een plek op de afbeelding en maak je compositie." |

### 18.5 Teacher dashboard

| Key | NL |
|---|---|
| `teacher.praatplaat.create` | "Nieuwe praatplaat" |
| `teacher.praatplaat.activateError` | (foutmelding) |
| `teacher.praatplaat.deactivateError` | (idem) |
| `teacher.praatplaat.deleteError` | (idem) |
| `teacher.praatplaat.fetchError` | (idem) |
| `teacher.praatplaat.share` | "Delen" |
| `teacher.praatplaat.shareTitle` | "Deel praatplaat" |
| `teacher.praatplaat.shareDescription` | "Deel deze link zodat leerlingen direct naar de praatplaat \"{{name}}\" worden geleid." |
| `teacher.praatplaat.openPraatplaat` | "Open praatplaat" |
| `teacher.praatplaat.viewer.showTimeline` | "Toon timeline" |
| `teacher.praatplaat.viewer.stop` | "Stoppen" |
| `teacher.praatplaat.viewer.emptyTitle` | (lege state) |
| `teacher.praatplaat.viewer.emptyDescription` | (idem) |
| `teacher.praatplaat.submissionCount` | "{{count}} inzending(en)" |
| `teacher.praatplaat.fetchSubmissionsError` | (foutmelding) |
| `teacher.praatplaat.playbackError` | (idem) |

### 18.6 Shared praatplaat (#73)

| Key | NL |
|---|---|
| `sharedPraatplaat.fetchError` | (foutmelding) |
| `sharedPraatplaat.audioError` | (idem) |
| `sharedPraatplaat.errorTitle` | (idem) |
| `sharedPraatplaat.errorDescription` | (idem) |
| `sharedPraatplaat.notFoundTitle` | (idem) |
| `sharedPraatplaat.notFoundDescription` | (idem) |
| `sharedPraatplaat.expiredTitle` | (idem) |
| `sharedPraatplaat.expiredDescription` | (idem) |
| `sharedPraatplaat.submissionCount` | "{{count}} compositie(s) op de praatplaat" |
| `sharedPraatplaat.noSubmissions` | "Er zijn nog geen composities op deze praatplaat" |
| `sharedPraatplaat.gestureHint` | "Klik op de knop hieronder om de praatplaat te openen" |
| `sharedPraatplaat.startListening` | "Luister naar de praatplaat" |
| `sharedPraatplaat.emptyTitle` | (lege state) |
| `sharedPraatplaat.emptyDescription` | (idem) |
| `sharedPraatplaat.backToStart` | "Terug naar start" |

---

## 19. Security & RLS

### 19.1 RLS-policies op `praatplaten`

```sql
ALTER TABLE public.praatplaten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own praatplaten"   ON public.praatplaten FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can create praatplaten"     ON public.praatplaten FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own praatplaten" ON public.praatplaten FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own praatplaten" ON public.praatplaten FOR DELETE USING (auth.uid() = teacher_id);

-- #73 sharing — anonieme SELECT toegestaan op gedeelde praatplaten:
CREATE POLICY "Anyone can read shared praatplaten" ON public.praatplaten FOR SELECT
  USING (share_code IS NOT NULL AND (share_expires_at IS NULL OR share_expires_at > NOW()));
```

### 19.2 RLS op `class_assignments`

Identiek patroon: alleen owner-teacher mag SELECT/INSERT/UPDATE/DELETE.

### 19.3 SECURITY DEFINER pattern

Alle public RPCs (`get_active_praatplaat`, `submit_or_update_composition`, `get_shared_praatplaat`) gebruiken `SECURITY DEFINER`:
- Bypassen RLS op intermediate joins
- Doen ownership/validity checks intern
- Activeren rate limiting vóór business-logica

### 19.4 Cross-collision avoidance

`generate_praatplaat_share_code()` checkt zowel `praatplaten.share_code` als `submissions.share_code` om botsingen tussen praatplaat-shares en compositie-shares te voorkomen. Karakter-set zonder ambigue tekens (geen `I`, `L`, `O`, `1`).

### 19.5 Idempotentie

`submit_or_update_composition` gebruikt client-UUID + `INSERT ... ON CONFLICT DO UPDATE`:
- Verloren netwerk-respons → retry met zelfde UUID = UPDATE i.p.v. duplicate
- Geen race-condition bij meerdere snel achter elkaar saves

### 19.6 Composition-data validatie

`getPraatplaatSubmissions` en `getSharedPraatplaat` valideren elke `composition_data` met Zod (`parseCompositionData`). Ongeldige inzendingen worden eruit gefilterd en gelogd — voorkomt crashes bij corrupte data.

---

## 20. Edge Cases & Known Risks

| # | Risico | Impact | Mitigatie |
|---|---|---|---|
| 1 | Positie aan rand → cluster valt buiten image | Laag | Clamping in `handleImageClick` ([0,1]); cluster-centroid blijft in image |
| 2 | Docent verwijdert actieve praatplaat tijdens leerling-werk | Medium | FK CASCADE: submissions worden mee verwijderd; submit faalt graceful met foutmelding |
| 3 | Browser-refresh na positie-keuze | Laag | `praatplaatPosition` is ephemeral; leerling herhaalt klascode-flow |
| 4 | Multi-spot zonder reset → 2e save overschrijft 1e | Medium | "Nieuwe plek"-flow expliciet reset `submissionId` en `praatplaatPosition` |
| 5 | Gedeelde devices: leerling A start, B opent | Laag | Pragmatic: `ClassSessionBadge` toont student-naam; geen hard lock |
| 6 | Share-link expiry tijdens publieke session | Laag | Modal toont "Link verlopen"; docent kan herdelen (verlengt 30 dagen) |
| 7 | Audio-init zonder user gesture (browser-policy) | Hoog (visueel) | `SharedPraatplaatViewer` heeft expliciete `'waiting-gesture'`-state met "Luister"-knop |
| 8 | Cluster-volgorde bepaalt centroid (niet-deterministisch) | Laag | Acceptabel; ordering komt van DESC `created_at` (bekend) |
| 9 | Race: 2 saves binnen 1 seconde door dubbel-klikken | Laag | `submit_or_update_composition` is idempotent via client-UUID |
| 10 | Storyboard-id `'praatplaat-X'` zonder bijbehorende praatplaat-snapshot (orphaned) | Laag | `hydrateCompositionContext` detecteert + reset + logger.warn |

---

## 21. File Index

| Bestand | Rol |
|---|---|
| [`src/lib/praatplaat.ts`](../src/lib/praatplaat.ts) | RPC-wrappers met i18n-errors en validatie |
| [`src/lib/assignments.ts`](../src/lib/assignments.ts) | Universele `getActiveAssignment` |
| [`src/hooks/usePraatplaten.ts`](../src/hooks/usePraatplaten.ts) | Docent CRUD + optimistic updates |
| [`src/hooks/useClassAssignment.ts`](../src/hooks/useClassAssignment.ts) | Activatie templates + praatplaten |
| [`src/hooks/useStageSave.ts`](../src/hooks/useStageSave.ts) | Auto-submit met positie + `praatplaatSubmitted` flag |
| [`src/utils/praatplaatClustering.ts`](../src/utils/praatplaatClustering.ts) | Spot-clustering algoritme |
| [`src/utils/praatplaatStoryboard.ts`](../src/utils/praatplaatStoryboard.ts) | Virtuele Storyboard-conversie |
| [`src/utils/compositionInit.ts`](../src/utils/compositionInit.ts) | Hydration van praatplaat-context bij heropen |
| [`src/stores/appStore.ts`](../src/stores/appStore.ts) | State + acties |
| [`src/types/index.ts`](../src/types/index.ts) | Type-definities |
| [`src/data/praatplaatImages.ts`](../src/data/praatplaatImages.ts) | Bibliotheek-images registry |
| [`src/components/praatplaat/PraatplaatSelectScreen.tsx`](../src/components/praatplaat/PraatplaatSelectScreen.tsx) | Leerling positie-keuze |
| [`src/components/praatplaat/PraatplaatViewer.tsx`](../src/components/praatplaat/PraatplaatViewer.tsx) | Docent-presentatie viewer |
| [`src/components/praatplaat/SharedPraatplaatViewer.tsx`](../src/components/praatplaat/SharedPraatplaatViewer.tsx) | Public viewer (#73) |
| [`src/components/praatplaat/PraatplaatSpot.tsx`](../src/components/praatplaat/PraatplaatSpot.tsx) | Individuele spot-icoon |
| [`src/components/teacher/PraatplaatCard.tsx`](../src/components/teacher/PraatplaatCard.tsx) | Dashboard-card |
| [`src/components/teacher/CreatePraatplaatModal.tsx`](../src/components/teacher/CreatePraatplaatModal.tsx) | Create-modal |
| [`src/components/teacher/SharePraatplaatModal.tsx`](../src/components/teacher/SharePraatplaatModal.tsx) | Share-modal met QR |
| [`src/components/teacher/ClassDetail.tsx`](../src/components/teacher/ClassDetail.tsx) | Praatplaat-sectie in dashboard |
| [`src/components/share/ShareCodeInput.tsx`](../src/components/share/ShareCodeInput.tsx) | Code-fallback-chain |
| [`src/components/stage/StageView.tsx`](../src/components/stage/StageView.tsx) | Success-modal + nieuwe-plek |
| [`src/components/studio/storytelling/StorytellingPanel.tsx`](../src/components/studio/storytelling/StorytellingPanel.tsx) | 2.5× zoom (#80) |
| [`src/App.tsx`](../src/App.tsx) | Screen-routing + deeplinks |
| [`src/i18n/locales/nl.json`](../src/i18n/locales/nl.json) / [`en.json`](../src/i18n/locales/en.json) | Vertalingen |
| [`supabase/migrations/005_praatplaten.sql`](../supabase/migrations/005_praatplaten.sql) | Kerntabel + RPCs |
| [`supabase/migrations/006_class_assignments.sql`](../supabase/migrations/006_class_assignments.sql) | Polymorf assignment-systeem |
| [`supabase/migrations/008_praatplaat_nullable_class.sql`](../supabase/migrations/008_praatplaat_nullable_class.sql) | `class_id` nullable |
| [`supabase/migrations/009_hard_delete_cascade.sql`](../supabase/migrations/009_hard_delete_cascade.sql) | FK CASCADE |
| [`supabase/migrations/010_submission_assignment_tracking.sql`](../supabase/migrations/010_submission_assignment_tracking.sql) | `assignment_id` + `assignment_type` kolommen |
| [`supabase/migrations/011_submit_or_update_rpc.sql`](../supabase/migrations/011_submit_or_update_rpc.sql) | Idempotente submit |
| [`supabase/migrations/012_praatplaat_share.sql`](../supabase/migrations/012_praatplaat_share.sql) | Public sharing |

---

## 22. Migration Order

Chronologische uitvoervolgorde van SQL-migraties:

1. **`005_praatplaten.sql`** — initiële tabel, submissions-extensie, kern-RPCs, RLS
2. **`008_praatplaat_nullable_class.sql`** — `class_id` nullable; voorbereiding voor unified architectuur
3. **`006_class_assignments.sql`** — polymorfe `class_assignments`, unified activation, `get_active_assignment`, data-migratie, opruim oude trigger/index
4. **`009_hard_delete_cascade.sql`** — FK SET NULL → CASCADE (submissions cascadeert mee bij delete)
5. **`010_submission_assignment_tracking.sql`** — `assignment_id` + `assignment_type` kolommen voor labeling
6. **`011_submit_or_update_rpc.sql`** — idempotente universele submit-functie
7. **`012_praatplaat_share.sql`** — public sharing met expiry + view counter

> **Let op:** migratie-volgorde 008 → 006 (intentioneel: 008 maakt 006 mogelijk).

---

## 23. Future Extensions (Opname-Praatplaat & meer)

### 23.1 Opname-praatplaat (#28-variant) — uitgebreid ontworpen, niet gebouwd

Bron: [PLAN-OPNAME-PRAATPLAAT.md](./PLAN-OPNAME-PRAATPLAAT.md), brainstorm v0.2 (2026-04-13).

**Concept:** lichtgewicht variant waarbij leerlingen een korte audioclip (max 15s) opnemen met device-microfoon i.p.v. componeren in de studio. Tap op afbeelding → opnemen → indienen.

**Architecturele beslissing — Scenario A:**
- Twee aparte praatplaat-types: `type: 'compositie'` (bestaand) vs `type: 'opname'` (nieuw)
- Per praatplaat kiest docent ÉÉN type bij aanmaken (niet hybride in v1)
- Deur open voor toekomstige migratie naar hybride (Scenario B) zonder schema-wijziging

**V1 → V3 progression:**

| Versie | Scope |
|---|---|
| **v1 (MVP)** | Opnemen (max 15s), her-opnemen, plaatsen, eenmalige inzending, docent speelt af in viewer |
| **v2** | Docent past max-duur per praatplaat aan; kan individuele opnames resetten/verwijderen |
| **v3** | "Docent-studio": opnames verschijnen als samples in een studio-sessie; docent plaatst ze op timeline + exporteert als één compositie |

**Database (toekomstige migratie 013):**
```sql
ALTER TABLE praatplaten ADD:
  type TEXT NOT NULL DEFAULT 'compositie' CHECK (type IN ('compositie', 'opname')),
  max_recording_seconds INT DEFAULT 15 CHECK (BETWEEN 5 AND 120),
  allow_multiple_spots BOOLEAN DEFAULT FALSE;

ALTER TABLE submissions ADD:
  recording_path TEXT NULL,
  recording_duration_ms INT NULL CHECK (BETWEEN 500 AND 120000),
  recording_mime TEXT NULL;

-- XOR-constraint: precies één van composition_data of recording_path
CONSTRAINT submissions_content_xor CHECK (
  (composition_data IS NOT NULL AND recording_path IS NULL) OR
  (composition_data IS NULL AND recording_path IS NOT NULL)
);
```

**Storage-architectuur:**
- Bucket: `praatplaat-recordings` (private)
- Pad: `{teacher_id}/{praatplaat_id}/{submission_id}.webm`
- Pattern: client vraagt signed upload-URL (5min TTL) → uploadt blob → finaliseert via RPC
- Geen directe anon-key uploads (volgt #52 rate-limit + ownership-check pattern)

**Geplande RPCs:**
- `request_recording_upload_url(class_code, praatplaat_id)` → submission_id + signed URL
- `finalize_recording_submission(submission_id, ..., position_x, position_y, duration_ms, mime)` → INSERT + verifieer file aanwezig
- `get_praatplaat_recordings(praatplaat_id, class_id?)` → array met signed URLs (1u TTL)
- `delete_recording_submission(submission_id)` (v2)

**Audio engine:**
- **Format:** WebM/Opus primary, MP4/AAC fallback (Safari 18.4+ ondersteunt nu WebM/Opus cross-platform)
- **Bitrate:** 64-96 kbps mono Opus → ~180KB per 15s
- **Library:** eigen `useMicRecorder`-hook (~80-100 LOC) i.p.v. externe lib (RecordRTC, react-media-recorder afgewezen — overkill of outdated)
- **Shared AudioContext** met Tone.js via `Tone.getContext().rawContext`

**Permission state machine:**
```
idle → requesting-permission → ready → recording → stopped → [error]
                            ↘ permission-denied / no-device
```

**UI-flow leerling (8 stappen):**
1. Klascode → device-check `isRecordingSupported()` → route naar `recording-praatplaat` screen
2. Tap op image-positie → marker
3. Optioneel naam-veld
4. Bevestig → recording-panel
5. Recording-panel:
   - Grote rode opnameknop (64px+, touch-friendly)
   - Timer 0:00 → max-duur (auto-stop)
   - Waveform-meter via AnalyserNode
6. Na opname: preview met play/pause + waveform; her-opname-knop; positie-wijzigen-knop; Verzenden (primary)
7. Upload-flow: PUT naar signed URL → finalize RPC → localStorage soft-lock → success
8. Indien `allow_multiple_spots`: post-submit "nog een geluid?" keuze

**Docent-viewer (toggle-play, zonder bar):**
- Detecteert `type === 'opname'` → laadt via `get_praatplaat_recordings()` (signed URLs)
- Spot-interactie: tap mic-icoon → speelt af (icoon pulseert); tap zelfde = stop; tap ander = switcht
- GEEN playback-bar (icoon zelf is de knop)
- Cluster met meerdere opnames: compacte dropdown
- Optionele detail-overlay (long-press): naam + duur + play + delete-knop (v2)

**Privacy & ethiek (§6 PLAN-OPNAME-PRAATPLAAT.md):**
- AVG/GDPR: stemopnames = persoonsgegevens
- Rolverdeling: school = controller, SoundScout = processor → **verwerkersovereenkomst nodig vóór pilot**
- Inappropriate content: v1 stop-knop docent + headphone/speaker icons (preview hint); v1.5 optionele moderation inbox; v2 individuele delete door docent
- Microphone permission: school-managed Chromebooks kunnen blokkeren → expliciete error UI + IT-link
- Upload validation server-side: geen client-trust; hard max-duur, 2MB size limit, MIME whitelist (webm/mp4/ogg)

**Retention:**
- Soft delete + grace period
- `last_activity_at` op praatplaten (bij elke nieuwe opname / docent-view / activate)
- Na 4 weken inactief → `pending_deletion_at = NOW() + 30 days`
- Geen actuele deletion — alleen markering
- Handmatige definitieve deletion door owner
- Minimum totaal: ~8 weken
- Storage-impact: 25 opnames × 180KB = 4.5MB per praatplaat (verwaarloosbaar)

**11 risico's met mitigaties** (zie PLAN-OPNAME-PRAATPLAAT.md §8 voor volledige tabel):
inappropriate content, MediaRecorder unsupported, mic permission blocked, AVG/parent objection, storage costs, client-side upload failures, incognito bypass, XOR constraint regression, simultaneous submissions, signed URL leaks, Tone.js + `<audio>` conflicts.

**6 succes-metrics (6 weken post-launch):**
- Recordings praatplaten per docent ≥ 1
- Submission-ratio (submissions / actieve leerlingen) ≥ 60%
- Re-record acties per submission: 1-3 = healthy, >5 = friction
- Failed uploads < 3%
- Ratio opname:compositie per docent ≤ 40% (niet verwateren van compositie-focus)
- Deletion requests (v2) — voor schatting van moderation-noodzaak

**Frontend-architectuur (nieuw + wijzigingen):**
```
src/
├── components/recording/RecordingPanel.tsx (universeel, herbruikbaar)
├── components/praatplaat/recording/
│   ├── RecordingPraatplaatScreen.tsx (orchestrator)
│   ├── RecordingPositionStep.tsx
│   ├── RecordingCaptureStep.tsx
│   ├── RecordingSubmitStep.tsx
│   └── RecordingSpot.tsx (mic-icoon variant)
├── hooks/useMicRecorder.ts (MediaRecorder wrapper)
├── hooks/useRecordingUpload.ts (upload + finalize)
├── lib/praatplaatRecording.ts (RPC-wrappers)
└── utils/audioFormat.ts (pickBestMimeType, isRecordingSupported)
```

Wijzigingen in bestaande bestanden: `types/index.ts` (PraatplaatType), `appStore.ts` (recording-screen + step-state), `lib/praatplaat.ts` (`getActivePraatplaat` returnt type), `PraatplaatViewer.tsx` (branch op type), `CreatePraatplaatModal.tsx` (type-toggle + max-duur + multiple-spots toggle), `PraatplaatCard.tsx` (type-badge), i18n keys.

**Pre-dev spikes (parallel):**
1. MediaRecorder + getUserMedia op target devices (2u): Chromebook, iPad recent/2020, Android tablet
2. Supabase Storage + signed URL POC (2u)
3. Verwerkersovereenkomst-template (halve dag)

**Ontwikkeling: 3-5 dagen.**

### 23.2 Andere geplande uitbreidingen

- **Realtime updates (#63):** Supabase Realtime voor live-push van nieuwe submissions naar docent-viewer
- **Docent-studio v3:** docent opent studio met opnames als sample-library, plaatst op timeline, exporteert
- **Praatplaat-export:** render image + alle audio als video of interactieve HTML
- **Multiple active praatplaten per klas:** verschillende praatplaten voor verschillende leerlinggroepen
- **Real-time spectator mode:** publiek ziet live nieuwe submissions verschijnen op shared viewer

---

## 24. Live Content Inventory

Bron: [`src/data/praatplaatImages.ts`](../src/data/praatplaatImages.ts) en [CONTENT-THEMA.md](./CONTENT-THEMA.md).

```typescript
type PraatplaatAvailability = 'teacher' | 'student' | 'both';

interface PraatplaatImage {
  id: string;
  nameKey: string;
  imageUrl: string;
  category: 'natuur' | 'stad' | 'gebouw' | 'feest' | 'fictie' | 'overig';
  availableFor?: PraatplaatAvailability;  // default 'teacher'
  themeId?: string;  // verplicht als 'student' of 'both'
}
```

**Live praatplaten (allemaal `themeId: 'basis'`, `availableFor: 'both'`):**

| ID | Naam | Categorie | Image |
|---|---|---|---|
| `pp-koningsdag` | Koningsdag | feest | `/images/praatplaten/koningsdag.jpg` |
| `pp-robotfabriek` | Robotfabriek | gebouw | `/images/praatplaten/robotfabriek.jpg` |
| `pp-sportveld` | Sportveld | stad | `/images/praatplaten/sportveld.jpg` |

Helpers:
- `isAvailableForTeacher(img)` — voor `CreatePraatplaatModal` library-grid
- `isAvailableForStudent(img)` — voor leerling-flow (compositie image-mode)

**Naast bibliotheek:** docent kan ook elke locatie-image uit een actief thema selecteren (`getAllLocationsByTheme()`), wat in `CreatePraatplaatModal` als collapsible "Thema-images" sectie verschijnt. In dat geval wordt `themeId` van de selected image gebruikt; voor library-images wordt `themeId: 'general'` gebruikt.

---

## Bijlage A — Volledige praatplaat-flow als sequentiediagram

```
LEERLING                  CLIENT                  SUPABASE                  DOCENT
   │                         │                        │                         │
   │ klascode 1234           │                        │                         │
   ├────────────────────────▶│                        │                         │
   │                         │ getActiveAssignment()  │                         │
   │                         ├───────────────────────▶│                         │
   │                         │                        │ rate_limit check        │
   │                         │                        │ JOIN class_assignments  │
   │                         │◀───── praatplaat data ─┤                         │
   │                         │                        │                         │
   │                  AssignmentLandingScreen         │                         │
   │ [Starten]               │                        │                         │
   ├────────────────────────▶│                        │                         │
   │                         │ setClassSession +      │                         │
   │                         │ setPraatplaat +        │                         │
   │                         │ goToPraatplaatSelect   │                         │
   │                         │                        │                         │
   │                  PraatplaatSelectScreen          │                         │
   │ tap (x, y)              │                        │                         │
   ├────────────────────────▶│ setPraatplaatPosition  │                         │
   │ [Bevestigen]            │                        │                         │
   ├────────────────────────▶│ goToMap (virt sb)      │                         │
   │                         │                        │                         │
   │                  Map → Studio (zoom 2.5×) → Stage│                         │
   │ [Save]                  │                        │                         │
   ├────────────────────────▶│ submit_or_update_      │                         │
   │                         │   composition()        │                         │
   │                         ├───────────────────────▶│                         │
   │                         │                        │ rate_limit              │
   │                         │                        │ INSERT/UPDATE submission│
   │                         │◀───── submission_id ───┤                         │
   │                         │ setPraatplaatSubmitted │                         │
   │                  StageView success modal         │                         │
   │ [Kies nieuwe plek]      │                        │                         │
   │                         │ reset position +       │                         │
   │                         │ submissionId + library │                         │
   │                         │ goToPraatplaatSelect   │                         │
   │                         │                        │                         │
   │                         │                        │   (later)               │
   │                         │                        │             [Open       │
   │                         │                        │              Praatplaat]│
   │                         │                        │ get_praatplaat_         │
   │                         │                        │   submissions()         │
   │                         │                        │◀────────────────────────┤
   │                         │                        ├──── submissions[] ─────▶│
   │                         │                        │                         │
   │                         │                        │     PraatplaatViewer    │
   │                         │                        │     cluster + render    │
   │                         │                        │     [klik spot] ▶ play  │
```

---

**Einde document.** Bij vragen of onduidelijkheden: raadpleeg [PLAN-72-PRAATPLAAT.md](./PLAN-72-PRAATPLAAT.md) (originele spec) of vraag een review aan de SoundScout-onderhouder.
