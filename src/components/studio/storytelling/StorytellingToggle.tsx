/**
 * StorytellingToggle - Studio layout view toggle (#41)
 *
 * Controls what's visible in the studio content area:
 * - 'library': Only sample library (default/current experience)
 * - 'split': Library + storytelling panel side by side
 * - 'image': Only storytelling panel (image fullscreen)
 * - 'scenes': All storyboard scenes as a filmstrip aligned to the timeline
 *   (Feature F) — only offered when `allowScenes` (multi-image storyboard).
 */

import { useTranslation } from 'react-i18next';
import { Music, Columns2, Image, GalleryHorizontal } from 'lucide-react';

export type StudioViewMode = 'library' | 'split' | 'image' | 'scenes';

interface StorytellingToggleProps {
  viewMode: StudioViewMode;
  onViewModeChange: (mode: StudioViewMode) => void;
  /** Toon de 'Scènes'-modus (alleen zinvol bij een multi-image storyboard). */
  allowScenes?: boolean;
}

const MODES: { value: StudioViewMode; icon: typeof Music; labelKey: string }[] = [
  { value: 'library', icon: Music, labelKey: 'composeMode.viewLibrary' },
  { value: 'split', icon: Columns2, labelKey: 'composeMode.viewSplit' },
  { value: 'image', icon: Image, labelKey: 'composeMode.viewImage' },
  { value: 'scenes', icon: GalleryHorizontal, labelKey: 'composeMode.viewScenes' },
];

export function StorytellingToggle({ viewMode, onViewModeChange, allowScenes = false }: StorytellingToggleProps) {
  const { t } = useTranslation();
  const modes = allowScenes ? MODES : MODES.filter((m) => m.value !== 'scenes');

  return (
    <div
      className="inline-flex items-center bg-neutral-100 rounded-lg p-0.5"
      role="radiogroup"
      aria-label={t('composeMode.viewMode')}
    >
      {modes.map(({ value, icon: Icon, labelKey }) => {
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
