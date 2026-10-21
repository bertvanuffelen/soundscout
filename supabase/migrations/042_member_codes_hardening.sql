-- =============================================================================
-- 042 — Leerlingcodes dichtzetten (eindtest E4/K2, M2, M3, L1, L2; 21-10-2026)
-- =============================================================================
--
-- De leerlingcode is het wachtwoord van het kind. Drie lagen tegelijk:
--
-- 1. Genoeg codes: formaat ABC1234 (3 letters zonder I/O + 4 cijfers),
--    ≈ 138 miljoen codes (24× meer dan XX0000). 7 tekens botsen nooit met
--    een bewaarcode (6) of deelcode (8) (M2). Code uit gen_random_bytes.
-- 2. Rem op raden: maximaal 20 MISLUKTE pogingen per 10 minuten per
--    netwerkadres. Goede logins tellen niet mee, dus een hele school achter
--    één IP kan gewoon inloggen. De globale rem uit 038 (1200/min over
--    iedereen) gaat eruit: die kon met één script alle leerlingen blokkeren.
--    Een uitgezette of verlopen code telt ook als mislukt (L2).
-- 3. Weinig buit: de login geeft geen bewaarcode meer. "Verder werken" loopt
--    via open_member_latest_work: bewaarcode + bestaand geheim, ZONDER te
--    claimen, zodat het eerste apparaat zijn schrijfrecht houdt.
--
-- Verder:
-- - link_submission_to_member hangt geen inzending om die al aan een ander
--   kind gekoppeld is (M3);
-- - extend_class_members is idempotent (L1);
-- - verlopen codes worden een jaar na verloop opgeruimd (AVG), dagelijks;
-- - member_codes_version() = 2: de app toont het docentblok pas als deze
--   migratie gedraaid is.
--
-- Veilig: in de database staan nog geen leerlingcodes (gecontroleerd
-- 21-10-2026), en de live app gebruikt ze nog niet. Idempotent.
-- =============================================================================

-- --- 1. Formaat ABC1234 -----------------------------------------------------

ALTER TABLE public.class_members DROP CONSTRAINT IF EXISTS class_members_member_code_check;
ALTER TABLE public.class_members DROP CONSTRAINT IF EXISTS class_members_member_code_format;
ALTER TABLE public.class_members
  ADD CONSTRAINT class_members_member_code_format CHECK (member_code ~ '^[A-Z]{3}[0-9]{4}$') NOT VALID;

CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  letters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  b BYTEA;
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  LOOP
    b := extensions.gen_random_bytes(7);
    v_code := substr(letters, 1 + (get_byte(b, 0) % 24), 1)
           || substr(letters, 1 + (get_byte(b, 1) % 24), 1)
           || substr(letters, 1 + (get_byte(b, 2) % 24), 1)
           || (get_byte(b, 3) % 10)::TEXT || (get_byte(b, 4) % 10)::TEXT
           || (get_byte(b, 5) % 10)::TEXT || (get_byte(b, 6) % 10)::TEXT;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.class_members WHERE member_code = v_code);
    v_attempt := v_attempt + 1;
    IF v_attempt > 50 THEN
      RAISE EXCEPTION 'Kon geen unieke leerlingcode maken';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_member_code() FROM PUBLIC, anon, authenticated;

-- --- 2. Rem op mislukte pogingen per netwerkadres ------------------------------

-- Netwerkadres van de aanroeper (PostgREST zet request.headers)
CREATE OR REPLACE FUNCTION public.member_client_ip()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(split_part(
      COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::json->>'x-forwarded-for',
      ',', 1)), ''),
    'unknown');
$$;
REVOKE ALL ON FUNCTION public.member_client_ip() FROM PUBLIC, anon, authenticated;

-- Gooi een fout als dit adres te vaak mis had (20 per 10 minuten)
CREATE OR REPLACE FUNCTION public.member_assert_not_locked()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.rate_limits
       WHERE action = 'member_login_fail'
         AND identifier = 'ip:' || public.member_client_ip()
         AND created_at > NOW() - INTERVAL '10 minutes') >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded for member_login';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.member_assert_not_locked() FROM PUBLIC, anon, authenticated;

-- Tel een mislukte poging (en ruim oude tellingen op)
CREATE OR REPLACE FUNCTION public.member_record_failure()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (action, identifier) VALUES ('member_login_fail', 'ip:' || public.member_client_ip());
  DELETE FROM public.rate_limits WHERE action = 'member_login_fail' AND created_at < NOW() - INTERVAL '1 hour';
END;
$$;
REVOKE ALL ON FUNCTION public.member_record_failure() FROM PUBLIC, anon, authenticated;

-- --- 3. Inloggen zonder buit ---------------------------------------------------

DROP FUNCTION IF EXISTS public.login_with_member_code(TEXT);
CREATE FUNCTION public.login_with_member_code(p_code TEXT)
RETURNS TABLE(
  status TEXT, member_id UUID, pseudonym TEXT, class_id UUID, class_name TEXT,
  class_code TEXT, expires_at DATE, has_work BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_code TEXT := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  m public.class_members%ROWTYPE;
BEGIN
  PERFORM public.member_assert_not_locked();
  -- Ruime rem op alle pogingen per adres (ook goede): een hele school kan
  -- tegelijk inloggen, een script niet eindeloos
  PERFORM check_rate_limit('member_login_ip', 'ip:' || public.member_client_ip(), 300, 60);

  SELECT * INTO m FROM public.class_members WHERE member_code = v_code;
  IF NOT FOUND THEN
    PERFORM public.member_record_failure();
    RETURN;
  END IF;
  IF NOT m.is_active OR m.expires_at < CURRENT_DATE THEN
    PERFORM public.member_record_failure();
    RETURN QUERY SELECT CASE WHEN m.is_active THEN 'expired' ELSE 'inactive' END,
      NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::BOOLEAN;
    RETURN;
  END IF;

  UPDATE public.class_members SET last_seen_at = NOW() WHERE id = m.id;

  RETURN QUERY
  SELECT 'ok'::TEXT, m.id, m.pseudonym, c.id, c.name::TEXT, c.code::TEXT, m.expires_at,
         EXISTS (SELECT 1 FROM public.submissions s WHERE s.member_id = m.id AND s.save_code IS NOT NULL)
  FROM public.classes c
  WHERE c.id = m.class_id;
END;
$$;

-- Verder met het laatste werk: bewaarcode + bestaand geheim, zonder claim
CREATE OR REPLACE FUNCTION public.open_member_latest_work(p_code TEXT)
RETURNS TABLE(submission_id UUID, save_code TEXT, save_secret TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_code TEXT := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  m public.class_members%ROWTYPE;
BEGIN
  PERFORM public.member_assert_not_locked();
  PERFORM check_rate_limit('member_open_work', 'ip:' || public.member_client_ip(), 120, 60);

  SELECT * INTO m FROM public.class_members
   WHERE member_code = v_code AND is_active AND expires_at >= CURRENT_DATE;
  IF NOT FOUND THEN
    PERFORM public.member_record_failure();
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.id, s.save_code::TEXT, s.save_secret::TEXT
  FROM public.submissions s
  WHERE s.member_id = m.id AND s.save_code IS NOT NULL
  ORDER BY COALESCE(s.last_updated_at, s.created_at) DESC
  LIMIT 1;
END;
$$;

-- --- 4. Koppelen: niets omhangen (M3) -----------------------------------------

CREATE OR REPLACE FUNCTION public.link_submission_to_member(
  p_submission_id UUID, p_save_secret TEXT, p_member_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(regexp_replace(coalesce(p_member_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_member public.class_members%ROWTYPE;
BEGIN
  PERFORM public.member_assert_not_locked();
  PERFORM check_rate_limit('link_member', 'ip:' || public.member_client_ip(), 120, 60);

  SELECT * INTO v_member FROM public.class_members
   WHERE member_code = v_code AND is_active AND expires_at >= CURRENT_DATE;
  IF NOT FOUND THEN
    PERFORM public.member_record_failure();
    RETURN FALSE;
  END IF;

  UPDATE public.submissions
     SET member_id = v_member.id,
         student_name = v_member.pseudonym
   WHERE id = p_submission_id
     AND save_secret IS NOT NULL
     AND save_secret = p_save_secret
     AND class_id = v_member.class_id
     AND (member_id IS NULL OR member_id = v_member.id);
  RETURN FOUND;
END;
$$;

-- --- 5. Verlengen idempotent (L1) ----------------------------------------------

CREATE OR REPLACE FUNCTION public.extend_class_members(p_class_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  PERFORM public.assert_class_owner(p_class_id);
  -- Tot het einde van VOLGEND schooljaar; nog een keer klikken telt niet op
  UPDATE public.class_members
     SET expires_at = GREATEST(expires_at, (public.member_school_year_end() + INTERVAL '1 year')::DATE)
   WHERE class_id = p_class_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- --- 6. Opruimen (AVG) -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_expired_members()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.class_members WHERE expires_at < CURRENT_DATE - INTERVAL '1 year';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_expired_members() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('soundscout-members-cleanup', '15 3 * * *', 'SELECT public.cleanup_expired_members()');
  END IF;
END;
$$;

-- --- 7. Versie voor de app ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_codes_version()
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 2 $$;

-- --- 8. Rechten ----------------------------------------------------------------

REVOKE ALL ON FUNCTION public.login_with_member_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_member_latest_work(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_submission_to_member(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_class_members(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.member_codes_version() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.login_with_member_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_member_latest_work(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_submission_to_member(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extend_class_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_codes_version() TO authenticated;
