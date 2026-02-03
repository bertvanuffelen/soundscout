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

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import type { Location, Sample } from '../../types';
import { Hotspot } from './Hotspot';

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

  // Zoom mode state
  const [isZoomed, setIsZoomed] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Refs for touch handling
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Calculate the 16:9 canvas dimensions that fit within the viewport
  const calculateCanvasDimensions = useCallback(() => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportRatio = viewportWidth / viewportHeight;

    let canvasWidth: number;
    let canvasHeight: number;

    if (viewportRatio > ASPECT_RATIO) {
      // Viewport is wider than 16:9 - fit to height
      canvasHeight = viewportHeight;
      canvasWidth = canvasHeight * ASPECT_RATIO;
    } else {
      // Viewport is taller than 16:9 - fit to width
      canvasWidth = viewportWidth;
      canvasHeight = canvasWidth / ASPECT_RATIO;
    }

    return { width: canvasWidth, height: canvasHeight };
  }, []);

  // Calculate pan bounds based on scaled canvas vs viewport
  const calculateBounds = useCallback(() => {
    if (typeof window === 'undefined') return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Scaled canvas dimensions
    const scaledWidth = canvasDimensions.width * ZOOM_SCALE;
    const scaledHeight = canvasDimensions.height * ZOOM_SCALE;

    // How much the scaled canvas extends beyond the viewport
    const extraWidth = Math.max(0, (scaledWidth - viewportWidth) / 2);
    const extraHeight = Math.max(0, (scaledHeight - viewportHeight) / 2);

    return {
      minX: -extraWidth,
      maxX: extraWidth,
      minY: -extraHeight,
      maxY: extraHeight,
    };
  }, [canvasDimensions]);

  // Clamp pan offset within bounds
  const clampPan = useCallback((x: number, y: number) => {
    const bounds = calculateBounds();
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
    };
  }, [calculateBounds]);

  // Touch/Mouse handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...panOffset };
  }, [panOffset]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const newPan = clampPan(
      panStartRef.current.x + deltaX,
      panStartRef.current.y + deltaY
    );

    setPanOffset(newPan);
  }, [isDragging, clampPan]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Note: We don't call e.preventDefault() here because:
      // 1. The container has touchAction: 'none' which already prevents scrolling
      // 2. Calling preventDefault on passive touch events causes console errors
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleMouseLeave = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Open zoom mode
  const openZoom = useCallback(() => {
    // Calculate dimensions before opening
    const dims = calculateCanvasDimensions();
    setCanvasDimensions(dims);
    // Reset pan to center
    setPanOffset({ x: 0, y: 0 });
    setIsZoomed(true);
  }, [calculateCanvasDimensions]);

  // Close zoom mode
  const closeZoom = useCallback(() => {
    setIsZoomed(false);
  }, []);

  // Update dimensions on resize
  useEffect(() => {
    if (!isZoomed) return;

    const handleResize = () => {
      const dims = calculateCanvasDimensions();
      setCanvasDimensions(dims);
      // Re-clamp pan offset with new bounds
      setPanOffset(prev => clampPan(prev.x, prev.y));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isZoomed, calculateCanvasDimensions, clampPan]);

  // Prevent body scroll when zoomed
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isZoomed]);

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
          bg-white/90 hover:bg-white active:bg-gray-100
          text-slate-800 font-semibold text-sm
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
          className="fixed inset-0 z-50 bg-black overflow-hidden"
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ touchAction: 'none' }}
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
              bg-white/90 hover:bg-white active:bg-gray-100
              text-slate-800 rounded-full shadow-lg
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
