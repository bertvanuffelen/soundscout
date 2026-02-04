import { memo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Track as TrackType, Sample } from '../../types';
import { useThemeStore } from '../../stores/themeStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { Clip } from './Clip';

interface TrackProps {
  track: TrackType;
  trackIndex: number;
  bpm: number;
  totalBeats: number;
  onRemoveClip: (trackIndex: number, clipId: string) => void;
  snapPreview: { trackId: string; beat: number; durationBeats: number; color: string } | null;
  readOnly?: boolean;
  samples?: Sample[];  // Optional: for read-only mode with custom samples
}

export const Track = memo(function Track({
  track,
  trackIndex,
  bpm,
  totalBeats,
  onRemoveClip,
  snapPreview,
  readOnly = false,
  samples,
}: TrackProps) {
  const themeGetSampleById = useThemeStore((s) => s.getSampleById);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  // Use provided samples array if available, otherwise fall back to theme store
  const getSampleById = useCallback((id: string): Sample | undefined => {
    if (samples) {
      return samples.find(s => s.id === id);
    }
    return themeGetSampleById(id);
  }, [samples, themeGetSampleById]);

  // Clear selection when clicking on empty track space
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      // Only clear if clicking directly on the track or clips area, not on a clip
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  const { setNodeRef, isOver } = useDroppable({
    id: track.id,
    data: { type: 'track', trackIndex },
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      id={track.id}
      onClick={handleTrackClick}
      className={`
        relative h-10 sm:h-12 border-b border-neutral-200 transition-colors duration-150
        ${isOver && !readOnly ? 'bg-primary-100/60' : 'bg-white/40'}
      `}
    >
      {/* Track label */}
      <div className="absolute left-0 top-0 bottom-0 w-5 sm:w-6 flex items-center justify-center bg-neutral-100/80 border-r border-neutral-200 z-10">
        <span className="text-[9px] sm:text-[10px] font-bold text-neutral-400">
          {trackIndex + 1}
        </span>
      </div>

      {/* Clips area */}
      <div
        className="absolute left-5 sm:left-6 right-0 top-0 bottom-0"
        onClick={handleTrackClick}
      >
        {track.clips.map((clip) => {
          const sample = getSampleById(clip.sampleId) as Sample;
          if (!sample) return null;

          return (
            <Clip
              key={clip.id}
              clip={clip}
              sample={sample}
              trackIndex={trackIndex}
              bpm={bpm}
              totalBeats={totalBeats}
              onRemove={(clipId) => onRemoveClip(trackIndex, clipId)}
              readOnly={readOnly}
            />
          );
        })}
        {/* Snap preview ghost */}
        {snapPreview && (
          <div
            className="absolute top-1 bottom-1 rounded-lg border-2 border-dashed pointer-events-none z-20 transition-[left] duration-75"
            style={{
              left: `${(snapPreview.beat / totalBeats) * 100}%`,
              width: `${Math.min((snapPreview.durationBeats / totalBeats) * 100, 100 - (snapPreview.beat / totalBeats) * 100)}%`,
              borderColor: `${snapPreview.color}80`,
              backgroundColor: `${snapPreview.color}15`,
              minWidth: '24px',
            }}
          />
        )}
      </div>
    </div>
  );
});
