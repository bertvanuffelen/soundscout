-- =============================================================================
-- 038 — Leerlingcodes (fase 4.2, ontwerp docs/ONTWERP-LEERLING-CODES.md v2)
-- =============================================================================
--
-- Een docent zet per klas leerlingcodes klaar (formaat XX0000, getoond als
-- XX-0000). Een code hoort bij één kind voor een schooljaar: vaste schuilnaam,
-- automatisch in de juiste klas, en "verder werken" op elk apparaat. Er staat
-- geen echte naam in de database: de koppeling code ↔ kind bestaat alleen op
-- papier bij de docent.
--
-- Additief en veilig:
-- - nieuwe tabel class_members + nullable kolom submissions.member_id;
-- - bestaande routes (klascode, bewaarcode) blijven ongewijzigd;
-- - alle leerling-toegang loopt via SECURITY DEFINER-RPC's met rate limits;
-- - docent-toegang via RLS op eigen klassen.
--
-- RPC's:
--   generate_class_members(class_id, pseudonyms[])  docent: codes aanmaken
--   get_class_members(class_id)                     docent: lijst + activiteit
--   extend_class_members(class_id)                  docent: één jaar verlengen
--   set_class_member_active(member_id, active)      docent: (de)activeren
--   replace_class_member_code(member_id)            docent: nieuwe code, zelfde kind
--   login_with_member_code(code)                    leerling: inloggen
--   link_submission_to_member(id, secret, code)     leerling: inzending koppelen
-- =============================================================================

-- --- 1. Tabel ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.class_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  member_code  TEXT NOT NULL UNIQUE CHECK (member_code ~ '^[A-Z]{2}[0-9]{4}$'),
  pseudonym    TEXT NOT NULL CHECK (char_length(pseudonym) BETWEEN 1 AND 60),
  expires_at   DATE NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS class_members_class_idx ON public.class_members(class_id);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.class_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS submissions_member_idx ON public.submissions(member_id);

-- --- 2. RLS: docent ziet en beheert alleen de leden van eigen klassen ---------

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_members_select_own ON public.class_members;
CREATE POLICY class_members_select_own ON public.class_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS class_members_delete_own ON public.class_members;
CREATE POLICY class_members_delete_own ON public.class_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

-- Aanmaken en wijzigen alleen via de RPC's hieronder (geen INSERT/UPDATE-policy).

-- --- 3. Hulpfuncties ---------------------------------------------------------

-- Einde van het schooljaar: 31 juli (vanaf augustus: 31 juli volgend jaar)
CREATE OR REPLACE FUNCTION public.member_school_year_end()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT make_date(
    EXTRACT(YEAR FROM CURRENT_DATE)::INT + CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 THEN 1 ELSE 0 END,
    7, 31
  );
$$;

-- Unieke code: 2 letters (zonder I/O) + 4 cijfers ≈ 5,8 miljoen codes.
-- Botst ook niet met een bestaande bewaarcode (zelfde codeveld in de app).
CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  letters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  LOOP
    v_code := substr(letters, 1 + floor(random() * 24)::INT, 1)
           || substr(letters, 1 + floor(random() * 24)::INT, 1)
           || lpad(floor(random() * 10000)::INT::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.class_members WHERE member_code = v_code)
          AND NOT EXISTS (SELECT 1 FROM public.submissions WHERE upper(save_code) = v_code);
    v_attempt := v_attempt + 1;
    IF v_attempt > 50 THEN
      RAISE EXCEPTION 'Kon geen unieke leerlingcode maken';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_class_owner(p_class_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Geen toegang tot deze klas';
  END IF;
END;
$$;

-- --- 4. Docent-RPC's ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_class_members(p_class_id UUID, p_pseudonyms TEXT[])
RETURNS TABLE(id UUID, member_code TEXT, pseudonym TEXT, expires_at DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_name TEXT;
  v_expires DATE := public.member_school_year_end();
BEGIN
  PERFORM public.assert_class_owner(p_class_id);
  PERFORM check_rate_limit('generate_members', 'teacher:' || auth.uid()::TEXT, 10, 60);
  IF p_pseudonyms IS NULL OR array_length(p_pseudonyms, 1) IS NULL OR array_length(p_pseudonyms, 1) > 60 THEN
    RAISE EXCEPTION 'Kies 1 tot 60 leerlingcodes';
  END IF;

  FOREACH v_name IN ARRAY p_pseudonyms LOOP
    RETURN QUERY
    WITH ins AS (
      INSERT INTO public.class_members AS cm (class_id, member_code, pseudonym, expires_at)
      VALUES (p_class_id, public.generate_member_code(), left(trim(v_name), 60), v_expires)
      RETURNING cm.id, cm.member_code, cm.pseudonym, cm.expires_at
    )
    SELECT ins.id, ins.member_code, ins.pseudonym, ins.expires_at FROM ins;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_class_members(p_class_id UUID)
RETURNS TABLE(
  id UUID, member_code TEXT, pseudonym TEXT, expires_at DATE, is_active BOOLEAN,
  created_at TIMESTAMPTZ, last_activity TIMESTAMPTZ, submission_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_class_owner(p_class_id);
  RETURN QUERY
  SELECT m.id, m.member_code, m.pseudonym, m.expires_at, m.is_active, m.created_at,
         GREATEST(m.last_seen_at, MAX(s.last_updated_at), MAX(s.created_at)) AS last_activity,
         COUNT(s.id)::INT AS submission_count
  FROM public.class_members m
  LEFT JOIN public.submissions s ON s.member_id = m.id
  WHERE m.class_id = p_class_id
  GROUP BY m.id
  ORDER BY m.created_at, m.member_code;
END;
$$;

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
  UPDATE public.class_members
     SET expires_at = GREATEST(expires_at, public.member_school_year_end()) + INTERVAL '1 year'
   WHERE class_id = p_class_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_class_member_active(p_member_id UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class UUID;
BEGIN
  SELECT class_id INTO v_class FROM public.class_members WHERE id = p_member_id;
  IF v_class IS NULL THEN RAISE EXCEPTION 'Leerlingcode niet gevonden'; END IF;
  PERFORM public.assert_class_owner(v_class);
  UPDATE public.class_members SET is_active = p_active WHERE id = p_member_id;
END;
$$;

-- Kaartje kwijt of misbruikt: nieuwe code, zelfde kind (schuilnaam + werk blijven)
CREATE OR REPLACE FUNCTION public.replace_class_member_code(p_member_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class UUID;
  v_code TEXT;
BEGIN
  SELECT class_id INTO v_class FROM public.class_members WHERE id = p_member_id;
  IF v_class IS NULL THEN RAISE EXCEPTION 'Leerlingcode niet gevonden'; END IF;
  PERFORM public.assert_class_owner(v_class);
  v_code := public.generate_member_code();
  UPDATE public.class_members SET member_code = v_code, is_active = TRUE WHERE id = p_member_id;
  RETURN v_code;
END;
$$;

-- --- 5. Leerling-RPC's (anoniem) -----------------------------------------------

-- Inloggen met een leerlingcode. Geeft de klas, de vaste schuilnaam en de
-- bewaarcode van het laatste werk (om verder te werken). Een verlopen of
-- uitgezette code geeft status 'expired' / 'inactive' zonder klasgegevens.
CREATE OR REPLACE FUNCTION public.login_with_member_code(p_code TEXT)
RETURNS TABLE(
  status TEXT, member_id UUID, pseudonym TEXT, class_id UUID, class_name TEXT,
  class_code TEXT, expires_at DATE, latest_save_code TEXT
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
  PERFORM check_rate_limit('member_login', 'code:' || v_code, 30, 60);
  -- Grove rem op het raden van codes (over alle codes samen)
  PERFORM check_rate_limit('member_login_all', 'all', 1200, 60);

  SELECT * INTO m FROM public.class_members WHERE member_code = v_code;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF NOT m.is_active THEN
    RETURN QUERY SELECT 'inactive'::TEXT, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::TEXT;
    RETURN;
  END IF;
  IF m.expires_at < CURRENT_DATE THEN
    RETURN QUERY SELECT 'expired'::TEXT, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, m.expires_at, NULL::TEXT;
    RETURN;
  END IF;

  UPDATE public.class_members SET last_seen_at = NOW() WHERE id = m.id;

  RETURN QUERY
  SELECT 'ok'::TEXT, m.id, m.pseudonym, c.id, c.name::TEXT, c.code::TEXT, m.expires_at,
         (SELECT s.save_code::TEXT FROM public.submissions s
           WHERE s.member_id = m.id AND s.save_code IS NOT NULL
           ORDER BY COALESCE(s.last_updated_at, s.created_at) DESC
           LIMIT 1)
  FROM public.classes c
  WHERE c.id = m.class_id;
END;
$$;

-- Koppel een (net ingeleverde) inzending aan de leerlingcode. Vereist het
-- geheim van die inzending (migratie 036) en dezelfde klas.
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
  PERFORM check_rate_limit('link_member', 'code:' || v_code, 60, 60);

  SELECT * INTO v_member FROM public.class_members
   WHERE member_code = v_code AND is_active AND expires_at >= CURRENT_DATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE public.submissions
     SET member_id = v_member.id,
         student_name = v_member.pseudonym
   WHERE id = p_submission_id
     AND save_secret IS NOT NULL
     AND save_secret = p_save_secret
     AND class_id = v_member.class_id;
  RETURN FOUND;
END;
$$;

-- --- 6. Rechten ----------------------------------------------------------------

REVOKE ALL ON FUNCTION public.generate_member_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_class_owner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_class_members(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_class_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_class_member_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_class_member_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.login_with_member_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_submission_to_member(UUID, TEXT, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_class_members(UUID, TEXT[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_class_members(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.extend_class_members(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.set_class_member_active(UUID, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.replace_class_member_code(UUID) FROM anon;
