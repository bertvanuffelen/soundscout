/* ===================================================================
   SoundScout — "De feedback-cirkel" (looping, stil)

   Eén soundscape reist de cirkel rond. Elke frame wordt de volledige staat
   berekend uit t = (now-start) % PERIOD (docs/ANIMATIE-RICHTLIJNEN.md).
   Alle zichtbare tekst staat in TEXTS; taal via ?lang=nl|en. De stapnamen
   en de sticker komen uit src/i18n/locales/*.json
   (teacherLanding.feedbackCycle.steps, teacher.feedback.stickers.build).
   =================================================================== */
const TEXTS = {
  nl: {
    title: 'SoundScout — De feedback-cirkel',
    label: 'Animatie: een soundscape gaat van opdracht naar maken, inleveren, feedback en verbeteren',
    steps: ['Opdracht', 'Maken', 'Inleveren', 'Feedback', 'Verbeteren'],
    sticker: 'Mooie opbouw!',
  },
  en: {
    title: 'SoundScout — The feedback cycle',
    label: 'Animation: a soundscape goes from assignment to creating, submitting, feedback and improving',
    steps: ['Assignment', 'Create', 'Submit', 'Feedback', 'Improve'],
    sticker: 'Nice build-up!',
  },
};
const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'nl';
const T = TEXTS[LANG];
document.documentElement.lang = LANG;
document.title = T.title;

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

const stage = document.getElementById('stage');
stage.setAttribute('aria-label', T.label);
el('div', 'ring', stage);
/* middelpunt en stralen in % van het podium (16:9 → de cirkel is rond) */
const CX = 50, CY = 52, RX = 20, RY = RX * 16 / 9, INNER = 0.7;
const angle = (i) => ((-90 + i * 72) * Math.PI) / 180;
const nodes = T.steps.map((s, i) => {
  const n = el('div', 'node', stage, s);
  n.style.left = CX + RX * 1.32 * Math.cos(angle(i)) + '%';
  n.style.top = CY + RY * 1.18 * Math.sin(angle(i)) + '%';
  return n;
});
const work = el('div', 'work', stage);
const BLOCKS = [['#0E7490', 3.2], ['#FF9800', 2.4], ['#E74C3C', 2.8], ['#FFC107', 2.2]].map(([c, w]) => {
  const b = el('b', '', work); b.style.background = c; return { b, w };
});
const badge = el('div', 'badge', stage, '<div class="stars">' + STAR + STAR + STAR + '</div><span class="sticker">' + T.sticker + '</span>');

function measure() { stage.style.setProperty('--u', stage.clientWidth / 100 + 'px'); }
measure();
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
else window.addEventListener('resize', measure);

/* tijdlijn in getallen: elke stap duurt LEG ms (reizen + even stilstaan) */
const LEG = 2200, TRAVEL = 1300, PERIOD = LEG * 5, END_STATE = LEG * 3 + TRAVEL + 400;

function render(t) {
  const leg = Math.floor(t / LEG), u = ease(seg(t - leg * LEG, 0, TRAVEL));   // onderweg naar stap `leg`
  const a = angle(leg - 1) + (angle(leg) - angle(leg - 1)) * u;
  // net binnen de ring, zodat het werk nooit over een label schuift
  work.style.left = CX + RX * INNER * Math.cos(a) + '%';
  work.style.top = CY + RY * INNER * Math.sin(a) + '%';
  const arrived = u >= 1 ? leg : (leg + 4) % 5;
  nodes.forEach((n, i) => n.classList.toggle('on', i === arrived));
  // blokken: 1 bij de opdracht, 3 na Maken, 4 na Verbeteren (en weer 1 bij de nieuwe opdracht)
  const made = t >= LEG + TRAVEL, improved = t >= LEG * 4 + TRAVEL;
  const fresh = 1 - seg(t, 0, 500);                                           // de vorige ronde vervaagt
  BLOCKS.forEach(({ b, w }, i) => {
    const on = i === 0 ? 1 : i < 3 ? (made ? seg(t, LEG + TRAVEL, LEG + TRAVEL + 300 + i * 180) : fresh) : improved ? seg(t, LEG * 4 + TRAVEL, LEG * 4 + TRAVEL + 400) : 0;
    b.style.width = 'calc(var(--u)*' + w * on + ')';
    b.style.display = on > 0 ? '' : 'none';
  });
  const fb = seg(t, LEG * 3 + TRAVEL, LEG * 3 + TRAVEL + 350) * (1 - seg(t, LEG * 4 + TRAVEL, LEG * 4 + TRAVEL + 400));
  badge.style.opacity = fb;
  badge.style.transform = 'translate(-50%,-50%) scale(' + (0.8 + 0.2 * fb) + ')';
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
