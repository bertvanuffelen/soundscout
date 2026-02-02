import { memo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Track as TrackType } from '../../types';
import { Track } from './Track';
import { VISIBLE_BEATS } from '../../constants/config';

interface TimelineProps {
  tracks: TrackType[];
  bpm: number;
  totalBeats: number;
  currentBeat: number;
  isPlaying: boolean;
  onRemoveClip: (trackIndex: number, clipId: string) => void;
  snapPreview: { trackId: string; beat: number; durationBeats: number; color: string } | null;
}

export const Timeline = memo(function Timeline({
  tracks,
  bpm,
  totalBeats,
  currentBeat,
  isPlaying,
  onRemoveClip,
  snapPreview,
}: TimelineProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate width multiplier for scrollable content
  const widthMultiplier = totalBeats / VISIBLE_BEATS;
  const playheadPercent = (currentBeat / totalBeats) * 100;

  // Generate grid lines (one per beat)
  const gridLines = Array.from({ length: totalBeats + 1 }, (_, i) => i);

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
      >
        {/* Scrollable content wrapper */}
        <div
          className="relative"
          style={{ width: `${widthMultiplier * 100}%`, minWidth: '100%' }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 left-5 sm:left-6 pointer-events-none">
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
                onRemoveClip={onRemoveClip}
                snapPreview={snapPreview?.trackId === track.id ? snapPreview : null}
              />
            ))}
          </div>

          {/* Playhead */}
          {isPlaying && (
            <div className="absolute inset-0 left-5 sm:left-6 pointer-events-none z-20">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-error-500 transition-[left] duration-75"
                style={{ left: `${playheadPercent}%` }}
              />
            </div>
          )}

          {/* Empty state hint */}
          {tracks.every((tr) => tr.clips.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
