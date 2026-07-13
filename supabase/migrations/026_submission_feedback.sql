-- ============================================
-- MIGRATIE 026: Docent-feedback op inzendingen + automatische bewaarcode
-- Voer uit in Supabase SQL Editor (NA migratie 025)
-- ============================================
-- Maakt de pedagogische cirkel rond: opdracht → maken → inleveren →
-- feedback → verbeteren.
--
-- Vier onderdelen:
--  1. Feedbackkolommen op submissions (sticker + niveau 1-3 + tekst + stempels)
--  2. RPC set_submission_feedback + mark_submission_seen (docent, ownership-check)
--  3. RPC submit_or_update_composition_v2 — als bestaande functie, maar mint
--     automatisch een bewaarcode (save_code) en geeft die terug. NIEUWE functie
--     naast de oude (return-type wijzigen zou live oude clients breken).
--  4. load_saved_composition uitgebreid met de feedbackvelden (DROP + CREATE;
--     extra kolommen zijn backward-compatible — oude clients negeren ze).
--
-- Additief en idempotent. Rate limiting via check_rate_limit (migratie 002).

-- ============================================
-- 1. SUBMISSIONS: feedbackkolommen
-- ============================================

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS feedback_sticker TEXT,
  ADD COLUMN IF NOT EXISTS feedback_level SMALLINT,
  ADD COLUMN IF NOT EXISTS feedback_text TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS teacher_seen_at TIMESTAMPTZ;

-- Sticker uit vaste set (client mapt naar emoji + i18n-label), niveau 1-3,
-- tekst kort (kindgericht bericht, geen essay).
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_feedback_sticker_check;
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_feedback_sticker_check CHECK (
    feedback_sticker IS NULL OR feedback_sticker IN
      ('star', 'rhythm', 'build', 'teamwork', 'surprise', 'target')
  );

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_feedback_level_check;
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_feedback_level_check CHECK (
    feedback_level IS NULL OR feedback_level BETWEEN 1 AND 3
  );

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_feedback_text_check;
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_feedback_text_check CHECK (
    feedback_text IS NULL OR char_length(feedback_text) <= 300
  );

-- ============================================
-- 2. RPC's VOOR DE DOCENT
-- ============================================

-- Feedback zetten (of wissen door alles NULL te sturen). Ownership-check:
-- de inzending moet bij een klas van de ingelogde docent horen. Bewust een
-- smalle RPC i.p.v. een brede UPDATE-policy, zodat een docent nooit per
-- ongeluk composition_data kan wijzigen.
CREATE OR REPLACE FUNCTION set_submission_feedback(
  p_submission_id UUID,
  p_sticker TEXT DEFAULT NULL,
  p_level SMALLINT DEFAULT NULL,
  p_text TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Max 60 feedback-acties per minuut per docent
  PERFORM check_rate_limit('set_feedback', 'teacher:' || auth.uid()::TEXT, 60, 60);

  UPDATE public.submissions s
  SET
    feedback_sticker = p_sticker,
    feedback_level   = p_level,
    feedback_text    = NULLIF(TRIM(COALESCE(p_text, '')), ''),
    feedback_at      = CASE
                         WHEN p_sticker IS NULL AND p_level IS NULL
                              AND NULLIF(TRIM(COALESCE(p_text, '')), '') IS NULL
                         THEN NULL  -- alles gewist → feedback verwijderd
                         ELSE NOW()
                       END
  FROM public.classes c
  WHERE s.id = p_submission_id
    AND s.class_id = c.id
    AND c.teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inzending niet gevonden of geen toegang';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_submission_feedback(UUID, TEXT, SMALLINT, TEXT) TO authenticated;

-- "Gezien"-stempel: gezet bij het openen van een inzending door de docent.
-- Alleen de eerste keer (status 'nieuw' → 'beluisterd' moet stabiel blijven).
CREATE OR REPLACE FUNCTION mark_submission_seen(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  PERFORM check_rate_limit('mark_seen', 'teacher:' || auth.uid()::TEXT, 120, 60);

  UPDATE public.submissions s
  SET teacher_seen_at = COALESCE(s.teacher_seen_at, NOW())
  FROM public.classes c
  WHERE s.id = p_submission_id
    AND s.class_id = c.id
    AND c.teacher_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION mark_submission_seen(UUID) TO authenticated;

-- ============================================
-- 3. RPC: submit_or_update_composition_v2 — mint bewaarcode
-- ============================================
-- Zelfde gedrag als submit_or_update_composition (migratie 018, autoritatief),
-- plus: mint bij de eerste insert een save_code + save_secret (hergebruik
-- generate_save_code/generate_save_secret uit migratie 004) en geef de
-- save_code terug. Zo heeft élke klas-inzending een individuele "handle"
-- waarmee het kind later de docent-feedback kan terugzien — zonder account.
--
-- De oude functie blijft ongewijzigd bestaan voor reeds uitgerolde clients.

CREATE OR REPLACE FUNCTION submit_or_update_composition_v2(
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
RETURNS TABLE (
  submission_id UUID,
  save_code VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    save_code, save_secret, last_updated_at
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
    last_updated_at = NOW();

  SELECT s.save_code INTO v_save_code
  FROM public.submissions s
  WHERE s.id = v_submission_id;

  RETURN QUERY SELECT v_submission_id, v_save_code;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_or_update_composition_v2(TEXT, TEXT, TEXT, JSONB, UUID, UUID, TEXT, TEXT, REAL, REAL) TO anon, authenticated;

-- ============================================
-- 4. load_saved_composition: feedbackvelden meesturen
-- ============================================
-- Return-type wijzigt (extra kolommen) → DROP + CREATE in één transactie.
-- Oude clients negeren de extra kolommen; bestaand gedrag blijft identiek.

DROP FUNCTION IF EXISTS load_saved_composition(VARCHAR);

CREATE FUNCTION load_saved_composition(p_save_code VARCHAR)
RETURNS TABLE (
  id UUID,
  student_name TEXT,
  composition_name TEXT,
  composition_data JSONB,
  last_updated_at TIMESTAMPTZ,
  student_email TEXT,
  feedback_sticker TEXT,
  feedback_level SMALLINT,
  feedback_text TEXT,
  feedback_at TIMESTAMPTZ
) AS $$
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
    s.feedback_sticker, s.feedback_level, s.feedback_text, s.feedback_at
  FROM public.submissions s
  WHERE s.save_code = v_normalized_code
    AND (s.last_updated_at IS NULL OR s.last_updated_at > NOW() - INTERVAL '60 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION load_saved_composition(VARCHAR) TO anon, authenticated;
