/**
 * StorytellingToggle - Three-state toggle for studio layout (#41)
 *
 * Controls what's visible in the studio content area:
 * - 'library': Only sample library (default/current experience)
 * - 'split': Library + storytelling panel side by side
 * - 'image': Only storytelling panel (image fullscreen)
 */

import { useTranslation } from 'react-i18next';
import { Music, Columns2, Image } from 'lucide-react';

export type StudioViewMode = 'library' | 'split' | 'image';

interface StorytellingToggleProps {
  viewMode: StudioViewMode;
  onViewModeChange: (mode: StudioViewMode) => void;
}

const MODES: { value: StudioViewMode; icon: typeof Music; labelKey: string }[] = [
  { value: 'library', icon: Music, labelKey: 'composeMode.viewLibrary' },
  { value: 'split', icon: Columns2, labelKey: 'composeMode.viewSplit' },
  { value: 'image', icon: Image, labelKey: 'composeMode.viewImage' },
];

export function StorytellingToggle({ viewMode, onViewModeChange }: StorytellingToggleProps) {
  const { t } = useTranslation();

  return (
    <div
      className="inline-flex items-center bg-neutral-100 rounded-lg p-0.5"
      role="radiogroup"
      aria-label={t('composeMode.viewMode')}
    >
      {MODES.map(({ value, icon: Icon, labelKey }) => {
        const isActive = viewMode === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            onClick={() => onViewModeChange(value)}
            className={`
              flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md transition-all duration-150
              ${isActive
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main hover:bg-white/50'
              }
            `}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
