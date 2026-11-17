/* ===================================================================
   SoundScout — "Ritme en melodie in de sequencer" (looping, stil)

   Vier acts in één rAF-klok:
     1. Kies             "Wat wil je maken?" → Ritme of Melodie
     2. Ritme            vakjes gaan aan, de teller loopt twee rondes
     3. Melodie          een deuntje op de noten C–B, de teller loopt twee rondes
     4. Op de tijdlijn   beide worden een gestippeld blok dat zich herhaalt

   Elke frame wordt de volledige staat berekend uit t = (now-start) % PERIOD;
   geen setTimeout-ketens (docs/ANIMATIE-RICHTLIJNEN.md).
   Alle zichtbare tekst staat in TEXTS; taal via ?lang=nl|en.
   =================================================================== */

/* ---------------- teksten (NL + EN) ----------------
   Overgenomen uit src/i18n/locales/*.json (melodie.tabs, sequencer.studio,
   sequencer.sequences, samples.boerderij-*) zodat animatie en app hetzelfde zeggen. */
const TEXTS = {
  nl: {
    title: 'SoundScout — Ritme en melodie in de sequencer',
    label: 'Animatie: je kiest ritme of melodie, vult de vakjes en zet het blok op de tijdlijn, waar het zich herhaalt',
    steps: ['Kies', 'Ritme', 'Melodie', 'Op de tijdlijn'],
    ask: 'Wat wil je maken?',
    rhythm: 'Ritme', melody: 'Melodie', done: 'Klaar',
    rhythmChip: 'Ritme 1', melodyChip: 'Melodie 1',
    sounds: ['Hond', 'Kippen', 'Lach'],
  },
  en: {
    title: 'SoundScout — Rhythm and melody in the sequencer',
    label: 'Animation: you choose rhythm or melody, fill the squares and put the block on the timeline, where it repeats',
    steps: ['Choose', 'Rhythm', 'Melody', 'On the timeline'],
    ask: 'What do you want to make?',
    rhythm: 'Rhythm', melody: 'Melody', done: 'Done',
    rhythmChip: 'Rhythm 1', melodyChip: 'Melody 1',
    sounds: ['Dog', 'Chickens', 'Laugh'],
  },
};
const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'nl';
const T = TEXTS[LANG];
document.documentElement.lang = LANG;
document.title = T.title;

/* ---------------- hulpjes ---------------- */
const ICON_GRID = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>';
const ICON_NOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}
function box(e, x, y, w, h) { e.style.left = x + '%'; e.style.top = y + '%'; e.style.width = w + '%'; e.style.height = h + '%'; }
const seg = (t, a, b) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a, b, u) => a + (b - a) * u;

/* ---------------- inhoud ---------------- */
const STEPS = 8;
const RHYTHM = [
  { c: '#FF9800', p: [1, 0, 0, 0, 1, 0, 0, 0] },
  { c: '#E74C3C', p: [0, 0, 1, 0, 0, 0, 1, 1] },
  { c: '#FFC107', p: [0, 0, 0, 1, 0, 0, 0, 0] },
];
const NOTES = ['B', 'A', 'G', 'F', 'E', 'D', 'C'];           // bovenste rij = hoogste noot
const TUNE = [6, 4, 2, 4, 3, 1, 2, null];                    // rij per tel: C E G E F A G –
const MELODY_COLOR = '#0E7490';
const RHYTHM_CHIP = '#F59E0B';

/* ---------------- tijdlijn in getallen (ms) ---------------- */
const CHOOSE1 = [300, 2500], PICK1 = 1700;
const R_IN = 2600, R_FILL = 3000, R_RUN = [5000, 9000], R_DONE = 9300, R_OUT = [9300, 10000];
const CHOOSE2 = [10000, 11500], PICK2 = 10900;
const M_IN = 11600, M_FILL = 12000, M_RUN = [14000, 18000], M_DONE = 18300, M_OUT = [18300, 19000];
const TL_IN = [19000, 19800], PLAY = [21200, 24600], OUT = [25200, 26000];
const PERIOD = 26500, END_STATE = 23000;

/* ---------------- opbouw ---------------- */
const stage = document.getElementById('stage');
stage.setAttribute('aria-label', T.label);
const stepEls = T.steps.map((s) => el('span', 'step', document.getElementById('steps'), s));

// kiezer
const chooser = el('div', 'layer', stage);
el('div', 'ask', chooser, T.ask);
const cardR = el('div', 'card', chooser, ICON_GRID + '<span>' + T.rhythm + '</span>'); cardR.style.left = '17%';
const cardM = el('div', 'card', chooser, ICON_NOTE + '<span>' + T.melody + '</span>'); cardM.style.left = '53%';

// rasters: kolommen van 20% tot 92%, rijen tussen 20% en 80%
const GX = 20, GW = 72, GY = 20, GH = 60, CW = GW / STEPS;
function grid(rows, labelFor, colorFor) {
  const layer = el('div', 'layer', stage), h = GH / rows, cells = [];
  for (let r = 0; r < rows; r++) {
    const lab = labelFor(layer, r);
    lab.style.top = GY + r * h + h * 0.08 + '%'; lab.style.height = h * 0.84 + '%';
    cells.push([]);
    for (let i = 0; i < STEPS; i++) {
      const c = el('div', 'cell', layer);
      box(c, GX + i * CW + CW * 0.06, GY + r * h + h * 0.08, CW * 0.88, h * 0.84);
      c.dataset.color = colorFor(r);
      cells[r].push(c);
    }
  }
  const now = el('div', 'now', layer);
  now.style.top = GY - 1.5 + '%'; now.style.height = GH + 3 + '%'; now.style.width = CW + '%';
  return { layer, cells, now };
}
const gr = grid(RHYTHM.length, (L, r) => { const n = el('div', 'name', L, T.sounds[r]); n.style.background = RHYTHM[r].c; return n; }, (r) => RHYTHM[r].c);
const gm = grid(NOTES.length, (L, r) => el('div', 'note', L, NOTES[r]), () => MELODY_COLOR);
// transform-oorsprong = de plank linksboven, waar het blok terechtkomt
gr.layer.style.transformOrigin = '16% 12%';
gm.layer.style.transformOrigin = '35% 12%';

const done = el('div', 'done', stage, T.done);
const tray = el('div', 'tray', stage);
[10, 56].forEach((y) => { el('div', 'track', tray).style.top = y + '%'; });
function chip(text, color, reps) {
  const c = el('div', 'seqchip', stage, '<span>' + text + '</span>');
  c.style.backgroundColor = color;
  const marks = [];
  for (let k = 1; k < reps; k++) { const m = el('i', '', c); m.style.left = (100 * k) / reps + '%'; marks.push(m); }
  return { c, marks };
}
const chipR = chip(T.rhythmChip, RHYTHM_CHIP, 3);
const chipM = chip(T.melodyChip, MELODY_COLOR, 2);
const playhead = el('div', 'playhead', stage);
const cursor = el('div', 'cursor', stage);

function measure() { stage.style.setProperty('--u', stage.clientWidth / 100 + 'px'); }
measure();
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
else window.addEventListener('resize', measure);

/* plank (boven) en tijdlijn (onder), in % van het podium */
const SHELF = { r: { x: 8, y: 6, w: 16, h: 11 }, m: { x: 27, y: 6, w: 16, h: 11 } };
const TRAY = { y: 44, h: 50 }, TR_H = TRAY.h * 0.32;
const PLACE = {
  r: { x: 9, y: TRAY.y + TRAY.h * 0.10 + TR_H * 0.08, w: 54, h: TR_H * 0.84 },
  m: { x: 37, y: TRAY.y + TRAY.h * 0.56 + TR_H * 0.08, w: 36, h: TR_H * 0.84 },
};

/* ---------------- render ---------------- */
function paintGrid(g, t, tIn, tFill, run, tOut, isOn) {
  const inn = seg(t, tIn, tIn + 400), collapse = ease(seg(t, tOut[0], tOut[1]));
  g.layer.style.opacity = inn * (1 - collapse);
  g.layer.style.transform = 'scale(' + lerp(1, 0.14, collapse) + ')';
  const running = t >= run[0] && t < run[1];
  const step = running ? Math.floor(((t - run[0]) / 500) % STEPS) : -1;
  let k = 0;
  g.cells.forEach((row, r) => row.forEach((c, i) => {
    const on = isOn(r, i);
    const lit = on && t >= tFill + (on ? k++ : 0) * 190;
    c.style.background = lit ? c.dataset.color : '';
    c.style.borderColor = lit ? 'transparent' : '';
    c.style.transform = 'scale(' + (lit && i === step ? 1.14 : 1) + ')';
  }));
  g.now.style.opacity = running ? 1 : 0;
  g.now.style.left = GX + Math.max(0, step) * CW + '%';
}
function paintChip(ch, shelf, place, t, tBorn, order) {
  const born = ease(seg(t, tBorn[0], tBorn[1])), v = ease(seg(t, TL_IN[1] + order * 420, TL_IN[1] + 700 + order * 420));
  box(ch.c, lerp(shelf.x, place.x, v), lerp(shelf.y, place.y, v), lerp(shelf.w, place.w, v), lerp(shelf.h, place.h, v));
  ch.c.style.opacity = born * (1 - seg(t, OUT[0], OUT[1]));
  ch.marks.forEach((m) => { m.style.opacity = v; });
}
function render(t) {
  const out = 1 - seg(t, OUT[0], OUT[1]);
  // kiezer (twee keer: eerst ritme, dan melodie)
  const first = t < CHOOSE2[0], win = first ? CHOOSE1 : CHOOSE2, pick = first ? PICK1 : PICK2;
  chooser.style.opacity = seg(t, win[0], win[0] + 350) * (1 - seg(t, win[1] - 350, win[1]));
  cardR.classList.toggle('on', first && t >= pick);
  cardM.classList.toggle('on', !first && t >= pick);

  paintGrid(gr, t, R_IN, R_FILL, R_RUN, R_OUT, (r, i) => !!RHYTHM[r].p[i]);
  paintGrid(gm, t, M_IN, M_FILL, M_RUN, M_OUT, (r, i) => TUNE[i] === r);

  const doneOn = (t >= R_IN + 400 && t < R_OUT[0] + 250) || (t >= M_IN + 400 && t < M_OUT[0] + 250);
  const press = Math.max(seg(t, R_DONE - 60, R_DONE) * (1 - seg(t, R_DONE, R_DONE + 220)), seg(t, M_DONE - 60, M_DONE) * (1 - seg(t, M_DONE, M_DONE + 220)));
  done.style.opacity = doneOn ? 1 : 0;
  done.style.transform = 'translateY(' + press * 0.35 + 'em)';

  tray.style.opacity = ease(seg(t, TL_IN[0], TL_IN[1])) * out;
  paintChip(chipR, SHELF.r, PLACE.r, t, R_OUT, 0);
  paintChip(chipM, SHELF.m, PLACE.m, t, M_OUT, 1);
  playhead.style.left = lerp(8.5, 91.5, seg(t, PLAY[0], PLAY[1])) + '%';
  playhead.style.top = TRAY.y + 2 + '%';
  playhead.style.height = TRAY.h - 4 + '%';
  playhead.style.opacity = t >= PLAY[0] - 250 && t < PLAY[1] + 300 ? out : 0;

  // de vinger: kaart → Klaar → kaart → Klaar
  const P = [[50, 66, 0], [32, 66, PICK1], [84, 90, R_DONE], [68, 66, PICK2], [84, 90, M_DONE]];
  let cx = P[0][0], cy = P[0][1], tap = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i][2], m = ease(seg(t, a - 800, a - 80));
    if (t >= a - 800) { cx = lerp(P[i - 1][0], P[i][0], m); cy = lerp(P[i - 1][1], P[i][1], m); }
    const d = seg(t, a - 80, a + 160); if (d > 0 && d < 1) tap = Math.sin(Math.PI * d);
  }
  cursor.style.left = cx + '%'; cursor.style.top = cy + '%';
  cursor.style.transform = 'translate(-50%,-50%) scale(' + (1 - 0.28 * tap) + ')';
  const busy = (t > PICK1 + 500 && t < R_DONE - 900) || (t > PICK2 + 500 && t < M_DONE - 900) || t > M_DONE + 500;
  cursor.style.opacity = busy ? 0 : seg(t, 300, 700);

  const step = t < R_IN ? 0 : t < CHOOSE2[0] ? 1 : t < CHOOSE2[1] ? 0 : t < TL_IN[0] ? 2 : 3;
  stepEls.forEach((sp, i) => sp.classList.toggle('on', i === step));
}

/* ---------------- één rAF-klok ---------------- */
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  render(END_STATE);
} else {
  let start = null;
  const loop = (now) => {
    if (start === null) start = now;
    render((now - start) % PERIOD);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
