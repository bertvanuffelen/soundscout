import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Lock } from 'lucide-react';
import type { Clip as ClipType, Sample } from '../../types';
import { getClipDurationBeats, beatsToSeconds } from '../../utils/audio';
// CLIP_MIN_WIDTH_PX removed: clips scale naturally with zoom level
import { SampleIcon } from '../../utils/iconMap';
import { useSelectionStore } from '../../stores/selectionStore';

interface ClipProps {
  clip: ClipType;
  sample: Sample;
  trackIndex: number;
  bpm: number;
  totalBeats: number;
  readOnly?: boolean;
  isMuted?: boolean;
  /** Locked clips (from template) can't be dragged or deleted */
  locked?: boolean;
}

export const Clip = memo(function Clip({
  clip,
  sample,
  trackIndex,
  bpm,
  totalBeats,
  readOnly = false,
  isMuted = false,
  locked = false,
}: ClipProps) {
  const { t } = useTranslation();

  // Selection state
  const selectedClipId = useSelectionStore((s) => s.selectedClipId);
  const selectClip = useSelectionStore((s) => s.selectClip);
  const isSelected = selectedClipId === clip.id;

  // Calculate dimensions (respects trim boundaries)
  const durationBeats = getClipDurationBeats(clip, sample, bpm);
  const durationSeconds = beatsToSeconds(durationBeats, bpm);
  const leftPercent = (clip.startBeat / totalBeats) * 100;
  const widthPercent = (durationBeats / totalBeats) * 100;

  // Locked clips (from template) can't be dragged, but can still be selected
  const dragDisabled = readOnly || locked;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `clip-${clip.id}`,
      data: { type: 'clip', clip, sample, trackIndex },
      disabled: dragDisabled,
    });

  const dragStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  // Handle click for selection (not drag)
  const handleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    selectClip(clip.id, trackIndex);
  };

  // Handle keyboard selection (Enter or Space)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readOnly) return;
      // Only trigger on Enter or Space key
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        selectClip(clip.id, trackIndex);
      }
    },
    [readOnly, clip.id, trackIndex, selectClip],
  );

  // Build aria-label with clip information
  const ariaLabel = `${t(sample.name)}, ${t('common.clips')}, ${t('studio.startBeat', {
    defaultValue: 'Start beat {{beat}}',
    beat: Math.round(clip.startBeat)
  })}, ${t('common.duration', {
    defaultValue: 'Duration {{duration}}s',
    duration: durationSeconds.toFixed(1)
  })}`;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={readOnly ? -1 : 0}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      className={`
        absolute top-1 bottom-1 rounded-lg flex items-center gap-1 px-1.5 overflow-hidden
        ${readOnly ? 'cursor-default' : locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} transition-all select-none
        ${isDragging ? 'opacity-0' : ''}
        ${isMuted ? 'grayscale opacity-40' : ''}
        ${locked ? 'opacity-75' : ''}
        ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black/20 shadow-lg z-20' : 'hover:shadow-md'}
      `}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
        backgroundColor: `${sample.color}cc`,
        minWidth: 0,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        ...dragStyle,
      }}
      title={t(sample.name)}
    >
      {locked ? (
        <Lock size={10} className="shrink-0 text-white/70" />
      ) : (
        <SampleIcon name={sample.icon} size={14} className="shrink-0 text-white" />
      )}
      <span className="text-[10px] font-semibold text-white truncate leading-tight">
        {t(sample.name)}
      </span>
    </div>
  );
});
