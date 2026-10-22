-- =============================================================================
-- 040 — Afronding leerlingcodes na de Supabase-beveiligingsadviezen (21-10-2026)
-- =============================================================================
--
-- 1. Vast search_path op de twee hulpfuncties uit 038 (lint 0011
--    function_search_path_mutable), net als 036 voor de oudere functies deed.
-- 2. assert_class_owner is alleen een interne controle: de docentfuncties
--    roepen hem aan als eigenaar (SECURITY DEFINER). Ingelogde gebruikers
--    hoeven hem niet direct aan te roepen.
--
-- Bewust zo gelaten (verwacht gedrag, geen fout):
-- - login_with_member_code en link_submission_to_member zijn uitvoerbaar door
--   anon: leerlingen hebben geen account (lint 0028).
-- - de docentfuncties zijn uitvoerbaar door authenticated en controleren zelf
--   het eigenaarschap (lint 0029).
-- Idempotent.
-- =============================================================================

ALTER FUNCTION public.generate_member_code() SET search_path = public;
ALTER FUNCTION public.member_school_year_end() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.assert_class_owner(UUID) FROM PUBLIC, anon, authenticated;
