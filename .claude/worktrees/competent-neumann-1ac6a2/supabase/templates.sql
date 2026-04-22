-- ============================================
-- SOUNDSCOUT TEMPLATES SCHEMA
-- Voer dit uit in Supabase SQL Editor
-- Na het uitvoeren van het hoofd schema.sql
-- ============================================

-- ============================================
-- 1. TEMPLATES TABEL
-- ============================================
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CONSTRAINT chk_template_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT CONSTRAINT chk_template_description_length CHECK (description IS NULL OR char_length(description) <= 1000),
  -- Template code: 8 karakters, zelfde format als share codes
  code VARCHAR(8) UNIQUE NOT NULL,
  -- Compositie data (tracks, samples, sections, bpm, totalBeats)
  composition_data JSONB NOT NULL CONSTRAINT chk_template_data_size CHECK (octet_length(composition_data::text) <= 1048576),
  -- Instructies voor de leerling (optioneel, Markdown)
  instructions TEXT CONSTRAINT chk_template_instructions_length CHECK (instructions IS NULL OR char_length(instructions) <= 5000),
  -- Of clips vergrendeld zijn (leerling kan ze niet verplaatsen/verwijderen)
  clips_locked BOOLEAN DEFAULT FALSE,
  -- Actief/inactief
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_templates_teacher ON public.templates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_templates_code ON public.templates(code);
CREATE INDEX IF NOT EXISTS idx_templates_active ON public.templates(is_active) WHERE is_active = TRUE;

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Docenten kunnen eigen templates lezen
CREATE POLICY "Teachers can read own templates"
  ON public.templates FOR SELECT
  USING (auth.uid() = teacher_id);

-- Iedereen kan actieve templates opzoeken via code (voor leerlingen)
CREATE POLICY "Anyone can read active templates by code"
  ON public.templates FOR SELECT
  USING (is_active = TRUE AND code IS NOT NULL);

-- Docenten kunnen templates aanmaken
CREATE POLICY "Teachers can create templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Docenten kunnen eigen templates bewerken
CREATE POLICY "Teachers can update own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Docenten kunnen eigen templates verwijderen
CREATE POLICY "Teachers can delete own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Genereer unieke 8-karakter template code (zelfde charset als share codes)
CREATE OR REPLACE FUNCTION generate_template_code()
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
    -- Check uniek in BEIDE tabellen (templates + submissions)
    SELECT EXISTS(
      SELECT 1 FROM public.templates WHERE code = new_code
      UNION ALL
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Haal template op via code (voor leerlingen, geen login nodig)
CREATE OR REPLACE FUNCTION get_template_by_code(p_code VARCHAR)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  teacher_name TEXT,
  composition_data JSONB,
  instructions TEXT,
  clips_locked BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.name, t.description,
    te.display_name as teacher_name,
    t.composition_data, t.instructions,
    t.clips_locked, t.created_at
  FROM public.templates t
  JOIN public.teachers te ON te.id = t.teacher_id
  WHERE t.code = UPPER(TRIM(p_code))
    AND t.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_template_by_code TO anon;
GRANT EXECUTE ON FUNCTION get_template_by_code TO authenticated;

-- ============================================
-- KLAAR!
-- ============================================
-- Als je "Success. No rows returned" ziet, is alles goed gegaan.
