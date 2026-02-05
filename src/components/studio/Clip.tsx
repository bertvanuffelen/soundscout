import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Clip as ClipType, Sample } from '../../types';
import { getClipDurationBeats } from '../../utils/audio';
import { CLIP_MIN_WIDTH_PX } from '../../constants/config';
import { SampleIcon } from '../../utils/iconMap';
import { useSelectionStore } from '../../stores/selectionStore';

interface ClipProps {
  clip: ClipType;
  sample: Sample;
  trackIndex: number;
  bpm: number;
  totalBeats: number;
  readOnly?: boolean;
}

export const Clip = memo(function Clip({
  clip,
  sample,
  trackIndex,
  bpm,
  totalBeats,
  readOnly = false,
}: ClipProps) {
  const { t } = useTranslation();

  // Selection state
  const selectedClipId = useSelectionStore((s) => s.selectedClipId);
  const selectClip = useSelectionStore((s) => s.selectClip);
  const isSelected = selectedClipId === clip.id;

  // Calculate dimensions (respects trim boundaries)
  const durationBeats = getClipDurationBeats(clip, sample, bpm);
  const leftPercent = (clip.startBeat / totalBeats) * 100;
  const widthPercent = (durationBeats / totalBeats) * 100;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `clip-${clip.id}`,
      data: { type: 'clip', clip, sample, trackIndex },
      disabled: readOnly,
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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`
        absolute top-1 bottom-1 rounded-lg flex items-center gap-1 px-1.5 overflow-hidden
        ${readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} transition-all select-none
        ${isDragging ? 'opacity-0' : ''}
        ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black/20 shadow-lg z-20' : 'hover:shadow-md'}
      `}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
        backgroundColor: `${sample.color}cc`,
        minWidth: `${CLIP_MIN_WIDTH_PX}px`,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        ...dragStyle,
      }}
      title={t(sample.name)}
    >
      <SampleIcon name={sample.icon} size={14} className="shrink-0 text-white" />
      <span className="text-[10px] font-semibold text-white truncate leading-tight">
        {t(sample.name)}
      </span>
    </div>
  );
});
