-- ============================================
-- MIGRATIE 028: Peer-feedback 2.0 — sterren per criterium, maximum van 3,
--                server-side venster (toggle + timer) en sessie-herstel
-- Voer uit in Supabase SQL Editor (NA migratie 027)
-- ============================================
-- Wijzigingen t.o.v. 027 (besluiten Bert, 2026-07-13):
--  1. Leerlingen geven per criterium van de feedbackkaart 1-3 STERREN
--     (i.p.v. alleen woord-chips) → er ontstaat een score (basis voor de
--     top 3 in het docentenoverzicht).
--  2. Vast maximum: één leerling beoordeelt maximaal 3 klasgenoten
--     (server-side afgedwongen; 027 had alleen batch-van-3 per aanroep).
--  3. De docent-toggle "klasgenoten luisteren" wordt nu óók door de RPC's
--     gecontroleerd (027 controleerde alleen client-side!) + optionele
--     timer: peer_review_closes_at. Na sluiting: lezen blijft (docent-RLS
--     en complimenten-weergave), geven stopt.
--  4. load_saved_composition geeft de class_code terug zodat de bewaarcode
--     de klas-sessie (en daarmee peer-feedback) kan herstellen.
--
-- Additief en idempotent; v1-RPC's blijven bestaan voor oude clients.

-- ============================================
-- 1. KOLOMMEN
-- ============================================

-- Sterren per criterium: {"Lekker ritme!": 3, "Mooie opbouw!": 2}
ALTER TABLE public.peer_feedback
  ADD COLUMN IF NOT EXISTS ratings JSONB;

-- Optionele sluittijd van het peer-feedbackvenster (NULL = geen timer)
ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS peer_review_closes_at TIMESTAMPTZ;

-- ============================================
-- 2. Hulpfunctie: is peer-feedback open voor deze klas?
-- ============================================

CREATE OR REPLACE FUNCTION peer_review_is_open(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_assignments ca
    WHERE ca.class_id = p_class_id
      AND ca.is_active = TRUE
      AND ca.peer_review_enabled = TRUE
      AND (ca.peer_review_closes_at IS NULL OR ca.peer_review_closes_at > NOW())
  );
$$;

-- ============================================
-- 3. set_assignment_peer_review — + timer (minuten)
-- ============================================
-- Signatuur wijzigt → DROP oude 3-args-versie om overload-ambiguïteit te
-- vermijden, dan CREATE met extra parameter.

DROP FUNCTION IF EXISTS set_assignment_peer_review(UUID, BOOLEAN, UUID);

CREATE FUNCTION set_assignment_peer_review(
  p_assignment_id UUID,
  p_enabled BOOLEAN,
  p_feedback_card_id UUID DEFAULT NULL,
  p_close_after_minutes INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
  v_closes_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Kaart-fallback: aanzetten zonder kaart → ingebouwde standaardkaart
  v_card_id := p_feedback_card_id;
  IF p_enabled AND v_card_id IS NULL THEN
    SELECT id INTO v_card_id FROM public.feedback_cards WHERE builtin_key = 'standaard';
  END IF;

  IF v_card_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.feedback_cards fc
    WHERE fc.id = v_card_id AND (fc.teacher_id = auth.uid() OR fc.teacher_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Feedbackkaart niet gevonden of geen toegang';
  END IF;

  -- Timer: alleen relevant bij aanzetten; NULL = geen automatische sluiting
  IF p_enabled AND p_close_after_minutes IS NOT NULL AND p_close_after_minutes > 0 THEN
    v_closes_at := NOW() + make_interval(mins => p_close_after_minutes);
  ELSE
    v_closes_at := NULL;
  END IF;

  UPDATE public.class_assignments ca
  SET peer_review_enabled = p_enabled,
      feedback_card_id = v_card_id,
      peer_review_closes_at = v_closes_at
  WHERE ca.id = p_assignment_id
    AND ca.teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opdracht niet gevonden of geen toegang';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_assignment_peer_review(UUID, BOOLEAN, UUID, INT) TO authenticated;

-- ============================================
-- 4. get_peer_review_batch — venster + quotum (max 3 totaal)
-- ============================================

CREATE OR REPLACE FUNCTION get_peer_review_batch(
  p_class_code TEXT,
  p_own_submission_id UUID,
  p_batch_size INT DEFAULT 3
)
RETURNS TABLE (
  submission_id UUID,
  composition_name TEXT,
  composition_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  v_reviewed INT;
  v_remaining INT;
BEGIN
  PERFORM check_rate_limit('peer_batch', 'sub:' || p_own_submission_id::TEXT, 10, 60);

  SELECT s.class_id INTO v_class_id
  FROM public.submissions s
  JOIN public.classes c ON c.id = s.class_id
  WHERE s.id = p_own_submission_id AND c.code = TRIM(p_class_code);

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Inzending niet gevonden bij deze klas';
  END IF;

  -- Venster: toggle uit of timer verlopen → lege set (client toont nette melding)
  IF NOT peer_review_is_open(v_class_id) THEN
    RETURN;
  END IF;

  -- Quotum: maximaal 3 beoordeelde klasgenoten per leerling
  SELECT COUNT(DISTINCT pf.submission_id) INTO v_reviewed
  FROM public.peer_feedback pf
  WHERE pf.from_submission_id = p_own_submission_id;

  v_remaining := 3 - v_reviewed;
  IF v_remaining <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.id, s.composition_name, s.composition_data
  FROM public.submissions s
  WHERE s.class_id = v_class_id
    AND s.id <> p_own_submission_id
    AND s.submitted_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.peer_feedback pf
      WHERE pf.submission_id = s.id AND pf.from_submission_id = p_own_submission_id
    )
  ORDER BY random()
  LIMIT LEAST(GREATEST(p_batch_size, 1), v_remaining);
END;
$$;

GRANT EXECUTE ON FUNCTION get_peer_review_batch(TEXT, UUID, INT) TO anon, authenticated;

-- ============================================
-- 5. submit_peer_feedback_v2 — sterren per criterium
-- ============================================
-- v1 (chips) blijft bestaan voor oude clients; v2 valideert ratings,
-- dwingt venster + quotum af, en vult chips (keys) voor compatibiliteit.

CREATE OR REPLACE FUNCTION submit_peer_feedback_v2(
  p_from_submission_id UUID,
  p_target_submission_id UUID,
  p_ratings JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_class UUID;
  v_target_class UUID;
  v_key TEXT;
  v_value JSONB;
  v_count INT := 0;
  v_reviewed INT;
  v_chips TEXT[];
BEGIN
  PERFORM check_rate_limit('peer_submit', 'sub:' || p_from_submission_id::TEXT, 20, 60);

  -- Ratings valideren: object met 1-8 criteria, waarden 1-3 (hele sterren)
  IF p_ratings IS NULL OR jsonb_typeof(p_ratings) <> 'object' THEN
    RAISE EXCEPTION 'Ongeldige beoordeling';
  END IF;
  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_ratings) LOOP
    v_count := v_count + 1;
    IF jsonb_typeof(v_value) <> 'number'
       OR (v_value)::TEXT::NUMERIC NOT IN (1, 2, 3)
       OR char_length(v_key) > 80 THEN
      RAISE EXCEPTION 'Ongeldige beoordeling';
    END IF;
  END LOOP;
  IF v_count < 1 OR v_count > 8 THEN
    RAISE EXCEPTION 'Beoordeel 1 tot 8 criteria';
  END IF;

  SELECT class_id INTO v_from_class FROM public.submissions WHERE id = p_from_submission_id;
  SELECT class_id INTO v_target_class FROM public.submissions WHERE id = p_target_submission_id;

  IF v_from_class IS NULL OR v_target_class IS NULL OR v_from_class <> v_target_class THEN
    RAISE EXCEPTION 'Inzendingen horen niet bij dezelfde klas';
  END IF;

  -- Venster: toggle uit of timer verlopen → weigeren
  IF NOT peer_review_is_open(v_from_class) THEN
    RAISE EXCEPTION 'Feedbackronde is gesloten';
  END IF;

  -- Quotum: max 3 ándere inzendingen (update van een bestaand paar mag altijd)
  SELECT COUNT(DISTINCT pf.submission_id) INTO v_reviewed
  FROM public.peer_feedback pf
  WHERE pf.from_submission_id = p_from_submission_id
    AND pf.submission_id <> p_target_submission_id;

  IF v_reviewed >= 3 THEN
    RAISE EXCEPTION 'Maximum van 3 beoordelingen bereikt';
  END IF;

  -- chips = criteria-namen (compatibiliteit met v1-lezers)
  SELECT array_agg(key) INTO v_chips FROM jsonb_each(p_ratings);

  INSERT INTO public.peer_feedback (submission_id, from_submission_id, chips, ratings)
  VALUES (p_target_submission_id, p_from_submission_id, v_chips, p_ratings)
  ON CONFLICT (submission_id, from_submission_id)
  DO UPDATE SET chips = EXCLUDED.chips, ratings = EXCLUDED.ratings, created_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION submit_peer_feedback_v2(UUID, UUID, JSONB) TO anon, authenticated;

-- ============================================
-- 6. get_peer_compliments — v2-vorm: gemiddelde sterren per criterium
-- ============================================
-- Return-type wijzigt → DROP + CREATE. Oude rijen zonder ratings (alleen
-- chips) tellen mee met avg_stars = NULL (client toont dan alleen aantal).

DROP FUNCTION IF EXISTS get_peer_compliments(VARCHAR);

CREATE FUNCTION get_peer_compliments(p_save_code VARCHAR)
RETURNS TABLE (
  chip TEXT,
  avg_stars NUMERIC,
  rater_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_code VARCHAR;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));
  PERFORM check_rate_limit('peer_compliments', 'code:' || v_normalized_code, 30, 60);

  RETURN QUERY
  WITH target AS (
    SELECT s.id FROM public.submissions s WHERE s.save_code = v_normalized_code
  ),
  starred AS (
    -- Nieuwe rijen: sterren per criterium
    SELECT r.key AS chip, (r.value)::TEXT::NUMERIC AS stars
    FROM public.peer_feedback pf
    JOIN target t ON t.id = pf.submission_id,
    LATERAL jsonb_each(pf.ratings) r
    WHERE pf.ratings IS NOT NULL
    UNION ALL
    -- Oude rijen (alleen chips): tellen mee zonder sterren
    SELECT unnest(pf.chips) AS chip, NULL::NUMERIC AS stars
    FROM public.peer_feedback pf
    JOIN target t ON t.id = pf.submission_id
    WHERE pf.ratings IS NULL
  )
  SELECT st.chip, ROUND(AVG(st.stars), 1) AS avg_stars, COUNT(*)::BIGINT AS rater_count
  FROM starred st
  GROUP BY st.chip
  ORDER BY AVG(st.stars) DESC NULLS LAST, COUNT(*) DESC, st.chip;
END;
$$;

GRANT EXECUTE ON FUNCTION get_peer_compliments(VARCHAR) TO anon, authenticated;

-- ============================================
-- 7. get_active_assignment — closes_at in de peer_review-JSONB
-- ============================================
-- Return-type ongewijzigd (peer_review-kolom bestaat al sinds 027) →
-- CREATE OR REPLACE met alleen een rijkere JSONB-body.

CREATE OR REPLACE FUNCTION get_active_assignment(p_class_code TEXT)
RETURNS TABLE (
  assignment_type TEXT,
  payload         JSONB,
  card            JSONB,
  class_id        UUID,
  class_name      TEXT,
  peer_review     JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
$$;

GRANT EXECUTE ON FUNCTION get_active_assignment(TEXT) TO anon, authenticated;

-- ============================================
-- 8. load_saved_composition — class_code voor sessie-herstel
-- ============================================
-- Extra kolom (backward-compatibel: oude clients negeren die) → DROP + CREATE.
-- Hiermee wordt de bewaarcode de universele terugkeerroute: de client kan
-- de klas-sessie (incl. peer-feedback) herstellen op elk apparaat.

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
  feedback_at TIMESTAMPTZ,
  class_code TEXT
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
    s.feedback_sticker, s.feedback_level, s.feedback_text, s.feedback_at,
    c.code AS class_code
  FROM public.submissions s
  LEFT JOIN public.classes c ON c.id = s.class_id
  WHERE s.save_code = v_normalized_code
    AND (s.last_updated_at IS NULL OR s.last_updated_at > NOW() - INTERVAL '60 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION load_saved_composition(VARCHAR) TO anon, authenticated;
