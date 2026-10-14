# Databasetests migratie 036

`npm run test:db` bouwt een lokale Postgres (PGlite, in Node, zonder Docker) na met:
- `prod_schema.sql`: de definities van de live productiedatabase op 14-10-2026 (tabellen, constraints, indexen, RLS, policies, functies, triggers, functierechten; **geen data**);
- de Supabase-rollen `anon`, `authenticated` en `service_role`, plus `auth.uid()` (via `request.jwt.claims`).

Daarna draait hij elke controle drie keer: op de productiestand, na `036_security_hardening.sql` en na de rollback. Alle testdata heet `AUDIT-…`.

- **T-regels** zijn beveiligingscontroles: ❌ op de productiestand = lek, ✅ na 036 = dicht.
- **R-regels** zijn regressies: die moeten in alle drie de kolommen ✅ zijn.

Beperking: PGlite is single-user Postgres 17.5. Rollen, RLS en `SECURITY DEFINER` werken echt, maar Supabase-specifieke dingen (PostgREST, Auth, pg_cron) zitten er niet in. Controleer na het toepassen op productie dus ook de rooktest uit `docs/audit-2026-10/FIXPLAN.md` (A5).
