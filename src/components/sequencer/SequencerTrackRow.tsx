/**
 * SequencerTrackRow — één spoor: bediening links (sticky) + stapcellen.
 *
 * Duur-arcering: elk vakje dat binnen de (getrimde) sampleduur ná een
 * actieve stap valt, krijgt een permanente diagonale arcering — zo ziet
 * de leerling hoeveel vakjes een geluid beslaat (wrapt over de loopgrens).
 */

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Sample } from '../../types';
import type { SequencerTrack, SequencerTrackMode } from '../../types/sequencer';
import { effectiveDuration, stepSpanCells } from '../../utils/sequencer';
import { cn } from '../../utils/cn';
import TrackControls from './TrackControls';

interface SequencerTrackRowProps {
  track: SequencerTrack;
  sample: Sample | undefined;
  lengthSteps: number;
  bpm: number;
  /** Actieve kolom tijdens afspelen, anders -1 */
  currentStep: number;
  canRemove: boolean;
  onToggleStep: (stepIndex: number) => void;
  onOpenPicker: () => void;
  onOpenTrim: () => void;
  onSetMode: (mode: SequencerTrackMode) => void;
  onToggleMute: () => void;
  onSetVolume: (volume: number) => void;
  onRemove: () => void;
}

export default memo(function SequencerTrackRow({
  track,
  sample,
  lengthSteps,
  bpm,
  currentStep,
  canRemove,
  onToggleStep,
  onOpenPicker,
  onOpenTrim,
  onSetMode,
  onToggleMute,
  onSetVolume,
  onRemove,
}: SequencerTrackRowProps) {
  const { t } = useTranslation();

  // Arcering: welke niet-actieve cellen vallen in de staart van een actieve stap?
  const shadedCells = useMemo(() => {
    const shaded = new Set<number>();
    if (!sample) return shaded;
    const span = stepSpanCells(
      effectiveDuration(sample, track.trimStart, track.trimEnd),
      bpm
    );
    if (span <= 1) return shaded;
    for (let step = 0; step < lengthSteps; step++) {
      if (!track.steps[step]) continue;
      for (let offset = 1; offset < span; offset++) {
        shaded.add((step + offset) % lengthSteps);
      }
    }
    return shaded;
  }, [sample, track.steps, track.trimStart, track.trimEnd, bpm, lengthSteps]);

  const color = sample?.color ?? 'var(--color-accent-400)';

  return (
    <div className="flex items-stretch gap-2">
      {/* Bediening — sticky zodat hij zichtbaar blijft bij horizontaal scrollen */}
      <div className="sticky left-0 z-10 w-44 sm:w-52 shrink-0 bg-bg-app pr-1">
        <TrackControls
          track={track}
          sample={sample}
          canRemove={canRemove}
          onOpenPicker={onOpenPicker}
          onOpenTrim={onOpenTrim}
          onSetMode={onSetMode}
          onToggleMute={onToggleMute}
          onSetVolume={onSetVolume}
          onRemove={onRemove}
        />
      </div>

      {/* Stapcellen */}
      <div className="flex items-center gap-1">
        {Array.from({ length: lengthSteps }, (_, index) => {
          const isActive = track.steps[index] === true;
          const isShaded = !isActive && shadedCells.has(index);
          const isCurrent = index === currentStep;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onToggleStep(index)}
              aria-pressed={isActive}
              aria-label={t('sequencer.steps', { step: index + 1 })}
              className={cn(
                'relative w-11 h-11 rounded-lg border-2 shrink-0 transition-colors',
                index % 4 === 0 && index > 0 && 'ml-2',
                isActive
                  ? 'border-transparent'
                  : 'bg-white border-border-subtle hover:border-neutral-400',
                isMutedStyle(track.mute, isActive),
                isCurrent && 'ring-2 ring-accent-600 ring-offset-1'
              )}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              {isShaded && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-md pointer-events-none"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent 0 4px, ${color}55 4px 8px)`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

/** Gedempt spoor: actieve cellen worden vaal */
function isMutedStyle(mute: boolean | undefined, isActive: boolean): string {
  return mute && isActive ? 'opacity-40' : '';
}
