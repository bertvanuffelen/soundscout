// Testsuite migratie 043 (themaplatform) — PGlite-replica van productie + 043.
// Draaien: npm run test:db. Zie ../036/README.md voor wat de replica wel/niet nabootst
// (geen PostgREST, geen Storage: de bucket-policies worden hier niet getest).
import { buildDb } from '../036/harness.mjs';

const R = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const MIG = `${R}/migrations/043_theme_platform.sql`;

const ADMIN = 'adadadad-0000-4000-8000-0000000000ad';
const TEACHER = 'eeeeeeee-0000-4000-8000-0000000000ee';
const lit = (v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

async function as(db, who, sql) {
  const claims = who === 'anon' ? { role: 'anon' } : { role: 'authenticated', sub: who };
  const role = who === 'anon' ? 'anon' : 'authenticated';
  try {
    const res = await db.exec(`begin; set local role ${role}; set local request.jwt.claims = ${lit(JSON.stringify(claims))}; ${sql}; commit;`);
    return { rows: res[res.length - 2]?.rows ?? [], error: null };
  } catch (e) {
    try { await db.exec('rollback'); } catch { /* al teruggedraaid */ }
    return { rows: [], error: e.message };
  }
}

const manifest = (id, version, extra = {}) => JSON.stringify({
  schemaVersion: 1, id, version, status: 'draft', isPublic: true,
  map: { image: { nl: 'images/kaart.jpg' }, positions: [{ locationId: 'plek', x: 50, y: 50 }] },
  locations: [{ id: 'plek', image: 'images/plek.jpg', hotspots: [] }],
  samples: [],
  texts: { nl: { name: 'AUDIT', description: '', locations: { plek: { name: 'Plek' } }, samples: {} } },
  ...extra,
});

const T = [];
const test = (id, label, fn) => T.push({ id, label, fn });
const ok = (cond, msg = '') => ({ pass: !!cond, msg });

async function seedDraft(db, id = 'audit-thema', version = 1, body = manifest(id, version)) {
  const a = await as(db, ADMIN, `insert into themes(id) values (${lit(id)}) on conflict do nothing`);
  const b = await as(db, ADMIN, `insert into theme_versions(theme_id, version, manifest) values (${lit(id)}, ${version}, ${lit(body)}::jsonb)`);
  return a.error || b.error;
}

test('A1', 'is_admin(): waar voor beheerder, onwaar voor docent en anon', async (db) => {
  const a = await as(db, ADMIN, 'select is_admin() v');
  const t = await as(db, TEACHER, 'select is_admin() v');
  const n = await as(db, 'anon', 'select is_admin() v');
  return ok(a.rows[0]?.v === true && t.rows[0]?.v === false && n.rows[0]?.v === false, `${a.rows[0]?.v}/${t.rows[0]?.v}/${n.rows[0]?.v}`);
});
test('A2', 'een docent kan zichzelf geen beheerder maken', async (db) => {
  const r = await as(db, TEACHER, `insert into admins(user_id) values ('${TEACHER}')`);
  const n = (await db.query(`select count(*)::int n from admins where user_id='${TEACHER}'`)).rows[0].n;
  return ok(!!r.error && n === 0, r.error ? 'geweigerd' : 'toegestaan');
});
test('A3', 'docent en anon kunnen geen thema of versie schrijven', async (db) => {
  const t1 = await as(db, TEACHER, `insert into themes(id) values ('audit-docent')`);
  const t2 = await as(db, 'anon', `insert into themes(id) values ('audit-anon')`);
  await seedDraft(db, 'audit-a3');
  const t3 = await as(db, TEACHER, `insert into theme_versions(theme_id, version, manifest) values ('audit-a3', 2, '{}'::jsonb)`);
  const t4 = await as(db, TEACHER, `update themes set sort = 1 where id = 'audit-a3' returning id`);
  return ok(!!t1.error && !!t2.error && !!t3.error && (t4.error || t4.rows.length === 0), [t1, t2, t3, t4].map((r) => (r.error ? 'x' : 'open')).join(','));
});
test('A4', 'concepten zijn onzichtbaar voor docent en anon, zichtbaar voor beheerder', async (db) => {
  await seedDraft(db, 'audit-a4');
  const q = `select (select count(*)::int from themes where id='audit-a4') t, (select count(*)::int from theme_versions where theme_id='audit-a4') v`;
  const a = (await as(db, ADMIN, q)).rows[0];
  const t = (await as(db, TEACHER, q)).rows[0];
  const n = (await as(db, 'anon', q)).rows[0];
  return ok(a.t === 1 && a.v === 1 && t.t === 0 && t.v === 0 && n.t === 0 && n.v === 0, `admin ${a.t}/${a.v}, docent ${t.t}/${t.v}, anon ${n.t}/${n.v}`);
});
test('A5', 'publiceren direct via de tabel kan niet (alleen via de RPC)', async (db) => {
  await seedDraft(db, 'audit-a5');
  const r1 = await as(db, ADMIN, `update theme_versions set published_at = now() where theme_id='audit-a5'`);
  const r2 = await as(db, ADMIN, `update themes set published_version = 1 where id='audit-a5'`);
  return ok(!!r1.error && !!r2.error, `${r1.error ?? 'open'} / ${r2.error ?? 'open'}`);
});
test('P1', 'publiceren: versie live, anon leest thema + manifest via published_themes', async (db) => {
  await seedDraft(db, 'audit-p1');
  const p = await as(db, ADMIN, `select publish_theme_version('audit-p1', 1) r`);
  const v = await as(db, 'anon', `select id, version, status, manifest->>'id' mid from published_themes where id='audit-p1'`);
  const t = await as(db, 'anon', `select published_version from themes where id='audit-p1'`);
  return ok(!p.error && v.rows[0]?.version === 1 && v.rows[0]?.status === 'published' && v.rows[0]?.mid === 'audit-p1' && t.rows[0]?.published_version === 1,
    p.error || JSON.stringify(v.rows[0]));
});
test('P2', 'een gepubliceerde versie is onveranderlijk en niet te verwijderen', async (db) => {
  await seedDraft(db, 'audit-p2');
  await as(db, ADMIN, `select publish_theme_version('audit-p2', 1)`);
  const u = await as(db, ADMIN, `update theme_versions set manifest = '{}'::jsonb where theme_id='audit-p2' and version=1`);
  const d = await as(db, ADMIN, `delete from theme_versions where theme_id='audit-p2' and version=1`);
  const dt = await as(db, ADMIN, `delete from themes where id='audit-p2'`);
  const again = await as(db, ADMIN, `select publish_theme_version('audit-p2', 1)`);
  const still = (await db.query(`select manifest->>'id' id from theme_versions where theme_id='audit-p2' and version=1`)).rows[0]?.id;
  return ok(!!u.error && !!d.error && !!dt.error && !!again.error && still === 'audit-p2', `${u.error} | ${d.error} | ${again.error}`);
});
test('P3', 'publiceren weigert een manifest met de verkeerde vorm', async (db) => {
  await seedDraft(db, 'audit-p3', 1, JSON.stringify({ schemaVersion: 1, id: 'ander-id', version: 1 }));
  const r = await as(db, ADMIN, `select publish_theme_version('audit-p3', 1)`);
  const v = (await db.query(`select published_at from theme_versions where theme_id='audit-p3'`)).rows[0]?.published_at;
  return ok(!!r.error && r.error.includes('theme_manifest_invalid') && v == null, r.error ?? 'toegestaan');
});
test('P4', 'docent kan niet publiceren of terugzetten', async (db) => {
  await seedDraft(db, 'audit-p4');
  const p = await as(db, TEACHER, `select publish_theme_version('audit-p4', 1)`);
  const r = await as(db, TEACHER, `select rollback_theme('audit-p4', 1)`);
  const n = await as(db, 'anon', `select publish_theme_version('audit-p4', 1)`);
  return ok(!!p.error && !!r.error && !!n.error, `${p.error} | ${r.error}`);
});
test('P5', 'terugzetten: live versie gaat naar een eerder gepubliceerde; niet naar een concept', async (db) => {
  await seedDraft(db, 'audit-p5', 1);
  await as(db, ADMIN, `select publish_theme_version('audit-p5', 1)`);
  await as(db, ADMIN, `insert into theme_versions(theme_id, version, manifest) values ('audit-p5', 2, ${lit(manifest('audit-p5', 2))}::jsonb)`);
  await as(db, ADMIN, `select publish_theme_version('audit-p5', 2)`);
  const live2 = (await as(db, 'anon', `select version from published_themes where id='audit-p5'`)).rows[0]?.version;
  const rb = await as(db, ADMIN, `select rollback_theme('audit-p5', 1)`);
  const live1 = (await as(db, 'anon', `select version from published_themes where id='audit-p5'`)).rows[0]?.version;
  await as(db, ADMIN, `insert into theme_versions(theme_id, version, manifest) values ('audit-p5', 3, ${lit(manifest('audit-p5', 3))}::jsonb)`);
  const toDraft = await as(db, ADMIN, `select rollback_theme('audit-p5', 3)`);
  const anonDraft = (await as(db, 'anon', `select count(*)::int n from theme_versions where theme_id='audit-p5' and version=3`)).rows[0]?.n;
  return ok(live2 === 2 && !rb.error && live1 === 1 && !!toDraft.error && anonDraft === 0, `live ${live2} → ${live1}; naar concept: ${toDraft.error ? 'geweigerd' : 'toegestaan'}`);
});
test('P6', 'verbergen: status hidden, thema blijft laadbaar', async (db) => {
  await seedDraft(db, 'audit-p6');
  await as(db, ADMIN, `select publish_theme_version('audit-p6', 1)`);
  const h = await as(db, ADMIN, `update themes set status='hidden' where id='audit-p6' returning status`);
  const v = (await as(db, 'anon', `select status from published_themes where id='audit-p6'`)).rows[0]?.status;
  return ok(!h.error && v === 'hidden', h.error || v);
});
test('P7', 'status zonder live versie blijft altijd draft', async (db) => {
  await seedDraft(db, 'audit-p7');
  const r = await as(db, ADMIN, `update themes set status='published' where id='audit-p7' returning status`);
  return ok(r.rows[0]?.status === 'draft', r.error || r.rows[0]?.status);
});
test('P8', 'publiceren is rate-limited (max 10 per minuut per beheerder)', async (db) => {
  const db2 = await buildDb({ migrations: [MIG] });
  await db2.exec(`insert into auth.users(id,email) values ('${ADMIN}','audit-admin@example.test'); insert into admins(user_id) values ('${ADMIN}');`);
  let refused = 0;
  for (let i = 1; i <= 11; i++) {
    await seedDraft(db2, `audit-rl${i}`);
    const r = await as(db2, ADMIN, `select publish_theme_version('audit-rl${i}', 1)`);
    if (r.error?.includes('Rate limit')) refused++;
  }
  await db2.close();
  return ok(refused === 1, `${refused} geweigerd`);
});
test('C1', 'bronvermelding: anon ziet die van live thema\'s, niet van concepten; docent kan niet schrijven', async (db) => {
  await seedDraft(db, 'audit-c1');
  await seedDraft(db, 'audit-c1b');
  await as(db, ADMIN, `insert into theme_assets(theme_id, path, licence, source) values ('audit-c1','v1/audio/a.mp3','CC0','freesound'), ('audit-c1b','v1/audio/b.mp3','CC0','eigen')`);
  await as(db, ADMIN, `select publish_theme_version('audit-c1', 1)`);
  const n = (await as(db, 'anon', `select theme_id from theme_assets where theme_id like 'audit-c1%'`)).rows.map((r) => r.theme_id);
  const w = await as(db, TEACHER, `insert into theme_assets(theme_id, path) values ('audit-c1','v1/x.mp3')`);
  const bad = await as(db, ADMIN, `insert into theme_assets(theme_id, path) values ('audit-c1','../x.mp3')`);
  return ok(n.length === 1 && n[0] === 'audit-c1' && !!w.error && !!bad.error, JSON.stringify(n));
});
test('S1', 'storage (nagebootst schema): bucket publiek; alleen beheerder uploadt/verwijdert in themes', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { readFileSync } = await import('node:fs');
  const { PRELUDE } = await import('../036/harness.mjs');
  const sdb = new PGlite();
  await sdb.exec(PRELUDE);
  await sdb.exec(`
    create table public.rate_limits (id bigserial primary key, action text, identifier text, created_at timestamptz default now());
    create function public.check_rate_limit(a text, i text, m int, w int) returns void language sql as $$ select $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id bigserial primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant all on storage.objects to anon, authenticated;
    grant all on all sequences in schema storage to anon, authenticated;
  `);
  await sdb.exec(readFileSync(MIG, 'utf8'));
  await sdb.exec(`insert into auth.users(id,email) values ('${ADMIN}','a@example.test'),('${TEACHER}','d@example.test'); insert into admins(user_id) values ('${ADMIN}');`);
  const bucket = (await sdb.query(`select public from storage.buckets where id='themes'`)).rows[0];
  const a = await as(sdb, ADMIN, `insert into storage.objects(bucket_id,name) values ('themes','kerst/v1/audio/a.mp3')`);
  const t = await as(sdb, TEACHER, `insert into storage.objects(bucket_id,name) values ('themes','kerst/v1/audio/b.mp3')`);
  const o = await as(sdb, TEACHER, `insert into storage.objects(bucket_id,name) values ('andere','x')`);
  const d = await as(sdb, TEACHER, `delete from storage.objects where bucket_id='themes' returning id`);
  const n = await as(sdb, 'anon', `select count(*)::int n from storage.objects where bucket_id='themes'`);
  await sdb.close();
  return ok(bucket?.public === true && !a.error && !!t.error && !!o.error && d.rows.length === 0 && n.rows[0]?.n === 0,
    `bucket publiek: ${bucket?.public}, beheerder: ${a.error ?? 'ok'}, docent: ${t.error ? 'geweigerd' : 'toegestaan'}, anon opsommen: ${n.rows[0]?.n}`);
});
test('R1', 'regressie: bestaande RPC\'s werken nog (klascode, telling)', async (db) => {
  const u = await as(db, 'anon', `select log_usage_event('app_start')`);
  return ok(!u.error, u.error || '');
});

const db = await buildDb({ migrations: [MIG] });
await db.exec(`
  insert into auth.users(id,email) values ('${ADMIN}','audit-admin@example.test'),('${TEACHER}','audit-docent@example.test');
  insert into admins(user_id) values ('${ADMIN}');
`);
// Idempotent: de migratie een tweede keer draaien mag niets breken
const { readFileSync } = await import('node:fs');
await db.exec(readFileSync(MIG, 'utf8'));

const results = [];
for (const t of T) {
  let r;
  try { r = await t.fn(db); } catch (e) { r = { pass: false, msg: 'crash: ' + e.message }; }
  results.push({ ...t, ...r });
}
await db.close();

console.log('\n| ID | Controle (043) | Resultaat |');
console.log('|---|---|---|');
for (const r of results) console.log(`| ${r.id} | ${r.label} | ${r.pass ? '✅' : '❌'} ${r.msg} |`);
const failed = results.filter((r) => !r.pass).map((r) => r.id);
console.log('\n043 niet groen:', failed.length ? failed.join(', ') : 'geen');
if (failed.length) process.exitCode = 1;
