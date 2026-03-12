/**
 * StorytellingPanel - Image display panel in the studio (#41)
 *
 * Shows the current storyboard image with navigation arrows.
 * During playback, the image syncs with currentBeat + sections.
 *
 * IMPORTANT: currentBeat updates ~20x/sec during playback.
 * We use requestAnimationFrame + imperative store read to avoid re-render storms.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import { useAudioStore } from '../../../stores/audioStore';
import { useTimelineStore } from '../../../stores/timelineStore';

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

  // If sections match image count (1 per slide) or imageCount - 1 (legacy)
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

export function StorytellingPanel({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const composeMode = useAppStore((s) => s.composeMode);
  const nextImage = useAppStore((s) => s.nextImage);
  const prevImage = useAppStore((s) => s.prevImage);

  // Local display index (driven by playback sync or manual navigation)
  const [displayIndex, setDisplayIndex] = useState(() => useAppStore.getState().currentImageIndex);
  const rafRef = useRef<number | null>(null);

  if (!activeStoryboard) return null;

  const imageCount = activeStoryboard.images.length;
  const isStoryboard = composeMode === 'storyboard' && imageCount > 1;
  const isFirst = displayIndex === 0;
  const isLast = displayIndex === imageCount - 1;

  // --- Playback sync ---

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

  // Keep local displayIndex in sync when store changes from outside (e.g. manual nav)
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      setDisplayIndex(state.currentImageIndex);
    });
    return unsub;
  }, []);

  // --- Manual navigation (wrapped to update local state too + seek timeline) ---

  /** Move playhead to the start beat of the given image/section index */
  const seekToSection = useCallback((imageIndex: number) => {
    if (!isStoryboard) return;
    const { sections } = useTimelineStore.getState();
    // Section i starts at sections[i-1].endBeat (or 0 for first)
    const startBeat = imageIndex > 0 && sections[imageIndex - 1]
      ? sections[imageIndex - 1].endBeat
      : 0;
    useAudioStore.getState().setCurrentBeat(startBeat);
  }, [isStoryboard]);

  const handlePrev = useCallback(() => {
    prevImage();
    // After prevImage, store.currentImageIndex is updated — read it
    const newIndex = useAppStore.getState().currentImageIndex;
    seekToSection(newIndex);
  }, [prevImage, seekToSection]);

  const handleNext = useCallback(() => {
    nextImage();
    const newIndex = useAppStore.getState().currentImageIndex;
    seekToSection(newIndex);
  }, [nextImage, seekToSection]);

  const currentImage = activeStoryboard.images[displayIndex];
  if (!currentImage) return null;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Image container — fills all available space */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-neutral-900/5 rounded-lg overflow-hidden m-2 sm:m-3">
        <img
          src={currentImage.url}
          alt={t(currentImage.label)}
          className="max-w-full max-h-full object-contain transition-opacity duration-300"
        />

        {/* Navigation arrows (storyboard only) */}
        {isStoryboard && (
          <>
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={t('composeMode.prevImage')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              disabled={isLast}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={t('composeMode.nextImage')}
            >
              <ChevronRight size={18} />
            </button>
            {/* Position indicator overlay */}
            <span className="absolute bottom-1.5 right-1.5 text-[10px] text-white/70 bg-black/30 rounded-full px-2 py-0.5 backdrop-blur-sm">
              {displayIndex + 1} / {imageCount}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
