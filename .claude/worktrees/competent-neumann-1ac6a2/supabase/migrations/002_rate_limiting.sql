-- ============================================
-- MIGRATIE: Server-side Rate Limiting (SEC-2)
-- Voer dit uit in Supabase SQL Editor
-- ============================================

-- 1. Rate limits tabel
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(action, identifier, created_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Herbruikbare rate limit checker
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_action TEXT,
  p_identifier TEXT,
  p_max_requests INT,
  p_window_seconds INT
)
RETURNS VOID AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE action = p_action
    AND identifier = p_identifier
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  IF v_count >= p_max_requests THEN
    RAISE EXCEPTION 'Rate limit exceeded for %', p_action;
  END IF;

  INSERT INTO public.rate_limits (action, identifier)
  VALUES (p_action, p_identifier);

  -- Lazy cleanup: verwijder entries ouder dan 1 uur
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour'
    AND action = p_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. submit_composition met rate limit (max 60/min per klascode)
--    Een klas van 35 leerlingen moet tegelijk kunnen inleveren
DROP FUNCTION IF EXISTS submit_composition(character, text, text, jsonb);
CREATE OR REPLACE FUNCTION submit_composition(
  p_class_code CHAR(4),
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
  v_identifier TEXT;
BEGIN
  v_identifier := 'class:' || p_class_code;
  PERFORM check_rate_limit('submit', v_identifier, 60, 60);

  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = p_class_code AND is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas-code niet gevonden';
  END IF;

  INSERT INTO public.submissions (class_id, student_name, composition_name, composition_data)
  VALUES (v_class_id, p_student_name, p_composition_name, p_composition_data)
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. share_composition met rate limit (max 10/min per sessie)
DROP FUNCTION IF EXISTS share_composition(text, text, jsonb);
CREATE OR REPLACE FUNCTION share_composition(
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
)
RETURNS TEXT AS $$
DECLARE
  v_code VARCHAR(8);
  v_expires TIMESTAMPTZ;
  v_identifier TEXT;
BEGIN
  v_identifier := COALESCE(auth.uid()::TEXT, 'anon:' || md5(p_student_name));
  PERFORM check_rate_limit('share', v_identifier, 10, 60);

  v_code := generate_share_code();
  v_expires := NOW() + INTERVAL '30 days';

  INSERT INTO public.submissions (
    class_id, student_name, composition_name,
    composition_data, share_code, expires_at, view_count
  )
  VALUES (
    NULL, p_student_name, p_composition_name,
    p_composition_data, v_code, v_expires, 0
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. get_shared_composition met rate limit (max 30/min per code)
--    DROP nodig omdat return-type gewijzigd is t.o.v. originele versie
DROP FUNCTION IF EXISTS get_shared_composition(character varying);
CREATE OR REPLACE FUNCTION get_shared_composition(p_code VARCHAR)
RETURNS TABLE (
  id UUID,
  student_name TEXT,
  composition_name TEXT,
  composition_data JSONB,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  view_count INT
) AS $$
DECLARE
  v_normalized_code VARCHAR;
BEGIN
  v_normalized_code := UPPER(TRIM(p_code));
  PERFORM check_rate_limit('get_shared', 'code:' || v_normalized_code, 30, 60);

  UPDATE public.submissions
  SET view_count = submissions.view_count + 1
  WHERE share_code = v_normalized_code
    AND (submissions.expires_at IS NULL OR submissions.expires_at > NOW());

  RETURN QUERY
  SELECT
    s.id, s.student_name, s.composition_name,
    s.composition_data, s.created_at, s.expires_at, s.view_count
  FROM public.submissions s
  WHERE s.share_code = v_normalized_code
    AND (s.expires_at IS NULL OR s.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grants opnieuw instellen
GRANT EXECUTE ON FUNCTION submit_composition(character, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION submit_composition(character, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION share_composition(text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION share_composition(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shared_composition(character varying) TO anon;
GRANT EXECUTE ON FUNCTION get_shared_composition(character varying) TO authenticated;

-- ============================================
-- KLAAR! Rate limiting actief.
-- Limieten: submit 60/min per klascode, share 10/min per sessie, get_shared 30/min per code
-- ============================================
