-- =============================================================================
-- 043 — Themaplatform: beheerders, thema's, versies, media (V2 Fase 3)
-- =============================================================================
--
-- Het beheerdersdashboard (/beheer) maakt en publiceert thema's zonder code.
-- Uitleg en eenmalige stappen: docs/v2/ADMIN-DASHBOARD.md.
--
--   admins          wie beheerder is (vervangt VITE_ADMIN_EMAILS als echte grens)
--   themes          veranderlijke gegevens per thema: status, zichtbaarheid,
--                   seizoen, volgorde, welke versie live staat
--   theme_versions  het manifest per versie; een GEPUBLICEERDE versie verandert
--                   nooit meer (trigger), een concept wel
--   theme_assets    bron, maker en licentie per mediabestand (colofon)
--   published_themes  view: per thema de live versie + manifest (wat de app leest)
--   bucket 'themes' publiek lezen, alleen beheerders schrijven
--                   (paden: <id>/v<n>/…, publieke URL …/object/public/themes/<id>/v<n>/…)
--
-- RPC's (alleen beheerders, rate-limited met check_rate_limit uit 002):
--   publish_theme_version(theme_id, version)  concept → live (met vormcontrole)
--   rollback_theme(theme_id, version)         live versie terug naar een eerder gepubliceerde
--
-- Additief en idempotent: nieuwe tabellen, niets bestaands verandert. Zonder
-- deze migratie blijft de app gewoon de statische thema's gebruiken.
-- Uitvoeren in de Supabase SQL Editor.
-- =============================================================================

-- --- 1. Beheerders ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Je ziet alleen je eigen rij. Toevoegen/verwijderen kan uitsluitend in de
-- SQL Editor (geen insert/update/delete-policy, dus via de API onmogelijk).
DROP POLICY IF EXISTS admins_select_own ON public.admins;
CREATE POLICY admins_select_own ON public.admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.admins FROM anon, authenticated;
GRANT SELECT ON public.admins TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- --- 2. Thema's -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.themes (
  id                TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9_-]*$'),
  -- draft = nog nooit gepubliceerd; published = live; hidden = live versie
  -- blijft laadbaar (lopende opdrachten, links), maar staat in geen kiezer
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
  -- true = in de leerlingkiezers; false = alleen via link/opdracht/bewaarcode
  is_public         BOOLEAN NOT NULL DEFAULT false,
  season_from       TEXT CHECK (season_from ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  season_until      TEXT CHECK (season_until ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  sort              INT,
  published_version INT CHECK (published_version > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT themes_season_pair CHECK ((season_from IS NULL) = (season_until IS NULL))
);

CREATE TABLE IF NOT EXISTS public.theme_versions (
  theme_id     TEXT NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  version      INT NOT NULL CHECK (version > 0),
  manifest     JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  PRIMARY KEY (theme_id, version)
);

CREATE TABLE IF NOT EXISTS public.theme_assets (
  theme_id          TEXT NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  -- pad relatief aan de themamap in de bucket, bv. 'v2/audio/hond.mp3'
  path              TEXT NOT NULL CHECK (path !~ '(^/|\.\.|\\)'),
  sha256            TEXT CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  bytes             BIGINT CHECK (bytes >= 0),
  content_type      TEXT,
  source            TEXT,
  author            TEXT,
  licence           TEXT,
  licence_url       TEXT,
  generation_prompt TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (theme_id, path)
);

-- --- 3. Vormcontrole van een manifest (minimaal; de app doet de volle Zod-controle) ---

CREATE OR REPLACE FUNCTION public.theme_manifest_shape_ok(p_manifest JSONB, p_theme_id TEXT, p_version INT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_typeof(p_manifest) = 'object'
     AND jsonb_typeof(p_manifest -> 'schemaVersion') = 'number'
     AND (p_manifest ->> 'schemaVersion') = '1'
     AND (p_manifest ->> 'id') IS NOT DISTINCT FROM p_theme_id
     AND jsonb_typeof(p_manifest -> 'version') = 'number'
     AND (p_manifest ->> 'version') = p_version::TEXT
     AND CASE WHEN jsonb_typeof(p_manifest -> 'locations') = 'array'
              THEN jsonb_array_length(p_manifest -> 'locations') > 0
              ELSE false END
     AND jsonb_typeof(p_manifest -> 'samples') = 'array'
     AND jsonb_typeof(p_manifest -> 'map') = 'object'
     AND jsonb_typeof(p_manifest -> 'map' -> 'positions') = 'array'
     AND jsonb_typeof(p_manifest -> 'map' -> 'image' -> 'nl') = 'string'
     AND jsonb_typeof(p_manifest -> 'texts' -> 'nl') = 'object'
     AND COALESCE(length(p_manifest -> 'texts' -> 'nl' ->> 'name'), 0) > 0;
$$;

-- --- 4. Triggers: onveranderlijke versies, live versie alleen via de RPC's ---

-- De RPC's zetten deze vlag (alleen binnen hun eigen transactie).
CREATE OR REPLACE FUNCTION public.theme_publish_flag_on()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$ SELECT COALESCE(current_setting('soundscout.theme_publish', true), '') = 'on'; $$;

CREATE OR REPLACE FUNCTION public.theme_versions_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'theme_version_immutable' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'theme_version_immutable' USING ERRCODE = '42501';
  END IF;

  -- Publiceren (published_at zetten) kan alleen via publish_theme_version
  IF NEW.published_at IS NOT NULL AND NOT public.theme_publish_flag_on() THEN
    RAISE EXCEPTION 'theme_publish_via_rpc_only' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.theme_id := OLD.theme_id;
    NEW.version := OLD.version;
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS theme_versions_guard ON public.theme_versions;
CREATE TRIGGER theme_versions_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.theme_versions
  FOR EACH ROW EXECUTE FUNCTION public.theme_versions_guard();

CREATE OR REPLACE FUNCTION public.themes_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Een thema met een (ooit) gepubliceerde versie verdwijnt nooit: lopende
    -- opdrachten en bewaarcodes verwijzen ernaar. Verbergen kan wel.
    IF OLD.published_version IS NOT NULL THEN
      RAISE EXCEPTION 'theme_published_cannot_delete' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.published_version IS NOT NULL AND NOT public.theme_publish_flag_on() THEN
    RAISE EXCEPTION 'theme_publish_via_rpc_only' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.published_version IS DISTINCT FROM OLD.published_version AND NOT public.theme_publish_flag_on() THEN
    RAISE EXCEPTION 'theme_publish_via_rpc_only' USING ERRCODE = '42501';
  END IF;

  -- Status volgt de live versie: zonder live versie altijd 'draft'
  IF NEW.published_version IS NULL THEN
    NEW.status := 'draft';
  ELSIF NEW.status = 'draft' THEN
    NEW.status := 'published';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS themes_guard ON public.themes;
CREATE TRIGGER themes_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.themes
  FOR EACH ROW EXECUTE FUNCTION public.themes_guard();

-- --- 5. RLS -----------------------------------------------------------------

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_assets ENABLE ROW LEVEL SECURITY;

-- Iedereen ziet thema's met een live versie; beheerders zien ook concepten.
DROP POLICY IF EXISTS themes_select ON public.themes;
CREATE POLICY themes_select ON public.themes
  FOR SELECT TO anon, authenticated
  USING (published_version IS NOT NULL OR public.is_admin());

DROP POLICY IF EXISTS themes_admin_insert ON public.themes;
CREATE POLICY themes_admin_insert ON public.themes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS themes_admin_update ON public.themes;
CREATE POLICY themes_admin_update ON public.themes
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS themes_admin_delete ON public.themes;
CREATE POLICY themes_admin_delete ON public.themes
  FOR DELETE TO authenticated USING (public.is_admin());

-- Gepubliceerde versies zijn openbaar; concepten alleen voor beheerders.
DROP POLICY IF EXISTS theme_versions_select ON public.theme_versions;
CREATE POLICY theme_versions_select ON public.theme_versions
  FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL OR public.is_admin());

DROP POLICY IF EXISTS theme_versions_admin_insert ON public.theme_versions;
CREATE POLICY theme_versions_admin_insert ON public.theme_versions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS theme_versions_admin_update ON public.theme_versions;
CREATE POLICY theme_versions_admin_update ON public.theme_versions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS theme_versions_admin_delete ON public.theme_versions;
CREATE POLICY theme_versions_admin_delete ON public.theme_versions
  FOR DELETE TO authenticated USING (public.is_admin());

-- Bronvermelding van live thema's is openbaar (colofon); de rest alleen beheer.
DROP POLICY IF EXISTS theme_assets_select ON public.theme_assets;
CREATE POLICY theme_assets_select ON public.theme_assets
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.themes t WHERE t.id = theme_id AND t.published_version IS NOT NULL)
  );

DROP POLICY IF EXISTS theme_assets_admin_write ON public.theme_assets;
CREATE POLICY theme_assets_admin_write ON public.theme_assets
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON public.themes, public.theme_versions, public.theme_assets FROM anon, authenticated;
GRANT SELECT ON public.themes, public.theme_versions, public.theme_assets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.themes, public.theme_versions, public.theme_assets TO authenticated;

-- --- 6. Wat de app leest: per thema de live versie --------------------------

-- security_invoker: de RLS van de onderliggende tabellen geldt, dus ook voor
-- een beheerder levert deze view alleen live versies.
DROP VIEW IF EXISTS public.published_themes;
CREATE VIEW public.published_themes
WITH (security_invoker = true) AS
  SELECT t.id,
         t.status,
         t.is_public,
         t.season_from,
         t.season_until,
         t.sort,
         t.published_version AS version,
         v.published_at,
         v.manifest
    FROM public.themes t
    JOIN public.theme_versions v
      ON v.theme_id = t.id AND v.version = t.published_version
   WHERE t.published_version IS NOT NULL
     AND v.published_at IS NOT NULL;

REVOKE ALL ON public.published_themes FROM anon, authenticated;
GRANT SELECT ON public.published_themes TO anon, authenticated;

-- --- 7. Publiceren en terugzetten -------------------------------------------

CREATE OR REPLACE FUNCTION public.publish_theme_version(p_theme_id TEXT, p_version INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_manifest JSONB;
  v_published TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  PERFORM public.check_rate_limit('publish_theme', auth.uid()::TEXT, 10, 60);

  SELECT manifest, published_at INTO v_manifest, v_published
    FROM public.theme_versions
   WHERE theme_id = p_theme_id AND version = p_version
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'theme_version_not_found';
  END IF;
  IF v_published IS NOT NULL THEN
    RAISE EXCEPTION 'theme_version_already_published';
  END IF;
  IF NOT public.theme_manifest_shape_ok(v_manifest, p_theme_id, p_version) THEN
    RAISE EXCEPTION 'theme_manifest_invalid';
  END IF;

  PERFORM set_config('soundscout.theme_publish', 'on', true);
  UPDATE public.theme_versions SET published_at = now()
   WHERE theme_id = p_theme_id AND version = p_version;
  UPDATE public.themes
     SET published_version = p_version,
         status = CASE WHEN status = 'hidden' THEN 'hidden' ELSE 'published' END
   WHERE id = p_theme_id;
  PERFORM set_config('soundscout.theme_publish', 'off', true);

  RETURN jsonb_build_object('theme_id', p_theme_id, 'version', p_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_theme(p_theme_id TEXT, p_version INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  PERFORM public.check_rate_limit('publish_theme', auth.uid()::TEXT, 10, 60);

  IF NOT EXISTS (
    SELECT 1 FROM public.theme_versions
     WHERE theme_id = p_theme_id AND version = p_version AND published_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'theme_version_not_published';
  END IF;

  PERFORM set_config('soundscout.theme_publish', 'on', true);
  UPDATE public.themes SET published_version = p_version WHERE id = p_theme_id;
  PERFORM set_config('soundscout.theme_publish', 'off', true);

  RETURN jsonb_build_object('theme_id', p_theme_id, 'version', p_version);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_theme_version(TEXT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_theme(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_theme_version(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_theme(TEXT, INT) TO authenticated;
REVOKE ALL ON FUNCTION public.theme_manifest_shape_ok(JSONB, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.theme_manifest_shape_ok(JSONB, TEXT, INT) TO authenticated;

-- --- 8. Storage: publieke bucket 'themes' -----------------------------------
--
-- Alleen als het storage-schema bestaat (Supabase; niet in de lokale
-- PGlite-test). Lezen gaat via de publieke URL (bucket public = true);
-- objecten opsommen, uploaden, vervangen en verwijderen: alleen beheerders.

DO $storage$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE '043: geen storage-schema, bucket overgeslagen';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('themes', 'themes', true, 5242880,
          ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif',
                'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav',
                'application/json'])
  ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- Op nieuwere Supabase-projecten mag de SQL Editor (rol postgres) soms
  -- geen policies op storage.objects maken ("must be owner of table objects").
  -- Dan breekt de migratie NIET af: er komt een waarschuwing en je maakt de
  -- vier policies met de hand (docs/v2/ADMIN-DASHBOARD.md §2, stap 3).
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS themes_bucket_admin_select ON storage.objects';
    EXECUTE $p$CREATE POLICY themes_bucket_admin_select ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'themes' AND public.is_admin())$p$;
    EXECUTE 'DROP POLICY IF EXISTS themes_bucket_admin_insert ON storage.objects';
    EXECUTE $p$CREATE POLICY themes_bucket_admin_insert ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'themes' AND public.is_admin())$p$;
    EXECUTE 'DROP POLICY IF EXISTS themes_bucket_admin_update ON storage.objects';
    EXECUTE $p$CREATE POLICY themes_bucket_admin_update ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'themes' AND public.is_admin())
      WITH CHECK (bucket_id = 'themes' AND public.is_admin())$p$;
    EXECUTE 'DROP POLICY IF EXISTS themes_bucket_admin_delete ON storage.objects';
    EXECUTE $p$CREATE POLICY themes_bucket_admin_delete ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'themes' AND public.is_admin())$p$;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING '043: geen rechten om storage-policies te maken. Maak ze in het dashboard (Storage → Policies → bucket themes), zie docs/v2/ADMIN-DASHBOARD.md §2 stap 3.';
  END;
END
$storage$;

-- --- 9. De eerste beheerder (met de hand, één keer) ---------------------------
--
-- Vervang het e-mailadres door het adres waarmee je als docent inlogt:
--
-- INSERT INTO public.admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'jouw-adres@example.nl'
--   ON CONFLICT DO NOTHING;
