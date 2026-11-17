// Testsuite migratie 045 ("Les afronden") — PGlite-replica van productie + 045.
// Draaien: npm run test:db. Zie ../036/README.md voor wat de replica wel/niet nabootst.
import { readFileSync } from 'node:fs';
import { buildDb } from '../036/harness.mjs';

const R = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const MIG = `${R}/migrations/045_end_lesson.sql`;

const OWNER = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const OTHER = 'bbbbbbbb-0000-4000-8000-0000000000b2';
const CLASS = 'cccccccc-0000-4000-8000-0000000000c3';
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

const T = [];
const test = (id, label, fn) => T.push({ id, label, fn });
const ok = (cond, msg = '') => ({ pass: !!cond, msg });
const ended = async (db) => (await db.query(`select lesson_ended_at v from classes where id='${CLASS}'`)).rows[0].v;

test('L1', 'een nieuwe klas is nog nooit afgerond; het apparaat leest NULL', async (db) => {
  const r = await as(db, 'anon', `select get_lesson_state('4827') v`);
  return ok(!r.error && r.rows[0]?.v === null, r.error || String(r.rows[0]?.v));
});
test('L2', 'anon kan de les niet afronden', async (db) => {
  const r = await as(db, 'anon', `select end_lesson('${CLASS}')`);
  return ok(!!r.error && (await ended(db)) === null, r.error ? 'geweigerd' : 'toegestaan');
});
test('L3', 'een andere docent kan de les van deze klas niet afronden', async (db) => {
  const r = await as(db, OTHER, `select end_lesson('${CLASS}')`);
  return ok(!!r.error && /class_not_found/.test(r.error) && (await ended(db)) === null, r.error || 'toegestaan');
});
test('L4', 'de eigenaar rondt af; het apparaat leest daarna hetzelfde tijdstip', async (db) => {
  const e = await as(db, OWNER, `select end_lesson('${CLASS}') v`);
  const s = await as(db, 'anon', `select get_lesson_state(' 4827 ') v`);
  const a = e.rows[0]?.v, b = s.rows[0]?.v;
  return ok(!e.error && !s.error && a && b && new Date(a).getTime() === new Date(b).getTime(), e.error || s.error || `${a} / ${b}`);
});
test('L5', 'nog een keer afronden geeft een later tijdstip (elke les opnieuw)', async (db) => {
  const before = new Date(await ended(db)).getTime();
  await new Promise((r) => setTimeout(r, 15));
  const e = await as(db, OWNER, `select end_lesson('${CLASS}') v`);
  return ok(!e.error && new Date(e.rows[0]?.v).getTime() > before, e.error || '');
});
test('L6', 'onbekende of ongeldige klascode geeft NULL, geen fout', async (db) => {
  const a = await as(db, 'anon', `select get_lesson_state('0000') v`);
  const b = await as(db, 'anon', `select get_lesson_state('abcd; drop table classes') v`);
  const c = await as(db, 'anon', `select get_lesson_state(NULL) v`);
  return ok(!a.error && !b.error && !c.error && a.rows[0]?.v === null && b.rows[0]?.v === null && c.rows[0]?.v === null, a.error || b.error || c.error || '');
});
test('L7', 'anon kan lesson_ended_at niet rechtstreeks zetten', async (db) => {
  const before = await ended(db);
  const r = await as(db, 'anon', `update classes set lesson_ended_at = now() + interval '1 day' where id='${CLASS}' returning id`);
  const after = await ended(db);
  return ok(r.rows.length === 0 && String(before) === String(after), r.error ? 'geweigerd' : `${r.rows.length} rijen`);
});
test('R1', 'regressie: bestaande RPC werkt nog (telling)', async (db) => {
  const u = await as(db, 'anon', `select log_usage_event('app_start')`);
  return ok(!u.error, u.error || '');
});

const db = await buildDb({ migrations: [MIG] });
await db.exec(`
  insert into auth.users(id,email) values ('${OWNER}','audit-eigenaar@example.test'),('${OTHER}','audit-ander@example.test');
  insert into teachers(id,email,display_name) values ('${OWNER}','audit-eigenaar@example.test','Eigenaar'),('${OTHER}','audit-ander@example.test','Ander') on conflict (id) do nothing;
  insert into classes(id,teacher_id,name,code) values ('${CLASS}','${OWNER}','Groep 6a','4827');
`);
// Idempotent: de migratie een tweede keer draaien mag niets breken
await db.exec(readFileSync(MIG, 'utf8'));

const results = [];
for (const t of T) {
  let r;
  try { r = await t.fn(db); } catch (e) { r = { pass: false, msg: 'crash: ' + e.message }; }
  results.push({ ...t, ...r });
}
await db.close();

console.log('\n| ID | Controle (045) | Resultaat |');
console.log('|---|---|---|');
for (const r of results) console.log(`| ${r.id} | ${r.label} | ${r.pass ? '✅' : '❌'} ${r.msg} |`);
const failed = results.filter((r) => !r.pass).map((r) => r.id);
console.log('\n045 niet groen:', failed.length ? failed.join(', ') : 'geen');
if (failed.length) process.exitCode = 1;
