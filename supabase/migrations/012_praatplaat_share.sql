-- ============================================
-- MIGRATIE 012: Publieke Praatplaat-viewer (#73)
-- Voer uit in Supabase SQL Editor
-- ============================================
-- Deelbare praatplaat-link: docenten genereren een 8-karakter share
-- code voor een praatplaat. Bezoekers openen de link en zien de
-- praatplaat met alle leerlingcomposities — zonder login.

-- ============================================
-- 1. NIEUWE KOLOMMEN OP PRAATPLATEN
-- ============================================

ALTER TABLE public.praatplaten
  ADD COLUMN IF NOT EXISTS share_code VARCHAR(8) UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_view_count INT DEFAULT 0
    CONSTRAINT chk_share_view_count_positive CHECK (share_view_count >= 0);

-- Index voor share code lookups
CREATE INDEX IF NOT EXISTS idx_praatplaten_share_code
  ON public.praatplaten(share_code) WHERE share_code IS NOT NULL;

-- ============================================
-- 2. SHARE CODE GENERATOR (praatplaat-specifiek)
-- ============================================
-- Aparte functie die uniqueness checkt tegen praatplaten.share_code
-- (niet submissions.share_code) om botsingen te voorkomen.

CREATE OR REPLACE FUNCTION generate_praatplaat_share_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(8) := '';
  code_exists BOOLEAN;
  i INT;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check tegen BEIDE tabellen om cross-collision te voorkomen
    SELECT EXISTS(
      SELECT 1 FROM public.praatplaten WHERE share_code = new_code
      UNION ALL
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. RPC: PRAATPLAAT DELEN (docenten)
-- ============================================
-- Genereert een share code (of geeft bestaande terug).
-- Verlengt verloopdatum bij elke aanroep.

CREATE OR REPLACE FUNCTION share_praatplaat(p_praatplaat_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code VARCHAR(8);
  v_expires TIMESTAMPTZ;
BEGIN
  -- Rate limit: 10 per minuut per docent
  PERFORM check_rate_limit('share_praatplaat', auth.uid()::text, 10, 60);

  -- Valideer: docent is eigenaar
  SELECT share_code INTO v_code
  FROM public.praatplaten
  WHERE id = p_praatplaat_id AND teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  v_expires := NOW() + INTERVAL '30 days';

  IF v_code IS NOT NULL THEN
    -- Bestaande code: verleng verloopdatum
    UPDATE public.praatplaten
    SET share_expires_at = v_expires
    WHERE id = p_praatplaat_id;

    RETURN v_code;
  ELSE
    -- Genereer nieuwe code
    v_code := generate_praatplaat_share_code();

    UPDATE public.praatplaten
    SET share_code = v_code,
        share_expires_at = v_expires,
        share_view_count = 0
    WHERE id = p_praatplaat_id;

    RETURN v_code;
  END IF;
END;
$$;

-- ============================================
-- 4. RPC: GEDEELDE PRAATPLAAT OPHALEN (publiek)
-- ============================================
-- Anonieme toegang. Retourneert praatplaat metadata + alle
-- submissions met positie en compositie-data.

CREATE OR REPLACE FUNCTION get_shared_praatplaat(p_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_praatplaat RECORD;
  v_result JSONB;
  v_submissions JSONB;
BEGIN
  -- Rate limit: 30 per minuut per code
  PERFORM check_rate_limit('get_shared_praatplaat', 'pp:' || p_code, 30, 60);

  -- Haal praatplaat op
  SELECT id, name, image_url, theme_id, location_id, share_expires_at
  INTO v_praatplaat
  FROM public.praatplaten
  WHERE share_code = p_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden';
  END IF;

  -- Check verloopdatum
  IF v_praatplaat.share_expires_at IS NOT NULL AND v_praatplaat.share_expires_at < NOW() THEN
    RAISE EXCEPTION 'Link is verlopen';
  END IF;

  -- Verhoog view count
  UPDATE public.praatplaten
  SET share_view_count = share_view_count + 1
  WHERE share_code = p_code;

  -- Haal submissions op
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'student_name', s.student_name,
      'composition_name', s.composition_name,
      'composition_data', s.composition_data,
      'position_x', s.position_x,
      'position_y', s.position_y,
      'created_at', s.created_at
    ) ORDER BY s.created_at DESC
  ), '[]'::jsonb)
  INTO v_submissions
  FROM public.submissions s
  WHERE s.praatplaat_id = v_praatplaat.id;

  -- Bouw response
  v_result := jsonb_build_object(
    'praatplaat', jsonb_build_object(
      'id', v_praatplaat.id,
      'name', v_praatplaat.name,
      'image_url', v_praatplaat.image_url,
      'theme_id', v_praatplaat.theme_id,
      'location_id', v_praatplaat.location_id
    ),
    'submissions', v_submissions
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 5. RLS POLICY: publieke leestoegang voor gedeelde praatplaten
-- ============================================
-- Anon gebruikers mogen praatplaten lezen als ze een geldig share_code hebben.
-- Dit is nodig zodat de RPC SECURITY DEFINER functies correct werken.

CREATE POLICY "Anyone can read shared praatplaten"
  ON public.praatplaten FOR SELECT
  USING (share_code IS NOT NULL AND (share_expires_at IS NULL OR share_expires_at > NOW()));

-- ============================================
-- 6. GRANTS
-- ============================================

-- Publieke functie (geen login nodig)
GRANT EXECUTE ON FUNCTION get_shared_praatplaat(VARCHAR) TO anon;

-- Authenticated functie (voor docenten)
GRANT EXECUTE ON FUNCTION share_praatplaat(UUID) TO authenticated;
