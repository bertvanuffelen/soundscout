-- ============================================
-- MIGRATIE 027: Peer-feedback — leerlingen beluisteren en complimenteren
--                elkaars werk via docent-instelbare feedbackkaarten
-- Voer uit in Supabase SQL Editor (NA migratie 026)
-- ============================================
-- Ontwerp (besluit Bert, week 2): de docent zet per opdracht "klasgenoten
-- luisteren" aan en kiest een feedbackkaart (herbruikbare set complimenten-
-- chips, analoog aan opdrachtkaarten). Leerlingen die ingeleverd hebben
-- krijgen 3 willekeurige anonieme klasgenoot-composities en kiezen per stuk
-- chips — GEEN vrije tekst (moderatie). De ontvanger ziet complimenten
-- anoniem geaggregeerd via de bewaarcode.
--
-- Additief en idempotent. Rate limiting via check_rate_limit (migratie 002).

-- ============================================
-- 1. FEEDBACK_CARDS — chip-sets (docent-eigen + ingebouwd)
-- ============================================

CREATE TABLE IF NOT EXISTS public.feedback_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = ingebouwde kaart (zoals bij lesson_cards)
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  builtin_key TEXT UNIQUE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  chips TEXT[] NOT NULL CHECK (cardinality(chips) BETWEEN 2 AND 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_cards_builtin_ownership CHECK (
    (teacher_id IS NULL AND builtin_key IS NOT NULL) OR
    (teacher_id IS NOT NULL AND builtin_key IS NULL)
  )
);

ALTER TABLE public.feedback_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own and builtin feedback cards" ON public.feedback_cards;
CREATE POLICY "Teachers read own and builtin feedback cards"
  ON public.feedback_cards FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid() OR teacher_id IS NULL);

DROP POLICY IF EXISTS "Teachers create own feedback cards" ON public.feedback_cards;
CREATE POLICY "Teachers create own feedback cards"
  ON public.feedback_cards FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers update own feedback cards" ON public.feedback_cards;
CREATE POLICY "Teachers update own feedback cards"
  ON public.feedback_cards FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers delete own feedback cards" ON public.feedback_cards;
CREATE POLICY "Teachers delete own feedback cards"
  ON public.feedback_cards FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Ingebouwde kaarten (NL — ingebouwde content is Nederlandstalig, net als
-- de ingebouwde leskaarten). Idempotent via builtin_key.
INSERT INTO public.feedback_cards (teacher_id, builtin_key, title, chips) VALUES
  (NULL, 'standaard', 'Standaard complimenten',
    ARRAY['Lekker ritme!', 'Mooie opbouw!', 'Verrassend geluid!', 'Knap gecombineerd!']),
  (NULL, 'ritme-puls', 'Ritme & puls',
    ARRAY['Lekker ritme!', 'Strakke puls!', 'Fijne herhaling!', 'Goed getimed!']),
  (NULL, 'opbouw-vorm', 'Opbouw & vorm',
    ARRAY['Spannend begin!', 'Mooie opbouw!', 'Sterk einde!', 'Duidelijke delen!']),
  (NULL, 'klankkleur', 'Klankkleur & verrassing',
    ARRAY['Verrassend geluid!', 'Mooie klanken!', 'Origineel idee!', 'Bijzondere combinatie!']),
  (NULL, 'beeld-verhaal', 'Past bij beeld of verhaal',
    ARRAY['Past goed bij het beeld!', 'Vertelt echt een verhaal!', 'Goede sfeer!', 'Beeld en geluid kloppen!'])
ON CONFLICT (builtin_key) DO NOTHING;

-- ============================================
-- 2. CLASS_ASSIGNMENTS — peer-review-instelling per opdracht
-- ============================================

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS peer_review_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS feedback_card_id UUID REFERENCES public.feedback_cards(id) ON DELETE SET NULL;

-- Instellen door de docent (smalle RPC i.p.v. brede UPDATE-policy)
CREATE OR REPLACE FUNCTION set_assignment_peer_review(
  p_assignment_id UUID,
  p_enabled BOOLEAN,
  p_feedback_card_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Kaart-fallback: aanzetten zonder kaart → ingebouwde standaardkaart
  v_card_id := p_feedback_card_id;
  IF p_enabled AND v_card_id IS NULL THEN
    SELECT id INTO v_card_id FROM public.feedback_cards WHERE builtin_key = 'standaard';
  END IF;

  -- Kaart moet eigen of ingebouwd zijn
  IF v_card_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.feedback_cards fc
    WHERE fc.id = v_card_id AND (fc.teacher_id = auth.uid() OR fc.teacher_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Feedbackkaart niet gevonden of geen toegang';
  END IF;

  UPDATE public.class_assignments ca
  SET peer_review_enabled = p_enabled,
      feedback_card_id = v_card_id
  WHERE ca.id = p_assignment_id
    AND ca.teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opdracht niet gevonden of geen toegang';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_assignment_peer_review(UUID, BOOLEAN, UUID) TO authenticated;

-- ============================================
-- 3. PEER_FEEDBACK — gegeven complimenten
-- ============================================

CREATE TABLE IF NOT EXISTS public.peer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ontvanger en gever zijn beide inzendingen (leerlingen hebben geen account)
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  from_submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  chips TEXT[] NOT NULL CHECK (cardinality(chips) BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT peer_feedback_not_self CHECK (submission_id <> from_submission_id),
  CONSTRAINT peer_feedback_once_per_pair UNIQUE (submission_id, from_submission_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_feedback_submission
  ON public.peer_feedback(submission_id);

ALTER TABLE public.peer_feedback ENABLE ROW LEVEL SECURITY;

-- Docent mag de peer-feedback van eigen klassen lezen; alle overige toegang
-- loopt via SECURITY DEFINER RPC's (leerlingen zijn anoniem).
DROP POLICY IF EXISTS "Teachers read peer feedback of own classes" ON public.peer_feedback;
CREATE POLICY "Teachers read peer feedback of own classes"
  ON public.peer_feedback FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = peer_feedback.submission_id AND c.teacher_id = auth.uid()
  ));

-- ============================================
-- 4. RPC: batch ophalen — 3 willekeurige anonieme klasgenoten
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
BEGIN
  PERFORM check_rate_limit('peer_batch', 'sub:' || p_own_submission_id::TEXT, 10, 60);

  -- Eigen inzending moet echt bij deze klas horen (UUID-kennis = bewijs
  -- van inlevering; consistent met het bestaande code-model)
  SELECT s.class_id INTO v_class_id
  FROM public.submissions s
  JOIN public.classes c ON c.id = s.class_id
  WHERE s.id = p_own_submission_id AND c.code = TRIM(p_class_code);

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Inzending niet gevonden bij deze klas';
  END IF;

  RETURN QUERY
  SELECT s.id, s.composition_name, s.composition_data
  FROM public.submissions s
  WHERE s.class_id = v_class_id
    AND s.id <> p_own_submission_id
    AND s.submitted_at IS NOT NULL
    -- nog niet door deze leerling beoordeeld
    AND NOT EXISTS (
      SELECT 1 FROM public.peer_feedback pf
      WHERE pf.submission_id = s.id AND pf.from_submission_id = p_own_submission_id
    )
  ORDER BY random()
  LIMIT LEAST(GREATEST(p_batch_size, 1), 5);
END;
$$;

GRANT EXECUTE ON FUNCTION get_peer_review_batch(TEXT, UUID, INT) TO anon, authenticated;

-- ============================================
-- 5. RPC: compliment geven
-- ============================================

CREATE OR REPLACE FUNCTION submit_peer_feedback(
  p_from_submission_id UUID,
  p_target_submission_id UUID,
  p_chips TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_class UUID;
  v_target_class UUID;
BEGIN
  PERFORM check_rate_limit('peer_submit', 'sub:' || p_from_submission_id::TEXT, 20, 60);

  IF p_chips IS NULL OR cardinality(p_chips) < 1 OR cardinality(p_chips) > 3 THEN
    RAISE EXCEPTION 'Kies 1 tot 3 complimenten';
  END IF;

  SELECT class_id INTO v_from_class FROM public.submissions WHERE id = p_from_submission_id;
  SELECT class_id INTO v_target_class FROM public.submissions WHERE id = p_target_submission_id;

  IF v_from_class IS NULL OR v_target_class IS NULL OR v_from_class <> v_target_class THEN
    RAISE EXCEPTION 'Inzendingen horen niet bij dezelfde klas';
  END IF;

  INSERT INTO public.peer_feedback (submission_id, from_submission_id, chips)
  VALUES (p_target_submission_id, p_from_submission_id, p_chips)
  ON CONFLICT (submission_id, from_submission_id)
  DO UPDATE SET chips = EXCLUDED.chips, created_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION submit_peer_feedback(UUID, UUID, TEXT[]) TO anon, authenticated;

-- ============================================
-- 6. RPC: ontvangen complimenten (anoniem geaggregeerd, via bewaarcode)
-- ============================================

CREATE OR REPLACE FUNCTION get_peer_compliments(p_save_code VARCHAR)
RETURNS TABLE (
  chip TEXT,
  chip_count BIGINT
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
  SELECT unnest(pf.chips) AS chip, COUNT(*)::BIGINT AS chip_count
  FROM public.peer_feedback pf
  JOIN public.submissions s ON s.id = pf.submission_id
  WHERE s.save_code = v_normalized_code
  GROUP BY 1
  ORDER BY 2 DESC, 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_peer_compliments(VARCHAR) TO anon, authenticated;

-- ============================================
-- 7. get_active_assignment — peer_review-kolom erbij
-- ============================================
-- Return-type wijzigt (extra kolom) → DROP + CREATE in één transactie.
-- Oude clients negeren de extra kolom (zelfde aanpak als migratie 026).
-- Body identiek aan migratie 018 + peer_review-resolutie.

DROP FUNCTION IF EXISTS get_active_assignment(TEXT);

CREATE FUNCTION get_active_assignment(p_class_code TEXT)
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
    c.name AS class_name,
    CASE
      WHEN ca.peer_review_enabled AND fc.id IS NOT NULL THEN jsonb_build_object(
        'enabled', TRUE,
        'card_title', fc.title,
        'chips', to_jsonb(fc.chips)
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
