-- ============================================
-- MIGRATIE 021: Publieke lees-RPC voor ingebouwde leskaarten
-- Voer uit in Supabase SQL Editor (NA migratie 020)
-- ============================================
-- De publieke docentenlandingspagina (/teacher, geen login) toont de ingebouwde
-- leskaarten. In plaats van te leunen op RLS-leesrechten voor anon, exposeren we
-- alleen de presentatie-velden via een SECURITY DEFINER-RPC. Zo blijft de tabel
-- dicht en tonen we bewust enkel built-ins (teacher_id NULL) als marketingdata.

CREATE OR REPLACE FUNCTION get_builtin_lesson_cards()
RETURNS TABLE (
  id UUID,
  builtin_key TEXT,
  assignment_type TEXT,
  title TEXT,
  level TEXT,
  lesson_goal TEXT,
  phases JSONB,
  cover_image TEXT,
  pdf_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    lc.id,
    lc.builtin_key,
    lc.assignment_type,
    lc.title,
    lc.level,
    lc.lesson_goal,
    lc.phases,
    lc.cover_image,
    lc.pdf_url
  FROM public.lesson_cards lc
  WHERE lc.teacher_id IS NULL
    AND lc.is_active IS TRUE
  ORDER BY lc.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_builtin_lesson_cards() TO anon, authenticated;
