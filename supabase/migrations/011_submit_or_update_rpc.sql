-- Migration 011: Universele submit_or_update_composition RPC
-- Purpose: One idempotent function for all klascode submissions (template + praatplaat + free).
-- Uses client-generated UUID + ON CONFLICT for idempotency.
--
-- DOES NOT replace or modify existing submit_composition or submit_praatplaat_composition.
-- Those remain available as fallback. This is a new, parallel function.

CREATE OR REPLACE FUNCTION submit_or_update_composition(
  p_class_code TEXT,
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB,
  p_client_id UUID DEFAULT NULL,           -- Client-generated UUID for idempotent INSERT
  p_assignment_id UUID DEFAULT NULL,        -- template_id or praatplaat_id
  p_assignment_type TEXT DEFAULT NULL,       -- 'template' or 'praatplaat'
  p_praatplaat_position_x REAL DEFAULT NULL,
  p_praatplaat_position_y REAL DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
  v_identifier TEXT;
BEGIN
  -- Rate limit: max 60 per minute per class code
  v_identifier := 'classcode:' || TRIM(p_class_code);
  PERFORM check_rate_limit('submit_or_update', v_identifier, 60, 60);

  -- Validate assignment_type if provided
  IF p_assignment_type IS NOT NULL AND p_assignment_type NOT IN ('template', 'praatplaat') THEN
    RAISE EXCEPTION 'Invalid assignment_type: %', p_assignment_type;
  END IF;

  -- Look up class by code
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = TRIM(p_class_code) AND is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden of niet actief';
  END IF;

  -- Determine the submission ID:
  -- If p_client_id is provided, use it (enables idempotent UPSERT).
  -- Otherwise generate a new UUID (first-time submit without client ID).
  v_submission_id := COALESCE(p_client_id, gen_random_uuid());

  -- UPSERT: INSERT if new, UPDATE if existing (idempotent via client_id)
  INSERT INTO public.submissions (
    id,
    class_id,
    student_name,
    composition_name,
    composition_data,
    assignment_id,
    assignment_type,
    praatplaat_id,
    position_x,
    position_y,
    last_updated_at
  )
  VALUES (
    v_submission_id,
    v_class_id,
    COALESCE(NULLIF(TRIM(p_student_name), ''), 'Anoniem'),
    p_composition_name,
    p_composition_data,
    p_assignment_id,
    p_assignment_type,
    CASE WHEN p_assignment_type = 'praatplaat' THEN p_assignment_id ELSE NULL END,
    p_praatplaat_position_x,
    p_praatplaat_position_y,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    composition_name = EXCLUDED.composition_name,
    composition_data = EXCLUDED.composition_data,
    student_name = EXCLUDED.student_name,
    position_x = COALESCE(EXCLUDED.position_x, public.submissions.position_x),
    position_y = COALESCE(EXCLUDED.position_y, public.submissions.position_y),
    last_updated_at = NOW();

  RETURN v_submission_id;
END;
$$;

-- Grant access to anonymous users (students without login)
GRANT EXECUTE ON FUNCTION submit_or_update_composition TO anon;
GRANT EXECUTE ON FUNCTION submit_or_update_composition TO authenticated;
