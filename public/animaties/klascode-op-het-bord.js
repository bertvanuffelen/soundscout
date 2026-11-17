/* ===================================================================
   SoundScout — "De klascode op het bord" (looping, stil)

   1. de code van vier cijfers verschijnt op het digibord
   2. de apparaten in de klas lichten één voor één op; de teller loopt mee
   3. iedereen is binnen

   Elke frame wordt de volledige staat berekend uit t = (now-start) % PERIOD
   (docs/ANIMATIE-RICHTLIJNEN.md). Alle zichtbare tekst staat in TEXTS;
   taal via ?lang=nl|en.
   =================================================================== */
const TEXTS = {
  nl: {
    title: 'SoundScout — De klascode op het bord',
    label: 'Animatie: de klascode staat op het digibord en de leerlingen komen één voor één binnen',
    go: 'Ga naar soundscout.nl en typ',
    joined: (n) => '<b>' + n + '</b> ' + (n === 1 ? 'leerling' : 'leerlingen') + ' binnen',
    all: 'Iedereen is binnen',
  },
  en: {
    title: 'SoundScout — The class code on the board',
    label: 'Animation: the class code is on the board and the pupils join one by one',
    go: 'Go to soundscout.nl and type',
    joined: (n) => '<b>' + n + '</b> ' + (n === 1 ? 'pupil has' : 'pupils have') + ' joined',
    all: 'Everyone is in',
  },
};
const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'nl';
const T = TEXTS[LANG];
document.documentElement.lang = LANG;
document.title = T.title;

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}
const seg = (t, a, b) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a));

const CODE = ['4', '8', '2', '7'];                       // voorbeeldcode, geen echte klas
const COLORS = ['#FFC107', '#FF9800', '#E74C3C', '#0E7490', '#6D28D9', '#795548'];
const DEVICES = 16, COLS = 8;

const stage = document.getElementById('stage');
stage.setAttribute('aria-label', T.label);
el('div', 'glow', stage);
el('div', 'go', stage, T.go);
const digits = CODE.map((d, i) => {
  const e = el('div', 'digit', stage, '<span>' + d + '</span>');
  e.style.left = 24.5 + i * 13.3 + '%';
  return e;
});
const devs = [];
for (let i = 0; i < DEVICES; i++) {
  const d = el('div', 'dev', stage, CHECK);
  d.style.left = 9.4 + (i % COLS) * 10.4 + '%';
  d.style.top = 55 + Math.floor(i / COLS) * 14 + '%';
  devs.push(d);
}
// vaste, door elkaar lopende volgorde: zo komt een klas ook binnen
const ORDER = [5, 0, 11, 3, 14, 8, 1, 12, 6, 15, 2, 9, 4, 13, 7, 10];
const count = el('div', 'count', stage);
const all = el('div', 'all', stage, T.all);

function measure() { stage.style.setProperty('--u', stage.clientWidth / 100 + 'px'); }
measure();
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
else window.addEventListener('resize', measure);

/* tijdlijn in getallen (ms) */
const DIGIT0 = 500, DIGIT_GAP = 320, JOIN0 = 2300, JOIN_GAP = 330;
const ALL_IN = JOIN0 + DEVICES * JOIN_GAP + 300, OUT = [ALL_IN + 2600, ALL_IN + 3300];
const PERIOD = OUT[1] + 400, END_STATE = ALL_IN + 800;
let shown = -1;

function render(t) {
  const out = 1 - seg(t, OUT[0], OUT[1]);
  digits.forEach((d, i) => {
    const p = seg(t, DIGIT0 + i * DIGIT_GAP, DIGIT0 + i * DIGIT_GAP + 260);
    d.style.opacity = p * out;
    d.style.transform = 'scale(' + (p < 1 ? 0.7 + 0.38 * p : 1) + ')';
  });
  let n = 0;
  ORDER.forEach((idx, k) => {
    const a = JOIN0 + k * JOIN_GAP, p = seg(t, a, a + 260), d = devs[idx];
    if (p > 0) n++;
    d.style.background = p > 0 ? COLORS[idx % COLORS.length] : 'transparent';
    d.style.borderColor = p > 0 ? 'transparent' : '';
    d.style.transform = 'scale(' + (p > 0 && p < 1 ? 1 + 0.25 * Math.sin(Math.PI * p) : 1) + ')';
    d.style.opacity = out;
    d.firstChild.style.opacity = p;
  });
  if (n !== shown) { shown = n; count.innerHTML = T.joined(n); }
  const done = seg(t, ALL_IN, ALL_IN + 300);
  count.style.opacity = (1 - done) * out;
  all.style.opacity = done * out;
  all.style.transform = 'translateX(-50%) scale(' + (done < 1 ? 0.8 + 0.25 * done : 1) + ')';
}

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
