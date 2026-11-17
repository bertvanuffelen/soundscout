-- Migration 045: "Les afronden" (designronde nov 2026, mockup B3 deel 2)
--
-- Doel: op gedeelde Chromebooks en iPads blijft het werk van een kind staan
-- tot het zelf "Klaar, ik stop" kiest. Met één knop rondt de docent de les af;
-- elk apparaat van die klas ruimt daarna bij het eerstvolgende openen zijn
-- werkblad op. Het werk zelf gaat niet weg: wat is ingeleverd of met de
-- klascode bewaard staat bij de docent, en een soundscape die alleen lokaal
-- bestond zet de app op dat apparaat bij "Mijn soundscapes".
--
-- Wat er bijkomt:
--   classes.lesson_ended_at   tijdstip van de laatste keer "Les afronden"
--   end_lesson(class_id)      docent (eigenaar) zet dat tijdstip op nu
--   get_lesson_state(code)    leerlingapparaat leest het tijdstip met de klascode
--
-- Het apparaat vergelijkt alleen "is dit tijdstip anders dan toen ik begon";
-- er wordt niets met de klok van het apparaat vergeleken en er gaat niets
-- over de leerling naar de server.
--
-- Idempotent en additief. Uitvoeren in de Supabase SQL Editor.

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS lesson_ended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.classes.lesson_ended_at IS
  'Laatste keer dat de docent "Les afronden" koos (migratie 045). NULL = nog nooit.';

-- --- Docent: de les afronden ------------------------------------------------

CREATE OR REPLACE FUNCTION public.end_lesson(p_class_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ended TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM check_rate_limit('end_lesson', 'teacher:' || auth.uid()::TEXT, 20, 60);

  UPDATE public.classes
     SET lesson_ended_at = NOW()
   WHERE id = p_class_id
     AND teacher_id = auth.uid()
  RETURNING lesson_ended_at INTO v_ended;

  IF v_ended IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  RETURN v_ended;
END;
$$;

REVOKE ALL ON FUNCTION public.end_lesson(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_lesson(UUID) TO authenticated;

-- --- Leerlingapparaat: is de les afgerond? ----------------------------------

-- Ruim genoeg voor een hele school (elk apparaat vraagt het bij openen en bij
-- terugkomen op het tabblad), krap genoeg tegen misbruik.
CREATE OR REPLACE FUNCTION public.get_lesson_state(p_class_code TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := TRIM(p_class_code);
  v_ended TIMESTAMPTZ;
BEGIN
  IF v_code IS NULL OR v_code !~ '^[0-9]{4}$' THEN
    RETURN NULL;
  END IF;

  PERFORM check_rate_limit('lesson_state', 'classcode:' || v_code, 600, 60);

  SELECT lesson_ended_at INTO v_ended
    FROM public.classes
   WHERE code = v_code;

  RETURN v_ended; -- NULL: onbekende klas of nog nooit afgerond
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lesson_state(TEXT) TO anon, authenticated;
