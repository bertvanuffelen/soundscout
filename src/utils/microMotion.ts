/**
 * Kleine, eenmalige bewegingen die de app "tastbaar" maken (designronde nov
 * 2026, mockup A4). Geen lussen: dit zijn losse momenten, dus WAAPI/CSS mag
 * (docs/ANIMATIE-RICHTLIJNEN.md). Alles valt stil weg bij
 * prefers-reduced-motion en in omgevingen zonder element.animate (tests).
 */

const reducedMotion = () =>
  typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Een verzameld geluid vliegt als blokje van de hotspot naar het eerste lege
 * vak van de tas (`[data-recorder-slot][data-empty="true"]`). Puur decoratief:
 * het vak zelf vult de app al; mislukt de vlucht, dan gebeurt er niets.
 */
export function flyToBag(from: HTMLElement, color: string): void {
  if (reducedMotion()) return;
  const target = document.querySelector<HTMLElement>('[data-recorder-slot][data-empty="true"]');
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement('div');
  if (typeof dot.animate !== 'function') return;
  const size = Math.max(28, Math.min(a.width, 56));
  Object.assign(dot.style, {
    position: 'fixed',
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '12px',
    background: color,
    boxShadow: '0 6px 14px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    zIndex: '60',
  } satisfies Partial<CSSStyleDeclaration>);
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const done = () => dot.remove();
  const anim = dot.animate(
    [
      { transform: 'translate(0,0) scale(0.6)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.7)`, opacity: 0.9 },
    ],
    { duration: 520, easing: 'cubic-bezier(.3,.1,.3,1)' },
  );
  anim.onfinish = done;
  anim.oncancel = done;
}

// --- Blok "landt" op de tijdlijn ---

let lastDropped: { id: string; at: number } | null = null;
const SETTLE_MS = 500;

/** Markeer een zojuist neergezette clip; de Clip speelt dan één keer de land-beweging. */
export function markDropped(clipId: string): void {
  lastDropped = { id: clipId, at: Date.now() };
}

export function wasJustDropped(clipId: string): boolean {
  return !!lastDropped && lastDropped.id === clipId && Date.now() - lastDropped.at < SETTLE_MS;
}
