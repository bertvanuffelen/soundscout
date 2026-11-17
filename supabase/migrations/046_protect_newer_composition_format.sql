-- Migration 046: een verouderde app mag nieuwer werk niet overschrijven (D1)
--
-- Het probleem: V2 bewaart dingen die V1 niet kent (melodie, geluidseffecten,
-- tempo, snelheid/echo/filter). V1 opent zo'n soundscape zonder foutmelding,
-- maar gooit die velden stil weg. Slaat V1 daarna op (bewaarcode-sync of
-- opnieuw inleveren), dan vervangt de uitgeklede versie de online kopie en is
-- de melodie van het kind voorgoed weg. Na de release draaien V1 en V2 een
-- tijd naast elkaar: een tabblad dat nog open stond, een Chromebook die sliep.
--
-- De oplossing: V2 zet in elke soundscape die het bewaart een formaatnummer
-- (composition_data.formatVersion = 2). V1 kent dat veld niet en stuurt het
-- dus nooit mee. Deze trigger weigert elke UPDATE die het formaatnummer van
-- een inzending zou verlagen. De verouderde app krijgt dan zijn gewone
-- "opslaan mislukt"-melding; het werk in de database blijft heel.
--
-- Wat NIET verandert:
--  - nieuw werk invoegen (ook vanuit V1) mag altijd;
--  - V1-werk bijwerken vanuit V1 mag altijd (geen formaatnummer aan beide kanten);
--  - updates die composition_data niet raken (feedback, gezien, deelcode);
--  - V2 dat V1-werk opwaardeert (formaat omhoog) mag altijd.
--
-- Terugdraaien naar V1 (noodgeval): V1 kan dan werk dat intussen in V2 is
-- bewaard niet online bijwerken. Dat is de bedoeling; lokaal bewaren werkt
-- wel. Zie docs/v2/STAGING-RUNBOOK.md.
--
-- Idempotent en additief. Uitvoeren in de Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.composition_format_version(p_data JSONB)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_data IS NULL THEN 1
    WHEN jsonb_typeof(p_data -> 'formatVersion') = 'number'
         AND (p_data ->> 'formatVersion') ~ '^[0-9]{1,6}$'
      THEN GREATEST((p_data ->> 'formatVersion')::INTEGER, 1)
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.protect_newer_composition_format()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.composition_format_version(NEW.composition_data)
       < public.composition_format_version(OLD.composition_data) THEN
    RAISE EXCEPTION 'client_outdated: deze soundscape is bewaard met een nieuwere versie van SoundScout'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_newer_composition_format ON public.submissions;
CREATE TRIGGER trg_protect_newer_composition_format
  BEFORE UPDATE OF composition_data ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_newer_composition_format();
