-- ============================================
-- MIGRATIE 006: Class Assignments (Opdrachten-architectuur)
-- Voer uit in Supabase SQL Editor
-- ============================================
-- Unified opdrachten-systeem: templates en praatplaten zijn docent-level
-- resources die per klas geactiveerd worden via class_assignments.
-- Leerlingen voeren klascode in → systeem bepaalt actieve opdracht.

-- ============================================
-- 1. PRAATPLATEN: class_id NULLABLE MAKEN
-- ============================================
-- Praatplaten worden docent-level resources (zoals templates).
-- class_id wordt pas gevuld bij backward-compat queries.

ALTER TABLE public.praatplaten
  ALTER COLUMN class_id DROP NOT NULL;

-- ============================================
-- 2. CLASS_ASSIGNMENTS TABEL
-- ============================================

CREATE TABLE IF NOT EXISTS public.class_assignments (
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

-- ============================================
-- 3. TRIGGER: automatisch deactiveren bij nieuwe activering
-- ============================================

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

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read own class assignments"
  ON public.class_assignments FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create class assignments"
  ON public.class_assignments FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own class assignments"
  ON public.class_assignments FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own class assignments"
  ON public.class_assignments FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================
-- 5. RPC: OPDRACHT ACTIVEREN
-- ============================================

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

  -- Valideer ownership van template
  IF p_template_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.templates WHERE id = p_template_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Template niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Valideer ownership van praatplaat
  IF p_praatplaat_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.praatplaten WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Insert (trigger deactiveert de rest automatisch)
  INSERT INTO public.class_assignments (class_id, teacher_id, template_id, praatplaat_id, is_active)
  VALUES (p_class_id, auth.uid(), p_template_id, p_praatplaat_id, TRUE)
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

-- ============================================
-- 6. RPC: OPDRACHT DEACTIVEREN
-- ============================================

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

-- ============================================
-- 7. RPC: ACTIEVE OPDRACHT OPHALEN (leerlingen)
-- ============================================

CREATE OR REPLACE FUNCTION get_active_assignment(p_class_code TEXT)
RETURNS TABLE (
  assignment_type TEXT,
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

-- ============================================
-- 8. BACKWARD COMPATIBILITY: get_active_praatplaat wrapper
-- ============================================
-- Bestaande client-code blijft werken tot frontend is gemigreerd.

CREATE OR REPLACE FUNCTION get_active_praatplaat(p_class_code TEXT)
RETURNS TABLE (
  praatplaat_id UUID,
  praatplaat_name TEXT,
  image_url TEXT,
  theme_id TEXT,
  location_id TEXT,
  class_id UUID,
  class_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('get_praatplaat', 'code:' || p_class_code, 30, 60);

  RETURN QUERY
  SELECT
    p.id AS praatplaat_id,
    p.name AS praatplaat_name,
    p.image_url,
    p.theme_id,
    p.location_id,
    c.id AS class_id,
    c.name AS class_name
  FROM public.class_assignments ca
  JOIN public.classes c ON c.id = ca.class_id
  JOIN public.praatplaten p ON p.id = ca.praatplaat_id
  WHERE c.code = p_class_code
    AND ca.is_active = TRUE;
END;
$$;

-- ============================================
-- 9. MIGREER BESTAANDE DATA
-- ============================================
-- Verplaats bestaande actieve praatplaten naar class_assignments.

INSERT INTO public.class_assignments (class_id, teacher_id, praatplaat_id, is_active, activated_at)
SELECT class_id, teacher_id, id, TRUE, created_at
FROM public.praatplaten
WHERE is_active = TRUE AND class_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. OPRUIMEN OUDE PRAATPLAAT-ACTIVERING
-- ============================================
-- De oude trigger en unique index zijn niet meer nodig — activering
-- loopt nu via class_assignments.

DROP TRIGGER IF EXISTS trg_enforce_single_active_praatplaat ON public.praatplaten;
DROP FUNCTION IF EXISTS enforce_single_active_praatplaat();
DROP INDEX IF EXISTS idx_praatplaten_active_per_class;

-- is_active op praatplaten wordt een globale visibility toggle
-- (is deze praatplaat beschikbaar voor activering?)

-- ============================================
-- 11. CREATE_PRAATPLAAT AANPASSEN (class_id optioneel)
-- ============================================

CREATE OR REPLACE FUNCTION create_praatplaat(
  p_name TEXT,
  p_theme_id TEXT,
  p_location_id TEXT,
  p_image_url TEXT,
  p_class_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_praatplaat_id UUID;
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('create_praatplaat', auth.uid()::text, 10, 60);

  -- Als class_id opgegeven: valideer ownership
  IF p_class_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Maak praatplaat aan (class_id kan NULL zijn)
  INSERT INTO public.praatplaten (class_id, teacher_id, name, theme_id, location_id, image_url, is_active)
  VALUES (p_class_id, auth.uid(), p_name, p_theme_id, p_location_id, p_image_url, TRUE)
  RETURNING id INTO v_praatplaat_id;

  RETURN v_praatplaat_id;
END;
$$;

-- ============================================
-- 12. GRANTS
-- ============================================

-- Publieke functies (voor leerlingen)
GRANT EXECUTE ON FUNCTION get_active_assignment(TEXT) TO anon;

-- Authenticated functies (voor docenten)
GRANT EXECUTE ON FUNCTION activate_assignment(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_class_assignment(UUID) TO authenticated;
