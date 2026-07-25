-- ============================================
-- MIGRATIE 035: Automatische verwijdering van vervallen data (AVG)
-- Voer uit in de Supabase SQL Editor.
-- Additief & idempotent.
-- ============================================
-- Maakt de privacy-belofte wáár i.p.v. alleen de toegang te blokkeren.
-- Beleid (besluit 24-7):
--   * Docent-inzendingen (leerlingwerk mét voornaam): 1 schooljaar (365 dagen)
--     na de laatste activiteit. ALLEEN de inzending wordt verwijderd — de klas,
--     opdracht en klascode blijven bestaan (dat is werkmateriaal van de docent,
--     geen persoonsgegeven van een kind).
--   * Online bewaarcode / gedeelde losse composities (geen klas, geen praatplaat):
--     60 dagen na de laatste activiteit.
--   * Vervallen deel-/albumcodes: code wissen (toegang stopt), rij blijft.
--
-- ⚠️ VOORWAARDE: de pg_cron-extensie moet aanstaan. In Supabase:
--   Dashboard → Database → Extensions → zoek "pg_cron" → Enable.
--   (De CREATE EXTENSION hieronder probeert dit ook, maar het kan zijn dat je
--    het één keer via het dashboard moet aanzetten.)

-- ============================================
-- 1. OPRUIMFUNCTIE
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_submissions INT := 0;
  deleted_bewaarcodes INT := 0;
  cleared_praatplaat_shares INT := 0;
  cleared_album_shares INT := 0;
BEGIN
  -- 1a. Docent-inzendingen (klas of praatplaat) — 1 schooljaar na laatste activiteit.
  WITH del AS (
    DELETE FROM public.submissions
    WHERE (class_id IS NOT NULL OR praatplaat_id IS NOT NULL)
      AND COALESCE(last_updated_at, submitted_at, created_at) < NOW() - INTERVAL '365 days'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_submissions FROM del;

  -- 1b. Losse composities zonder klas/praatplaat (online bewaarcode of gedeelde
  --     link) — 60 dagen na laatste activiteit. Dekt zowel bewaarcodes (60 d)
  --     als deellinks (30 d), beide ruim binnen 60 dagen.
  WITH del AS (
    DELETE FROM public.submissions
    WHERE class_id IS NULL AND praatplaat_id IS NULL
      AND COALESCE(last_updated_at, created_at) < NOW() - INTERVAL '60 days'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_bewaarcodes FROM del;

  -- 1c. Vervallen deelcodes van praatplaten wissen (toegang stopt; rij blijft).
  UPDATE public.praatplaten
    SET share_code = NULL, share_expires_at = NULL
    WHERE share_code IS NOT NULL
      AND share_expires_at IS NOT NULL
      AND share_expires_at < NOW();
  GET DIAGNOSTICS cleared_praatplaat_shares = ROW_COUNT;

  -- 1d. Vervallen klasalbum-codes wissen.
  UPDATE public.class_assignments
    SET share_code = NULL, share_expires_at = NULL
    WHERE share_code IS NOT NULL
      AND share_expires_at IS NOT NULL
      AND share_expires_at < NOW();
  GET DIAGNOSTICS cleared_album_shares = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_submissions', deleted_submissions,
    'deleted_bewaarcodes', deleted_bewaarcodes,
    'cleared_praatplaat_shares', cleared_praatplaat_shares,
    'cleared_album_shares', cleared_album_shares,
    'ran_at', NOW()
  );
END;
$$;

-- Alleen de eigenaar/cron mag deze functie draaien — niet via de publieke API.
REVOKE ALL ON FUNCTION public.cleanup_expired_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_data() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_data() FROM authenticated;

-- ============================================
-- 2. DAGELIJKSE PLANNING (pg_cron)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Bestaande job met dezelfde naam verwijderen (idempotent bij her-uitvoeren).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'soundscout-cleanup';

-- Elke dag om 03:00 (UTC) opruimen.
SELECT cron.schedule(
  'soundscout-cleanup',
  '0 3 * * *',
  $$ SELECT public.cleanup_expired_data(); $$
);

-- Handmatig testen kan met:  SELECT public.cleanup_expired_data();
