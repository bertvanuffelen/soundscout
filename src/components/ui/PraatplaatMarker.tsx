/**
 * PraatplaatMarker — positie-marker op een praatplaat-afbeelding.
 *
 * Eén gedeelde marker voor alle presentatie-oppervlakken (was identiek
 * gedupliceerd in ClassPresentationView en PeerReviewModal). Positie in
 * genormaliseerde coördinaten (0-1); de ouder is de relative container
 * om de afbeelding.
 */

import { cn } from '../../utils/cn';
import type { PraatplaatPosition } from '../../types';

interface PraatplaatMarkerProps {
  position: PraatplaatPosition;
  /** Actief = groter, accentkleur en pulserend (speelt nu) */
  active?: boolean;
  className?: string;
}

export function PraatplaatMarker({ position, active = false, className }: PraatplaatMarkerProps) {
  return (
    <span
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-all',
        active ? 'w-6 h-6 bg-accent-400 animate-pulse scale-110' : 'w-3.5 h-3.5 bg-brand-300/80',
        className,
      )}
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
      aria-hidden="true"
    />
  );
}

export default PraatplaatMarker;
