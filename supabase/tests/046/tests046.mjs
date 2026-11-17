// Testsuite migratie 046 (verouderde app mag nieuwer werk niet overschrijven).
// PGlite-replica van productie + 046. Draaien: npm run test:db.
import { readFileSync } from 'node:fs';
import { buildDb } from '../036/harness.mjs';

const R = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const MIG = `${R}/migrations/046_protect_newer_composition_format.sql`;
const V1 = `{"tracks":[],"bpm":120,"totalBeats":128,"isLooping":false,"samples":[]}`;
const V2 = `{"formatVersion":2,"tracks":[],"bpm":90,"totalBeats":128,"isLooping":false,"samples":[],"effectSounds":[{"id":"fx1"}]}`;
const V2B = `{"formatVersion":2,"tracks":[],"bpm":100,"totalBeats":128,"isLooping":false,"samples":[]}`;

const T = [];
const test = (id, label, fn) => T.push({ id, label, fn });
const ok = (cond, msg = '') => ({ pass: !!cond, msg });
let n = 0;
async function insert(db, data) {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  await db.query(`insert into submissions(id, student_name, composition_name, composition_data) values ($1,'Sem','Boerderij',$2::jsonb)`, [id, data]);
  return id;
}
async function update(db, id, data) {
  try { await db.query(`update submissions set composition_data = $2::jsonb where id = $1`, [id, data]); return null; }
  catch (e) { return e.message; }
}
const bpm = async (db, id) => (await db.query(`select composition_data->>'bpm' v from submissions where id=$1`, [id])).rows[0].v;

test('F1', 'formaatnummer: ontbreekt = 1, 2 = 2, rommel = 1', async (db) => {
  const r = (await db.query(`select composition_format_version('${V1}'::jsonb) a, composition_format_version('${V2}'::jsonb) b,
    composition_format_version('{"formatVersion":"2"}'::jsonb) c, composition_format_version('{"formatVersion":-3}'::jsonb) d,
    composition_format_version(NULL) e, composition_format_version('{"formatVersion":99999999999}'::jsonb) f`)).rows[0];
  return ok(r.a === 1 && r.b === 2 && r.c === 1 && r.d === 1 && r.e === 1 && r.f === 1, JSON.stringify(r));
});
test('F2', 'V1 mag V2-werk niet overschrijven; het werk blijft heel', async (db) => {
  const id = await insert(db, V2);
  const err = await update(db, id, V1);
  return ok(err && /client_outdated/.test(err) && (await bpm(db, id)) === '90', err || 'toegestaan');
});
test('F3', 'V2 mag V2-werk bijwerken', async (db) => {
  const id = await insert(db, V2);
  const err = await update(db, id, V2B);
  return ok(!err && (await bpm(db, id)) === '100', err || '');
});
test('F4', 'V1 mag V1-werk bijwerken (niets verandert voor bestaand gebruik)', async (db) => {
  const id = await insert(db, V1);
  const err = await update(db, id, V1.replace('120', '121'));
  return ok(!err && (await bpm(db, id)) === '121', err || '');
});
test('F5', 'V2 mag V1-werk opwaarderen', async (db) => {
  const id = await insert(db, V1);
  const err = await update(db, id, V2);
  return ok(!err && (await bpm(db, id)) === '90', err || '');
});
test('F6', 'updates die de soundscape niet raken blijven werken op V2-werk (feedback, gezien)', async (db) => {
  const id = await insert(db, V2);
  let err = null;
  try { await db.query(`update submissions set feedback_sticker='build', teacher_seen_at=now() where id=$1`, [id]); } catch (e) { err = e.message; }
  return ok(!err, err || '');
});
test('F7', 'nieuw V1-werk invoegen mag altijd', async (db) => {
  let err = null;
  try { await insert(db, V1); } catch (e) { err = e.message; }
  return ok(!err, err || '');
});

const db = await buildDb({ migrations: [MIG] });
// Idempotent: de migratie een tweede keer draaien mag niets breken
await db.exec(readFileSync(MIG, 'utf8'));

const results = [];
for (const t of T) {
  let r;
  try { r = await t.fn(db); } catch (e) { r = { pass: false, msg: 'crash: ' + e.message }; }
  results.push({ ...t, ...r });
}
await db.close();

console.log('\n| ID | Controle (046) | Resultaat |');
console.log('|---|---|---|');
for (const r of results) console.log(`| ${r.id} | ${r.label} | ${r.pass ? '✅' : '❌'} ${r.msg} |`);
const failed = results.filter((r) => !r.pass).map((r) => r.id);
console.log('\n046 niet groen:', failed.length ? failed.join(', ') : 'geen');
if (failed.length) process.exitCode = 1;
