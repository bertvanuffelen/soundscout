/**
 * CrossfadeImage - Smooth crossfade transition between images (#62)
 *
 * Two persistent image layers avoid DOM insertion glitches.
 *
 * Technique:
 * 1. Wrapper div (relative) creates a positioning context matching the bottom image
 * 2. Bottom layer (normal flow) always shows the CURRENT image — sizes the wrapper
 * 3. Overlay layer (absolute inset-0, always in DOM) fills the wrapper = matches image
 * 4. On src change: overlay snaps to opacity 1 (no transition), then fades to 0
 * 5. When idle, overlay mirrors the current src at opacity 0 (invisible)
 *
 * The wrapper ensures the overlay matches the image area, not the parent container.
 * This prevents size mismatches with object-contain images in flex layouts.
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface CrossfadeImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Extra classes for the wrapper div (e.g. "w-full h-full" to fill parent) */
  containerClassName?: string;
  /** Transition duration in ms (default: 500) */
  duration?: number;
}

export function CrossfadeImage({
  src,
  alt,
  className,
  containerClassName,
  duration = 500,
}: CrossfadeImageProps) {
  // Bottom layer: always shows the current (new) image — in normal flow for sizing
  const [displaySrc, setDisplaySrc] = useState(src);
  // Overlay: persistent in DOM, shows old image during crossfade
  const [overlaySrc, setOverlaySrc] = useState(src);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  // Whether the overlay is actively transitioning (determines CSS transition)
  const [transitioning, setTransitioning] = useState(false);

  const prevSrcRef = useRef(src);
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (src !== prevSrcRef.current) {
      // 1. Overlay keeps showing the OLD image, snap to opacity 1 (no transition)
      setOverlaySrc(prevSrcRef.current);
      setOverlayOpacity(1);
      setTransitioning(false);

      // 2. Bottom layer switches to NEW image (hidden behind overlay)
      setDisplaySrc(src);
      prevSrcRef.current = src;

      // 3. After browser paints, enable transition and fade overlay out
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
      const fadeTimer = setTimeout(() => {
        setTransitioning(true);
        setOverlayOpacity(0);
      }, 30);

      // 4. After transition completes, sync overlay to current src
      cleanupRef.current = setTimeout(() => {
        setOverlaySrc(src);
        setTransitioning(false);
      }, duration + 80);

      return () => clearTimeout(fadeTimer);
    }
  }, [src, duration]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
    };
  }, []);

  return (
    <div className={cn('relative', containerClassName)}>
      {/* Bottom: current image — in normal flow (determines wrapper size) */}
      <img src={displaySrc} alt={alt} className={className} />

      {/* Overlay: fills wrapper (not grandparent) — old image fading out */}
      <img
        src={overlaySrc}
        alt=""
        aria-hidden="true"
        className={cn(className, 'absolute inset-0 pointer-events-none')}
        style={{
          opacity: overlayOpacity,
          transition: transitioning ? `opacity ${duration}ms ease-in-out` : 'none',
        }}
      />
    </div>
  );
}
