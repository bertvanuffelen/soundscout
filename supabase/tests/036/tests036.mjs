// Testsuite migratie 036 — draait op een PGlite-replica van de productiedefinities.
import { buildDb } from './harness.mjs';
const R = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const MIG = `${R}/migrations/036_security_hardening.sql`;
const RB = `${R}/rollbacks/036_security_hardening_rollback.sql`;

const A = 'aaaaaaaa-0000-4000-8000-00000000000a', B = 'bbbbbbbb-0000-4000-8000-00000000000b';
const CA = 'ca000000-0000-4000-8000-0000000000ca', CB = 'cb000000-0000-4000-8000-0000000000cb';
const lit = (v) => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

async function as(db, who, sql) {
  const claims = who === 'anon' ? { role: 'anon' } : { role: 'authenticated', sub: who };
  const role = who === 'anon' ? 'anon' : 'authenticated';
  try {
    const res = await db.exec(`begin; set local role ${role}; set local request.jwt.claims = ${lit(JSON.stringify(claims))}; ${sql}; commit;`);
    return { rows: res[res.length - 2]?.rows ?? [], error: null };
  } catch (e) { try { await db.exec('rollback'); } catch {} return { rows: [], error: e.message }; }
}

// Werkt op beide vormen van v2 (oud: 2 kolommen, nieuw: + save_secret)
async function submitV2(db, code, clientId, name, secret) {
  const hasSecretParam = (await db.query(`select count(*)::int n from pg_proc where proname='submit_or_update_composition_v2' and pronargs=11`)).rows[0].n > 0;
  const extra = hasSecretParam && secret !== undefined ? `, p_save_secret := ${lit(secret)}` : '';
  return as(db, 'anon', `select * from submit_or_update_composition_v2(p_class_code := ${lit(code)}, p_student_name := 'AUDIT-leerling', p_composition_name := ${lit(name)}, p_composition_data := '{"tracks":[]}'::jsonb, p_client_id := ${lit(clientId)}, p_assignment_type := 'free', p_assignment_ref := 'basis'${extra})`);
}

async function seed(db) {
  await db.exec(`
    insert into auth.users(id,email) values ('${A}','audit-docent-a@example.test'),('${B}','audit-docent-b@example.test');
    insert into classes(id,teacher_id,name,code) values ('${CA}','${A}','AUDIT-klas-A','1111'),('${CB}','${B}','AUDIT-klas-B','2222');
    insert into feedback_cards(teacher_id,builtin_key,title,chips) values (null,'standaard','AUDIT-standaard',array['Ritme','Sfeer']);
    insert into templates(teacher_id,name,code,composition_data,is_active) values ('${A}','AUDIT-template','TMPLAAAA','{}'::jsonb,true);
    insert into lesson_cards(teacher_id,builtin_key,assignment_type,free_theme_id,title,card_inline) values (null,'audit-lc','free','winter','AUDIT-leskaart','{"title":"AUDIT","bullets":["a"]}'::jsonb);
  `);
  await as(db, A, `select activate_assignment('${CA}', null, null, null, null, 'basis')`);
  await as(db, B, `select activate_assignment('${CB}', null, null, null, null, 'basis')`);
}

const T = [];
const test = (id, label, fn) => T.push({ id, label, fn });
const ok = (cond, msg = '') => ({ pass: !!cond, msg });

// ---- Beveiliging (verwacht: dicht na 036) ----
test('T1', 'anon kan klassen niet opsommen', async (db) => {
  const r = await as(db, 'anon', `select count(*)::int n from classes`); return ok(r.rows[0]?.n === 0, `zag ${r.rows[0]?.n}`);
});
test('T2', 'anon kan niet direct in submissions schrijven', async (db) => {
  const r = await as(db, 'anon', `insert into submissions(class_id,student_name,composition_name,composition_data) values ('${CA}','AUDIT-x','AUDIT-x','{}')`);
  return ok(!!r.error, r.error ? 'geweigerd' : 'toegestaan');
});
test('T3a', 'bestaande inzending niet bij te werken vanuit een andere klascode', async (db) => {
  const v = await submitV2(db, '1111', 'aaaa0001-0000-4000-8000-000000000001', 'AUDIT-origineel');
  const r = await submitV2(db, '2222', 'aaaa0001-0000-4000-8000-000000000001', 'AUDIT-gewijzigd');
  const now = (await db.query(`select composition_name n from submissions where id='aaaa0001-0000-4000-8000-000000000001'`)).rows[0]?.n;
  return ok(!v.error && now === 'AUDIT-origineel', `stand: ${now}`);
});
test('T3b', 'bestaande inzending niet bij te werken zonder geheim (zelfde klas); geen bewaarcode terug', async (db) => {
  await submitV2(db, '1111', 'aaaa0002-0000-4000-8000-000000000002', 'AUDIT-origineel');
  const r = await submitV2(db, '1111', 'aaaa0002-0000-4000-8000-000000000002', 'AUDIT-gewijzigd');
  const now = (await db.query(`select composition_name n from submissions where id='aaaa0002-0000-4000-8000-000000000002'`)).rows[0]?.n;
  return ok(now === 'AUDIT-origineel' && !(r.rows[0]?.save_code), `stand: ${now}, code terug: ${r.rows[0]?.save_code ? 'ja' : 'nee'}`);
});
test('T3d', 'bestaande inzending niet bij te werken met een fout geheim', async (db) => {
  await submitV2(db, '1111', 'aaaa0004-0000-4000-8000-000000000004', 'AUDIT-origineel');
  await submitV2(db, '1111', 'aaaa0004-0000-4000-8000-000000000004', 'AUDIT-gewijzigd', 'fout-geheim');
  const now = (await db.query(`select composition_name n from submissions where id='aaaa0004-0000-4000-8000-000000000004'`)).rows[0]?.n;
  return ok(now === 'AUDIT-origineel', `stand: ${now}`);
});
test('T4', 'docent B kan geen opdracht in klas A zetten', async (db) => {
  const r = await as(db, B, `insert into class_assignments(class_id,teacher_id,assignment_type,free_theme_id,is_active) values ('${CA}','${B}','free','audit-kaap',true)`);
  const active = (await db.query(`select free_theme_id f from class_assignments where class_id='${CA}' and is_active`)).rows[0]?.f;
  return ok(!!r.error && active === 'basis', `actief in klas A: ${active}`);
});
test('T4b', 'docent B kan geen praatplaat aan klas A hangen', async (db) => {
  const r = await as(db, B, `insert into praatplaten(class_id,teacher_id,name,theme_id,location_id,image_url) values ('${CA}','${B}','AUDIT','t','l','/x.jpg')`);
  return ok(!!r.error);
});
test('T5', 'docent B kan eigen opdracht niet naar klas A verhangen', async (db) => {
  const r = await as(db, B, `update class_assignments set class_id='${CA}' where teacher_id='${B}' returning id`);
  return ok(!!r.error || r.rows.length === 0, r.error ? 'geweigerd' : `${r.rows.length} rijen`);
});

test('T4c', 'docent B kan geen opdracht zetten in een klas ZONDER actieve opdracht', async (db) => {
  await as(db, A, `select deactivate_class_assignment('${CA}')`);
  const r = await as(db, B, `insert into class_assignments(class_id,teacher_id,assignment_type,free_theme_id,is_active) values ('${CA}','${B}','free','audit-kaap',true)`);
  const active = (await db.query(`select teacher_id t from class_assignments where class_id='${CA}' and is_active`)).rows[0]?.t;
  await as(db, A, `select activate_assignment('${CA}', null, null, null, null, 'basis')`);
  return ok(!!r.error, active ? `actief van ${active === B ? 'docent B' : 'docent A'}` : 'geen actieve');
});
test('T5b', 'docent B kan een inactieve eigen opdracht niet naar klas A verhangen', async (db) => {
  await as(db, B, `insert into class_assignments(class_id,teacher_id,assignment_type,storyboard_ref,is_active) values ('${CB}','${B}','storyboard','audit-sb',false)`);
  const r = await as(db, B, `update class_assignments set class_id='${CA}' where teacher_id='${B}' and storyboard_ref='audit-sb' returning id`);
  return ok(!!r.error || r.rows.length === 0, r.error ? 'geweigerd' : `${r.rows.length} rij verhangen`);
});
test('T6', 'check_rate_limit niet publiek aanroepbaar', async (db) => {
  const a = await as(db, 'anon', `select check_rate_limit('x','y',1,60)`);
  const b = await as(db, A, `select check_rate_limit('x','y',1,60)`);
  return ok(!!a.error && !!b.error);
});
test('T6b', 'code-generatoren en v1-functies niet anoniem aanroepbaar', async (db) => {
  const fns = [`generate_save_code()`, `generate_save_secret()`, `generate_share_code_v2()`, `generate_class_code()`, `generate_template_code()`,
    `submit_peer_feedback('${CA}','${CB}',array['x'])`,
    `submit_or_update_composition('1111','x','x','{}'::jsonb)`];
  const open = [];
  for (const f of fns) { const r = await as(db, 'anon', `select ${f}`); if (!r.error) open.push(f.split('(')[0]); }
  return ok(open.length === 0, open.length ? 'open: ' + open.join(', ') : 'alle dicht');
});
test('T7', '35× opdracht ophalen voor één klas binnen een minuut lukt', async (db) => {
  let fails = 0;
  for (let i = 0; i < 35; i++) { const r = await as(db, 'anon', `select * from get_active_assignment('1111')`); if (r.error) fails++; }
  return ok(fails === 0, `${fails} geweigerd`);
});
test('T9', 'anon kan templates niet opsommen', async (db) => {
  const r = await as(db, 'anon', `select count(*)::int n from templates`); return ok(r.rows[0]?.n === 0, `zag ${r.rows[0]?.n}`);
});
test('T11', 'docent B kan album van klas A niet delen', async (db) => {
  const id = (await db.query(`select id from class_assignments where class_id='${CA}' and is_active`)).rows[0].id;
  const r = await as(db, B, `select share_class_album('${id}')`); return ok(!!r.error);
});
test('T12', 'leerling-e-mail wordt niet opgeslagen of teruggegeven', async (db) => {
  const s = await as(db, 'anon', `select * from save_composition_online('AUDIT-leerling','AUDIT','{"tracks":[]}'::jsonb, null, 'kind@example.test')`);
  const code = s.rows[0]?.save_code;
  const stored = (await db.query(`select student_email e from submissions where save_code=${lit(code)}`)).rows[0]?.e;
  const l = await as(db, 'anon', `select student_email from load_saved_composition(${lit(code)})`);
  return ok(!s.error && stored == null && l.rows[0]?.student_email == null, `opgeslagen: ${stored ?? 'niets'}`);
});

test('T13', 'schuilnaam van een klas-inzending blijft vast bij bijwerken', async (db) => {
  const id = 'aaaa0006-0000-4000-8000-000000000006';
  const first = await as(db, 'anon', `select * from submit_or_update_composition_v2(p_class_code := '1111', p_student_name := 'Zingende Zeehond', p_composition_name := 'AUDIT', p_composition_data := '{"tracks":[]}'::jsonb, p_client_id := '${id}', p_assignment_type := 'free', p_assignment_ref := 'basis')`);
  const secret = first.rows[0]?.save_secret ?? null;
  const extra = secret ? `, p_save_secret := ${lit(secret)}` : '';
  await as(db, 'anon', `select * from submit_or_update_composition_v2(p_class_code := '1111', p_student_name := 'Dansende Das', p_composition_name := 'AUDIT-2', p_composition_data := '{"tracks":[]}'::jsonb, p_client_id := '${id}', p_assignment_type := 'free', p_assignment_ref := 'basis'${extra})`);
  const row = (await db.query(`select student_name n, composition_name c from submissions where id='${id}'`)).rows[0];
  return ok(row?.n === 'Zingende Zeehond' && row?.c === 'AUDIT-2', `naam: ${row?.n}, titel: ${row?.c}`);
});

// ---- Regressie (moet altijd werken) ----
test('R1', 'leerling: nieuwe inzending geeft id + bewaarcode (+ geheim na 036)', async (db) => {
  const r = await submitV2(db, '1111', 'aaaa0003-0000-4000-8000-000000000003', 'AUDIT-nieuw');
  return ok(!r.error && r.rows[0]?.submission_id && r.rows[0]?.save_code, r.error || `geheim terug: ${r.rows[0]?.save_secret ? 'ja' : 'nee'}`);
});
test('R2', 'leerling: eigen inzending bijwerken (met geheim na 036)', async (db) => {
  const id = 'aaaa0005-0000-4000-8000-000000000005';
  const first = await submitV2(db, '1111', id, 'AUDIT-v1');
  const secret = first.rows[0]?.save_secret ?? undefined;
  const r = await submitV2(db, '1111', id, 'AUDIT-v2', secret);
  const now = (await db.query(`select composition_name n, count(*) over () c from submissions where id='${id}'`)).rows[0];
  return ok(!r.error && now?.n === 'AUDIT-v2' && r.rows[0]?.save_code, r.error || `stand: ${now?.n}`);
});
test('R3', 'docent A ziet eigen klas, maakt klascode en klas aan', async (db) => {
  const c = await as(db, A, `select count(*)::int n from classes where teacher_id='${A}'`);
  const g = await as(db, A, `select generate_class_code() code`);
  const i = await as(db, A, `insert into classes(teacher_id,name,code) values ('${A}','AUDIT-klas-A2',${lit(g.rows[0]?.code)})`);
  return ok(c.rows[0]?.n === 1 && !g.error && !i.error, g.error || i.error || '');
});
test('R4', 'docent A: opdrachtsoorten activeren in eigen klas (RPC)', async (db) => {
  const s = await as(db, A, `select activate_assignment('${CA}', null, null, 'verspringen', null, null)`);
  const p = await as(db, A, `select activate_praatplaat_from_catalog('${CA}','AUDIT-pp','basis','speeltuin','/images/x.jpg', null)`);
  const l = await as(db, A, `select activate_lesson_card((select id from lesson_cards where builtin_key='audit-lc'), '${CA}')`);
  const f = await as(db, A, `select activate_assignment('${CA}', null, null, null, null, 'basis')`);
  return ok(!s.error && !p.error && !l.error && !f.error, s.error || p.error || l.error || f.error || '');
});
test('R5', 'docent A: tijdsduur/kaart op eigen actieve opdracht wijzigen (REST-update)', async (db) => {
  const r = await as(db, A, `update class_assignments set duration_label='2 lessen' where class_id='${CA}' and is_active returning id`);
  return ok(!r.error && r.rows.length === 1, r.error || `${r.rows.length} rijen`);
});
test('R6', 'docent A: album delen; anon opent album', async (db) => {
  const id = (await db.query(`select id from class_assignments where class_id='${CA}' and is_active`)).rows[0].id;
  const s = await as(db, A, `select share_class_album('${id}') code`);
  const g = await as(db, 'anon', `select get_shared_class_album(${lit(s.rows[0]?.code)}) a`);
  const n = g.rows[0]?.a?.submissions?.length;
  return ok(!s.error && !g.error && n >= 1, s.error || g.error || `${n} inzendingen`);
});
test('R7', 'peer review: batch ophalen en sterren geven', async (db) => {
  const id = (await db.query(`select id from class_assignments where class_id='${CA}' and is_active`)).rows[0].id;
  const e = await as(db, A, `select set_assignment_peer_review('${id}', true, null, null)`);
  const own = 'aaaa0003-0000-4000-8000-000000000003';
  const b = await as(db, 'anon', `select * from get_peer_review_batch('1111','${own}',3)`);
  const tgt = b.rows[0]?.submission_id ?? b.rows[0]?.id;
  const s = await as(db, 'anon', `select submit_peer_feedback_v2('${own}','${tgt}','{"Ritme":3}'::jsonb)`);
  return ok(!e.error && !b.error && tgt && !s.error, e.error || b.error || s.error || '');
});
test('R8', 'bewaarcode: opslaan, claimen en bijwerken', async (db) => {
  const s = await as(db, 'anon', `select * from save_composition_online('AUDIT-leerling','AUDIT-b','{"tracks":[]}'::jsonb, null, null)`);
  const code = s.rows[0]?.save_code;
  const c = await as(db, 'anon', `select claim_saved_composition(${lit(code)}, 'AUDIT-leerling') s`);
  const u = await as(db, 'anon', `select update_saved_composition(${lit(code)}, ${lit(c.rows[0]?.s)}, '{"tracks":[]}'::jsonb, 'AUDIT-b2')`);
  return ok(!s.error && !c.error && !u.error, s.error || c.error || u.error || '');
});
test('R9', 'publieke RPC\'s: klas/template op code, telling, oud inleverpad', async (db) => {
  const a = await as(db, 'anon', `select * from get_class_by_code('1111')`);
  const t = await as(db, 'anon', `select * from get_template_by_code('TMPLAAAA')`);
  const u = await as(db, 'anon', `select log_usage_event('app_start')`);
  const s = await as(db, 'anon', `select submit_composition('1111','AUDIT','AUDIT-oud','{"tracks":[]}'::jsonb)`);
  return ok(a.rows.length === 1 && t.rows.length === 1 && !u.error && !s.error, a.error || t.error || u.error || s.error || '');
});
test('R10', 'docent: eigen inzendingen lezen/feedback/verwijderen; vreemde docent niet', async (db) => {
  const a = await as(db, A, `select count(*)::int n from submissions where class_id='${CA}'`);
  const b = await as(db, B, `select count(*)::int n from submissions where class_id='${CA}'`);
  const sid = 'aaaa0003-0000-4000-8000-000000000003';
  const fa = await as(db, A, `select set_submission_feedback('${sid}','star',2::smallint,'AUDIT goed')`);
  const fb = await as(db, B, `select set_submission_feedback('${sid}','star',1::smallint,'AUDIT')`);
  const st = await as(db, A, `select * from get_peer_stars_for_class('${CA}')`);
  const d = await as(db, A, `delete from submissions where id='aaaa0004-0000-4000-8000-000000000004' returning id`);
  return ok(a.rows[0]?.n > 0 && b.rows[0]?.n === 0 && !fa.error && !!fb.error && !st.error && d.rows.length === 1,
    `A ziet ${a.rows[0]?.n}, B ziet ${b.rows[0]?.n}`);
});
test('R11', 'praatplaat zonder klas en in eigen klas aanmaken', async (db) => {
  const a = await as(db, A, `insert into praatplaten(class_id,teacher_id,name,theme_id,location_id,image_url) values (null,'${A}','AUDIT','t','l','/a.jpg')`);
  const b = await as(db, A, `insert into praatplaten(class_id,teacher_id,name,theme_id,location_id,image_url) values ('${CA}','${A}','AUDIT','t','l','/b.jpg')`);
  return ok(!a.error && !b.error, a.error || b.error || '');
});
test('R12', 'nachtelijke opruiming draait', async (db) => {
  const r = await db.query(`select cleanup_expired_data() j`); return ok(!!r.rows[0]?.j, JSON.stringify(r.rows[0]?.j));
});

async function run(label, migrations) {
  const db = await buildDb({ migrations });
  await seed(db);
  const out = {};
  for (const t of T) {
    try { out[t.id] = await t.fn(db); } catch (e) { out[t.id] = { pass: false, msg: 'crash: ' + e.message }; }
  }
  await db.close();
  return out;
}

const base = await run('productie', []);
const mig = await run('na 036', [MIG]);
const rb = await run('na rollback', [MIG, RB]);
const sym = (r) => (r.pass ? '✅' : '❌');
console.log('| ID | Controle | productie nu | na 036 | na rollback |');
console.log('|---|---|---|---|---|');
for (const t of T) console.log(`| ${t.id} | ${t.label} | ${sym(base[t.id])} ${base[t.id].msg} | ${sym(mig[t.id])} ${mig[t.id].msg} | ${sym(rb[t.id])} ${rb[t.id].msg} |`);
const failMig = T.filter((t) => !mig[t.id].pass).map((t) => t.id);
console.log('\nNa 036 niet groen:', failMig.length ? failMig.join(', ') : 'geen');
