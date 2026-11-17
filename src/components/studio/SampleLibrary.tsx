import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Play, Square, MapPin, GripVertical, Grid3x3, Music, Plus as PlusIcon, Map as MapIcon, Wand2 } from 'lucide-react';
import type { EffectSound, Sample } from '../../types';
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
  /** Maak een nieuwe sequence (knop in de maakbalk) */
  onAddSequence?: () => void;
  /** Terug naar de kaart om meer geluiden te verzamelen (maakbalk) */
  onCollectMore?: () => void;
  /** Maak een nieuw geluidseffect van een bibliotheekgeluid (maakbalk) */
  onAddEffectSound?: () => void;
  /** Geluidseffecten met hun brongeluid (chips; slepen = plaatsen met effecten) */
  effectSounds?: Array<{ effectSound: EffectSound; source: Sample }>;
  /** Klik op een geluidseffect-chip: Vervormen openen om het aan te passen */
  onOpenEffectSound?: (effectSoundId: string) => void;
  /** Luister naar een geluidseffect (met effecten) */
  onPreviewEffectSound?: (effectSoundId: string) => void;
  /** Luister naar een sequence vanaf de chip (aan/uit) */
  onPreviewSequence?: (sequenceId: string) => void;
  /** Welke sequence klinkt nu via de chip (voor de stopknop) */
  previewSequenceId?: string | null;
}

/** Geluidseffect-chip: gestippeld in de kleur van het brongeluid, toverstaf-icoon */
const DraggableEffectSound = memo(function DraggableEffectSound({
  effectSound,
  source,
  onOpen,
  onPreview,
}: {
  effectSound: EffectSound;
  source: Sample;
  onOpen?: (id: string) => void;
  onPreview?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `fx-${effectSound.id}`,
    data: { type: 'sample', sample: source, effectSound },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none', WebkitTouchCallout: 'none', userSelect: 'none', borderColor: source.color }}
      onClick={() => onOpen?.(effectSound.id)}
      {...listeners}
      {...attributes}
      data-testid="effect-sound-chip"
      className={`
        flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border sm:border-2 border-dashed bg-bg-surface
        transition-all duration-150 select-none shrink-0 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-30 scale-95' : 'hover:shadow-md active:shadow-sm'}
      `}
      title={t('studio.editEffectSound')}
    >
      <div className="flex items-center justify-center w-3 sm:w-4 -ml-0.5 sm:-ml-1 text-neutral-400 pointer-events-none">
        <GripVertical className="w-3 h-4 sm:w-4 sm:h-5" aria-hidden="true" />
      </div>
      <div className="w-1 sm:w-2 h-4 sm:h-8 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
      <Wand2 className="w-3 h-3 sm:w-5 sm:h-5 text-text-main shrink-0" aria-label={t('studio.addEffectSound')} />
      <span className="text-xs sm:text-sm font-semibold text-text-main whitespace-nowrap">{effectSound.name}</span>
      {onPreview && (
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(effectSound.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="ml-0.5 sm:ml-1 w-6 h-6 sm:w-9 sm:h-9 flex items-center justify-center rounded-full cursor-pointer shrink-0 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-500 hover:text-neutral-700 transition-colors"
          title={t('recorder.preview')}
          aria-label={`${t('recorder.preview')}: ${effectSound.name}`}
        >
          <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
        </button>
      )}
    </div>
  );
});

/**
 * Maakbalk (designronde nov 2026): altijd vooraan in de bibliotheek, op een
 * vaste plek — Verzamel meer geluiden · + Sequence · + Geluidseffect. In een
 * smalle bibliotheek (telefoon, of naast het storyboard) drie tegels met een
 * kort woord; breed één rij met de volledige tekst.
 */
function MakeBar({ onCollectMore, onAddSequence, onAddEffectSound }: Pick<SampleLibraryProps, 'onCollectMore' | 'onAddSequence' | 'onAddEffectSound'>) {
  const { t } = useTranslation();
  const items = [
    onCollectMore && { key: 'collect', Icon: MapIcon, plus: false, long: t('studio.collectMore'), short: t('studio.collectMoreShort'), onClick: onCollectMore },
    onAddSequence && { key: 'sequence', Icon: Grid3x3, plus: true, long: t('studio.addSequenceShort'), short: t('studio.addSequenceShort'), onClick: onAddSequence },
    onAddEffectSound && { key: 'effect', Icon: Wand2, plus: true, long: t('studio.addEffectSound'), short: t('studio.addEffectSoundShort'), onClick: onAddEffectSound },
  ].filter(Boolean) as Array<{ key: string; Icon: typeof MapIcon; plus: boolean; long: string; short: string; onClick: () => void }>;
  if (items.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={t('studio.makeBar')}
      className="grid @3xl:flex gap-1.5 sm:gap-2 shrink-0"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ key, Icon, plus, long, short, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          aria-label={plus ? `+ ${long}` : long}
          data-testid={`make-${key}`}
          className="type-body inline-flex flex-col @3xl:flex-row items-center justify-center gap-0.5 @3xl:gap-2 rounded-xl border-2 border-dashed border-accent-400 bg-accent-50 hover:bg-accent-100 active:bg-accent-200 text-accent-900 font-extrabold px-2 @3xl:px-3 min-h-11 @3xl:min-h-12 transition-colors select-none"
        >
          <span className="inline-flex items-center gap-0.5" aria-hidden="true">
            {plus && <PlusIcon className="w-4 h-4" />}
            <Icon className="w-5 h-5" />
          </span>
          <span className="text-xs @3xl:hidden">{short}</span>
          <span className="hidden @3xl:inline whitespace-nowrap">{long}</span>
        </button>
      ))}
    </div>
  );
}

/** Bundel-chip in de kleur van de sequence: sleepbaar + klik = patroon bewerken */
const DraggableBundle = memo(function DraggableBundle({
  sequence,
  onOpen,
  onPreview,
  isPlaying = false,
}: {
  sequence: SequencerSequence;
  onOpen?: (sequenceId: string) => void;
  onPreview?: (sequenceId: string) => void;
  isPlaying?: boolean;
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
      {/* Melodie (V2 Fase 4) = muzieknoot, ritme = raster */}
      {sequence.kind === 'melody'
        ? <Music className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color }} aria-hidden="true" />
        : <Grid3x3 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color }} aria-hidden="true" />}
      <span className="text-xs sm:text-sm font-semibold whitespace-nowrap text-text-main">
        {sequence.name}
      </span>
      {onPreview && (
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(sequence.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={isPlaying}
          aria-label={`${t('recorder.preview')}: ${sequence.name}`}
          data-testid="sequence-chip-preview"
          className={`ml-0.5 sm:ml-1 w-6 h-6 sm:w-9 sm:h-9 flex items-center justify-center rounded-full cursor-pointer shrink-0 transition-colors ${
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
      )}
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
      <span className="text-xs sm:text-sm font-semibold text-text-main whitespace-nowrap">
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
  onCollectMore,
  onAddEffectSound,
  effectSounds = [],
  onOpenEffectSound,
  onPreviewEffectSound,
  onPreviewSequence,
  previewSequenceId = null,
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

  const makeBar = <MakeBar onCollectMore={onCollectMore} onAddSequence={onAddSequence} onAddEffectSound={onAddEffectSound} />;
  const isEmpty = samples.length === 0 && sequences.length === 0 && effectSounds.length === 0;

  return (
    <div className="@container flex-1 flex flex-col min-h-0 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-b border-border-subtle">
      <h2 className="type-label text-text-muted mb-1.5 sm:mb-2">
        {t('studio.library')}
      </h2>
      <div className="flex flex-col @3xl:flex-row @3xl:items-start gap-2 @3xl:gap-3 min-h-0 flex-1">
        {makeBar}
        <div className="hidden @3xl:block w-px self-stretch bg-border-subtle shrink-0" aria-hidden="true" />
        {isEmpty ? (
          <div className="min-w-0">
            <p className="type-body font-semibold text-text-muted italic">{t('studio.emptyLibrary')}</p>
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {t('studio.emptyLibraryHint')}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 content-start overflow-y-auto min-h-0 min-w-0 flex-1 @3xl:self-stretch" role="listbox" aria-label={t('studio.library')}>
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
            {effectSounds.map(({ effectSound, source }) => (
              <DraggableEffectSound
                key={effectSound.id}
                effectSound={effectSound}
                source={source}
                onOpen={onOpenEffectSound}
                onPreview={onPreviewEffectSound}
              />
            ))}
            {sequences.map((sequence) => (
              <DraggableBundle
                key={sequence.id}
                sequence={sequence}
                onOpen={onOpenSequence}
                onPreview={onPreviewSequence}
                isPlaying={previewSequenceId === sequence.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
