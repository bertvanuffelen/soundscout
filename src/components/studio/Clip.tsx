import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import type { Clip as ClipType, Sample } from '../../types';
import { secondsToBeats } from '../../utils/audio';
import { CLIP_MIN_WIDTH_PX } from '../../constants/config';
import { SampleIcon } from '../../utils/iconMap';

interface ClipProps {
  clip: ClipType;
  sample: Sample;
  trackIndex: number;
  bpm: number;
  totalBeats: number;
  onRemove: (clipId: string) => void;
}

export const Clip = memo(function Clip({
  clip,
  sample,
  trackIndex,
  bpm,
  totalBeats,
  onRemove,
}: ClipProps) {
  const { t } = useTranslation();
  const durationBeats = secondsToBeats(sample.duration, bpm);
  const leftPercent = (clip.startBeat / totalBeats) * 100;
  const widthPercent = (durationBeats / totalBeats) * 100;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `clip-${clip.id}`,
      data: { type: 'clip', clip, sample, trackIndex },
    });

  const dragStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        absolute top-1 bottom-1 rounded-lg flex items-center gap-1 px-1.5 overflow-hidden
        cursor-grab active:cursor-grabbing group transition-shadow hover:shadow-md select-none
        ${isDragging ? 'opacity-30 z-30' : ''}
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
      {/* Remove button - always visible on touch, hover on desktop */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(clip.id);
        }}
        className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-black/40 sm:bg-black/30 hover:bg-error-500 active:bg-error-600 text-white text-xs rounded-bl-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer z-20"
        title={t('recorder.eject')}
      >
        <X size={10} className="sm:w-3 sm:h-3" />
      </button>
    </div>
  );
});
