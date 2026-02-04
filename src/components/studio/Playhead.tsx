import { memo, useCallback, useState } from 'react';
import { cn } from '../../utils/cn';

interface PlayheadProps {
  currentBeat: number;
  totalBeats: number;
  isPlaying: boolean;
  onSeek: (beat: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Playhead component with draggable handle in ruler strip.
 *
 * - Handle is only draggable when not playing
 * - 44px touch hitbox for accessibility
 * - Visual handle is 12px circle
 */
export const Playhead = memo(function Playhead({
  currentBeat,
  totalBeats,
  isPlaying,
  onSeek,
  containerRef,
}: PlayheadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const playheadPercent = (currentBeat / totalBeats) * 100;

  // Calculate beat from pointer position
  const calculateBeatFromPointer = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return currentBeat;

      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const contentWidth = containerRef.current.scrollWidth;

      // Track label width (left-6 = 24px on sm+)
      const trackLabelWidth = 24;

      // Calculate position relative to content (accounting for scroll)
      const relativeX = clientX - rect.left + scrollLeft - trackLabelWidth;
      const clipAreaWidth = contentWidth - trackLabelWidth;

      // Convert to beat
      const beat = (relativeX / clipAreaWidth) * totalBeats;

      // Clamp to valid range
      return Math.max(0, Math.min(totalBeats, beat));
    },
    [containerRef, currentBeat, totalBeats]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isPlaying) return;

      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
    },
    [isPlaying]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const beat = calculateBeatFromPointer(e.clientX);
      onSeek(beat);
    },
    [isDragging, calculateBeatFromPointer, onSeek]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);

      // Final position
      const beat = calculateBeatFromPointer(e.clientX);
      onSeek(Math.round(beat)); // Snap to nearest beat on release
    },
    [isDragging, calculateBeatFromPointer, onSeek]
  );

  const canDrag = !isPlaying;

  return (
    <>
      {/* Handle in ruler strip - interactive */}
      <div
        className={cn(
          // Large touch hitbox (44px wide)
          'absolute top-0 h-4 w-11 -translate-x-1/2 z-30',
          'flex items-center justify-center',
          canDrag && 'cursor-ew-resize',
          isDragging && 'touch-none'
        )}
        style={{ left: `${playheadPercent}%` }}
        onPointerDown={canDrag ? handlePointerDown : undefined}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Visual handle - circle */}
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2 border-white shadow-sm transition-transform',
            'bg-error-500',
            isDragging && 'scale-125',
            !canDrag && 'opacity-60'
          )}
        />
      </div>

      {/* Vertical line through tracks - non-interactive */}
      {/* Using fixed height because parent container is only 16px, bottom-0 won't extend beyond */}
      <div
        className="absolute top-4 w-0.5 bg-error-500 pointer-events-none z-20 -translate-x-1/2 h-[500px]"
        style={{ left: `${playheadPercent}%` }}
      />
    </>
  );
});
