import { memo, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { Volume2, VolumeX } from 'lucide-react';
import type { Track as TrackType, Sample } from '../../types';
import { TRACK_COLORS } from '../../types';
import { useThemeStore } from '../../stores/themeStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAppStore } from '../../stores/appStore';
import { Clip } from './Clip';
import { VolumePopover } from './VolumePopover';

interface TrackProps {
  track: TrackType;
  trackIndex: number;
  bpm: number;
  totalBeats: number;
  snapPreview: { trackId: string; beat: number; durationBeats: number; color: string } | null;
  readOnly?: boolean;
  samples?: Sample[];  // Optional: for read-only mode with custom samples
}

export const Track = memo(function Track({
  track,
  trackIndex,
  bpm,
  totalBeats,
  snapPreview,
  readOnly = false,
  samples,
}: TrackProps) {
  const { t } = useTranslation();
  const themeGetSampleById = useThemeStore((s) => s.getSampleById);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const updateTrackVolume = useTimelineStore((s) => s.updateTrackVolume);
  const setTrackMute = useTimelineStore((s) => s.setTrackMute);
  const updateTrackColor = useTimelineStore((s) => s.updateTrackColor);

  // Section state (for background colors)
  const sections = useTimelineStore((s) => s.sections);

  // Template lock options (#59)
  const templateLockOptions = useAppStore((s) => s.templateLockOptions);

  // Volume popover state
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const volumeBtnRef = useRef<HTMLButtonElement>(null);

  const trackVolume = track.volume ?? 0;
  const trackMuted = track.mute ?? false;

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

  const handleVolumeIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVolumePopover((prev) => !prev);
  }, []);

  const handleVolumeChange = useCallback(
    (db: number) => updateTrackVolume(trackIndex, db),
    [trackIndex, updateTrackVolume],
  );

  const handleMuteToggle = useCallback(
    (muted: boolean) => setTrackMute(trackIndex, muted),
    [trackIndex, setTrackMute],
  );

  const handleTrackColorChange = useCallback(
    (color: string | undefined) => updateTrackColor(trackIndex, color),
    [trackIndex, updateTrackColor],
  );

  const handleClosePopover = useCallback(() => {
    setShowVolumePopover(false);
  }, []);

  const { setNodeRef, isOver } = useDroppable({
    id: track.id,
    data: { type: 'track', trackIndex },
    disabled: readOnly,
  });

  const clipCount = track.clips.length;
  const trackLabel = `${t('common.tracks')} ${trackIndex + 1}, ${clipCount} ${t('common.clips').toLowerCase()}`;

  return (
    <div
      ref={setNodeRef}
      id={track.id}
      role="list"
      aria-label={trackLabel}
      onClick={handleTrackClick}
      className={`
        relative h-10 sm:h-12 border-b border-neutral-200 transition-colors duration-150 touch-none
        ${isOver && !readOnly ? 'bg-primary-100/60' : 'bg-white/40'}
      `}
      style={track.color ? { backgroundColor: `${track.color}12` } : undefined}
    >
      {/* Track label with volume icon */}
      <div
        className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 flex flex-col items-center justify-center border-r border-neutral-200 z-10 gap-0.5"
        style={track.color ? { backgroundColor: `${track.color}25` } : { backgroundColor: 'var(--color-bg-surface)' }}
      >
        <span className="text-[8px] sm:text-[10px] font-bold text-neutral-400" aria-hidden="true">
          {trackIndex + 1}
        </span>
        {/* Volume icon — only in edit mode */}
        {!readOnly && (
          <button
            ref={volumeBtnRef}
            onClick={handleVolumeIconClick}
            aria-label={t('studio.trackVolume', { track: trackIndex + 1 })}
            className={`
              w-4 h-4 flex items-center justify-center rounded transition-colors cursor-pointer
              ${trackMuted
                ? 'text-error-500 hover:text-error-600'
                : 'text-neutral-400 hover:text-neutral-600'
              }
            `}
            title={trackMuted ? t('studio.muted') : t('studio.trackVolume', { track: trackIndex + 1 })}
          >
            {trackMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
          </button>
        )}
      </div>

      {/* Volume popover — rendered via portal to escape overflow clipping */}
      {showVolumePopover && volumeBtnRef.current && createPortal(
        <div
          style={{
            position: 'fixed',
            left: volumeBtnRef.current.getBoundingClientRect().right + 4,
            top: volumeBtnRef.current.getBoundingClientRect().top,
            zIndex: 9999,
          }}
        >
          <VolumePopover
            volumeDb={trackVolume}
            isMuted={trackMuted}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onClose={handleClosePopover}
            label={`${t('common.tracks')} ${trackIndex + 1}`}
            trackColor={track.color}
            onTrackColorChange={handleTrackColorChange}
            colorPalette={TRACK_COLORS}
          />
        </div>,
        document.body,
      )}

      {/* Clips area */}
      <div
        className="absolute left-4 sm:left-6 right-0 top-0 bottom-0"
        onClick={handleTrackClick}
      >
        {/* Section background colors */}
        {sections.length > 0 && (() => {
          let prevEnd = 0;
          return sections.map((section) => {
            const startBeat = prevEnd;
            prevEnd = section.endBeat;
            const leftPct = (startBeat / totalBeats) * 100;
            const widthPct = ((section.endBeat - startBeat) / totalBeats) * 100;
            return (
              <div
                key={section.id}
                className="absolute top-0 bottom-0 pointer-events-none z-0"
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: section.color,
                  opacity: 0.07,
                }}
              />
            );
          });
        })()}

        {track.clips.map((clip) => {
          const sample = getSampleById(clip.sampleId) as Sample;
          if (!sample) return null;

          const isClipMuted = trackMuted || (clip.effects?.mute ?? false);

          return (
            <Clip
              key={clip.id}
              clip={clip}
              sample={sample}
              trackIndex={trackIndex}
              bpm={bpm}
              totalBeats={totalBeats}
              readOnly={readOnly}
              isMuted={isClipMuted}
              locked={templateLockOptions.clipsLocked && (clip.fromTemplate === true)}
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
