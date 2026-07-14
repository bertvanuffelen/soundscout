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
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAudioStore } from '../../stores/audioStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { getActiveImageIndex } from '../../utils/storytelling';
import { audioService } from '../../services/AudioService';
import { ImageLightbox } from '../ui/ImageLightbox';
import { CrossfadeImage } from '../ui/CrossfadeImage';

export function StorytellingDisplay() {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const composeMode = useAppStore((s) => s.composeMode);
  const setCurrentImageIndex = useAppStore((s) => s.setCurrentImageIndex);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  // Local display index (driven by playback sync or manual navigation)
  const [displayIndex, setDisplayIndex] = useState(() => useAppStore.getState().currentImageIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const rafRef = useRef<number | null>(null);

  const imageCount = activeStoryboard?.images.length ?? 0;
  const isStoryboard = composeMode === 'storyboard' && imageCount > 1;

  // Sync image index with playback using requestAnimationFrame
  // Reads currentBeat imperatively to avoid re-render storms.
  // Inner hoisted `loop` i.p.v. zelf-referentie in de useCallback
  // (react-hooks v6: variabele-voor-declaratie).
  const syncWithPlayback = useCallback(() => {
    function loop() {
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

      rafRef.current = requestAnimationFrame(loop);
    }
    loop();
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

  // Sync image when seeking while NOT playing (scrubbing playhead)
  useEffect(() => {
    if (!isStoryboard) return;

    const unsub = useAudioStore.subscribe((state, prevState) => {
      if (!state.isPlaying && state.currentBeat !== prevState.currentBeat && activeStoryboard) {
        const { totalBeats, sections } = useTimelineStore.getState();
        const newIndex = getActiveImageIndex(state.currentBeat, totalBeats, activeStoryboard.images.length, sections);
        setDisplayIndex((prev) => {
          if (prev !== newIndex) {
            useAppStore.getState().setCurrentImageIndex(newIndex);
            return newIndex;
          }
          return prev;
        });
      }
    });
    return unsub;
  }, [isStoryboard, activeStoryboard]);

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

  // --- Transport controls for lightbox ---

  const handleLightboxPlayPause = useCallback(() => {
    const { isPlaying: playing } = useAudioStore.getState();
    if (playing) {
      audioService.pause();
      useAudioStore.getState().setIsPlaying(false);
    } else {
      const { tracks, totalBeats, isLooping } = useTimelineStore.getState();
      const { currentBeat } = useAudioStore.getState();
      const { librarySamples } = useLibraryStore.getState();
      audioService.scheduleTimeline(tracks, librarySamples);
      audioService.setLoop(isLooping, totalBeats);
      audioService.play(currentBeat);
      useAudioStore.getState().setIsPlaying(true);
    }
  }, []);

  const handleLightboxStop = useCallback(() => {
    audioService.stop();
    useAudioStore.getState().setIsPlaying(false);
    useAudioStore.getState().setCurrentBeat(0);
  }, []);

  if (!activeStoryboard) return null;

  const currentImage = activeStoryboard.images[displayIndex];
  if (!currentImage) return null;

  const isFirst = displayIndex === 0;
  const isLast = displayIndex === imageCount - 1;

  return (
    <div className="w-full max-w-lg">
      {/* Image container */}
      <div className="relative rounded-xl overflow-hidden bg-black/20 shadow-lg">
        <CrossfadeImage
          src={currentImage.url}
          alt={t(currentImage.label)}
          className="w-full aspect-video object-cover"
        />

        {/* Zoom button */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
          aria-label={t('common.zoom')}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

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

      {/* Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          src={currentImage.url}
          alt={t(currentImage.label)}
          onClose={() => setLightboxOpen(false)}
          isPlaying={isPlaying}
          onPlayPause={handleLightboxPlayPause}
          onStop={handleLightboxStop}
        />
      )}
    </div>
  );
}
