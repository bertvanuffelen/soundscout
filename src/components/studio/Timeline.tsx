import { memo, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Track as TrackType, Sample } from '../../types';
import { Track } from './Track';
import { Playhead } from './Playhead';
import { VISIBLE_BEATS } from '../../constants/config';
import { useSelectionStore } from '../../stores/selectionStore';
import { useTimelineStore } from '../../stores/timelineStore';

interface TimelineProps {
  tracks: TrackType[];
  bpm: number;
  totalBeats: number;
  currentBeat: number;
  isPlaying: boolean;
  onSeek?: (beat: number) => void;
  snapPreview: { trackId: string; beat: number; durationBeats: number; color: string } | null;
  readOnly?: boolean;
  samples?: Sample[];  // Optional: for read-only mode with custom samples
}

export const Timeline = memo(function Timeline({
  tracks,
  bpm,
  totalBeats,
  currentBeat,
  isPlaying,
  onSeek,
  snapPreview,
  readOnly = false,
  samples,
}: TimelineProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const hasNoClips = useTimelineStore((s) => s.selectHasNoClips());

  // Handle click on timeline background to clear selection
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      // Only clear if clicking on timeline background, not on a clip
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  // Calculate width multiplier for scrollable content
  const widthMultiplier = totalBeats / VISIBLE_BEATS;
  const playheadPercent = (currentBeat / totalBeats) * 100;

  // Generate grid lines (one per beat) — memoized since totalBeats rarely changes
  const gridLines = useMemo(
    () => Array.from({ length: totalBeats + 1 }, (_, i) => i),
    [totalBeats],
  );

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerWidth = container.clientWidth;
      const scrollWidth = container.scrollWidth;
      const playheadPosition = (currentBeat / totalBeats) * scrollWidth;

      // Keep playhead in the middle third of the visible area
      const visibleStart = container.scrollLeft;
      const visibleEnd = visibleStart + containerWidth;
      const margin = containerWidth * 0.3;

      if (playheadPosition < visibleStart + margin) {
        container.scrollLeft = Math.max(0, playheadPosition - margin);
      } else if (playheadPosition > visibleEnd - margin) {
        container.scrollLeft = Math.min(scrollWidth - containerWidth, playheadPosition - containerWidth + margin);
      }
    }
  }, [currentBeat, totalBeats, isPlaying]);

  return (
    <div className="flex flex-col shrink-0">
      <h3 className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wide px-2 sm:px-4 py-1.5 sm:py-2 bg-white/60 md:bg-bg-surface border-b border-border-subtle border-t">
        {t('studio.timeline')}
      </h3>

      <div
        ref={scrollContainerRef}
        className="relative overflow-x-auto bg-neutral-50/50 md:bg-neutral-100/50"
        onClick={handleTimelineClick}
      >
        {/* Scrollable content wrapper */}
        <div
          className="relative"
          style={{ width: `${widthMultiplier * 100}%`, minWidth: '100%' }}
        >
          {/* Ruler strip - 16px with measure lines */}
          <div className="relative h-4 border-b border-border-subtle bg-neutral-100/80">
            {/* Track label spacer */}
            <div className="absolute left-0 top-0 bottom-0 w-5 sm:w-6 bg-neutral-200/50" />

            {/* Measure lines in ruler (every 4 beats) */}
            <div className="absolute inset-0 left-5 sm:left-6">
              {gridLines
                .filter((b) => b % 4 === 0)
                .map((beat) => {
                  const leftPercent = (beat / totalBeats) * 100;
                  const measureNumber = beat / 4 + 1;
                  return (
                    <div
                      key={beat}
                      className="absolute top-0 bottom-0 border-l border-neutral-300"
                      style={{ left: `${leftPercent}%` }}
                    >
                      {/* Measure number label */}
                      <span
                        className="absolute left-0.5 top-0 text-[8px] sm:text-[9px] leading-4 text-neutral-400 select-none pointer-events-none"
                      >
                        {measureNumber}
                      </span>
                    </div>
                  );
                })}

              {/* Playhead (handle in ruler + line through tracks) */}
              {onSeek && (
                <Playhead
                  currentBeat={currentBeat}
                  totalBeats={totalBeats}
                  isPlaying={isPlaying}
                  onSeek={onSeek}
                  containerRef={scrollContainerRef}
                />
              )}
            </div>
          </div>

          {/* Grid lines for tracks */}
          <div className="absolute top-4 inset-x-0 bottom-0 left-5 sm:left-6 pointer-events-none">
            {gridLines.map((beat) => {
              const leftPercent = (beat / totalBeats) * 100;
              const isMajor = beat % 4 === 0;
              return (
                <div
                  key={beat}
                  className={`absolute top-0 bottom-0 ${isMajor ? 'border-neutral-300' : 'border-neutral-200/60'}`}
                  style={{
                    left: `${leftPercent}%`,
                    borderLeftWidth: '1px',
                  }}
                />
              );
            })}
          </div>

          {/* Tracks */}
          <div className="relative z-10">
            {tracks.map((track, i) => (
              <Track
                key={track.id}
                track={track}
                trackIndex={i}
                bpm={bpm}
                totalBeats={totalBeats}
                snapPreview={snapPreview?.trackId === track.id ? snapPreview : null}
                readOnly={readOnly}
                samples={samples}
              />
            ))}
          </div>

          {/* Playhead line fallback for read-only mode without seek */}
          {readOnly && !onSeek && (
            <div className="absolute top-4 inset-x-0 bottom-0 left-5 sm:left-6 pointer-events-none z-20">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-error-500 -translate-x-1/2"
                style={{ left: `${playheadPercent}%` }}
              />
            </div>
          )}

          {/* Empty state hint - only show in edit mode */}
          {!readOnly && hasNoClips && (
            <div className="absolute inset-0 top-4 flex items-center justify-center pointer-events-none">
              <p className="text-xs sm:text-sm text-text-muted italic">
                {t('studio.dragHint')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
