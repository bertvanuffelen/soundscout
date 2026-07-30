/* ===================================================================
   SoundScout — "Zo werkt de sequencer" (looping uitleg-animatie)

   Vier acts in één rAF-klok:
     1. het lege raster verschijnt (3 sporen x 16 vakjes)
     2. de muis klikt vakjes aan — per spoor een eigen okertint
     3. de afspeellijn loopt twee rondes: het patroon herhaalt zichzelf
     4. het patroon wordt een blokje dat naar de tijdlijn gaat en uitrekt

   Elke frame wordt de volledige staat berekend uit t = (now-start) % PERIOD;
   geen setTimeout-ketens, dus na een tab-wissel verschijnt er niets in één klap.
   Alle zichtbare tekst staat in TEXTS; taal via ?lang=nl|en.
   =================================================================== */

/* ---------------- inline Lucide-iconen (currentColor) ---------------- */
const IC = {
  'grid-3x3':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
  'drum':'<path d="m2 2 8 8"/><path d="m22 2-8 8"/><ellipse cx="12" cy="9" rx="10" ry="5"/><path d="M7 13.4v7.9"/><path d="M12 14v8"/><path d="M17 13.4v7.9"/><path d="M2 9v8a10 5 0 0 0 20 0V9"/>',
  'waves':'<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>',
  'bird':'<path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/>',
  'mouse':'<path d="M12.586 12.586 19 19"/><path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z"/>'
};
function svg(name, extra){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
         'stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + IC[name] + '</svg>';
}

/* ---------------- teksten (NL + EN) ----------------
   Alle zichtbare tekst staat hier, nergens anders in dit bestand. De taal komt
   uit de URL: ?lang=en -> Engels, anders Nederlands. De geluidsnamen zijn
   overgenomen uit src/i18n/locales/*.json zodat animatie en app hetzelfde zeggen. */
const TEXTS = {
  nl: {
    title: 'SoundScout — Zo werkt de sequencer',
    kicker: 'Sequencer',
    heading: 'Bouw een ritme dat zichzelf herhaalt',
    hint: '1 vakje = 1 tel',
    timeline: 'Tijdlijn',
    clip: 'Sequence 1',
    sounds: { drum: 'Trommel', water: 'Water', vogel: 'Vogel' },
    caps: [
      'Kies per spoor een geluid uit je bibliotheek',
      'Klik vakjes aan: daar klinkt het geluid',
      'Het patroon loopt rond en herhaalt zichzelf',
      'Sleep je sequence naar de tijdlijn en rek hem uit'
    ]
  },
  en: {
    title: 'SoundScout — How the sequencer works',
    kicker: 'Sequencer',
    heading: 'Build a rhythm that repeats itself',
    hint: '1 cell = 1 beat',
    timeline: 'Timeline',
    clip: 'Sequence 1',
    sounds: { drum: 'Drum', water: 'Water', vogel: 'Bird' },
    caps: [
      'Pick a sound from your library for each track',
      'Click cells: that is where the sound plays',
      'The pattern loops round and repeats itself',
      'Drag your sequence onto the timeline and stretch it'
    ]
  }
};
const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'nl';
const T = TEXTS[LANG];
document.documentElement.lang = LANG;
document.title = T.title;

/* ---------------- data ----------------
   Drie sporen met elk een eigen tint uit het sequencer-palet en de vakjes
   die de "leerling" aanklikt (0-gebaseerd, 16 vakjes = 4 maten). */
const COLS = 16;
const ROWS = [
  { label: T.sounds.drum,  color: '#F59E0B', icon: 'drum',  steps: [0, 4, 8, 12] },
  { label: T.sounds.water, color: '#B45309', icon: 'waves', steps: [2, 6, 10, 14] },
  { label: T.sounds.vogel, color: '#FBBF24', icon: 'bird',  steps: [0, 9] }
];

/* ---------------- DOM opbouwen ---------------- */
const film    = document.getElementById('film');
const rowsEl  = document.getElementById('rows');
const seqarea = document.getElementById('seqarea');
const ph      = document.getElementById('ph');
const mouse   = document.getElementById('mouse');
const bundle  = document.getElementById('bundle');
const tlgrid  = document.getElementById('tlgrid');
const tlclip  = document.getElementById('tlclip');
const cap     = document.getElementById('cap');

document.getElementById('headIcon').innerHTML   = svg('grid-3x3');
document.getElementById('headKicker').textContent = T.kicker;
document.getElementById('headTitle').textContent  = T.heading;
document.getElementById('headHint').textContent   = T.hint;
document.getElementById('tlKicker').textContent   = T.timeline;
mouse.innerHTML  = svg('mouse', ' fill="#ffffff" stroke="#243244" stroke-width="1.6"');
bundle.innerHTML = svg('grid-3x3') + '<span>' + T.clip + '</span>';
tlclip.innerHTML = svg('grid-3x3') + '<span>' + T.clip + '</span>';

const pills = [];
const cells = [];   // cells[rij][kolom]
ROWS.forEach((row) => {
  const wrap = document.createElement('div');
  wrap.className = 'seqrow';

  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.innerHTML =
    '<span class="dot" style="background:' + row.color + '"></span>' +
    svg(row.icon) +
    '<span>' + row.label + '</span>';
  wrap.appendChild(pill);
  pills.push(pill);

  const cellWrap = document.createElement('div');
  cellWrap.className = 'cells';
  const rowCells = [];
  for (let c = 0; c < COLS; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (c % 4 === 0 && c > 0 ? ' bar' : '');
    cellWrap.appendChild(cell);
    rowCells.push(cell);
  }
  cells.push(rowCells);
  wrap.appendChild(cellWrap);
  rowsEl.appendChild(wrap);
});

/* De klikvolgorde: spoor voor spoor, vakje voor vakje. */
const CLICKS = [];
ROWS.forEach((row, r) => row.steps.forEach((c) => CLICKS.push({ r, c })));

/* ---------------- tijdlijn (ms) ----------------
   Vier acts; PERIOD is de som. Elke element-staat is een pure functie van t. */
const T_INTRO     = 450;                                    // lege kaart
const ROW_STAG    = 300;                                    // stagger per spoor
const APP         = 460;                                    // duur pop-in
const ROWS_END    = T_INTRO + (ROWS.length - 1) * ROW_STAG + APP;

const CLICK_START = ROWS_END + 350;
const CLICK_STAG  = 235;                                    // tijd tussen twee kliks
const CLICK_POP   = 300;                                    // duur van één vakje-pop
const CLICKS_END  = CLICK_START + (CLICKS.length - 1) * CLICK_STAG + CLICK_POP;

const PLAY_START  = CLICKS_END + 450;
const SWEEP       = 2100;                                   // één ronde door het raster
const ROUNDS      = 2;                                      // twee rondes = "het herhaalt"
const PLAY_END    = PLAY_START + SWEEP * ROUNDS;

const BUNDLE_APP  = PLAY_END + 250;                         // blokje verschijnt
const BUNDLE_DUR  = 420;
const DRAG_START  = BUNDLE_APP + BUNDLE_DUR + 250;
const DRAG_DUR    = 950;                                    // slepen naar de tijdlijn
const STRETCH_ST  = DRAG_START + DRAG_DUR + 200;
const STRETCH_DUR = 850;                                    // uitrekken (patroon herhaalt)
const HOLD        = 1150;                                   // eindbeeld vasthouden
const FADE        = 500;                                    // alles uitfaden
const END_PAUSE   = 700;
const PERIOD      = STRETCH_ST + STRETCH_DUR + HOLD + FADE + END_PAUSE;

/* Onderschriften: [vanaf, tot, index in T.caps] */
const CAPS = [
  [T_INTRO,     CLICK_START,            0],
  [CLICK_START, PLAY_START,             1],
  [PLAY_START,  BUNDLE_APP,             2],
  [BUNDLE_APP,  STRETCH_ST + STRETCH_DUR + HOLD, 3]
];

const easeOut   = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const clamp01   = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------------- posities meten ----------------
   De muis en het zwevende blokje staan absoluut in .film; de doelposities
   komen uit getBoundingClientRect zodat alles meeschaalt met de breedte. */
let POS = { clicks: [], bundleFrom: { x: 0, y: 0 }, bundleTo: { x: 0, y: 0 }, tl: { x: 0, y: 0, w: 0 } };

function centerIn(el, host) {
  const a = el.getBoundingClientRect();
  const b = host.getBoundingClientRect();
  return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
}

function measure() {
  POS.clicks = CLICKS.map(({ r, c }) => centerIn(cells[r][c], film));
  const seqBox = seqarea.getBoundingClientRect();
  const filmBox = film.getBoundingClientRect();
  const tlBox  = tlgrid.getBoundingClientRect();
  POS.bundleFrom = {
    x: seqBox.left - filmBox.left + seqBox.width * 0.5,
    y: seqBox.top - filmBox.top + seqBox.height * 0.5
  };
  POS.bundleTo = {
    x: tlBox.left - filmBox.left + tlBox.width * 0.22,
    y: tlBox.top - filmBox.top + tlBox.height * 0.5
  };
  POS.tl = { x: tlBox.left - filmBox.left, y: tlBox.top - filmBox.top, w: tlBox.width };
}

/* ---------------- render ---------------- */
function render(t) {
  const fadeStart = STRETCH_ST + STRETCH_DUR + HOLD;
  const globalFade = t > fadeStart ? 1 - clamp01((t - fadeStart) / FADE) : 1;

  // --- act 1: spoor-pills + lege vakjes ---
  for (let r = 0; r < ROWS.length; r++) {
    const aStart = T_INTRO + r * ROW_STAG;
    const p = clamp01((t - aStart) / APP);
    const e = easeOut(p);
    pills[r].style.opacity = (p > 0 ? clamp01(p * 1.6) : 0) * globalFade;
    pills[r].style.transform = 'translateY(' + (8 * (1 - e)) + 'px) scale(' + (0.94 + 0.06 * e) + ')';

    for (let c = 0; c < COLS; c++) {
      const cellStart = aStart + 60 + c * 12;              // vakjes rollen kort in
      const cp = clamp01((t - cellStart) / 260);
      const ce = easeOut(cp);
      const cell = cells[r][c];

      // is dit vakje aangeklikt, en zo ja: wanneer?
      const idx = CLICKS.findIndex((k) => k.r === r && k.c === c);
      const clickAt = idx >= 0 ? CLICK_START + idx * CLICK_STAG : Infinity;
      const on = t >= clickAt;

      let bg = '#ffffff', border = '#e3e6ea', scale = 0.9 + 0.1 * ce, lift = 0;

      if (on) {
        const pop = clamp01((t - clickAt) / CLICK_POP);
        const pe = easeOut(pop);
        bg = ROWS[r].color;
        border = ROWS[r].color;
        scale = 0.82 + 0.18 * pe + 0.14 * Math.sin(pop * Math.PI);   // klik-overshoot
      }

      // afspeellijn passeert: aangeklikte vakjes lichten op
      if (on && t >= PLAY_START && t <= PLAY_END) {
        const inRound = (t - PLAY_START) % SWEEP;
        const hitAt = (c / COLS) * SWEEP;
        const d = inRound - hitAt;
        if (d >= 0 && d < 340) {
          const s = Math.sin((d / 340) * Math.PI);
          scale = 1 + 0.22 * s;
          lift = -3 * s;
        }
      }

      cell.style.opacity = (cp > 0 ? 1 : 0) * globalFade;
      cell.style.background = bg;
      cell.style.borderColor = border;
      cell.style.transform = 'translateY(' + (lift + 6 * (1 - ce)) + 'px) scale(' + scale + ')';
    }
  }

  // --- act 3: afspeellijn (twee rondes) ---
  if (t >= PLAY_START && t <= PLAY_END) {
    const inRound = (t - PLAY_START) % SWEEP;
    ph.style.opacity = String(globalFade);
    ph.style.left = (inRound / SWEEP) * 100 + '%';
  } else if (t > PLAY_END && t < PLAY_END + 300) {
    ph.style.opacity = String((1 - (t - PLAY_END) / 300) * globalFade);
  } else {
    ph.style.opacity = '0';
  }

  // --- act 4: blokje verschijnt, wordt gesleept en rekt uit ---
  let bOp = 0, bx = POS.bundleFrom.x, by = POS.bundleFrom.y, bSc = 0.9;
  if (t >= BUNDLE_APP && t < DRAG_START) {
    const p = clamp01((t - BUNDLE_APP) / BUNDLE_DUR);
    const e = easeOut(p);
    bOp = clamp01(p * 1.6);
    bSc = 0.82 + 0.18 * e + 0.08 * Math.sin(p * Math.PI);
  } else if (t >= DRAG_START && t < DRAG_START + DRAG_DUR) {
    const p = easeInOut(clamp01((t - DRAG_START) / DRAG_DUR));
    bOp = 1; bSc = 1;
    bx = POS.bundleFrom.x + (POS.bundleTo.x - POS.bundleFrom.x) * p;
    by = POS.bundleFrom.y + (POS.bundleTo.y - POS.bundleFrom.y) * p;
  } else if (t >= DRAG_START + DRAG_DUR && t < DRAG_START + DRAG_DUR + 200) {
    // landen: blokje verdwijnt, de clip op de tijdlijn neemt het over
    bOp = 1 - clamp01((t - DRAG_START - DRAG_DUR) / 200);
    bx = POS.bundleTo.x; by = POS.bundleTo.y; bSc = 1 - 0.06 * (1 - bOp);
  }
  bundle.style.opacity = String(bOp * globalFade);
  bundle.style.transform =
    'translate(' + (bx - bundle.offsetWidth / 2) + 'px,' + (by - bundle.offsetHeight / 2) + 'px) scale(' + bSc + ')';

  // clip op de tijdlijn: verschijnt bij de landing, rekt daarna uit
  const landed = DRAG_START + DRAG_DUR;
  if (t >= landed) {
    const wStart = 0.22, wEnd = 0.62;                       // fractie van de tijdlijnbreedte
    let w = wStart;
    if (t >= STRETCH_ST) {
      w = wStart + (wEnd - wStart) * easeOut(clamp01((t - STRETCH_ST) / STRETCH_DUR));
    }
    tlclip.style.opacity = String(globalFade);
    tlclip.style.left = '4%';
    tlclip.style.width = w * 100 + '%';
  } else {
    tlclip.style.opacity = '0';
    tlclip.style.width = '0';
  }

  // --- muis: klikt de vakjes aan, sleept daarna het blokje ---
  let mOp = 0, mx = 0, my = 0, mSc = 1;
  const mIn = CLICK_START - 500;
  if (t >= mIn && t < PLAY_START) {
    mOp = clamp01((t - mIn) / 300);
    // van klik naar klik bewegen, met een korte indruk op het klikmoment
    let from = { x: POS.clicks[0] ? POS.clicks[0].x - 90 : 0, y: POS.clicks[0] ? POS.clicks[0].y + 60 : 0 };
    let to = POS.clicks[0] || { x: 0, y: 0 };
    let seg = clamp01((t - mIn) / (CLICK_START - mIn));
    for (let i = 0; i < CLICKS.length; i++) {
      const at = CLICK_START + i * CLICK_STAG;
      if (t >= at) {
        from = POS.clicks[i] || from;
        to = POS.clicks[i + 1] || POS.clicks[i] || to;
        seg = clamp01((t - at) / CLICK_STAG);
        const sinceClick = t - at;
        mSc = sinceClick < 160 ? 0.82 + 0.18 * easeOut(sinceClick / 160) : 1;
      }
    }
    const e = easeInOut(seg);
    mx = from.x + (to.x - from.x) * e;
    my = from.y + (to.y - from.y) * e;
  } else if (t >= BUNDLE_APP && t < landed + 200) {
    mOp = 1;
    mx = bx; my = by;
    mSc = t >= DRAG_START && t < landed ? 0.88 : 1;         // ingedrukt tijdens slepen
  } else if (t >= PLAY_START && t < BUNDLE_APP) {
    mOp = clamp01(1 - (t - PLAY_START) / 300);
    mx = POS.clicks[POS.clicks.length - 1] ? POS.clicks[POS.clicks.length - 1].x : 0;
    my = POS.clicks[POS.clicks.length - 1] ? POS.clicks[POS.clicks.length - 1].y : 0;
  }
  mouse.style.opacity = String(mOp * globalFade);
  mouse.style.transform = 'translate(' + (mx - 3) + 'px,' + (my - 3) + 'px) scale(' + mSc + ')';

  // --- onderschrift ---
  let capText = '', capOp = 0;
  for (const [from, to, i] of CAPS) {
    if (t >= from && t < to) {
      capText = T.caps[i];
      const inP = clamp01((t - from) / 300);
      const outP = clamp01((to - t) / 300);
      capOp = Math.min(inP, outP);
    }
  }
  if (capText && cap.textContent !== capText) cap.textContent = capText;
  cap.style.opacity = String(capOp * globalFade);
}

/* ---------------- loop ---------------- */
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let raf = 0, startT = null;

function loop(now) {
  if (startT === null) startT = now;
  render((now - startT) % PERIOD);
  raf = requestAnimationFrame(loop);
}

function start() {
  cancelAnimationFrame(raf);
  measure();
  if (REDUCE) {
    // geen beweging: toon de statische eindstaat (gevuld raster + clip)
    render(STRETCH_ST + STRETCH_DUR + HOLD - 50);
    return;
  }
  startT = null;
  raf = requestAnimationFrame(loop);
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(measure, 120);
});
window.addEventListener('pagehide', () => cancelAnimationFrame(raf));

// wachten tot Nunito geladen is, anders meten we op de fallback-breedte
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(start);
} else {
  start();
}
