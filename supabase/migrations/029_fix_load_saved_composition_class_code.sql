-- ============================================
-- Migratie 029 — fix: load_saved_composition kapot sinds 028
-- ============================================
-- Bug (gevonden in testronde 1, 2026-07-16): migratie 028 voegde de
-- retourkolom `class_code TEXT` toe aan load_saved_composition, maar
-- selecteert `c.code` uit `classes` — en die kolom is CHAR(4).
-- PL/pgSQL eist bij RETURN QUERY exacte (binair-coërcibele) typen, dus
-- ELKE aanroep faalde met:
--   42804: "Returned type character(4) does not match expected type text
--           in column 11"
-- Gevolg: elke bewaarcode gaf "code niet gevonden" (de client maskeerde
-- de RPC-fout; die maskering is client-side inmiddels ook opgeheven).
--
-- Fix: expliciete cast `c.code::TEXT`. Verder identiek aan de 028-versie.
-- Idempotent: CREATE OR REPLACE met ongewijzigde signatuur/return-type.
-- ============================================

CREATE OR REPLACE FUNCTION load_saved_composition(p_save_code VARCHAR)
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
    c.code::TEXT AS class_code
  FROM public.submissions s
  LEFT JOIN public.classes c ON c.id = s.class_id
  WHERE s.save_code = v_normalized_code
    AND (s.last_updated_at IS NULL OR s.last_updated_at > NOW() - INTERVAL '60 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION load_saved_composition(VARCHAR) TO anon, authenticated;

-- ============================================
-- KLAAR! Verifieer met een bestaande bewaarcode:
--   SELECT * FROM load_saved_composition('BBD6KD');
-- → hoort 1 rij te geven (geen 42804-fout).
-- ============================================
