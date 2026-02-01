import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Track as TrackType } from '../../types';
import { Track } from './Track';

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
  const playheadPercent = (currentBeat / totalBeats) * 100;

  // Generate grid lines (one per beat)
  const gridLines = Array.from({ length: totalBeats + 1 }, (_, i) => i);

  return (
    <div className="flex flex-col shrink-0">
      <h3 className="text-[10px] sm:text-xs font-bold text-primary-600 uppercase tracking-wide px-2 sm:px-4 py-1.5 sm:py-2 bg-white/60 border-b border-neutral-200 border-t">
        {t('studio.timeline')}
      </h3>

      <div className="relative overflow-hidden bg-neutral-50/50">
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
            <p className="text-xs sm:text-sm text-neutral-400 italic">
              {t('studio.dragHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
