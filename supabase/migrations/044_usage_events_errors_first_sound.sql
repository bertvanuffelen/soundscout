-- Migration 044: vier extra tellers voor de anonieme gebruiksstatistieken
--
-- Doel: zien of er in de klas iets misgaat en hoe snel een leerling zijn
-- eerste geluid hoort, zonder iets over de gebruiker te bewaren.
--   client_error      — sessies waarin een onverwachte fout optrad (max. 1 per sessie;
--                       er gaat niets over de fout zelf naar de server)
--   first_sound_20s   — eerste geluid binnen 20 s na het starten van een soundscape
--   first_sound_60s   — eerste geluid binnen 60 s
--   first_sound_slow  — eerste geluid later dan 60 s
-- Alleen de emmer wordt geteld, nooit de tijd zelf: het blijft één teller per
-- (event, dag), net als in migratie 025. Geen id's, geen IP, geen user-agent.
--
-- De acht bestaande events uit 025 die de app nooit verstuurde, worden vanaf
-- V2 wel verstuurd; daarvoor is geen databasewijziging nodig.
--
-- Idempotent en additief (alleen de allowlist groeit). Uitvoeren in de
-- Supabase SQL Editor. Zonder deze migratie negeert de server de vier nieuwe
-- events stilzwijgend; de app werkt dan gewoon.

CREATE OR REPLACE FUNCTION public.log_usage_event(p_event TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event NOT IN (
    'app_start',
    'composition_started',
    'composition_saved',
    'composition_submitted',
    'stage_reached',
    'mp3_export',
    'video_export',
    'share_link_created',
    'save_code_created',
    'class_code_entered',
    'teacher_dashboard_opened',
    'client_error',
    'first_sound_20s',
    'first_sound_60s',
    'first_sound_slow'
  ) THEN
    RETURN; -- onbekend event stilzwijgend negeren
  END IF;

  -- Max 600/min per event — schoolklassen passen ruim, scripts niet.
  PERFORM check_rate_limit('usage_' || p_event, 'global', 600, 60);

  INSERT INTO public.usage_stats (event, day, count)
  VALUES (p_event, CURRENT_DATE, 1)
  ON CONFLICT (event, day)
  DO UPDATE SET count = public.usage_stats.count + 1;
EXCEPTION WHEN OTHERS THEN
  -- Statistiek mag nooit een gebruikersflow breken
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_usage_event(TEXT) TO anon, authenticated;
