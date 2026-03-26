-- ============================================
-- MIGRATIE 005: Praatplaten (#72)
-- Voer uit in Supabase SQL Editor
-- ============================================
-- Collaboratieve klankkaart: leerlingen koppelen composities aan
-- een X,Y-positie op een gedeelde afbeelding ("praatplaat").
-- Docenten beheren praatplaten via het dashboard en presenteren
-- resultaten op het digibord.

-- ============================================
-- 1. PRAATPLATEN TABEL
-- ============================================

CREATE TABLE IF NOT EXISTS public.praatplaten (
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

-- Indices
CREATE INDEX idx_praatplaten_class ON public.praatplaten(class_id);
CREATE INDEX idx_praatplaten_teacher ON public.praatplaten(teacher_id);

-- Constraint: maximaal één actieve praatplaat per klas
CREATE UNIQUE INDEX idx_praatplaten_active_per_class
  ON public.praatplaten (class_id)
  WHERE is_active = TRUE;

-- ============================================
-- 2. RLS POLICIES VOOR PRAATPLATEN
-- ============================================

ALTER TABLE public.praatplaten ENABLE ROW LEVEL SECURITY;

-- Docenten kunnen eigen praatplaten lezen
CREATE POLICY "Teachers can read own praatplaten"
  ON public.praatplaten FOR SELECT
  USING (auth.uid() = teacher_id);

-- Docenten kunnen eigen praatplaten aanmaken
CREATE POLICY "Teachers can create praatplaten"
  ON public.praatplaten FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Docenten kunnen eigen praatplaten wijzigen
CREATE POLICY "Teachers can update own praatplaten"
  ON public.praatplaten FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Docenten kunnen eigen praatplaten verwijderen
CREATE POLICY "Teachers can delete own praatplaten"
  ON public.praatplaten FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================
-- 3. NIEUWE KOLOMMEN OP SUBMISSIONS
-- ============================================

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS praatplaat_id UUID REFERENCES public.praatplaten(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position_x REAL CHECK (position_x IS NULL OR (position_x >= 0 AND position_x <= 1)),
  ADD COLUMN IF NOT EXISTS position_y REAL CHECK (position_y IS NULL OR (position_y >= 0 AND position_y <= 1));

-- Index voor praatplaat lookups
CREATE INDEX IF NOT EXISTS idx_submissions_praatplaat
  ON public.submissions(praatplaat_id) WHERE praatplaat_id IS NOT NULL;

-- ============================================
-- 4. TRIGGER: één actieve praatplaat per klas
-- ============================================
-- Bij activeren van een praatplaat worden alle andere praatplaten
-- van dezelfde klas automatisch gedeactiveerd.

CREATE OR REPLACE FUNCTION enforce_single_active_praatplaat()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE public.praatplaten
    SET is_active = FALSE
    WHERE class_id = NEW.class_id
      AND id != NEW.id
      AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_active_praatplaat
  BEFORE INSERT OR UPDATE OF is_active ON public.praatplaten
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_praatplaat();

-- ============================================
-- 5. RPC: PRAATPLAAT AANMAKEN
-- ============================================

CREATE OR REPLACE FUNCTION create_praatplaat(
  p_class_id UUID,
  p_name TEXT,
  p_theme_id TEXT,
  p_location_id TEXT,
  p_image_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_praatplaat_id UUID;
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('create_praatplaat', auth.uid()::text, 10, 60);

  -- Valideer: klas behoort tot ingelogde docent
  SELECT teacher_id INTO v_teacher_id
  FROM public.classes
  WHERE id = p_class_id;

  IF v_teacher_id IS NULL OR v_teacher_id != auth.uid() THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  -- Maak praatplaat aan
  INSERT INTO public.praatplaten (class_id, teacher_id, name, theme_id, location_id, image_url)
  VALUES (p_class_id, auth.uid(), p_name, p_theme_id, p_location_id, p_image_url)
  RETURNING id INTO v_praatplaat_id;

  RETURN v_praatplaat_id;
END;
$$;

-- ============================================
-- 6. RPC: PRAATPLAAT ACTIVEREN / DEACTIVEREN
-- ============================================

CREATE OR REPLACE FUNCTION activate_praatplaat(p_praatplaat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Valideer ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  -- Activeer (trigger deactiveert automatisch alle andere)
  UPDATE public.praatplaten
  SET is_active = TRUE
  WHERE id = p_praatplaat_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION deactivate_praatplaat(p_praatplaat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Valideer ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  UPDATE public.praatplaten
  SET is_active = FALSE
  WHERE id = p_praatplaat_id;

  RETURN TRUE;
END;
$$;

-- ============================================
-- 7. RPC: PRAATPLAAT VERWIJDEREN
-- ============================================

CREATE OR REPLACE FUNCTION delete_praatplaat(p_praatplaat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Valideer ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  -- Verwijder praatplaat (submissions.praatplaat_id wordt NULL via ON DELETE SET NULL)
  DELETE FROM public.praatplaten
  WHERE id = p_praatplaat_id;

  RETURN TRUE;
END;
$$;

-- ============================================
-- 8. RPC: ACTIEVE PRAATPLAAT OPHALEN (leerlingen)
-- ============================================

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
  FROM public.praatplaten p
  JOIN public.classes c ON c.id = p.class_id
  WHERE c.code = p_class_code
    AND p.is_active = TRUE;
END;
$$;

-- ============================================
-- 9. RPC: PRAATPLAAT-COMPOSITIE INSTUREN (leerlingen)
-- ============================================

CREATE OR REPLACE FUNCTION submit_praatplaat_composition(
  p_class_code TEXT,
  p_praatplaat_id UUID,
  p_position_x REAL,
  p_position_y REAL,
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('submit', 'class:' || p_class_code, 60, 60);

  -- Zoek klas
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = p_class_code;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden';
  END IF;

  -- Valideer praatplaat behoort tot klas
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND class_id = v_class_id
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden voor deze klas';
  END IF;

  -- Valideer positie
  IF p_position_x < 0 OR p_position_x > 1 OR p_position_y < 0 OR p_position_y > 1 THEN
    RAISE EXCEPTION 'Ongeldige positie';
  END IF;

  -- Insert submission met praatplaat-koppeling
  INSERT INTO public.submissions (
    class_id,
    student_name,
    composition_name,
    composition_data,
    praatplaat_id,
    position_x,
    position_y
  ) VALUES (
    v_class_id,
    p_student_name,
    p_composition_name,
    p_composition_data,
    p_praatplaat_id,
    p_position_x,
    p_position_y
  )
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

-- ============================================
-- 10. RPC: PRAATPLAAT SUBMISSIONS OPHALEN (docenten)
-- ============================================

CREATE OR REPLACE FUNCTION get_praatplaat_submissions(p_praatplaat_id UUID)
RETURNS TABLE (
  id UUID,
  student_name TEXT,
  composition_name TEXT,
  composition_data JSONB,
  position_x REAL,
  position_y REAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Valideer: docent is eigenaar van de praatplaat
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE praatplaten.id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.student_name,
    s.composition_name,
    s.composition_data,
    s.position_x,
    s.position_y,
    s.created_at
  FROM public.submissions s
  WHERE s.praatplaat_id = p_praatplaat_id
  ORDER BY s.created_at DESC;
END;
$$;

-- ============================================
-- 11. GRANTS
-- ============================================

-- Publieke functies (voor leerlingen, geen login nodig)
GRANT EXECUTE ON FUNCTION get_active_praatplaat(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_praatplaat_composition(TEXT, UUID, REAL, REAL, TEXT, TEXT, JSONB) TO anon;

-- Authenticated functies (voor docenten)
GRANT EXECUTE ON FUNCTION create_praatplaat(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_praatplaat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_praatplaat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_praatplaat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_praatplaat_submissions(UUID) TO authenticated;
