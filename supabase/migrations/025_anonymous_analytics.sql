-- Migration 025: Anonieme, cookieloze gebruiksstatistieken
--
-- Doel: inzicht in gebruik (hoeveel sessies, welke schermen/features) zonder
-- persoonsgegevens. Er wordt NIETS over de gebruiker opgeslagen: geen id's,
-- geen IP, geen user-agent, geen cookies. Alleen (event, dag) + teller.
--
-- Ontwerp: één rij per (event, dag) met een teller — geen event-log, dus
-- geen groeiende tabel met individuele momenten die tot personen herleidbaar
-- zouden kunnen zijn, en verwaarloosbare opslag.
--
-- Idempotent en additief. Uitvoeren in de Supabase SQL Editor.

-- --- Tabel -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usage_stats (
  event      TEXT NOT NULL,
  day        DATE NOT NULL DEFAULT CURRENT_DATE,
  count      BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (event, day)
);

ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

-- Geen anon-policies: schrijven kan uitsluitend via de SECURITY DEFINER-RPC
-- hieronder; lezen alleen voor ingelogde gebruikers (dashboard/beheer).
DROP POLICY IF EXISTS usage_stats_read_authenticated ON public.usage_stats;
CREATE POLICY usage_stats_read_authenticated
  ON public.usage_stats FOR SELECT
  TO authenticated
  USING (true);

-- --- RPC -------------------------------------------------------------------

-- Eventnamen zijn een vaste allowlist zodat de publieke RPC niet als vrije
-- schrijfingang misbruikt kan worden. Rate limiting via het bestaande
-- check_rate_limit-mechanisme (migration 002), gekeyed op event-naam:
-- ruim genoeg voor een hele school tegelijk, krap genoeg tegen misbruik.
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
    'teacher_dashboard_opened'
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
