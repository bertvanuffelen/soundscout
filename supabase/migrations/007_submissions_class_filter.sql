-- 007: Filter praatplaat submissions per klas
--
-- get_praatplaat_submissions krijgt een optionele p_class_id parameter.
-- Als p_class_id is opgegeven, worden alleen submissions van die klas getoond.
-- Als NULL, worden alle submissions voor de praatplaat getoond (backward compatible).

CREATE OR REPLACE FUNCTION get_praatplaat_submissions(
  p_praatplaat_id UUID,
  p_class_id UUID DEFAULT NULL
)
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
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
  ORDER BY s.created_at DESC;
END;
$$;
