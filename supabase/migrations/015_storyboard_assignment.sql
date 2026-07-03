-- ============================================
-- MIGRATIE 015: Storyboard als 3e opdracht-type (Feature A)
-- Voer uit in Supabase SQL Editor
-- ============================================
-- Breidt de opdrachten-architectuur uit met een derde type: 'storyboard'.
-- Storyboards zijn statische app-content (registry in src/data/storyboards.ts),
-- GEEN docent-DB-resource. Daarom wordt het storyboard opgeslagen als een
-- tekst-referentie (registry-id) i.p.v. een UUID-FK.
--
-- Model: expliciete discriminator-kolom `assignment_type` + behoud van de
-- bestaande template_id/praatplaat_id UUID-FK's (hun ON DELETE CASCADE blijft
-- ongewijzigd) + nieuwe `storyboard_ref TEXT`.
--
-- LET OP: dit raakt de bestaande FK's op class_assignments NIET aan. De
-- template/praatplaat-cascade zit inline in migratie 006; de submissions-
-- cascade in migratie 009. Beide blijven hier onaangeroerd.

-- ============================================
-- 1. CLASS_ASSIGNMENTS: discriminator + storyboard-ref (additief)
-- ============================================

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS assignment_type TEXT,
  ADD COLUMN IF NOT EXISTS storyboard_ref TEXT;

-- Backfill discriminator uit bestaande rijen (oude CHECK garandeerde precies één ref)
UPDATE public.class_assignments
SET assignment_type = CASE
    WHEN template_id IS NOT NULL THEN 'template'
    WHEN praatplaat_id IS NOT NULL THEN 'praatplaat'
  END
WHERE assignment_type IS NULL;

ALTER TABLE public.class_assignments
  ALTER COLUMN assignment_type SET NOT NULL;

-- Oude 2-weg CHECK vervangen door type-geleide 3-weg CHECK (idempotent)
ALTER TABLE public.class_assignments
  DROP CONSTRAINT IF EXISTS one_assignment_type;

ALTER TABLE public.class_assignments
  ADD CONSTRAINT one_assignment_type CHECK (
    (assignment_type = 'template'   AND template_id   IS NOT NULL AND praatplaat_id IS NULL AND storyboard_ref IS NULL) OR
    (assignment_type = 'praatplaat' AND praatplaat_id IS NOT NULL AND template_id   IS NULL AND storyboard_ref IS NULL) OR
    (assignment_type = 'storyboard' AND storyboard_ref IS NOT NULL AND template_id  IS NULL AND praatplaat_id  IS NULL)
  );

-- ============================================
-- 2. RPC: OPDRACHT ACTIVEREN (+ storyboard)
-- ============================================
-- De oude 3-arg-variant droppen om overload-ambiguïteit te vermijden; de client
-- roept voortaan de 4-arg-variant aan.

DROP FUNCTION IF EXISTS activate_assignment(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION activate_assignment(
  p_class_id UUID,
  p_template_id UUID DEFAULT NULL,
  p_praatplaat_id UUID DEFAULT NULL,
  p_storyboard_ref TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id UUID;
  v_type TEXT;
  v_count INT;
BEGIN
  -- Valideer ownership van klas
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  -- Valideer: precies één opdracht-type
  v_count := (CASE WHEN p_template_id IS NOT NULL THEN 1 ELSE 0 END)
           + (CASE WHEN p_praatplaat_id IS NOT NULL THEN 1 ELSE 0 END)
           + (CASE WHEN p_storyboard_ref IS NOT NULL THEN 1 ELSE 0 END);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Precies één opdracht-type vereist';
  END IF;

  -- Bepaal type + valideer ownership van DB-resources
  IF p_template_id IS NOT NULL THEN
    v_type := 'template';
    IF NOT EXISTS (
      SELECT 1 FROM public.templates WHERE id = p_template_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Template niet gevonden of geen toegang';
    END IF;
  ELSIF p_praatplaat_id IS NOT NULL THEN
    v_type := 'praatplaat';
    IF NOT EXISTS (
      SELECT 1 FROM public.praatplaten WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
    END IF;
  ELSE
    -- Storyboard is app-content: geen DB-ownership-check, alleen non-empty ref
    v_type := 'storyboard';
    IF length(trim(p_storyboard_ref)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige storyboard-referentie';
    END IF;
  END IF;

  -- Insert (trigger deactiveert de rest automatisch)
  INSERT INTO public.class_assignments (
    class_id, teacher_id, assignment_type, template_id, praatplaat_id, storyboard_ref, is_active
  )
  VALUES (
    p_class_id, auth.uid(), v_type, p_template_id, p_praatplaat_id, p_storyboard_ref, TRUE
  )
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

-- ============================================
-- 3. RPC: ACTIEVE OPDRACHT OPHALEN (leerlingen) — JSONB-payload-vorm
-- ============================================
-- Herontwerp: type-stabiele returnvorm. In plaats van brede type-specifieke
-- kolommen geeft de RPC nu een `payload JSONB` (server-side per type opgebouwd)
-- + `card JSONB` (opdrachtkaart, gevuld vanaf migratie 016). Een toekomstig 4e
-- type = één extra CASE-tak; de signatuur/returnvorm verandert niet meer.
--
-- Return-type wijzigt → eerst DROPpen (CREATE OR REPLACE kan return-type niet wijzigen).

DROP FUNCTION IF EXISTS get_active_assignment(TEXT);

CREATE OR REPLACE FUNCTION get_active_assignment(p_class_code TEXT)
RETURNS TABLE (
  assignment_type TEXT,
  payload         JSONB,
  card            JSONB,
  class_id        UUID,
  class_name      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('get_assignment', 'code:' || p_class_code, 30, 60);

  RETURN QUERY
  SELECT
    ca.assignment_type,
    CASE ca.assignment_type
      WHEN 'template' THEN jsonb_build_object(
        'template_id', t.id,
        'name', t.name,
        'description', t.description,
        'teacher_name', te.display_name,
        'composition_data', t.composition_data,
        'instructions', t.instructions,
        'lock_options', t.lock_options
      )
      WHEN 'praatplaat' THEN jsonb_build_object(
        'praatplaat_id', p.id,
        'name', p.name,
        'image_url', p.image_url,
        'theme_id', p.theme_id,
        'location_id', p.location_id
      )
      WHEN 'storyboard' THEN jsonb_build_object(
        'storyboard_ref', ca.storyboard_ref
      )
    END AS payload,
    NULL::jsonb AS card,   -- opdrachtkaart komt in migratie 016
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
-- 4. SUBMISSIONS: storyboard toelaten + string-ref kolom
-- ============================================
-- assignment_id (UUID) past niet op een storyboard-registry-id (tekst). Daarom
-- een additieve `assignment_ref TEXT` voor string-gebaseerde opdracht-types.
-- Weergave in het dashboard loopt via class_id (ongewijzigd); assignment_ref is
-- puur labeling/groepering.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS assignment_ref TEXT;

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_assignment_type_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_assignment_type_check
  CHECK (assignment_type IS NULL OR assignment_type IN ('template', 'praatplaat', 'storyboard'));

COMMENT ON COLUMN public.submissions.assignment_ref IS 'Tekst-referentie van de opdracht voor string-gebaseerde types (bv. storyboard-registry-id); labeling only';

-- ============================================
-- 5. RPC: UNIVERSELE SUBMIT (+ storyboard + assignment_ref)
-- ============================================
-- Oude signatuur droppen en herbouwen met p_assignment_ref, om overloads te
-- vermijden. Storyboard-inzendingen leveren p_assignment_ref (registry-id) aan
-- en laten p_assignment_id NULL.

DROP FUNCTION IF EXISTS submit_or_update_composition(TEXT, TEXT, TEXT, JSONB, UUID, UUID, TEXT, REAL, REAL);

CREATE OR REPLACE FUNCTION submit_or_update_composition(
  p_class_code TEXT,
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB,
  p_client_id UUID DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL,
  p_assignment_type TEXT DEFAULT NULL,
  p_assignment_ref TEXT DEFAULT NULL,
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
  -- Rate limit: max 60 per minuut per klascode
  v_identifier := 'classcode:' || TRIM(p_class_code);
  PERFORM check_rate_limit('submit_or_update', v_identifier, 60, 60);

  -- Valideer assignment_type indien opgegeven
  IF p_assignment_type IS NOT NULL AND p_assignment_type NOT IN ('template', 'praatplaat', 'storyboard') THEN
    RAISE EXCEPTION 'Invalid assignment_type: %', p_assignment_type;
  END IF;

  -- Zoek klas op code
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = TRIM(p_class_code) AND is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden of niet actief';
  END IF;

  -- Bepaal submission-ID (idempotente UPSERT via client_id)
  v_submission_id := COALESCE(p_client_id, gen_random_uuid());

  INSERT INTO public.submissions (
    id,
    class_id,
    student_name,
    composition_name,
    composition_data,
    assignment_id,
    assignment_type,
    assignment_ref,
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
    p_assignment_ref,
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

-- ============================================
-- 6. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_active_assignment(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_assignment(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_or_update_composition(TEXT, TEXT, TEXT, JSONB, UUID, UUID, TEXT, TEXT, REAL, REAL) TO anon, authenticated;
