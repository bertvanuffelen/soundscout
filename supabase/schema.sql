-- ============================================
-- SOUNDSCOUT DATABASE SCHEMA
-- Voer dit uit in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TEACHERS (Docenten)
-- ============================================
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  school_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CLASSES (Klassen)
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code CHAR(4) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 3. SUBMISSIONS (Inzendingen van leerlingen)
-- ============================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  composition_name TEXT NOT NULL,
  composition_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_code ON public.classes(code);
CREATE INDEX IF NOT EXISTS idx_submissions_class ON public.submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions(created_at DESC);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS op alle tabellen
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- TEACHERS POLICIES
CREATE POLICY "Teachers can read own profile"
  ON public.teachers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Teachers can update own profile"
  ON public.teachers FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow insert for authenticated users"
  ON public.teachers FOR INSERT
  WITH CHECK (auth.uid() = id);

-- CLASSES POLICIES
CREATE POLICY "Teachers can read own classes"
  ON public.classes FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can lookup class by code"
  ON public.classes FOR SELECT
  USING (TRUE);

CREATE POLICY "Teachers can create classes"
  ON public.classes FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own classes"
  ON public.classes FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own classes"
  ON public.classes FOR DELETE
  USING (auth.uid() = teacher_id);

-- SUBMISSIONS POLICIES
CREATE POLICY "Anyone can submit compositions"
  ON public.submissions FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Teachers can read submissions of own classes"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = submissions.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete submissions of own classes"
  ON public.submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = submissions.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Genereer unieke 4-cijferige klas-code
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS CHAR(4) AS $$
DECLARE
  new_code CHAR(4);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Zoek klas op basis van code (voor leerlingen)
CREATE OR REPLACE FUNCTION get_class_by_code(p_code CHAR(4))
RETURNS TABLE (
  id UUID,
  name TEXT,
  teacher_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    t.display_name as teacher_name
  FROM public.classes c
  JOIN public.teachers t ON t.id = c.teacher_id
  WHERE c.code = p_code
  AND c.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon (voor niet-ingelogde leerlingen)
GRANT EXECUTE ON FUNCTION get_class_by_code TO anon;
GRANT EXECUTE ON FUNCTION get_class_by_code TO authenticated;

-- Submit compositie (voor leerlingen zonder login)
CREATE OR REPLACE FUNCTION submit_composition(
  p_class_code CHAR(4),
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
BEGIN
  -- Zoek klas
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = p_class_code AND is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas-code niet gevonden';
  END IF;

  -- Insert submission
  INSERT INTO public.submissions (class_id, student_name, composition_name, composition_data)
  VALUES (v_class_id, p_student_name, p_composition_name, p_composition_data)
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION submit_composition TO anon;
GRANT EXECUTE ON FUNCTION submit_composition TO authenticated;

-- ============================================
-- 7. TRIGGER: Maak teacher profiel bij registratie
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teachers (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists en maak opnieuw
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- KLAAR!
-- ============================================
-- Als je "Success. No rows returned" ziet, is alles goed gegaan.
