/**
 * StorytellingDisplay - Image display on the stage, synced with playback (#41)
 *
 * Shows the current storyboard image, large and prominent.
 * During playback, the image changes based on currentBeat + sections (or even division).
 *
 * IMPORTANT: currentBeat updates ~20x/sec during playback.
 * We use requestAnimationFrame + imperative store read to avoid re-render storms.
 * Only re-renders when the derived imageIndex actually changes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAudioStore } from '../../stores/audioStore';
import { useTimelineStore } from '../../stores/timelineStore';

/**
 * Determine which image to show based on currentBeat.
 * Uses sections if available, otherwise divides beats evenly.
 */
function getActiveImageIndex(
  currentBeat: number,
  totalBeats: number,
  imageCount: number,
  sections: { endBeat: number }[],
): number {
  if (imageCount <= 1) return 0;

  // If sections match image count (1 section per slide) or image count - 1
  // (legacy: last slide has no section), use section boundaries
  if (sections.length === imageCount || sections.length === imageCount - 1) {
    for (let i = 0; i < sections.length; i++) {
      if (currentBeat < sections[i].endBeat) {
        return i;
      }
    }
    return imageCount - 1;
  }

  // Fallback: divide beats evenly
  const beatsPerImage = totalBeats / imageCount;
  const index = Math.floor(currentBeat / beatsPerImage);
  return Math.min(index, imageCount - 1);
}

export function StorytellingDisplay() {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const composeMode = useAppStore((s) => s.composeMode);
  const setCurrentImageIndex = useAppStore((s) => s.setCurrentImageIndex);

  // Local display index (driven by playback sync or manual navigation)
  const [displayIndex, setDisplayIndex] = useState(() => useAppStore.getState().currentImageIndex);
  const rafRef = useRef<number | null>(null);

  if (!activeStoryboard) return null;

  const imageCount = activeStoryboard.images.length;
  const isStoryboard = composeMode === 'storyboard' && imageCount > 1;

  // Sync image index with playback using requestAnimationFrame
  // Reads currentBeat imperatively to avoid re-render storms
  const syncWithPlayback = useCallback(() => {
    const { isPlaying } = useAudioStore.getState();
    if (!isPlaying || !activeStoryboard) {
      rafRef.current = null;
      return;
    }

    const { currentBeat } = useAudioStore.getState();
    const { totalBeats, sections } = useTimelineStore.getState();

    const newIndex = getActiveImageIndex(currentBeat, totalBeats, activeStoryboard.images.length, sections);

    setDisplayIndex((prev) => {
      if (prev !== newIndex) {
        // Also update the store so other components stay in sync
        useAppStore.getState().setCurrentImageIndex(newIndex);
        return newIndex;
      }
      return prev;
    });

    rafRef.current = requestAnimationFrame(syncWithPlayback);
  }, [activeStoryboard]);

  // Start/stop the sync loop when playback state changes
  useEffect(() => {
    if (!isStoryboard) return;

    const unsub = useAudioStore.subscribe((state) => {
      if (state.isPlaying && !rafRef.current) {
        rafRef.current = requestAnimationFrame(syncWithPlayback);
      }
    });

    // Check initial state
    if (useAudioStore.getState().isPlaying) {
      rafRef.current = requestAnimationFrame(syncWithPlayback);
    }

    return () => {
      unsub();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isStoryboard, syncWithPlayback]);

  // Manual navigation (only when not playing)
  const handlePrev = useCallback(() => {
    setDisplayIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      setCurrentImageIndex(next);
      return next;
    });
  }, [setCurrentImageIndex]);

  const handleNext = useCallback(() => {
    setDisplayIndex((prev) => {
      if (!activeStoryboard) return prev;
      const next = Math.min(prev + 1, activeStoryboard.images.length - 1);
      setCurrentImageIndex(next);
      return next;
    });
  }, [activeStoryboard, setCurrentImageIndex]);

  const currentImage = activeStoryboard.images[displayIndex];
  if (!currentImage) return null;

  const isFirst = displayIndex === 0;
  const isLast = displayIndex === imageCount - 1;

  return (
    <div className="w-full max-w-lg">
      {/* Image container */}
      <div className="relative rounded-xl overflow-hidden bg-black/20 shadow-lg">
        <img
          src={currentImage.url}
          alt={t(currentImage.label)}
          className="w-full aspect-video object-cover transition-opacity duration-500"
        />

        {/* Navigation arrows (storyboard with multiple images, only when not playing) */}
        {isStoryboard && (
          <>
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={t('composeMode.prevImage')}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              disabled={isLast}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={t('composeMode.nextImage')}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Label overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold drop-shadow-md">
              {t(currentImage.label)}
            </span>
            {isStoryboard && (
              <span className="text-white/80 text-xs drop-shadow-md">
                {displayIndex + 1} / {imageCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
