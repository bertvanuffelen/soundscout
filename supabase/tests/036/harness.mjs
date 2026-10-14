// Bouwt een lokale Postgres (PGlite) na met de live productie-definities + Supabase-rollen.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

export const PRELUDE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','anon') $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(current_setting('request.jwt.claims', true)::jsonb,'{}'::jsonb) $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
set check_function_bodies = off;
`;

export async function buildDb({ migrations = [] } = {}) {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(readFileSync(new URL('./prod_schema.sql', import.meta.url), 'utf8'));
  await db.exec(`grant all on all tables in schema public to anon, authenticated, service_role;
                 grant all on all sequences in schema public to anon, authenticated, service_role;`);
  for (const m of migrations) await db.exec(readFileSync(m, 'utf8'));
  return db;
}

if (process.argv[1].endsWith('harness.mjs')) {
  const db = await buildDb();
  const r = await db.query(`select (select count(*) from pg_policies where schemaname='public') pol,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where nspname='public') fn,
    (select count(*) from pg_trigger where not tgisinternal) trg`);
  console.log(JSON.stringify(r.rows[0]));
}
