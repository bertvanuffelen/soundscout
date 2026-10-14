-- =============================================================================
-- ROLLBACK van 036_security_hardening — herstelt de stand van productie op 14-10-2026
-- (definities letterlijk uit de live database). Alleen gebruiken als 036 problemen
-- geeft. LET OP: dit zet de lekken uit de audit weer open. Gewiste
-- leerling-e-mailadressen komen niet terug.
-- Na deze rollback ook de vorige app-build terugzetten.
-- =============================================================================

BEGIN;

CREATE POLICY "Anyone can lookup class by code" ON public.classes AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can submit compositions" ON public.submissions AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read active templates by code" ON public.templates AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND (code IS NOT NULL)));
DROP POLICY IF EXISTS "Teachers can create class assignments" ON public.class_assignments;
CREATE POLICY "Teachers can create class assignments" ON public.class_assignments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
DROP POLICY IF EXISTS "Teachers can update own class assignments" ON public.class_assignments;
CREATE POLICY "Teachers can update own class assignments" ON public.class_assignments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = teacher_id));
DROP POLICY IF EXISTS "Teachers can create praatplaten" ON public.praatplaten;
CREATE POLICY "Teachers can create praatplaten" ON public.praatplaten AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
DROP POLICY IF EXISTS "Teachers can update own praatplaten" ON public.praatplaten;
CREATE POLICY "Teachers can update own praatplaten" ON public.praatplaten AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = teacher_id));

DROP FUNCTION IF EXISTS public.submit_or_update_composition_v2(text, text, text, jsonb, uuid, uuid, text, text, real, real, character varying);
CREATE OR REPLACE FUNCTION public.submit_or_update_composition_v2(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid DEFAULT NULL::uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_assignment_type text DEFAULT NULL::text, p_assignment_ref text DEFAULT NULL::text, p_praatplaat_position_x real DEFAULT NULL::real, p_praatplaat_position_y real DEFAULT NULL::real)
 RETURNS TABLE(submission_id uuid, save_code character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
  v_identifier TEXT;
  v_save_code VARCHAR(6);
BEGIN
  -- Rate limit: gedeeld met v1 (zelfde actie-key)
  v_identifier := 'classcode:' || TRIM(p_class_code);
  PERFORM check_rate_limit('submit_or_update', v_identifier, 60, 60);

  IF p_assignment_type IS NOT NULL AND p_assignment_type NOT IN ('template', 'praatplaat', 'storyboard', 'free') THEN
    RAISE EXCEPTION 'Invalid assignment_type: %', p_assignment_type;
  END IF;

  SELECT c.id INTO v_class_id
  FROM public.classes c
  WHERE c.code = TRIM(p_class_code) AND c.is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden of niet actief';
  END IF;

  v_submission_id := COALESCE(p_client_id, gen_random_uuid());

  INSERT INTO public.submissions (
    id, class_id, student_name, composition_name, composition_data,
    assignment_id, assignment_type, assignment_ref,
    praatplaat_id, position_x, position_y,
    save_code, save_secret, submitted_at, last_updated_at
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
    generate_save_code(),
    generate_save_secret(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    composition_name = EXCLUDED.composition_name,
    composition_data = EXCLUDED.composition_data,
    student_name = EXCLUDED.student_name,
    position_x = COALESCE(EXCLUDED.position_x, public.submissions.position_x),
    position_y = COALESCE(EXCLUDED.position_y, public.submissions.position_y),
    -- Bestaande code behouden; alleen minten als de rij er nog geen had
    -- (bijv. eerder ingeleverd via de oude v1-RPC)
    save_code   = COALESCE(public.submissions.save_code, EXCLUDED.save_code),
    save_secret = COALESCE(public.submissions.save_secret, EXCLUDED.save_secret),
    -- Eerste formele inlevering telt; blijft daarna staan
    submitted_at = COALESCE(public.submissions.submitted_at, NOW()),
    last_updated_at = NOW();

  SELECT s.save_code INTO v_save_code
  FROM public.submissions s
  WHERE s.id = v_submission_id;

  RETURN QUERY SELECT v_submission_id, v_save_code;
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.submit_or_update_composition_v2(text, text, text, jsonb, uuid, uuid, text, text, real, real) TO PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_save_code() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_save_secret() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_share_code() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_share_code_v2() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_praatplaat_share_code() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(uuid, uuid, text[]) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_or_update_composition(text, text, text, jsonb, uuid, uuid, text, text, real, real) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_class_code() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_template_code() TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_active_assignment(p_class_code text)
 RETURNS TABLE(assignment_type text, payload jsonb, card jsonb, class_id uuid, class_name text, peer_review jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM check_rate_limit('get_assignment', 'code:' || p_class_code, 30, 60);

  RETURN QUERY
  SELECT
    ca.assignment_type,
    (CASE ca.assignment_type
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
    END
      || jsonb_build_object('duration_label', ca.duration_label)
    ) AS payload,
    CASE
      WHEN ca.card_id IS NOT NULL THEN jsonb_build_object(
        'title', ac.title,
        'bullets', ac.bullets
      )
      ELSE NULL
    END AS card,
    c.id AS class_id,
    c.name AS class_name,
    CASE
      WHEN ca.peer_review_enabled AND fc.id IS NOT NULL THEN jsonb_build_object(
        'enabled', TRUE,
        'card_title', fc.title,
        'chips', to_jsonb(fc.chips),
        'closes_at', ca.peer_review_closes_at
      )
      ELSE NULL
    END AS peer_review
  FROM public.class_assignments ca
  JOIN public.classes c ON c.id = ca.class_id
  LEFT JOIN public.templates t ON t.id = ca.template_id
  LEFT JOIN public.teachers te ON te.id = t.teacher_id
  LEFT JOIN public.praatplaten p ON p.id = ca.praatplaat_id
  LEFT JOIN public.assignment_cards ac ON ac.id = ca.card_id
  LEFT JOIN public.feedback_cards fc ON fc.id = ca.feedback_card_id
  WHERE c.code = p_class_code
    AND ca.is_active = TRUE;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.save_composition_online(p_student_name text, p_composition_name text, p_composition_data jsonb, p_class_code text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS TABLE(save_code character varying, save_secret character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_code VARCHAR(6); v_secret VARCHAR(32); v_class_id UUID := NULL; v_identifier TEXT;
BEGIN
  v_identifier := COALESCE(auth.uid()::TEXT, 'anon:' || md5(p_student_name));
  PERFORM check_rate_limit('save_online', v_identifier, 10, 60);
  IF p_class_code IS NOT NULL AND char_length(TRIM(p_class_code)) = 4 THEN
    SELECT id INTO v_class_id FROM public.classes WHERE code = TRIM(p_class_code) AND is_active = TRUE;
  END IF;
  v_code := generate_save_code();
  v_secret := generate_save_secret();
  INSERT INTO public.submissions (class_id, student_name, composition_name, composition_data, save_code, save_secret, last_updated_at, student_email)
  VALUES (v_class_id, p_student_name, p_composition_name, p_composition_data, v_code, v_secret, NOW(), NULLIF(TRIM(p_email), ''));
  RETURN QUERY SELECT v_code, v_secret;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.load_saved_composition(p_save_code character varying)
 RETURNS TABLE(id uuid, student_name text, composition_name text, composition_data jsonb, last_updated_at timestamp with time zone, student_email text, feedback_sticker text, feedback_level smallint, feedback_text text, feedback_at timestamp with time zone, class_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_normalized_code VARCHAR;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));

  -- Rate limit: max 30 lookups per minuut per code
  PERFORM check_rate_limit('load_save', 'code:' || v_normalized_code, 30, 60);

  RETURN QUERY
  SELECT
    s.id, s.student_name, s.composition_name,
    s.composition_data, s.last_updated_at, s.student_email,
    s.feedback_sticker, s.feedback_level, s.feedback_text, s.feedback_at,
    c.code::TEXT AS class_code
  FROM public.submissions s
  LEFT JOIN public.classes c ON c.id = s.class_id
  WHERE s.save_code = v_normalized_code
    AND (s.last_updated_at IS NULL OR s.last_updated_at > NOW() - INTERVAL '60 days');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.share_class_album(p_assignment_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_code VARCHAR(8);
  v_expires TIMESTAMPTZ;
BEGIN
  -- Rate limit: 10 per minuut per docent
  PERFORM check_rate_limit('share_class_album', auth.uid()::text, 10, 60);

  -- Valideer: docent is eigenaar van de opdracht
  SELECT share_code INTO v_code
  FROM public.class_assignments
  WHERE id = p_assignment_id AND teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opdracht niet gevonden of geen toegang';
  END IF;

  v_expires := NOW() + INTERVAL '30 days';

  IF v_code IS NOT NULL THEN
    UPDATE public.class_assignments
    SET share_expires_at = v_expires
    WHERE id = p_assignment_id;
    RETURN v_code;
  ELSE
    v_code := generate_share_code_v2();
    UPDATE public.class_assignments
    SET share_code = v_code,
        share_expires_at = v_expires,
        share_view_count = 0
    WHERE id = p_assignment_id;
    RETURN v_code;
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_submissions INT := 0;
  deleted_bewaarcodes INT := 0;
  cleared_praatplaat_shares INT := 0;
  cleared_album_shares INT := 0;
BEGIN
  -- 1a. Docent-inzendingen (klas of praatplaat) — 1 schooljaar na laatste activiteit.
  WITH del AS (
    DELETE FROM public.submissions
    WHERE (class_id IS NOT NULL OR praatplaat_id IS NOT NULL)
      AND COALESCE(last_updated_at, submitted_at, created_at) < NOW() - INTERVAL '365 days'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_submissions FROM del;

  -- 1b. Losse composities zonder klas/praatplaat (online bewaarcode of gedeelde
  --     link) — 60 dagen na laatste activiteit. Dekt zowel bewaarcodes (60 d)
  --     als deellinks (30 d), beide ruim binnen 60 dagen.
  WITH del AS (
    DELETE FROM public.submissions
    WHERE class_id IS NULL AND praatplaat_id IS NULL
      AND COALESCE(last_updated_at, created_at) < NOW() - INTERVAL '60 days'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_bewaarcodes FROM del;

  -- 1c. Vervallen deelcodes van praatplaten wissen (toegang stopt; rij blijft).
  UPDATE public.praatplaten
    SET share_code = NULL, share_expires_at = NULL
    WHERE share_code IS NOT NULL
      AND share_expires_at IS NOT NULL
      AND share_expires_at < NOW();
  GET DIAGNOSTICS cleared_praatplaat_shares = ROW_COUNT;

  -- 1d. Vervallen klasalbum-codes wissen.
  UPDATE public.class_assignments
    SET share_code = NULL, share_expires_at = NULL
    WHERE share_code IS NOT NULL
      AND share_expires_at IS NOT NULL
      AND share_expires_at < NOW();
  GET DIAGNOSTICS cleared_album_shares = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_submissions', deleted_submissions,
    'deleted_bewaarcodes', deleted_bewaarcodes,
    'cleared_praatplaat_shares', cleared_praatplaat_shares,
    'cleared_album_shares', cleared_album_shares,
    'ran_at', NOW()
  );
END;
$function$
;
ALTER FUNCTION public.get_active_assignment(text) RESET search_path;
ALTER FUNCTION public.save_composition_online(text, text, jsonb, text, text) RESET search_path;
ALTER FUNCTION public.load_saved_composition(character varying) RESET search_path;

COMMIT;
