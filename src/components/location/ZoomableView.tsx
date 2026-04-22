/**
 * ZoomableView - Fullscreen zoom mode for location exploration
 *
 * Features:
 * - Fullscreen overlay with scaled location view
 * - Touch/mouse pan to navigate
 * - Hotspots remain clickable (correct positions via 16:9 container)
 * - Smooth animations
 *
 * IMPORTANT: Uses a 16:9 aspect ratio container inside the fullscreen overlay
 * to ensure hotspot positions match the original LocationScene layout.
 *
 * Currently shown on mobile portrait only, but built for all screen sizes
 */

import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import type { Location, Sample } from '../../types';
import { Hotspot } from './Hotspot';
import { usePanZoom } from '../../hooks/usePanZoom';

interface ZoomableViewProps {
  location: Location;
  getSampleById: (id: string) => Sample | undefined;
  /** Check if sample should be completely hidden (already collected) */
  isSampleHidden: (sampleId: string) => boolean;
  /** Check if sample should be disabled (e.g., recorder full) */
  isSampleDisabled: () => boolean;
  onCollect: (sample: Sample) => void;
  onHoverStart: (sampleId: string) => void;
  onHoverEnd: (sampleId: string) => void;
  /** Control visibility of zoom button - defaults to mobile portrait only */
  showZoomButton?: 'always' | 'mobile-portrait' | 'mobile' | 'never';
}

// Scale factor for zoomed view
const ZOOM_SCALE = 2.0;

// Aspect ratio of location images (16:9)
const ASPECT_RATIO = 16 / 9;

export function ZoomableView({
  location,
  getSampleById,
  isSampleHidden,
  isSampleDisabled,
  onCollect,
  onHoverStart,
  onHoverEnd,
  showZoomButton = 'mobile-portrait',
}: ZoomableViewProps) {
  const { t } = useTranslation();

  // Pan/zoom logic
  const {
    isZoomed,
    panOffset,
    isDragging,
    canvasDimensions,
    containerRef,
    openZoom,
    closeZoom,
    handlers,
  } = usePanZoom({ zoomScale: ZOOM_SCALE, aspectRatio: ASPECT_RATIO });

  // Determine zoom button visibility class
  const getZoomButtonClass = () => {
    switch (showZoomButton) {
      case 'always':
        return '';
      case 'mobile':
        return 'md:hidden';
      case 'mobile-portrait':
        // Show only on mobile portrait (hide on landscape and desktop)
        return 'landscape:hidden md:hidden';
      case 'never':
        return 'hidden';
      default:
        return 'landscape:hidden md:hidden';
    }
  };

  return (
    <>
      {/* Zoom button - positioned in bottom right of canvas */}
      <button
        onClick={openZoom}
        className={`absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-2
          bg-white/90 hover:bg-white active:bg-neutral-100
          text-brand-800 font-semibold text-sm
          rounded-full shadow-lg backdrop-blur-sm
          transition-all active:scale-95
          ${getZoomButtonClass()}`}
        aria-label={t('location.explore', 'Verkennen')}
      >
        <Search className="w-4 h-4" />
        <span>{t('location.explore', 'Verkennen')}</span>
      </button>

      {/* Fullscreen zoom overlay */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black overflow-hidden touch-none"
          ref={containerRef}
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={handlers.onTouchEnd}
          onMouseDown={handlers.onMouseDown}
          onMouseMove={handlers.onMouseMove}
          onMouseUp={handlers.onMouseUp}
          onMouseLeave={handlers.onMouseLeave}
        >
          {/* Centered, scaled 16:9 canvas container */}
          <div
            className="absolute transition-transform duration-75"
            style={{
              // Position in center of viewport
              left: '50%',
              top: '50%',
              // Size to calculated 16:9 dimensions
              width: canvasDimensions.width,
              height: canvasDimensions.height,
              // Transform: first center, then apply pan and scale
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px) scale(${ZOOM_SCALE})`,
              transformOrigin: 'center center',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            {/* Background image - fills the 16:9 container exactly */}
            <img
              src={location.backgroundImage}
              alt={t(location.name)}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Hotspots - positioned relative to the 16:9 container */}
            {/* Only show hotspots for samples that haven't been collected yet */}
            {location.hotspots.map((hotspot) => {
              const sample = getSampleById(hotspot.sampleId);
              if (!sample) return null;

              // Hide hotspot if sample is already in recorder or collected
              if (isSampleHidden(sample.id)) return null;

              // Disable if recorder is full (but still show the hotspot)
              const disabled = isSampleDisabled();

              return (
                <Hotspot
                  key={hotspot.id}
                  hotspot={hotspot}
                  sample={sample}
                  disabled={disabled}
                  onCollect={onCollect}
                  onHoverStart={onHoverStart}
                  onHoverEnd={onHoverEnd}
                />
              );
            })}
          </div>

          {/* Close button - fixed position, not affected by pan */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeZoom();
            }}
            className="fixed top-4 right-4 z-[60] p-3
              bg-white/90 hover:bg-white active:bg-neutral-100
              text-brand-800 rounded-full shadow-lg
              transition-all active:scale-95"
            aria-label={t('common.close', 'Sluiten')}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Pan hint - shows at bottom */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]
            bg-black/60 text-white text-sm px-4 py-2 rounded-full
            pointer-events-none animate-pulse">
            {t('location.panHint', 'Sleep om rond te kijken')}
          </div>
        </div>
      )}
    </>
  );
}

export default ZoomableView;
