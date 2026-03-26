-- ============================================
-- MIGRATIE 004: Bewaar-codes (#52)
-- Voer uit in Supabase SQL Editor
-- ============================================
-- Leerlingen kunnen composities online bewaren met een 6-karakter code.
-- Op een ander apparaat laden ze de compositie via die code om verder te werken.
-- Composities vervallen na 60 dagen inactiviteit (last_updated_at).

-- ============================================
-- 1. NIEUWE KOLOMMEN OP SUBMISSIONS
-- ============================================

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS save_code VARCHAR(6) UNIQUE,
  ADD COLUMN IF NOT EXISTS save_secret VARCHAR(32),
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS student_email TEXT
    CONSTRAINT chk_student_email_length CHECK (student_email IS NULL OR char_length(student_email) BETWEEN 5 AND 255);

-- Index voor save_code lookups
CREATE INDEX IF NOT EXISTS idx_submissions_save_code
  ON public.submissions(save_code) WHERE save_code IS NOT NULL;

-- ============================================
-- 2. RLS POLICY: leesbaar via save_code
-- ============================================

-- Iedereen kan composities lezen via een geldige save_code (niet verlopen)
CREATE POLICY "Anyone can read saved compositions by save_code"
  ON public.submissions FOR SELECT
  USING (
    save_code IS NOT NULL
    AND (last_updated_at IS NULL OR last_updated_at > NOW() - INTERVAL '60 days')
  );

-- Iedereen kan composities updaten via save_code + secret (SECURITY DEFINER RPC)
-- (Directe UPDATE is niet nodig — gaat via RPC functie)

-- ============================================
-- 3. CODE GENERATOR: 6-karakter bewaarcode
-- ============================================

CREATE OR REPLACE FUNCTION generate_save_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(6) := '';
  code_exists BOOLEAN;
  i INT;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check uniqueness across save_codes AND share_codes AND template codes
    SELECT EXISTS(
      SELECT 1 FROM public.submissions WHERE save_code = new_code
      UNION ALL
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Secret generator: 32-karakter random string
CREATE OR REPLACE FUNCTION generate_save_secret()
RETURNS VARCHAR(32) AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  secret VARCHAR(32) := '';
  i INT;
BEGIN
  FOR i IN 1..32 LOOP
    secret := secret || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN secret;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. RPC: BEWAAR COMPOSITIE ONLINE
-- ============================================

CREATE OR REPLACE FUNCTION save_composition_online(
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB,
  p_class_code TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  save_code VARCHAR,
  save_secret VARCHAR
) AS $$
DECLARE
  v_code VARCHAR(6);
  v_secret VARCHAR(32);
  v_class_id UUID := NULL;
  v_identifier TEXT;
BEGIN
  -- Rate limit: max 10 saves per minuut per sessie
  v_identifier := COALESCE(auth.uid()::TEXT, 'anon:' || md5(p_student_name));
  PERFORM check_rate_limit('save_online', v_identifier, 10, 60);

  -- Optioneel: zoek klas bij class_code
  IF p_class_code IS NOT NULL AND char_length(TRIM(p_class_code)) = 4 THEN
    SELECT id INTO v_class_id
    FROM public.classes
    WHERE code = TRIM(p_class_code) AND is_active = TRUE;
    -- Niet gevonden is geen fout — class_id blijft NULL
  END IF;

  v_code := generate_save_code();
  v_secret := generate_save_secret();

  INSERT INTO public.submissions (
    class_id, student_name, composition_name,
    composition_data, save_code, save_secret,
    last_updated_at, student_email
  )
  VALUES (
    v_class_id, p_student_name, p_composition_name,
    p_composition_data, v_code, v_secret,
    NOW(), NULLIF(TRIM(p_email), '')
  );

  RETURN QUERY SELECT v_code, v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_composition_online TO anon;
GRANT EXECUTE ON FUNCTION save_composition_online TO authenticated;

-- ============================================
-- 5. RPC: UPDATE BEWAARDE COMPOSITIE
-- ============================================

CREATE OR REPLACE FUNCTION update_saved_composition(
  p_save_code VARCHAR,
  p_save_secret VARCHAR,
  p_composition_data JSONB,
  p_composition_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_normalized_code VARCHAR;
  v_rows_affected INT;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));

  -- Rate limit: max 30 updates per minuut per code
  PERFORM check_rate_limit('update_save', 'code:' || v_normalized_code, 30, 60);

  -- Update alleen als code + secret matchen
  UPDATE public.submissions
  SET
    composition_data = p_composition_data,
    composition_name = COALESCE(NULLIF(TRIM(p_composition_name), ''), composition_name),
    last_updated_at = NOW()
  WHERE save_code = v_normalized_code
    AND save_secret = p_save_secret;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Ongeldige bewaarcode of geheim';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_saved_composition TO anon;
GRANT EXECUTE ON FUNCTION update_saved_composition TO authenticated;

-- ============================================
-- 6. RPC: LAAD BEWAARDE COMPOSITIE
-- ============================================

CREATE OR REPLACE FUNCTION load_saved_composition(p_save_code VARCHAR)
RETURNS TABLE (
  id UUID,
  student_name TEXT,
  composition_name TEXT,
  composition_data JSONB,
  last_updated_at TIMESTAMPTZ,
  student_email TEXT
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
    s.composition_data, s.last_updated_at, s.student_email
  FROM public.submissions s
  WHERE s.save_code = v_normalized_code
    AND (s.last_updated_at IS NULL OR s.last_updated_at > NOW() - INTERVAL '60 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION load_saved_composition TO anon;
GRANT EXECUTE ON FUNCTION load_saved_composition TO authenticated;

-- ============================================
-- 7. RPC: CLAIM COMPOSITIE (nieuw apparaat)
-- ============================================

CREATE OR REPLACE FUNCTION claim_saved_composition(
  p_save_code VARCHAR,
  p_student_name TEXT
)
RETURNS VARCHAR AS $$
DECLARE
  v_normalized_code VARCHAR;
  v_new_secret VARCHAR(32);
  v_rows_affected INT;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));

  -- Rate limit: max 5 claims per minuut per code (brute force preventie)
  PERFORM check_rate_limit('claim_save', 'code:' || v_normalized_code, 5, 60);

  v_new_secret := generate_save_secret();

  -- Update secret + naam
  UPDATE public.submissions
  SET
    save_secret = v_new_secret,
    student_name = COALESCE(NULLIF(TRIM(p_student_name), ''), student_name),
    last_updated_at = NOW()
  WHERE save_code = v_normalized_code
    AND (last_updated_at IS NULL OR last_updated_at > NOW() - INTERVAL '60 days');

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Bewaarcode niet gevonden of verlopen';
  END IF;

  RETURN v_new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_saved_composition TO anon;
GRANT EXECUTE ON FUNCTION claim_saved_composition TO authenticated;

-- ============================================
-- KLAAR!
-- ============================================
-- Test: SELECT * FROM save_composition_online('Test', 'Mijn compositie', '{}');
