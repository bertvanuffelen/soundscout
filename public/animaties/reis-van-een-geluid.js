/* ===================================================================
   SoundScout — "Eén geluid op reis" (looping uitleg-animatie, stil)

   Eén doorlopende opname: vier geluidsblokken gaan van hotspot → tas →
   tijdlijn → podium. Elke frame wordt de volledige staat berekend uit
   t = (now - start) % PERIOD; geen setTimeout-ketens, dus na een tab-wissel
   verschijnt er niets in één klap (docs/ANIMATIE-RICHTLIJNEN.md).
   Alle zichtbare tekst staat in TEXTS; taal via ?lang=nl|en.
   =================================================================== */

/* ---------------- teksten (NL + EN) ----------------
   De geluidsnamen zijn overgenomen uit src/i18n/locales/*.json (samples.boerderij-*)
   zodat animatie en app hetzelfde zeggen. */
const TEXTS = {
  nl: {
    title: 'SoundScout — Eén geluid op reis',
    label: 'Animatie: vier geluiden worden verzameld op de kinderboerderij, op de tijdlijn gezet en op het podium gepresenteerd',
    steps: ['Ontdek', 'Verzamel', 'Bouw', 'Laat horen'],
    now: 'Nu te horen',
    sounds: ['Lach', 'Paard', 'Hond', 'Kippen'],
  },
  en: {
    title: 'SoundScout — One sound on its way',
    label: 'Animation: four sounds are collected on the farm, placed on the timeline and presented on the stage',
    steps: ['Explore', 'Collect', 'Build', 'Present'],
    now: 'Now playing',
    sounds: ['Laugh', 'Horse', 'Dog', 'Chickens'],
  },
};
const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'nl';
const T = TEXTS[LANG];
document.documentElement.lang = LANG;
document.title = T.title;

/* ---------------- hulpjes ---------------- */
const WAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/></svg>';
const STAR = '<svg viewBox="0 0 24 24"><path fill="#FBBF24" stroke="#78350F" stroke-width="1.2" stroke-linejoin="round" d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>';
function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}
const seg = (t, a, b) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a, b, u) => a + (b - a) * u;

/* ---------------- de vier geluiden ----------------
   hx/hy = echte hotspot-plek in de kinderboerderij (basis-manifest);
   tr/s/l = spoor, start en lengte op de tijdlijn (in % van de sporen). */
const S = [
  { c: '#FFC107', hx: 24.6, hy: 36.3, tr: 0, s: 2, l: 28 },
  { c: '#795548', hx: 62.7, hy: 40.7, tr: 1, s: 20, l: 34 },
  { c: '#FF9800', hx: 85.3, hy: 72, tr: 2, s: 44, l: 30 },
  { c: '#E74C3C', hx: 89.8, hy: 26.7, tr: 0, s: 56, l: 22 },
];

/* ---------------- opbouw ---------------- */
const stage = document.getElementById('stage');
stage.setAttribute('aria-label', T.label);
const stepEls = T.steps.map((s) => el('span', 'step', document.getElementById('steps'), s));
el('div', 'scene', stage);
const dim = el('div', 'dim', stage);
const hots = S.map((s) => {
  const h = el('div', 'hot', stage);
  h.style.left = s.hx + '%';
  h.style.top = s.hy + '%';
  h.style.background = s.c;
  el('i', '', h);
  return h;
});
const bag = el('div', 'bag', stage, '<b></b><b></b><b></b><b></b><b></b><b></b>');
const tray = el('div', 'tray', stage);
const TRACK_TOP = [12, 38, 64];
TRACK_TOP.forEach((y) => { el('div', 'track', tray).style.top = y + '%'; });
const lights = ['#FBBF24', '#E74C3C', '#0E7490'].map((c, i) => {
  const l = el('div', 'light', stage);
  l.style.left = 8 + i * 21 + '%';
  l.style.background = 'linear-gradient(' + c + ',transparent)';
  return l;
});
const pill = el('div', 'nowpill', stage, T.now);
const stars = Array.from(el('div', 'stars', stage, STAR + STAR + STAR).children);
const chips = S.map((s, i) => {
  const c = el('div', 'chip', stage, WAVE + '<span>' + T.sounds[i] + '</span>');
  c.style.background = s.c;
  return c;
});
const playhead = el('div', 'playhead', stage);
const cursor = el('div', 'cursor', stage);

/* --u = 1% van de podiumbreedte (alle maten schalen mee) */
function measure() { stage.style.setProperty('--u', stage.clientWidth / 100 + 'px'); }
measure();
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
else window.addEventListener('resize', measure);

/* ---------------- tijdlijn in getallen (ms) ---------------- */
const TAP = (i) => 1200 + i * 1100;         // tik op hotspot i
const FLY = 650;                            // vlucht naar de tas
const TO_STUDIO = [5600, 6400];
const PLAY = [9200, 13800];                 // afspeellijn
const TO_STAGE = [13800, 14800];
const OUT = [19600, 20600];
const PERIOD = 21000;
const END_STATE = 17500;                    // stilstaand beeld bij reduced motion

const K = 16 / 9;                           // 1% breedte uitgedrukt in % hoogte
const slotX = (i) => 23.25 + 10.7 * i, SLOT_Y = 89.5, SLOT_W = 9.5, SLOT_H = 6 * K;
const TX0 = 7.7, TW = 84.6, TRAY_TOP = 22, TRAY_H = 68, TRACK_H = TRAY_H * 0.17;
function block(s) {
  const w = (s.l * TW) / 100;
  return { x: TX0 + (s.s * TW) / 100 + w / 2, y: TRAY_TOP + (TRAY_H * TRACK_TOP[s.tr]) / 100 + TRACK_H / 2, w, h: TRACK_H };
}

/* ---------------- render: de hele staat uit t ---------------- */
function render(t) {
  const toStudio = ease(seg(t, TO_STUDIO[0], TO_STUDIO[1]));
  const toStage = ease(seg(t, TO_STAGE[0], TO_STAGE[1]));
  const out = 1 - seg(t, OUT[0], OUT[1]);

  dim.style.opacity = Math.max(toStudio * 0.9, toStage) * 0.96;
  bag.style.opacity = (1 - seg(t, 6400, 7600)) * out;
  tray.style.opacity = toStudio * (1 - toStage);
  tray.style.transform = 'translateY(' + (1 - toStudio) * 8 + '%)';

  const px = TX0 + seg(t, PLAY[0], PLAY[1]) * TW;
  playhead.style.left = px + '%';
  playhead.style.top = '24%';
  playhead.style.bottom = '12%';
  playhead.style.opacity = t >= PLAY[0] - 300 && t < PLAY[1] + 200 ? 1 - toStage : 0;

  hots.forEach((h, i) => {
    const a = TAP(i), u = seg(t, a, a + 500), wob = 0.5 + 0.5 * Math.sin(t / 520 + i * 1.7);
    h.style.transform = 'translate(-50%,-50%) scale(' + (u > 0 && u < 1 ? 1 + 0.45 * Math.sin(Math.PI * u) : 1 + 0.06 * Math.sin(t / 380 + i)) + ')';
    h.style.opacity = (t < a ? 1 : lerp(1, 0.35, seg(t, a, a + 600))) * (1 - toStudio);
    h.firstChild.style.transform = 'scale(' + (1 + 0.35 * wob) + ')';
    h.firstChild.style.opacity = t < a ? 0.7 * wob : 0;
  });

  chips.forEach((c, i) => {
    const s = S[i], a = TAP(i), b = block(s);
    const u = ease(seg(t, a, a + FLY));                         // hotspot → tas
    const v = ease(seg(t, 6500 + i * 420, 7250 + i * 420));     // tas → tijdlijn
    const z = ease(seg(t, 14000 + i * 130, 14850 + i * 130));   // tijdlijn → podium
    let x = lerp(s.hx, slotX(i), u), y = lerp(s.hy, SLOT_Y, u) - Math.sin(Math.PI * u) * 14;
    let w = lerp(5, SLOT_W, u), h = lerp(7, SLOT_H, u);
    x = lerp(x, b.x, v); y = lerp(y, b.y, v); w = lerp(w, b.w, v); h = lerp(h, b.h, v);
    const barH = 16 + 13 * Math.abs(Math.sin(t / 240 + i * 1.3));
    x = lerp(x, 35 + i * 10, z); w = lerp(w, 6, z); h = lerp(h, barH, z); y = lerp(y, 86 - barH / 2, z);
    const sounding = t >= PLAY[0] && t <= PLAY[1] && px >= b.x - b.w / 2 && px <= b.x + b.w / 2;
    c.style.left = x - w / 2 + '%';
    c.style.top = y - h / 2 + '%';
    c.style.width = w + '%';
    c.style.height = h + '%';
    c.style.opacity = seg(t, a, a + 140) * out;
    c.style.transform = 'scale(' + (sounding ? 1.07 : 1) + ')';
    c.style.filter = sounding ? 'brightness(1.18)' : 'none';
    c.lastChild.style.opacity = (u > 0.6 ? 1 : 0) * (1 - z);
    c.firstChild.style.opacity = 1 - z;
  });

  lights.forEach((l, i) => {
    l.style.opacity = toStage * 0.5 * out;
    l.style.transform = 'rotate(' + Math.sin(t / 900 + i * 2) * 16 + 'deg)';
  });
  pill.style.opacity = toStage * out;
  stars.forEach((sv, i) => {
    const p = seg(t, 16000 + i * 420, 16350 + i * 420);
    sv.style.transform = 'scale(' + (p < 1 ? p * 1.25 : 1) + ')';
    sv.style.opacity = (p > 0 ? 1 : 0) * out;
  });

  // de vinger loopt de hotspots af en stapt daarna opzij
  let cx = 50, cy = 64;
  for (let i = 0; i < S.length; i++) {
    const a = TAP(i);
    if (t < a - 750) break;
    const from = i ? [S[i - 1].hx, S[i - 1].hy] : [50, 64], m = ease(seg(t, a - 750, a - 80));
    cx = lerp(from[0], S[i].hx, m); cy = lerp(from[1], S[i].hy, m);
  }
  let tap = 0;
  S.forEach((_, i) => { const d = seg(t, TAP(i) - 80, TAP(i) + 160); if (d > 0 && d < 1) tap = Math.sin(Math.PI * d); });
  cursor.style.left = cx + '%';
  cursor.style.top = cy + 4 + '%';
  cursor.style.transform = 'translate(-50%,-50%) scale(' + (1 - 0.28 * tap) + ')';
  cursor.style.opacity = (1 - seg(t, 5200, 5700)) * seg(t, 200, 600);

  const step = t < TAP(0) + FLY ? 0 : t < 6300 ? 1 : t < TO_STAGE[0] ? 2 : 3;
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
