-- ============================================
-- MIGRATIE: Delen met Link (#14)
-- Voer dit uit in Supabase SQL Editor
--
-- VEILIG: Wijzigt geen bestaande data.
-- Voegt alleen kolommen toe en past constraints aan.
-- ============================================

-- ============================================
-- STAP 1: Nieuwe kolommen toevoegen aan submissions
-- ============================================
-- share_code: unieke 8-karakter code voor publieke links
-- expires_at: wanneer de link verloopt (NULL = nooit)
-- view_count: aantal keer dat de link is geopend

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS share_code VARCHAR(8) UNIQUE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;

-- ============================================
-- STAP 2: class_id nullable maken
-- ============================================
-- Publieke shares hebben geen klas-koppeling

ALTER TABLE public.submissions
  ALTER COLUMN class_id DROP NOT NULL;

-- ============================================
-- STAP 3: Foreign key wijzigen naar SET NULL
-- ============================================
-- Bij klas verwijdering: submissions behouden (class_id → NULL)
-- i.p.v. CASCADE (submissions verwijderd)

ALTER TABLE public.submissions
  DROP CONSTRAINT submissions_class_id_fkey,
  ADD CONSTRAINT submissions_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

-- ============================================
-- STAP 4: Index op share_code
-- ============================================

CREATE INDEX IF NOT EXISTS idx_submissions_share_code
  ON public.submissions(share_code)
  WHERE share_code IS NOT NULL;

-- ============================================
-- STAP 5: RLS policy voor publiek lezen
-- ============================================
-- Iedereen mag submissions met een geldige share_code lezen

CREATE POLICY "Anyone can read shared compositions"
  ON public.submissions FOR SELECT
  USING (
    share_code IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- ============================================
-- STAP 6: Share code generator functie
-- ============================================
-- Genereert unieke 8-karakter alfanumerieke code
-- Karakterset zonder I, O, 0, 1 (voorkomt verwarring)

CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STAP 7: RPC functie - Compositie delen (publieke link)
-- ============================================
-- Aanroepbaar door iedereen (ook zonder login)
-- Retourneert de share_code

CREATE OR REPLACE FUNCTION share_composition(
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB,
  p_expires_days INT DEFAULT 30
)
RETURNS VARCHAR(8) AS $$
DECLARE
  v_share_code VARCHAR(8);
BEGIN
  v_share_code := generate_share_code();

  INSERT INTO public.submissions (
    class_id, student_name, composition_name, composition_data,
    share_code, expires_at
  ) VALUES (
    NULL,
    p_student_name,
    p_composition_name,
    p_composition_data,
    v_share_code,
    NOW() + (p_expires_days || ' days')::INTERVAL
  );

  RETURN v_share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION share_composition TO anon;
GRANT EXECUTE ON FUNCTION share_composition TO authenticated;

-- ============================================
-- STAP 8: RPC functie - Gedeelde compositie ophalen
-- ============================================
-- Aanroepbaar door iedereen
-- Verhoogt view_count bij elke aanroep

CREATE OR REPLACE FUNCTION get_shared_composition(p_code VARCHAR(8))
RETURNS TABLE (
  composition_name TEXT,
  student_name TEXT,
  composition_data JSONB,
  created_at TIMESTAMPTZ,
  view_count INT
) AS $$
BEGIN
  -- Verhoog view count
  UPDATE public.submissions
  SET view_count = COALESCE(submissions.view_count, 0) + 1
  WHERE submissions.share_code = p_code
    AND (submissions.expires_at IS NULL OR submissions.expires_at > NOW());

  RETURN QUERY
  SELECT
    s.composition_name,
    s.student_name,
    s.composition_data,
    s.created_at,
    s.view_count
  FROM public.submissions s
  WHERE s.share_code = p_code
    AND (s.expires_at IS NULL OR s.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_shared_composition TO anon;
GRANT EXECUTE ON FUNCTION get_shared_composition TO authenticated;

-- ============================================
-- KLAAR!
-- ============================================
-- Test met:
-- SELECT share_composition('Test Leerling', 'Mijn Song', '{"tracks":[]}'::jsonb, 30);
-- SELECT * FROM get_shared_composition('DE_CODE');
