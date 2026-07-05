-- ============================================
-- MIGRATIE 018: 'vrij' als 4e opdracht-type (vrije compositie)
-- Voer uit in Supabase SQL Editor (NA migratie 017)
-- ============================================
-- Breidt de opdrachten-architectuur uit met een vierde type: 'free'.
-- Een vrije-compositie-opdracht legt geen resource (template/praatplaat/
-- storyboard) vast, maar wél een thema: de docent kiest bij activeren één
-- thema (geluidenset). De leerling componeert vrij binnen dat thema — enkel
-- gericht op de geluiden, zonder praatplaat of storyboard.
--
-- Model: zoals storyboard is 'free' geen docent-DB-resource. Het thema wordt
-- opgeslagen als tekst-referentie `free_theme_id` (theme-registry-id), net als
-- `storyboard_ref`. Geen FK — thema's zijn app-content (src/data/themes).
--
-- Deze migratie bouwt voort op de AUTORITATIEVE versies uit migratie 017
-- (idempotente activate_assignment + partiële unieke indexen) en migratie 016
-- (get_active_assignment + opdrachtkaart). Houd de functies consistent.

-- ============================================
-- 1. CLASS_ASSIGNMENTS: free_theme_id + 4-weg CHECK (additief)
-- ============================================

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS free_theme_id TEXT;

-- Oude 3-weg CHECK vervangen door type-geleide 4-weg CHECK (idempotent)
ALTER TABLE public.class_assignments
  DROP CONSTRAINT IF EXISTS one_assignment_type;

ALTER TABLE public.class_assignments
  ADD CONSTRAINT one_assignment_type CHECK (
    (assignment_type = 'template'   AND template_id    IS NOT NULL AND praatplaat_id IS NULL AND storyboard_ref IS NULL AND free_theme_id IS NULL) OR
    (assignment_type = 'praatplaat' AND praatplaat_id  IS NOT NULL AND template_id   IS NULL AND storyboard_ref IS NULL AND free_theme_id IS NULL) OR
    (assignment_type = 'storyboard' AND storyboard_ref IS NOT NULL AND template_id   IS NULL AND praatplaat_id  IS NULL AND free_theme_id IS NULL) OR
    (assignment_type = 'free'       AND free_theme_id  IS NOT NULL AND template_id   IS NULL AND praatplaat_id  IS NULL AND storyboard_ref IS NULL)
  );

-- ============================================
-- 2. PARTIËLE UNIEKE INDEX — max één vrije-opdracht per (klas + thema)
-- ============================================
-- Consistent met de indexen uit migratie 017: hervatten i.p.v. duplicaten.

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_assignments_uniq_free
  ON public.class_assignments (class_id, free_theme_id) WHERE free_theme_id IS NOT NULL;

-- ============================================
-- 3. RPC: activate_assignment — eindversie (+ p_free_theme_id)
-- ============================================
-- Vervangt de 5-arg-variant uit migratie 017. Drop eerst om overload-
-- ambiguïteit te vermijden. Body blijft idempotent (hervatten per klas + bron).

DROP FUNCTION IF EXISTS activate_assignment(UUID, UUID, UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION activate_assignment(
  p_class_id UUID,
  p_template_id UUID DEFAULT NULL,
  p_praatplaat_id UUID DEFAULT NULL,
  p_storyboard_ref TEXT DEFAULT NULL,
  p_card_id UUID DEFAULT NULL,
  p_free_theme_id TEXT DEFAULT NULL
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
           + (CASE WHEN p_storyboard_ref IS NOT NULL THEN 1 ELSE 0 END)
           + (CASE WHEN p_free_theme_id IS NOT NULL THEN 1 ELSE 0 END);
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
  ELSIF p_storyboard_ref IS NOT NULL THEN
    -- Storyboard is app-content: geen DB-ownership-check, alleen non-empty ref
    v_type := 'storyboard';
    IF length(trim(p_storyboard_ref)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige storyboard-referentie';
    END IF;
  ELSE
    -- Vrije compositie: thema is app-content, alleen non-empty ref
    v_type := 'free';
    IF length(trim(p_free_theme_id)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige thema-referentie';
    END IF;
  END IF;

  -- Valideer ownership van de (optionele) opdrachtkaart
  IF p_card_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.assignment_cards WHERE id = p_card_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Opdrachtkaart niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Hervatten: bestaande rij voor (klas + bron) zoeken
  SELECT id INTO v_assignment_id
  FROM public.class_assignments
  WHERE class_id = p_class_id
    AND (
      (v_type = 'template'   AND template_id   = p_template_id) OR
      (v_type = 'praatplaat' AND praatplaat_id = p_praatplaat_id) OR
      (v_type = 'storyboard' AND storyboard_ref = p_storyboard_ref) OR
      (v_type = 'free'       AND free_theme_id  = p_free_theme_id)
    )
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    -- Hervat bestaande opdracht (trigger deactiveert de rest)
    UPDATE public.class_assignments
    SET is_active = TRUE, activated_at = NOW(), card_id = p_card_id
    WHERE id = v_assignment_id;
  ELSE
    -- Nieuwe opdracht
    INSERT INTO public.class_assignments (
      class_id, teacher_id, assignment_type, template_id, praatplaat_id, storyboard_ref, free_theme_id, card_id, is_active
    )
    VALUES (
      p_class_id, auth.uid(), v_type, p_template_id, p_praatplaat_id, p_storyboard_ref, p_free_theme_id, p_card_id, TRUE
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  RETURN v_assignment_id;
END;
$$;

-- activate_praatplaat_from_catalog (migratie 017) roept activate_assignment
-- positioneel met 5 argumenten aan; de nieuwe 6e parameter defaultt naar NULL,
-- dus die call blijft geldig zonder wijziging.

-- ============================================
-- 4. RPC: get_active_assignment — + 'free'-tak in payload
-- ============================================
-- Return-vorm identiek aan migratie 016; alleen een extra CASE-tak. Signatuur/
-- return-type ongewijzigd → CREATE OR REPLACE volstaat.

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
      WHEN 'free' THEN jsonb_build_object(
        'free_theme_id', ca.free_theme_id
      )
    END AS payload,
    CASE
      WHEN ca.card_id IS NOT NULL THEN jsonb_build_object(
        'title', ac.title,
        'bullets', ac.bullets
      )
      ELSE NULL
    END AS card,
    c.id AS class_id,
    c.name AS class_name
  FROM public.class_assignments ca
  JOIN public.classes c ON c.id = ca.class_id
  LEFT JOIN public.templates t ON t.id = ca.template_id
  LEFT JOIN public.teachers te ON te.id = t.teacher_id
  LEFT JOIN public.praatplaten p ON p.id = ca.praatplaat_id
  LEFT JOIN public.assignment_cards ac ON ac.id = ca.card_id
  WHERE c.code = p_class_code
    AND ca.is_active = TRUE;
END;
$$;

-- ============================================
-- 5. SUBMISSIONS: 'free' toelaten
-- ============================================
-- Vrije-inzendingen dragen assignment_type = 'free' en de thema-ref via
-- assignment_ref (tekst, zoals storyboard). assignment_id blijft NULL.

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_assignment_type_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_assignment_type_check
  CHECK (assignment_type IS NULL OR assignment_type IN ('template', 'praatplaat', 'storyboard', 'free'));

-- ============================================
-- 6. RPC: submit_or_update_composition — 'free' toelaten
-- ============================================
-- Signatuur ongewijzigd t.o.v. migratie 015 → CREATE OR REPLACE. Enige wijziging:
-- de assignment_type-validatie accepteert nu ook 'free'. Free levert (net als
-- storyboard) p_assignment_ref = thema-id en laat p_assignment_id NULL.

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
  IF p_assignment_type IS NOT NULL AND p_assignment_type NOT IN ('template', 'praatplaat', 'storyboard', 'free') THEN
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
-- 7. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION activate_assignment(UUID, UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_assignment(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_or_update_composition(TEXT, TEXT, TEXT, JSONB, UUID, UUID, TEXT, TEXT, REAL, REAL) TO anon, authenticated;
