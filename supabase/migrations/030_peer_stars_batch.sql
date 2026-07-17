-- ============================================
-- Migratie 030: batch peer-sterren per klas (presentatiescherm fase 2)
-- ============================================
-- Het zijpaneel van het presentatiescherm toont per inzending het totaal
-- aan ontvangen peer-sterren. Tot nu toe kon dat alleen per compositie
-- (get_peer_compliments per bewaarcode); voor een playlist van een hele
-- klas is dat N round-trips. Deze functie levert alles in één keer,
-- uitsluitend aan de eigenaar-docent van de klas.
--
-- Idempotent: CREATE OR REPLACE; geen tabelwijzigingen.

CREATE OR REPLACE FUNCTION get_peer_stars_for_class(p_class_id UUID)
RETURNS TABLE (
  submission_id UUID,
  total_stars   BIGINT,
  rater_count   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alleen de eigenaar-docent van deze klas
  IF NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Geen toegang tot deze klas';
  END IF;

  RETURN QUERY
  SELECT
    pf.submission_id,
    -- Sterren over alle criteria en beoordelaars opgeteld; chips-only-rijen
    -- (pre-028, ratings IS NULL) tellen als beoordelaar met 0 sterren
    COALESCE(SUM(
      (SELECT SUM((r.value)::TEXT::NUMERIC)
       FROM jsonb_each(pf.ratings) r)
    ), 0)::BIGINT AS total_stars,
    COUNT(*)::BIGINT AS rater_count
  FROM public.peer_feedback pf
  JOIN public.submissions s ON s.id = pf.submission_id
  WHERE s.class_id = p_class_id
  GROUP BY pf.submission_id;
END;
$$;

-- Alleen ingelogde docenten (de auth.uid()-check hierboven doet de rest)
REVOKE EXECUTE ON FUNCTION get_peer_stars_for_class(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION get_peer_stars_for_class(UUID) TO authenticated;
