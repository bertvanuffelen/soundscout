/**
 * OpdrachtkaartCard - Gestylede instructiekaart (titel + bullets)
 *
 * Vorm-onafhankelijk: toont óf de door de docent gekoppelde opdrachtkaart, óf
 * de per-type default. Gebruikt op de AssignmentLandingScreen.
 */

import type { OpdrachtkaartContent } from '../../types';

export function OpdrachtkaartCard({ card }: { card: OpdrachtkaartContent }) {
  if (!card.title && card.bullets.length === 0) return null;
  return (
    <div className="rounded-xl bg-white/5 md:bg-neutral-100 border border-white/10 md:border-neutral-200 p-4 mb-4">
      {card.title && (
        <h2 className="font-semibold text-white md:text-text-main mb-2">{card.title}</h2>
      )}
      {card.bullets.length > 0 && (
        <ul className="space-y-1.5">
          {card.bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2 text-white/90 md:text-text-main text-sm">
              <span className="text-accent-400 md:text-accent-600 mt-0.5 shrink-0">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OpdrachtkaartCard;
