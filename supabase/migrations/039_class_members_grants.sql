-- =============================================================================
-- 039 — Rechten docentfuncties leerlingcodes dichtzetten (na 038)
-- =============================================================================
--
-- Waarom: Postgres geeft nieuwe functies standaard EXECUTE aan PUBLIC. De
-- "REVOKE ... FROM anon" in 038 haalde daardoor niets weg: anoniem kon de
-- docentfuncties nog aanroepen (gecontroleerd 21-10-2026). Misbruik was niet
-- mogelijk — elke functie eist via assert_class_owner een ingelogde eigenaar —
-- maar docentfuncties horen voor anoniem dicht te zitten (defense in depth).
--
-- Leerlingfuncties (login_with_member_code, link_submission_to_member) blijven
-- bewust open voor anoniem: leerlingen hebben geen account.
-- Idempotent: opnieuw draaien kan geen kwaad.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.generate_class_members(UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_class_members(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.extend_class_members(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_class_member_active(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.replace_class_member_code(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assert_class_owner(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_class_members(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_class_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_class_member_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_class_member_code(UUID) TO authenticated;
