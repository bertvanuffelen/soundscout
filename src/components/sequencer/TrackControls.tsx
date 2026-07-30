/**
 * TrackControls — bediening van één sequencer-spoor:
 * geluid kiezen, uitklinken/afkappen, dempen, volume, trim, verwijderen.
 */

import { useTranslation } from 'react-i18next';
import { Scissors, Trash2, Volume2, VolumeX } from 'lucide-react';
import type { Sample } from '../../types';
import type { SequencerTrack, SequencerTrackMode } from '../../types/sequencer';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';

interface TrackControlsProps {
  track: SequencerTrack;
  sample: Sample | undefined;
  canRemove: boolean;
  onOpenPicker: () => void;
  onOpenTrim: () => void;
  onSetMode: (mode: SequencerTrackMode) => void;
  onToggleMute: () => void;
  onSetVolume: (volume: number) => void;
  onRemove: () => void;
}

export default function TrackControls({
  track,
  sample,
  canRemove,
  onOpenPicker,
  onOpenTrim,
  onSetMode,
  onToggleMute,
  onSetVolume,
  onRemove,
}: TrackControlsProps) {
  const { t } = useTranslation();
  const isMuted = track.mute === true;

  return (
    <div className="flex flex-col gap-1.5 py-1">
      {/* Geluid kiezen */}
      <button
        type="button"
        onClick={onOpenPicker}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left min-h-9',
          'bg-white border-border-subtle hover:bg-neutral-50 transition-colors'
        )}
        title={sample ? t('sequencer.changeSample') : t('sequencer.chooseSample')}
      >
        {sample ? (
          <>
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: sample.color }}
              aria-hidden
            />
            <SampleIcon name={sample.icon} size={14} className="text-text-main shrink-0" />
            <span className="text-xs font-semibold text-text-main truncate">
              {t(sample.name)}
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold text-text-muted">
            {t('sequencer.chooseSample')}
          </span>
        )}
      </button>

      <div className="flex items-center gap-1">
        {/* Uitklinken / afkappen */}
        <div
          className="flex rounded-lg border border-border-subtle overflow-hidden"
          role="group"
          aria-label={t('sequencer.mode.label')}
        >
          {(['ring', 'cut'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSetMode(mode)}
              aria-pressed={track.mode === mode}
              className={cn(
                'px-1.5 py-1 text-[10px] font-bold leading-none min-h-7',
                track.mode === mode
                  ? 'bg-accent-400 text-accent-900'
                  : 'bg-white text-text-muted hover:bg-neutral-50'
              )}
            >
              {t(`sequencer.mode.${mode}`)}
            </button>
          ))}
        </div>

        {/* Dempen */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={isMuted}
          aria-label={isMuted ? t('sequencer.unmute') : t('sequencer.mute')}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center border',
            isMuted
              ? 'bg-error-500 border-error-500 text-white'
              : 'bg-white border-border-subtle text-text-muted hover:bg-neutral-50'
          )}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <Volume2 className="w-3.5 h-3.5" aria-hidden />
          )}
        </button>

        {/* Trim */}
        <button
          type="button"
          onClick={onOpenTrim}
          disabled={!sample}
          aria-label={t('sequencer.trim.title')}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center border',
            'bg-white border-border-subtle text-text-muted hover:bg-neutral-50',
            'disabled:opacity-40 disabled:pointer-events-none'
          )}
        >
          <Scissors className="w-3.5 h-3.5" aria-hidden />
        </button>

        {/* Verwijderen */}
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('sequencer.removeTrack')}
            className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white border-border-subtle text-error-500 hover:bg-error-50"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* Volume */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={track.volume ?? 1}
        onChange={(e) => onSetVolume(Number(e.target.value))}
        aria-label={t('sequencer.volume')}
        className="w-full h-2 accent-accent-500"
      />
    </div>
  );
}
