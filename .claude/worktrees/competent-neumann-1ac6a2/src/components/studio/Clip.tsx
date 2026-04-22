import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Lock, Sparkles } from 'lucide-react';
import type { Clip as ClipType, Sample } from '../../types';
import { getClipDurationBeats, getEffectiveClipDurationBeats, beatsToSeconds } from '../../utils/audio';
import { SampleIcon } from '../../utils/iconMap';
import { useSelectionStore } from '../../stores/selectionStore';
import { useTimelineStore } from '../../stores/timelineStore';

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

  // Store actions for resize
  const resizeClipLoop = useTimelineStore((s) => s.resizeClipLoop);
  const setClipLoop = useTimelineStore((s) => s.setClipLoop);

  // Calculate dimensions — loop-aware (#65)
  const singleDurationBeats = getClipDurationBeats(clip, sample, bpm);
  const effectiveDurationBeats = getEffectiveClipDurationBeats(clip, sample, bpm);
  const durationSeconds = beatsToSeconds(singleDurationBeats, bpm);
  const leftPercent = (clip.startBeat / totalBeats) * 100;
  const widthPercent = (effectiveDurationBeats / totalBeats) * 100;

  // Effect indicators (#33)
  const hasEffects = ((clip.effects?.pitch ?? 0) !== 0) ||
                     ((clip.effects?.reverb ?? 0) > 0);

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
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        selectClip(clip.id, trackIndex);
      }
    },
    [readOnly, clip.id, trackIndex, selectClip],
  );

  // --- Resize handle for loop (#65) ---
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startX: number; originalBeats: number } | null>(null);

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const currentBeats = clip.loop && clip.loopDurationBeats
      ? clip.loopDurationBeats
      : singleDurationBeats;

    resizeStartRef.current = { startX: e.clientX, originalBeats: currentBeats };
    setIsResizing(true);

    // Calculate beats-per-pixel from the clips area width
    const clipElement = e.currentTarget.parentElement;
    const trackElement = clipElement?.parentElement;
    const trackWidth = trackElement?.clientWidth ?? 1;
    const beatsPerPixel = totalBeats / trackWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!resizeStartRef.current) return;
      const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
      const deltaBeats = deltaX * beatsPerPixel;
      const newBeats = Math.max(singleDurationBeats, resizeStartRef.current.originalBeats + deltaBeats);

      // Snap to half-beat grid
      const snapped = Math.round(newBeats * 2) / 2;

      if (snapped > singleDurationBeats) {
        resizeClipLoop(trackIndex, clip.id, snapped);
      } else {
        // Shrunk back to original size: remove loop
        setClipLoop(trackIndex, clip.id, false);
      }
    };

    const onPointerUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [clip, singleDurationBeats, totalBeats, trackIndex, resizeClipLoop, setClipLoop]);

  // --- Loop repeat visualization (#65) ---
  const loopRepeats = clip.loop && clip.loopDurationBeats ? (() => {
    const totalBeatsClip = clip.loopDurationBeats!;
    const repeats: { leftPct: number; widthPct: number }[] = [];

    let offset = singleDurationBeats;
    while (offset < totalBeatsClip) {
      const remaining = totalBeatsClip - offset;
      const width = Math.min(singleDurationBeats, remaining);
      repeats.push({
        leftPct: (offset / totalBeatsClip) * 100,
        widthPct: (width / totalBeatsClip) * 100,
      });
      offset += singleDurationBeats;
    }
    return repeats;
  })() : null;

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
        ${readOnly ? 'cursor-default' : locked ? 'cursor-not-allowed' : isResizing ? 'cursor-ew-resize' : 'cursor-grab active:cursor-grabbing'} ${isResizing ? '' : 'transition-all'} select-none
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
      {/* Loop repeat overlays (#65) */}
      {loopRepeats && loopRepeats.map((r, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 border-l border-white/30 pointer-events-none"
          style={{
            left: `${r.leftPct}%`,
            width: `${r.widthPct}%`,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
      ))}

      {/* Clip content */}
      <div className="flex items-center gap-1 z-10 min-w-0">
        {locked ? (
          <Lock size={10} className="shrink-0 text-white/70" />
        ) : (
          <SampleIcon name={sample.icon} size={14} className="shrink-0 text-white" />
        )}
        <span className="text-[10px] font-semibold text-white truncate leading-tight">
          {clip.label || t(sample.name)}
        </span>
      </div>

      {/* Effect indicator (#33) */}
      {hasEffects && (
        <div className="absolute right-0.5 bottom-0.5 z-10 pointer-events-none">
          <Sparkles size={10} className="text-white/70" />
        </div>
      )}

      {/* Resize handle (#65) — only visible when selected and not locked/readOnly */}
      {isSelected && !readOnly && !locked && (
        <div
          onPointerDown={handleResizePointerDown}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-30
                     hover:bg-white/30 active:bg-white/50 transition-colors"
          style={{ touchAction: 'none' }}
        />
      )}
    </div>
  );
});
