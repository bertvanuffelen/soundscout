-- ============================================
-- SOUNDSCOUT DATABASE SCHEMA
-- Voer dit uit in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TEACHERS (Docenten)
-- ============================================
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL CONSTRAINT chk_teacher_email_length CHECK (char_length(email) BETWEEN 5 AND 255),
  display_name TEXT NOT NULL CONSTRAINT chk_teacher_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 100),
  school_name TEXT CONSTRAINT chk_teacher_school_name_length CHECK (school_name IS NULL OR char_length(school_name) BETWEEN 1 AND 200),
  max_classes INT DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CLASSES (Klassen)
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CONSTRAINT chk_class_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  code CHAR(4) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 3. SUBMISSIONS (Inzendingen van leerlingen)
-- ============================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL CONSTRAINT chk_student_name_length CHECK (char_length(student_name) BETWEEN 1 AND 100),
  composition_name TEXT NOT NULL CONSTRAINT chk_composition_name_length CHECK (char_length(composition_name) BETWEEN 1 AND 200),
  composition_data JSONB NOT NULL CONSTRAINT chk_composition_data_size CHECK (octet_length(composition_data::text) <= 1048576),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Delen met Link (#14)
  share_code VARCHAR(8) UNIQUE,
  expires_at TIMESTAMPTZ,
  view_count INT DEFAULT 0 CONSTRAINT chk_view_count_positive CHECK (view_count >= 0)
);

-- ============================================
-- 4. INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_code ON public.classes(code);
CREATE INDEX IF NOT EXISTS idx_submissions_class ON public.submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_share_code ON public.submissions(share_code) WHERE share_code IS NOT NULL;

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

-- Publiek leesbaar voor gedeelde composities (Delen met Link #14)
CREATE POLICY "Anyone can read shared compositions"
  ON public.submissions FOR SELECT
  USING (
    share_code IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
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
-- 8. MAX CLASSES ENFORCEMENT (TP0-4)
-- ============================================

-- Trigger functie: voorkom meer klassen dan max_classes limiet
CREATE OR REPLACE FUNCTION check_max_classes()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.classes WHERE teacher_id = NEW.teacher_id;

  SELECT COALESCE(max_classes, 8) INTO max_allowed
  FROM public.teachers WHERE id = NEW.teacher_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Maximum number of classes (%) reached', max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_classes ON public.classes;
CREATE TRIGGER enforce_max_classes
  BEFORE INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION check_max_classes();

-- ============================================
-- 9. DELEN MET LINK (#14)
-- ============================================

-- Genereer unieke 8-karakter share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(8) := '';
  code_exists BOOLEAN;
  i INT;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.submissions WHERE share_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Deel een compositie (maakt submission met share_code, geen class_id nodig)
CREATE OR REPLACE FUNCTION share_composition(
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
)
RETURNS TEXT AS $$
DECLARE
  v_code VARCHAR(8);
  v_expires TIMESTAMPTZ;
BEGIN
  v_code := generate_share_code();
  v_expires := NOW() + INTERVAL '30 days';

  INSERT INTO public.submissions (
    class_id, student_name, composition_name,
    composition_data, share_code, expires_at, view_count
  )
  VALUES (
    NULL, p_student_name, p_composition_name,
    p_composition_data, v_code, v_expires, 0
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION share_composition TO anon;
GRANT EXECUTE ON FUNCTION share_composition TO authenticated;

-- Haal gedeelde compositie op (en verhoog view_count)
CREATE OR REPLACE FUNCTION get_shared_composition(p_code VARCHAR)
RETURNS TABLE (
  id UUID,
  student_name TEXT,
  composition_name TEXT,
  composition_data JSONB,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  view_count INT
) AS $$
BEGIN
  -- Verhoog view_count
  UPDATE public.submissions
  SET view_count = submissions.view_count + 1
  WHERE share_code = UPPER(TRIM(p_code))
    AND (submissions.expires_at IS NULL OR submissions.expires_at > NOW());

  -- Retourneer data
  RETURN QUERY
  SELECT
    s.id, s.student_name, s.composition_name,
    s.composition_data, s.created_at, s.expires_at, s.view_count
  FROM public.submissions s
  WHERE s.share_code = UPPER(TRIM(p_code))
    AND (s.expires_at IS NULL OR s.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_shared_composition TO anon;
GRANT EXECUTE ON FUNCTION get_shared_composition TO authenticated;

-- ============================================
-- KLAAR!
-- ============================================
-- Als je "Success. No rows returned" ziet, is alles goed gegaan.
