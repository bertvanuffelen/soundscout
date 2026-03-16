-- ============================================
-- MIGRATIE: Granulaire Template Lock Options (#59)
-- Voer dit uit in Supabase SQL Editor (3 stappen)
-- ============================================

-- Stap 1: Voeg lock_options JSONB kolom toe
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS lock_options JSONB;

-- Stap 2: Migreer bestaande templates van clips_locked naar lock_options
UPDATE public.templates
SET lock_options = jsonb_build_object(
  'clipsLocked', COALESCE(clips_locked, false),
  'sectionsLocked', COALESCE(clips_locked, false),
  'libraryLocked', true,
  'allowNewClips', true
)
WHERE lock_options IS NULL;

-- Stap 3: Update RPC functie om lock_options mee te geven
-- (DROP nodig omdat return type wijzigt)
DROP FUNCTION IF EXISTS get_template_by_code(character varying);

CREATE OR REPLACE FUNCTION get_template_by_code(p_code VARCHAR)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  teacher_name TEXT,
  composition_data JSONB,
  instructions TEXT,
  clips_locked BOOLEAN,
  lock_options JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.name, t.description,
    te.display_name as teacher_name,
    t.composition_data, t.instructions,
    t.clips_locked, t.lock_options, t.created_at
  FROM public.templates t
  JOIN public.teachers te ON te.id = t.teacher_id
  WHERE t.code = UPPER(TRIM(p_code))
    AND t.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_template_by_code TO anon;
GRANT EXECUTE ON FUNCTION get_template_by_code TO authenticated;

-- ============================================
-- VERIFICATIE: controleer of migratie geslaagd is
-- ============================================
-- SELECT id, name, clips_locked, lock_options FROM public.templates LIMIT 5;
