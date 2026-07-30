import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Play, Square, MapPin, GripVertical, Grid3x3, Plus as PlusIcon } from 'lucide-react';
import type { Sample } from '../../types';
import type { SequencerSequence } from '../../types/sequencer';
import { createSequenceSample } from '../../utils/sequencer';
import { SEQUENCE_COLOR } from '../../types/sequencer';
import { SampleIcon } from '../../utils/iconMap';

interface SampleLibraryProps {
  samples: Sample[];
  onPreview: (sampleId: string) => void;
  selectedSampleId?: string | null;
  onSelectSample?: (sampleId: string | null) => void;
  /** Stop de preview van dit geluid (voor de aan/uit-status van de play-knop) */
  onStopPreview?: (sampleId: string) => void;
  /** Sequencer-bundels (fase 2, dev-vlag) — sleepbaar als virtuele sample */
  sequences?: SequencerSequence[];
  /** Open een sequence in de sequencer-tab (klik op de chip) */
  onOpenSequence?: (sequenceId: string) => void;
  /** Maak een nieuwe sequence (gestippelde plus-chip achteraan) */
  onAddSequence?: () => void;
}

/** Bundel-chip in de kleur van de sequence: sleepbaar + klik = patroon bewerken */
const DraggableBundle = memo(function DraggableBundle({
  sequence,
  onOpen,
}: {
  sequence: SequencerSequence;
  onOpen?: (sequenceId: string) => void;
}) {
  const { t } = useTranslation();
  const virtualSample = createSequenceSample(sequence);
  const color = sequence.color ?? SEQUENCE_COLOR;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `bundle-${sequence.id}`,
      data: { type: 'sample', sample: virtualSample },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        borderColor: color,
        backgroundColor: `${color}1a`,
      }}
      onClick={() => onOpen?.(sequence.id)}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border sm:border-2 border-dashed
        transition-all duration-150 select-none shrink-0 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-30 scale-95' : 'hover:shadow-md active:shadow-sm'}
      `}
      title={t('sequencer.studio.editPattern')}
    >
      <div className="flex items-center justify-center w-3 sm:w-4 -ml-0.5 sm:-ml-1 pointer-events-none" style={{ color }}>
        <GripVertical className="w-3 h-4 sm:w-4 sm:h-5" aria-hidden="true" />
      </div>
      <Grid3x3 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color }} aria-hidden="true" />
      <span className="text-[10px] sm:text-sm font-medium whitespace-nowrap text-text-main">
        {sequence.name}
      </span>
    </div>
  );
});

const DraggableSample = memo(function DraggableSample({
  sample,
  onPreview,
  isPlaying,
  isSelected,
  onSelect,
}: {
  sample: Sample;
  onPreview: (sampleId: string) => void;
  isPlaying?: boolean;
  isSelected?: boolean;
  onSelect?: (sampleId: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `library-${sample.id}`,
      data: { type: 'sample', sample },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const handleSampleClick = () => {
    if (onSelect) {
      onSelect(sample.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
      onClick={handleSampleClick}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border sm:border-2
        transition-all duration-150 select-none shrink-0 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-30 scale-95' : 'hover:shadow-md active:shadow-sm'}
        ${isSelected ? 'ring-2 ring-accent-400 border-accent-400 bg-accent-50' : ''}
      `}
      title={t('studio.dragToTimeline')}
    >
      {/* Grip icon — visual indicator only */}
      <div className="flex items-center justify-center w-3 sm:w-4 -ml-0.5 sm:-ml-1 text-neutral-400 pointer-events-none">
        <GripVertical className="w-3 h-4 sm:w-4 sm:h-5" aria-hidden="true" />
      </div>

      <div
        className="w-1 sm:w-2 h-4 sm:h-8 rounded-full shrink-0"
        style={{ backgroundColor: sample.color }}
      />
      <SampleIcon name={sample.icon} size={12} className="text-text-main sm:w-5 sm:h-5" />
      <span className="text-[10px] sm:text-sm font-medium text-text-main whitespace-nowrap">
        {t(sample.name)}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onPreview(sample.id); }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-pressed={isPlaying}
        className={`ml-0.5 sm:ml-1 w-6 h-6 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-sm cursor-pointer shrink-0 transition-colors ${
          isPlaying
            ? 'bg-accent-400 text-accent-900 hover:bg-accent-500'
            : 'bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-500 hover:text-neutral-700'
        }`}
        title={t('recorder.preview')}
      >
        {isPlaying
          ? <Square className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          : <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />}
      </button>
    </div>
  );
});

export const SampleLibrary = memo(function SampleLibrary({
  samples,
  onPreview,
  selectedSampleId,
  onSelectSample,
  onStopPreview,
  sequences = [],
  onOpenSequence,
  onAddSequence,
}: SampleLibraryProps) {
  const { t } = useTranslation();

  // Aan/uit-status van de preview-knopjes (testronde 7): bijhouden welk
  // geluid klinkt; na de sampleduur (of een tweede klik) weer uit.
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const playingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (playingTimerRef.current) clearTimeout(playingTimerRef.current);
  }, []);
  const handlePreviewToggle = (sample: Sample) => {
    if (playingTimerRef.current) clearTimeout(playingTimerRef.current);
    if (playingSampleId === sample.id) {
      onStopPreview?.(sample.id);
      setPlayingSampleId(null);
      return;
    }
    onPreview(sample.id);
    setPlayingSampleId(sample.id);
    playingTimerRef.current = setTimeout(
      () => setPlayingSampleId(null),
      sample.duration * 1000 + 100
    );
  };

  if (samples.length === 0 && sequences.length === 0) {
    return (
      <div className="flex-1 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-b border-border-subtle">
        <p className="text-xs sm:text-sm text-text-muted italic">{t('studio.emptyLibrary')}</p>
        <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          {t('studio.emptyLibraryHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-b border-border-subtle">
      <h2 className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5 sm:mb-2">
        {t('studio.library')}
      </h2>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 content-start overflow-y-auto" role="listbox" aria-label={t('studio.library')}>
        {samples.map((sample) => (
          <DraggableSample
            key={sample.id}
            sample={sample}
            onPreview={() => handlePreviewToggle(sample)}
            isPlaying={playingSampleId === sample.id}
            isSelected={selectedSampleId === sample.id}
            onSelect={onSelectSample ? (id) => onSelectSample(selectedSampleId === id ? null : id) : undefined}
          />
        ))}
        {sequences.map((sequence) => (
          <DraggableBundle
            key={sequence.id}
            sequence={sequence}
            onOpen={onOpenSequence}
          />
        ))}
        {onAddSequence && (
          <button
            type="button"
            onClick={onAddSequence}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border sm:border-2 border-dashed border-accent-400 text-accent-700 hover:bg-accent-50 transition-colors select-none shrink-0"
            title={t('sequencer.studio.addSequence')}
          >
            <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
            <Grid3x3 className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
            <span className="text-[10px] sm:text-sm font-medium whitespace-nowrap">
              {t('sequencer.studio.addSequence')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
});
