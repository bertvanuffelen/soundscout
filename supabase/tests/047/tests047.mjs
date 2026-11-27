// Testsuite migratie 047 ("Plekken tonen", raad-de-plek) + 048 (leskaart
// Sinterklaas) — PGlite-replica van productie + 036 + 037 + 047 + 048.
// Draaien: npm run test:db. Zie ../036/README.md voor wat de replica nabootst.
import { readFileSync } from 'node:fs';
import { buildDb } from '../036/harness.mjs';

const R = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const M = (f) => `${R}/migrations/${f}`;
const MIG047 = M('047_praatplaat_show_spots.sql');
const MIG048 = M('048_seed_sinterklaas_lesson_card.sql');

const OWNER = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const OTHER = 'bbbbbbbb-0000-4000-8000-0000000000b2';
const CLASS = 'cccccccc-0000-4000-8000-0000000000c3';
const PLAIN = 'dddddddd-0000-4000-8000-0000000000d4'; // leskaart zonder preset
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
const one = async (db, sql) => (await db.query(sql)).rows[0];

const T = [];
const test = (id, label, fn) => T.push({ id, label, fn });
const ok = (cond, msg = '') => ({ pass: !!cond, msg });
const active = (db) => one(db, `select ca.id, ca.assignment_type, ca.show_spots, ca.duration_label, ca.praatplaat_id, ca.card_id,
  p.theme_id, p.image_url, p.name from class_assignments ca left join praatplaten p on p.id = ca.praatplaat_id
  where ca.class_id='${CLASS}' and ca.is_active`);
const payload = async (db) => (await as(db, 'anon', `select payload from get_active_assignment('4827')`)).rows[0]?.payload;
let sintId;

test('P1', 'leskaart zonder preset → praatplaat met plekken AAN (standaard), ook voor de leerling', async (db) => {
  const r = await as(db, OWNER, `select activate_lesson_card('${PLAIN}','${CLASS}') v`);
  const a = await active(db);
  const p = await payload(db);
  return ok(!r.error && a.show_spots === true && p?.show_spots === true && p?.students_type_title === true, r.error || JSON.stringify(p));
});
test('P2', 'anon en een andere docent kunnen de instelling niet omzetten', async (db) => {
  const a = await active(db);
  const x = await as(db, 'anon', `update class_assignments set show_spots=false where id='${a.id}' returning id`);
  const y = await as(db, OTHER, `update class_assignments set show_spots=false where id='${a.id}' returning id`);
  return ok(x.rows.length === 0 && y.rows.length === 0 && (await active(db)).show_spots === true, `${x.rows.length}/${y.rows.length}`);
});
test('P3', 'de eigenaar zet plekken UIT; de leerling-payload volgt direct', async (db) => {
  const a = await active(db);
  const u = await as(db, OWNER, `update class_assignments set show_spots=false where id='${a.id}' returning id`);
  const p = await payload(db);
  return ok(!u.error && u.rows.length === 1 && p?.show_spots === false, u.error || JSON.stringify(p));
});
test('P4', 'gedeeld bord bij UIT: show_spots=false en géén posities in het antwoord', async (db) => {
  const a = await active(db);
  await db.exec(`update praatplaten set share_code='PPSHARE1', share_expires_at=now()+interval '1 day' where id='${a.praatplaat_id}';
    insert into submissions(class_id, praatplaat_id, student_name, composition_name, composition_data, position_x, position_y, submitted_at)
    values ('${CLASS}','${a.praatplaat_id}','Sem','Boot','{"tracks":[],"samples":[],"praatplaatPosition":{"x":0.2,"y":0.7}}'::jsonb,0.2,0.7,now());`);
  const r = await as(db, 'anon', `select get_shared_praatplaat('PPSHARE1') v`);
  const v = r.rows[0]?.v; const s = v?.submissions?.[0];
  return ok(!r.error && v.show_spots === false && s && s.position_x === null && s.position_y === null
    && !('praatplaatPosition' in s.composition_data) && Array.isArray(s.composition_data.tracks), r.error || JSON.stringify(s));
});
test('P5', 'klas-album bij UIT: idem, geen posities', async (db) => {
  const a = await active(db);
  await db.exec(`update class_assignments set share_code='ALBSHAR1', share_expires_at=now()+interval '1 day' where id='${a.id}'`);
  const r = await as(db, 'anon', `select get_shared_class_album('ALBSHAR1') v`);
  const v = r.rows[0]?.v; const s = v?.submissions?.[0];
  return ok(!r.error && v.show_spots === false && v.submissions.length === 1 && s.position_x === null
    && !('praatplaatPosition' in s.composition_data), r.error || JSON.stringify(v));
});
test('P6', 'weer AAN: bord en album geven de posities terug (bestaand gedrag)', async (db) => {
  const a = await active(db);
  await as(db, OWNER, `update class_assignments set show_spots=true where id='${a.id}'`);
  const b = (await as(db, 'anon', `select get_shared_praatplaat('PPSHARE1') v`)).rows[0]?.v;
  const c = (await as(db, 'anon', `select get_shared_class_album('ALBSHAR1') v`)).rows[0]?.v;
  const sb = b?.submissions?.[0]; const sc = c?.submissions?.[0];
  return ok(b.show_spots === true && c.show_spots === true && Number(sb.position_x) === 0.2 && Number(sc.position_y) === 0.7
    && sb.composition_data.praatplaatPosition.x === 0.2, JSON.stringify([sb?.position_x, sc?.position_y]));
});
test('P7', 'leskaart zonder preset zet een verborgen opdracht terug op AAN bij opnieuw activeren', async (db) => {
  const a = await active(db);
  await db.exec(`update class_assignments set show_spots=false where id='${a.id}'`);
  const r = await as(db, OWNER, `select activate_lesson_card('${PLAIN}','${CLASS}') v`);
  return ok(!r.error && (await active(db)).show_spots === true, r.error || '');
});
test('S1', '048: de ingebouwde leskaart sinterklaas bestaat, volledig ingesteld', async (db) => {
  const l = await one(db, `select * from lesson_cards where builtin_key='sinterklaas'`);
  sintId = l?.id;
  return ok(l && l.teacher_id === null && l.assignment_type === 'praatplaat' && l.pp_theme_id === 'sinterklaas'
    && l.show_spots === false && l.duration_label === '1 les' && l.pp_image_url === l.cover_image
    && l.card_inline.bullets.length === 4 && l.phases.length === 4, JSON.stringify(l));
});
test('S2', 'één activatie zet alles klaar: praatplaat, thema sinterklaas, plekken UIT, 1 les, leerlingkaart', async (db) => {
  const r = await as(db, OWNER, `select activate_lesson_card('${sintId}','${CLASS}') v`);
  const a = await active(db);
  const card = a.card_id ? await one(db, `select title, bullets from assignment_cards where id='${a.card_id}'`) : null;
  const got = await as(db, 'anon', `select assignment_type, payload, card from get_active_assignment('4827')`);
  const g = got.rows[0];
  return ok(!r.error && a.assignment_type === 'praatplaat' && a.theme_id === 'sinterklaas' && a.show_spots === false
    && a.duration_label === '1 les' && card?.bullets?.[3] === 'Lever in. De klas raadt jouw plek.'
    && g?.payload?.show_spots === false && g?.payload?.duration_label === '1 les' && g?.payload?.theme_id === 'sinterklaas'
    && g?.card?.bullets?.length === 4, r.error || JSON.stringify(a));
});
test('S3', 'opnieuw activeren zet een handmatig getoonde les weer op UIT (de les legt de stand vast)', async (db) => {
  const a = await active(db);
  await db.exec(`update class_assignments set show_spots=true, duration_label='3 lessen' where id='${a.id}'`);
  const r = await as(db, OWNER, `select activate_lesson_card('${sintId}','${CLASS}') v`);
  const b = await active(db);
  return ok(!r.error && b.id === a.id && b.show_spots === false && b.duration_label === '1 les', r.error || JSON.stringify(b));
});
test('S4', 'een andere docent kan de les niet voor deze klas activeren', async (db) => {
  const r = await as(db, OTHER, `select activate_lesson_card('${sintId}','${CLASS}') v`);
  return ok(!!r.error, r.error ? 'geweigerd' : 'toegestaan');
});
test('S5', 'publieke leskaartenlijst (landing) toont de les', async (db) => {
  const r = await as(db, 'anon', `select builtin_key from get_builtin_lesson_cards()`);
  return ok(!r.error && r.rows.some((x) => x.builtin_key === 'sinterklaas'), r.error || JSON.stringify(r.rows));
});

const db = await buildDb({ migrations: [M('036_security_hardening.sql'), M('037_students_type_title.sql'), MIG047, MIG048] });
// Idempotent: beide migraties een tweede keer draaien mag niets breken
await db.exec(readFileSync(MIG047, 'utf8'));
await db.exec(readFileSync(MIG048, 'utf8'));
await db.exec(`
  insert into auth.users(id,email) values ('${OWNER}','audit-eigenaar@example.test'),('${OTHER}','audit-ander@example.test');
  insert into teachers(id,email,display_name) values ('${OWNER}','audit-eigenaar@example.test','Eigenaar'),('${OTHER}','audit-ander@example.test','Ander') on conflict (id) do nothing;
  insert into classes(id, teacher_id, name, code) values ('${CLASS}','${OWNER}','AUDIT-groep 6','4827');
  insert into lesson_cards(id, builtin_key, assignment_type, praatplaat_ref, pp_theme_id, pp_location_id, pp_image_url, title)
    values ('${PLAIN}','audit-plain','praatplaat','pp-audit','basis','pp-audit','/images/audit.jpg','AUDIT-plaat');
`);

const results = [];
for (const t of T) {
  let r;
  try { r = await t.fn(db); } catch (e) { r = { pass: false, msg: 'crash: ' + e.message }; }
  results.push({ ...t, ...r });
}
await db.close();

console.log('\n| ID | Controle (047/048) | Resultaat |');
console.log('|---|---|---|');
for (const r of results) console.log(`| ${r.id} | ${r.label} | ${r.pass ? '✅' : '❌'} ${r.msg} |`);
const failed = results.filter((r) => !r.pass).map((r) => r.id);
console.log('\n047 niet groen:', failed.length ? failed.join(', ') : 'geen');
if (failed.length) process.exitCode = 1;
