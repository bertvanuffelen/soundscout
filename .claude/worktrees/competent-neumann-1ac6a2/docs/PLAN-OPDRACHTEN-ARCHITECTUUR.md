# Plan: Opdrachten-architectuur (Dashboard Herstructurering)

**Issue:** #72 punt 1 (uitgesteld) + toekomstbestendig fundament
**Status:** Plan — nog niet geïmplementeerd
**Datum:** 2026-03-26

---

## Probleemstelling

Templates en praatplaten zijn beide "opdrachten" die een docent aanmaakt, maar ze werken nu fundamenteel anders:

| Aspect | Templates | Praatplaten |
|--------|-----------|-------------|
| **Scope** | Globaal (docent-level) | Per klas (`class_id` verplicht) |
| **Locatie in UI** | TeacherDashboard | ClassDetail |
| **Leerling-toegang** | 8-karakter template-code (direct) | 4-cijferige klascode → actieve praatplaat |
| **Koppeling aan klas** | Geen | Verplicht bij aanmaken |

### Gewenste situatie

De docent denkt in termen van: "Ik maak opdrachten en activeer ze per klas."

- **Dashboard:** Eén "Opdrachten" sectie met templates én praatplaten naast elkaar
- **Klaspagina:** "Actieve opdracht" blok — kies welke opdracht nu live is voor deze klas
- **Leerling:** Voert klascode in → systeem bepaalt automatisch of het een template of praatplaat is → routeert naar juiste flow

---

## Architectuur

### Database-model

Bestaande tabellen (`templates`, `praatplaten`) blijven bestaan — ze hebben zeer verschillende schemas. Wat verandert:

#### 1. `praatplaten.class_id` wordt nullable

```sql
ALTER TABLE public.praatplaten
  ALTER COLUMN class_id DROP NOT NULL;
```

Een praatplaat kan voortaan bestaan zonder klas (docent-level resource). De `class_id` wordt pas gevuld bij activering via `class_assignments`.

#### 2. Nieuwe tabel: `class_assignments`

```sql
CREATE TABLE public.class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,

  -- Polymorf: precies één van deze is NOT NULL
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
  praatplaat_id UUID REFERENCES public.praatplaten(id) ON DELETE CASCADE,

  is_active BOOLEAN DEFAULT TRUE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Precies één opdracht-type per rij
  CONSTRAINT one_assignment_type CHECK (
    (template_id IS NOT NULL AND praatplaat_id IS NULL) OR
    (template_id IS NULL AND praatplaat_id IS NOT NULL)
  )
);

-- Max 1 actieve opdracht per klas
CREATE UNIQUE INDEX idx_class_assignments_active
  ON public.class_assignments (class_id)
  WHERE is_active = TRUE;

-- Lookups
CREATE INDEX idx_class_assignments_class ON public.class_assignments(class_id);
CREATE INDEX idx_class_assignments_teacher ON public.class_assignments(teacher_id);
```

#### 3. Trigger: automatisch deactiveren bij nieuwe activering

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

#### 4. Nieuwe RPC: `get_active_assignment(p_class_code)`

Vervangt `get_active_praatplaat()` — één unified entry point voor leerlingen.

```sql
CREATE OR REPLACE FUNCTION get_active_assignment(p_class_code TEXT)
RETURNS TABLE (
  assignment_type TEXT,        -- 'template' | 'praatplaat'
  -- Template velden (nullable)
  template_id UUID,
  template_name TEXT,
  template_description TEXT,
  template_teacher_name TEXT,
  composition_data JSONB,
  instructions TEXT,
  lock_options JSONB,
  -- Praatplaat velden (nullable)
  praatplaat_id UUID,
  praatplaat_name TEXT,
  image_url TEXT,
  theme_id TEXT,
  location_id TEXT,
  -- Gedeelde velden
  class_id UUID,
  class_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('get_assignment', 'code:' || p_class_code, 30, 60);

  RETURN QUERY
  SELECT
    CASE
      WHEN ca.template_id IS NOT NULL THEN 'template'::TEXT
      WHEN ca.praatplaat_id IS NOT NULL THEN 'praatplaat'::TEXT
    END AS assignment_type,
    -- Template fields
    t.id AS template_id,
    t.name AS template_name,
    t.description AS template_description,
    te.display_name AS template_teacher_name,
    t.composition_data,
    t.instructions,
    t.lock_options,
    -- Praatplaat fields
    p.id AS praatplaat_id,
    p.name AS praatplaat_name,
    p.image_url,
    p.theme_id,
    p.location_id,
    -- Shared
    c.id AS class_id,
    c.name AS class_name
  FROM public.class_assignments ca
  JOIN public.classes c ON c.id = ca.class_id
  LEFT JOIN public.templates t ON t.id = ca.template_id
  LEFT JOIN public.teachers te ON te.id = t.teacher_id
  LEFT JOIN public.praatplaten p ON p.id = ca.praatplaat_id
  WHERE c.code = p_class_code
    AND ca.is_active = TRUE;
END;
$$;

-- Grant aan anonieme gebruikers (leerlingen)
GRANT EXECUTE ON FUNCTION get_active_assignment(TEXT) TO anon;
```

#### 5. RPC: `activate_assignment` en `deactivate_assignment`

```sql
CREATE OR REPLACE FUNCTION activate_assignment(
  p_class_id UUID,
  p_template_id UUID DEFAULT NULL,
  p_praatplaat_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Valideer ownership van klas
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  -- Valideer: precies één van template_id/praatplaat_id
  IF (p_template_id IS NULL AND p_praatplaat_id IS NULL)
     OR (p_template_id IS NOT NULL AND p_praatplaat_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Precies één opdracht-type vereist';
  END IF;

  -- Valideer ownership van template/praatplaat
  IF p_template_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.templates WHERE id = p_template_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Template niet gevonden of geen toegang';
    END IF;
  END IF;

  IF p_praatplaat_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.praatplaten WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Upsert: als er al een (inactieve) koppeling bestaat, heractiveer die
  INSERT INTO public.class_assignments (class_id, teacher_id, template_id, praatplaat_id, is_active)
  VALUES (p_class_id, auth.uid(), p_template_id, p_praatplaat_id, TRUE)
  ON CONFLICT ON CONSTRAINT class_assignments_pkey DO NOTHING
  RETURNING id INTO v_assignment_id;

  -- Fallback: gewoon insert (trigger deactiveert de rest)
  IF v_assignment_id IS NULL THEN
    INSERT INTO public.class_assignments (class_id, teacher_id, template_id, praatplaat_id, is_active)
    VALUES (p_class_id, auth.uid(), p_template_id, p_praatplaat_id, TRUE)
    RETURNING id INTO v_assignment_id;
  END IF;

  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION deactivate_class_assignment(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  UPDATE public.class_assignments
  SET is_active = FALSE
  WHERE class_id = p_class_id AND is_active = TRUE;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION activate_assignment(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_class_assignment(UUID) TO authenticated;
```

#### 6. `create_praatplaat` aanpassen — `class_id` optioneel

```sql
-- Vervangt de bestaande functie
CREATE OR REPLACE FUNCTION create_praatplaat(
  p_name TEXT,
  p_theme_id TEXT,
  p_location_id TEXT,
  p_image_url TEXT,
  p_class_id UUID DEFAULT NULL  -- optioneel nu
)
RETURNS UUID
...
```

#### 7. Bestaande trigger + index aanpassen

De trigger `enforce_single_active_praatplaat` en unique index `idx_praatplaten_active_per_class` worden overbodig — activering loopt nu via `class_assignments`.

```sql
-- Verwijder de oude praatplaat-specifieke activering
DROP TRIGGER IF EXISTS trg_enforce_single_active_praatplaat ON public.praatplaten;
DROP FUNCTION IF EXISTS enforce_single_active_praatplaat();
DROP INDEX IF EXISTS idx_praatplaten_active_per_class;

-- is_active op praatplaten wordt een soft-delete / visibility toggle
-- (globaal: is deze praatplaat beschikbaar voor activering?)
```

#### 8. `get_active_praatplaat` backward compatibility

Bestaande client-code die `get_active_praatplaat(code)` aanroept blijft werken tot de frontend is gemigreerd:

```sql
-- Wrapper die de nieuwe functie aanroept
CREATE OR REPLACE FUNCTION get_active_praatplaat(p_class_code TEXT)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT praatplaat_id, praatplaat_name, image_url, theme_id, location_id, class_id, class_name
  FROM get_active_assignment(p_class_code)
  WHERE assignment_type = 'praatplaat';
END;
$$;
```

---

## Student-flow (nieuw)

### Klascode invoer (4 cijfers)

```
Leerling voert 4-cijferige klascode in
  ↓
ShareCodeInput roept get_active_assignment(code) aan
  ↓
  ├── assignment_type = 'praatplaat'
  │     → setPraatplaat({...})
  │     → goToPraatplaatSelect()
  │     (bestaande flow, ongewijzigd)
  │
  ├── assignment_type = 'template'
  │     → initializeFromTemplate(template)
  │     (bestaande flow, gaat direct naar studio)
  │
  └── geen resultaat
        → setError("Geen actieve opdracht voor deze klas")
```

### Template-code invoer (8 karakters)

Blijft ongewijzigd werken als directe toegang. Dit is een bonus-feature (delen buiten klassen), niet de primaire flow.

### Praatplaat submission

De `submit_praatplaat_composition` RPC blijft werken — submissions gaan naar `submissions` tabel met `praatplaat_id`. De praatplaat hoeft niet meer per se een `class_id` te hebben, want de klas wordt via de klascode bepaald bij submission.

---

## Frontend-wijzigingen

### Fase 1: Database + Nieuwe hook

**Bestanden:**

| Bestand | Actie |
|---------|-------|
| `supabase/migrations/006_class_assignments.sql` | **Nieuw** — volledige migratie |
| `src/lib/assignments.ts` | **Nieuw** — Supabase client functies |
| `src/hooks/useClassAssignment.ts` | **Nieuw** — hook voor actieve opdracht per klas |

**`useClassAssignment(classId)`** retourneert:
```typescript
interface UseClassAssignmentReturn {
  activeAssignment: ClassAssignment | null;  // huidige actieve opdracht
  loading: boolean;
  error: string | null;
  activate: (templateId?: string, praatplaatId?: string) => Promise<void>;
  deactivate: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface ClassAssignment {
  id: string;
  type: 'template' | 'praatplaat';
  templateId?: string;
  praatplaatId?: string;
  name: string;             // template.name of praatplaat.name
  activatedAt: string;
}
```

### Fase 2: Dashboard herstructurering

**`TeacherDashboard.tsx`** — verandert van 2 secties naar 2 secties (maar anders):

| Huidig | Nieuw |
|--------|-------|
| "Mijn klassen" (grid) | "Mijn klassen" (grid, ongewijzigd) |
| "Templates" (grid) | **"Mijn opdrachten"** (grid met templates + praatplaten) |

**Wijzigingen:**
1. Importeer `usePraatplaten` (nieuw: zonder classId, haalt alle docent-praatplaten op)
2. Combineer templates en praatplaten in één grid met type-badge
3. PraatplaatCard en TemplateCard krijgen een **type-indicator** (icoon + label)
4. "Nieuwe opdracht" knop opent keuze: "Template" of "Praatplaat"

**`usePraatplaten`** hook aanpassen:
- Huidige signature: `usePraatplaten(classId: string)`
- Nieuwe signature: `usePraatplaten(classId?: string)` — zonder classId → alle docent-praatplaten
- `fetchPraatplaten()` in `lib/praatplaat.ts`: zonder classId → `select * from praatplaten where teacher_id = auth.uid()`

### Fase 3: ClassDetail herstructurering

**`ClassDetail.tsx`** — praatplaten-sectie wordt "Actieve opdracht" blok:

| Huidig | Nieuw |
|--------|-------|
| Praatplaten sectie (CRUD grid) | **"Actieve opdracht"** blok |
| Handmatig activeren per praatplaat | Eén knop: "Opdracht activeren" → modal |
| Alleen praatplaten | Templates én praatplaten |

**Nieuw component: `ActivateAssignmentModal`**

Modal die alle beschikbare opdrachten van de docent toont (templates + praatplaten), met selectie en bevestiging. Flow:
1. Docent klikt "Opdracht activeren" in ClassDetail
2. Modal opent met twee tabs of secties: "Templates" en "Praatplaten"
3. Docent selecteert één opdracht
4. Bevestig → `activate_assignment(classId, templateId?, praatplaatId?)`
5. ClassDetail toont nu "Actieve opdracht: [naam]" met deactiveer-knop

**Actieve opdracht blok in ClassDetail:**
```
┌────────────────────────────────────────────────┐
│ 📋 Actieve opdracht                            │
│                                                │
│  [Praatplaat icon] Geluiden op de boerderij    │
│  Geactiveerd op 26 maart 2026                  │
│                                                │
│  [Open praatplaat]  [Deactiveer]  [Wijzig]     │
│                                                │
│  Klascode: 1234                                │
└────────────────────────────────────────────────┘
```

Of als er geen actieve opdracht is:
```
┌────────────────────────────────────────────────┐
│ 📋 Actieve opdracht                            │
│                                                │
│  Geen actieve opdracht voor deze klas.         │
│                                                │
│  [Opdracht activeren]                          │
└────────────────────────────────────────────────┘
```

### Fase 4: ShareCodeInput aanpassen

**`ShareCodeInput.tsx`** — 4-digit klascode flow:

Huidig:
```typescript
// Regel 54-80: roept getActivePraatplaat(code) aan
const praatplaat = await getActivePraatplaat(code);
```

Nieuw:
```typescript
// Roept get_active_assignment(code) aan
const assignment = await getActiveAssignment(code);
if (assignment) {
  if (assignment.type === 'praatplaat') {
    setPraatplaat({...});
    goToPraatplaatSelect();
  } else if (assignment.type === 'template') {
    await initializeFromTemplate(assignment.template);
  }
  return;
}
setError(t('share.noActiveAssignment'));
```

### Fase 5: Opschonen

- Verwijder `activate/deactivate` uit `PraatplaatCard` (activering loopt nu via ClassDetail)
- `PraatplaatCard` wordt puur een resource-kaart: naam, thumbnail, verwijderen, bekijken
- `TemplateCard` idem: resource-kaart zonder klas-specifieke logica
- Verwijder `handleTogglePraatplaat` uit `ClassDetail`
- `is_active` op `praatplaten` tabel wordt een globale visibility toggle (beschikbaar voor activering), niet een per-klas activering

---

## Migratiepad bestaande data

De migratie moet rekening houden met bestaande praatplaten die al `class_id` en `is_active = true` hebben:

```sql
-- Migreer bestaande actieve praatplaten naar class_assignments
INSERT INTO public.class_assignments (class_id, teacher_id, praatplaat_id, is_active, activated_at)
SELECT class_id, teacher_id, id, TRUE, created_at
FROM public.praatplaten
WHERE is_active = TRUE AND class_id IS NOT NULL;
```

---

## Wat NIET verandert

1. **Template-code directe toegang** (8 chars) — blijft werken via `getTemplateByCode()`
2. **Share-code en bewaarcode** (6/8 chars) — ongewijzigd
3. **Praatplaat student-flow** (positie kiezen → map → studio → stage) — ongewijzigd
4. **Template student-flow** (locks, library, storyboard) — ongewijzigd
5. **SubmissionPlayer** — ongewijzigd
6. **PraatplaatViewer** — ongewijzigd
7. **Submissions tabel** — ongewijzigd
8. **Bestaande praatplaat RPCs** (submit, get_submissions) — ongewijzigd

---

## Implementatievolgorde

| Stap | Beschrijving | Risico |
|------|-------------|--------|
| 1 | SQL migratie schrijven (`006_class_assignments.sql`) | Laag |
| 2 | `src/lib/assignments.ts` — client functies voor nieuwe RPCs | Laag |
| 3 | `useClassAssignment` hook | Laag |
| 4 | `usePraatplaten` aanpassen — optionele classId | Laag |
| 5 | `TeacherDashboard` — opdrachten-sectie (templates + praatplaten) | Middel |
| 6 | `ClassDetail` — actieve opdracht blok + `ActivateAssignmentModal` | Middel |
| 7 | `ShareCodeInput` — unified `get_active_assignment` flow | Middel |
| 8 | Opschonen: PraatplaatCard/TemplateCard vereenvoudigen | Laag |
| 9 | Migratie draaien in Supabase | Laag |
| 10 | Testen volledige flow (docent + leerling) | — |

**Geschatte omvang:** ~400-500 regels nieuwe code, ~200 regels verwijderd, 1 SQL migratie.

---

## Risico's en aandachtspunten

1. **Backward compatibility:** `get_active_praatplaat` moet als wrapper blijven bestaan tot alle clients zijn gemigreerd
2. **Bestaande data:** Actieve praatplaten moeten correct gemigreerd worden naar `class_assignments`
3. **Praatplaat submissions:** `submit_praatplaat_composition` valideert `praatplaat.class_id = class_id`. Na de migratie moet dit via `class_assignments` lopen, of de validatie wordt versoepeld
4. **Template in klas-context:** Als een template via klascode wordt geladen, moet de leerling wél in klas-context blijven (voor eventuele submissions). Dat betekent dat de klascode + class_id mee moeten naar de studio
5. **Race conditions:** Twee docenten kunnen theoretisch dezelfde template/praatplaat tegelijk aan verschillende klassen koppelen — dat is gewenst gedrag, geen bug
