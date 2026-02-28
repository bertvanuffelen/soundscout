import { memo, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Track as TrackType, Sample } from '../../types';
import { Track } from './Track';
import { Playhead } from './Playhead';
import { SectionBar } from './SectionBar';
import { VISIBLE_BEATS, MAX_SECTIONS } from '../../constants/config';
import { useSelectionStore } from '../../stores/selectionStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioStore } from '../../stores/audioStore';
import { Undo2, Redo2, Plus, Flag } from 'lucide-react';

interface TimelineProps {
  tracks: TrackType[];
  bpm: number;
  totalBeats: number;
  currentBeat?: number;  // Optional: uses store subscription if not provided
  isPlaying: boolean;
  onSeek?: (beat: number) => void;
  snapPreview: { trackId: string; beat: number; durationBeats: number; color: string } | null;
  readOnly?: boolean;
  samples?: Sample[];  // Optional: for read-only mode with custom samples
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // A11Y-1: Keyboard add-to-track
  selectedLibrarySampleName?: string | null;
  onAddToTrack?: () => void;
}

export const Timeline = memo(function Timeline({
  tracks,
  bpm,
  totalBeats,
  currentBeat: propCurrentBeat,
  isPlaying,
  onSeek,
  snapPreview,
  readOnly = false,
  samples,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  selectedLibrarySampleName,
  onAddToTrack,
}: TimelineProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const hasNoClips = useTimelineStore((s) => s.selectHasNoClips());

  // Section state
  const sections = useTimelineStore((s) => s.sections);
  const addSection = useTimelineStore((s) => s.addSection);
  const updateSection = useTimelineStore((s) => s.updateSection);
  const removeSection = useTimelineStore((s) => s.removeSection);

  // Subscribe to currentBeat from store (for StudioView)
  // or use prop (for SubmissionPlayer with local state)
  const storeCurrentBeat = useAudioStore((s) => s.currentBeat);
  const currentBeat = propCurrentBeat ?? storeCurrentBeat;

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

  // Mark section at current playhead position
  const handleMarkSection = useCallback(() => {
    // Read currentBeat imperatively to avoid dependency on fast-updating value
    const beat = Math.round(useAudioStore.getState().currentBeat);
    if (beat > 0 && beat <= totalBeats) {
      addSection(beat);
    }
  }, [totalBeats, addSection]);

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
    <div className="flex flex-col shrink-0" role="region" aria-label={t('studio.timeline')}>
      <div className="flex items-center justify-between px-2 sm:px-4 py-1 sm:py-1.5 bg-white/60 md:bg-bg-surface border-b border-border-subtle border-t">
        <h2 className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wide">
          {t('studio.timeline')}
        </h2>
        <div className="flex items-center gap-0.5">
          {/* A11Y-1: Add selected sample to track (keyboard alternative for DnD) */}
          {onAddToTrack && selectedLibrarySampleName && (
            <button
              onClick={onAddToTrack}
              aria-label={t('studio.addToTrack', { name: selectedLibrarySampleName })}
              className="p-1 rounded text-accent-600 hover:text-accent-700 hover:bg-accent-100/60 transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          )}
          {/* Mark section button — only in edit mode with feature flag */}
          {!readOnly && (
            <button
              onClick={handleMarkSection}
              disabled={sections.length >= MAX_SECTIONS}
              aria-label={t('studio.sections.markSection')}
              title={sections.length >= MAX_SECTIONS
                ? t('studio.sections.maxReached')
                : t('studio.sections.markSection')
              }
              className="p-1 rounded text-neutral-400 hover:text-accent-600 hover:bg-accent-100/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            >
              <Flag size={14} />
            </button>
          )}
          {onUndo && onRedo && (
            <>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                aria-label={t('studio.undo')}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                aria-label={t('studio.redo')}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
              >
                <Redo2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

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
          {/* Section bar — shown when sections exist (dev flag or template) */}
          {sections.length > 0 && (
            <div className="relative border-b border-border-subtle">
              {/* Track label spacer */}
              <div className="absolute left-0 top-0 bottom-0 w-5 sm:w-6 bg-neutral-200/50 z-10" />
              <div className="ml-5 sm:ml-6">
                <SectionBar
                  sections={sections}
                  totalBeats={totalBeats}
                  onUpdate={updateSection}
                  onDelete={removeSection}
                />
              </div>
            </div>
          )}

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
