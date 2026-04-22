/**
 * LocationMarker - Clickable location icon on the map
 *
 * Shows:
 * - Location icon/image
 * - Name
 * - Progress indicator (collected/total samples)
 */

import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import type { Location } from '../../types';
import type { LocationPosition } from '../../data/themes/types';
import { cn } from '../../utils/cn';

interface LocationMarkerProps {
  position: LocationPosition;
  location: Location;
  collected: number;
  total: number;
  onClick: () => void;
}

export function LocationMarker({
  position,
  location,
  collected,
  total,
  onClick,
}: LocationMarkerProps) {
  const { t } = useTranslation();

  const isComplete = collected === total && total > 0;
  const hasProgress = collected > 0;

  // Size classes based on position.size - all same small size on mobile (20px), varies on desktop
  const sizeClasses = {
    sm: 'w-5 h-5 sm:w-14 sm:h-14',
    md: 'w-5 h-5 sm:w-16 sm:h-16',
    lg: 'w-5 h-5 sm:w-20 sm:h-20',
  };

  const size = position.size ?? 'md';

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute transform -translate-x-1/2 -translate-y-1/2',
        'flex flex-col items-center gap-0.5 sm:gap-1',
        'transition-transform duration-200 hover:scale-110 active:scale-95',
        'cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 rounded-xl' // sky: three-state visual distinction
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      title={t(location.name)}
    >
      {/* Marker Icon */}
      <div
        className={cn(
          sizeClasses[size],
          'rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center',
          'border-2 sm:border-4 transition-colors',
          isComplete
            ? 'bg-success-100 border-success-400'
            : hasProgress
              ? 'bg-accent-100 border-accent-400'
              : 'bg-white border-sky-300 hover:border-sky-400' // sky: three-state distinction (success/accent/sky)
        )}
      >
        {position.iconUrl ? (
          <img
            src={position.iconUrl}
            alt={t(location.name)}
            className="w-3/4 h-3/4 object-contain"
          />
        ) : (
          <MapPin
            className={cn(
              'w-2.5 h-2.5 sm:w-6 sm:h-6',
              isComplete
                ? 'text-success-600'
                : hasProgress
                  ? 'text-accent-600'
                  : 'text-sky-600'
            )}
          />
        )}
      </div>

      {/* Location Name - hidden on mobile */}
      <div className="hidden sm:block bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-md">
        <span className="text-sm font-semibold text-text-main">
          {t(location.name)}
        </span>
      </div>

      {/* Progress Badge */}
      <div
        className={cn(
          'px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shadow',
          isComplete
            ? 'bg-success-500 text-white'
            : hasProgress
              ? 'bg-accent-500 text-white'
              : 'bg-neutral-200 text-text-muted'
        )}
      >
        {collected}/{total}
      </div>
    </button>
  );
}
