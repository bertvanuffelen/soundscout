/**
 * StorytellingPanel - Image display panel in the studio (#41)
 *
 * Shows the current storyboard image with navigation arrows.
 * - Single image mode: just the image, no arrows
 * - Storyboard mode: image + prev/next arrows + position indicator
 */

import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';

export function StorytellingPanel({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const currentImageIndex = useAppStore((s) => s.currentImageIndex);
  const composeMode = useAppStore((s) => s.composeMode);
  const nextImage = useAppStore((s) => s.nextImage);
  const prevImage = useAppStore((s) => s.prevImage);

  if (!activeStoryboard) return null;

  const currentImage = activeStoryboard.images[currentImageIndex];
  if (!currentImage) return null;

  const imageCount = activeStoryboard.images.length;
  const isStoryboard = composeMode === 'storyboard' && imageCount > 1;
  const isFirst = currentImageIndex === 0;
  const isLast = currentImageIndex === imageCount - 1;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Image container — fills available space */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-neutral-900/5 rounded-lg overflow-hidden mx-2 sm:mx-3 mt-2 sm:mt-3">
        <img
          src={currentImage.url}
          alt={t(currentImage.label)}
          className="max-w-full max-h-full object-contain"
        />

        {/* Navigation arrows (storyboard only) */}
        {isStoryboard && (
          <>
            <button
              onClick={prevImage}
              disabled={isFirst}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={t('composeMode.prevImage')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextImage}
              disabled={isLast}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={t('composeMode.nextImage')}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Footer: label + position indicator */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2">
        <span className="text-xs sm:text-sm font-medium text-text-main truncate">
          {t(currentImage.label)}
        </span>
        {isStoryboard && (
          <span className="text-xs text-text-muted ml-2 whitespace-nowrap">
            {currentImageIndex + 1} / {imageCount}
          </span>
        )}
      </div>
    </div>
  );
}
