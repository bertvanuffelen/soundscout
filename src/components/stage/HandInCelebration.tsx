/**
 * HandInCelebration — het moment van inleveren op het podium (designronde nov
 * 2026, mockup A4). Podiumlicht, de eigen geluidsblokken komen omhoog en één
 * duidelijk woord. Geen confetti: het blijft een werkplaats, geen speelgoed.
 *
 * Stil, drie seconden, klikt nergens doorheen (pointer-events: none). Bij
 * prefers-reduced-motion blijft alleen het woord staan (CSS in index.css).
 * De melding voor schermlezers loopt via de bestaande toast; dit is beeld.
 */

import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

interface HandInCelebrationProps {
  /** Kleuren van de geluiden in deze soundscape (max. zes worden getoond). */
  colors: string[];
}

const FALLBACK_COLORS = ['#FFC107', '#FF9800', '#E74C3C', '#0E7490'];
const BAR_HEIGHTS = [56, 84, 68, 96, 60, 76];

export function HandInCelebration({ colors }: HandInCelebrationProps) {
  const { t } = useTranslation();
  const bars = (colors.length > 0 ? colors : FALLBACK_COLORS).slice(0, 6);
  return (
    <div
      className="handin-overlay fixed inset-0 z-40 pointer-events-none flex flex-col items-center justify-center gap-6 overflow-hidden bg-brand-900/80"
      aria-hidden="true"
      data-testid="handin-celebration"
    >
      <span
        className="handin-beam absolute left-1/2 bottom-[30%] w-[70vmin] h-[150vmin] origin-bottom mix-blend-screen"
        style={{ clipPath: 'polygon(46% 100%, 54% 100%, 100% 0, 0 0)', background: 'linear-gradient(var(--color-accent-400), transparent)' }}
      />
      <span className="handin-pill relative inline-flex items-center gap-2 rounded-full bg-accent-400 px-6 py-3 text-2xl sm:text-3xl font-extrabold text-accent-900 shadow-[0_0_20px_4px_rgba(251,191,36,0.25)]">
        <Check className="w-7 h-7" strokeWidth={3} />
        {t('stage.handedInCelebration')}
      </span>
      <span className="relative flex items-end gap-2 h-24">
        {bars.map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="handin-bar w-7 sm:w-9 rounded-t-lg"
            style={{ backgroundColor: color, height: BAR_HEIGHTS[i % BAR_HEIGHTS.length], animationDelay: `${0.25 + i * 0.09}s` }}
          />
        ))}
      </span>
    </div>
  );
}
