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
import { ChevronLeft, ChevronRight, Crosshair, Maximize2, ZoomIn } from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import { useAudioStore } from '../../../stores/audioStore';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useLibraryStore } from '../../../stores/libraryStore';
import { getActiveImageIndex } from '../../../utils/storytelling';
import { audioService } from '../../../services/AudioService';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { CrossfadeImage } from '../../ui/CrossfadeImage';

export function StorytellingPanel({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const composeMode = useAppStore((s) => s.composeMode);
  const nextImage = useAppStore((s) => s.nextImage);
  const prevImage = useAppStore((s) => s.prevImage);
  const praatplaatPosition = useAppStore((s) => s.praatplaatPosition);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  // Local display index (driven by playback sync or manual navigation)
  const [displayIndex, setDisplayIndex] = useState(() => useAppStore.getState().currentImageIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // --- Praatplaat zoom (#80) ---
  const hasPraatplaatZoom = !!praatplaatPosition;
  const [isZoomed, setIsZoomed] = useState(hasPraatplaatZoom);
  const rafRef = useRef<number | null>(null);

  const imageCount = activeStoryboard?.images.length ?? 0;
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

  // --- Praatplaat zoom style (#80) ---
  const ZOOM_LEVEL = 2.5;
  const zoomStyle = (hasPraatplaatZoom && isZoomed && praatplaatPosition)
    ? (() => {
        // Clamp origin so the crop stays within bounds
        // At 2.5× zoom, visible area = 1/2.5 = 40% of image.
        // Origin must be ≥ 20% from edge and ≤ 80% from edge.
        const min = (1 / ZOOM_LEVEL) / 2;           // 0.2
        const max = 1 - min;                          // 0.8
        const ox = Math.min(max, Math.max(min, praatplaatPosition.x)) * 100;
        const oy = Math.min(max, Math.max(min, praatplaatPosition.y)) * 100;
        return {
          transform: `scale(${ZOOM_LEVEL})`,
          transformOrigin: `${ox}% ${oy}%`,
        } as React.CSSProperties;
      })()
    : undefined;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Image container — fills all available space */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-neutral-900/5 rounded overflow-hidden m-1 sm:m-1.5">
        <CrossfadeImage
          src={currentImage.url}
          alt={t(currentImage.label)}
          className="w-full h-full object-contain"
          containerClassName="w-full h-full"
          style={zoomStyle}
        />

        {/* Praatplaat zoom toggle (#80) */}
        {hasPraatplaatZoom && (
          <button
            onClick={() => setIsZoomed((z) => !z)}
            className="absolute top-1.5 right-10 sm:right-11 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
            aria-label={t(isZoomed ? 'studio.praatplaatZoomOut' : 'studio.praatplaatZoomIn')}
          >
            {isZoomed
              ? <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              : <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            }
          </button>
        )}

        {/* Lightbox zoom button */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-1.5 right-1.5 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          aria-label={t('common.zoom')}
        >
          <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

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

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
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
