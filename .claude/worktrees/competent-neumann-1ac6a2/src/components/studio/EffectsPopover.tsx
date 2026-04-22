/**
 * EffectsPopover - Per-clip audio effects (pitch + reverb)
 *
 * Shows two sliders for pitch shift (-12 to +12 semitones) and
 * reverb wet mix (0-100%). Each slider has a reset button.
 *
 * Portal-rendered (same pattern as VolumePopover).
 */

import { memo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';

interface EffectsPopoverProps {
  /** Pitch shift in semitones (-12 to +12) */
  pitch: number;
  /** Reverb wet mix percentage (0-100) */
  reverb: number;
  /** Called when pitch changes */
  onPitchChange: (pitch: number) => void;
  /** Called when reverb changes */
  onReverbChange: (reverb: number) => void;
  /** Called when popover should close */
  onClose: () => void;
  /** Label for accessibility (e.g. sample name) */
  label: string;
}

export const EffectsPopover = memo(function EffectsPopover({
  pitch,
  reverb,
  onPitchChange,
  onReverbChange,
  onClose,
  label,
}: EffectsPopoverProps) {
  const { t } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePitchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onPitchChange(Number(e.target.value));
    },
    [onPitchChange],
  );

  const handleReverbChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onReverbChange(Number(e.target.value));
    },
    [onReverbChange],
  );

  const handlePitchReset = useCallback(() => onPitchChange(0), [onPitchChange]);
  const handleReverbReset = useCallback(() => onReverbChange(0), [onReverbChange]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-white rounded-xl shadow-lg border border-neutral-200 p-2.5 min-w-[220px]"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={t('studio.effects')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide truncate max-w-[160px]">
          {t('studio.effects')}: {label}
        </span>
      </div>

      {/* Pitch slider */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-neutral-600">
            {t('studio.pitch')}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-400 tabular-nums">
              {pitch > 0 ? `+${pitch}` : pitch}
            </span>
            {pitch !== 0 && (
              <button
                onClick={handlePitchReset}
                aria-label={t('studio.resetEffect')}
                className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-neutral-400 w-6 text-right shrink-0">
            {t('studio.pitchLow')}
          </span>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={pitch}
            onChange={handlePitchChange}
            onDoubleClick={handlePitchReset}
            aria-label={t('studio.pitch')}
            className="
              flex-1 h-1.5 rounded-full appearance-none cursor-pointer
              bg-neutral-200 accent-violet-500
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
            "
          />
          <span className="text-[8px] text-neutral-400 w-6 shrink-0">
            {t('studio.pitchHigh')}
          </span>
        </div>
      </div>

      {/* Reverb slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-neutral-600">
            {t('studio.reverbLabel')}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-400 tabular-nums">
              {reverb}%
            </span>
            {reverb !== 0 && (
              <button
                onClick={handleReverbReset}
                aria-label={t('studio.resetEffect')}
                className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-neutral-400 w-6 text-right shrink-0">
            {t('studio.reverbDry')}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={reverb}
            onChange={handleReverbChange}
            onDoubleClick={handleReverbReset}
            aria-label={t('studio.reverbLabel')}
            className="
              flex-1 h-1.5 rounded-full appearance-none cursor-pointer
              bg-neutral-200 accent-violet-500
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
            "
          />
          <span className="text-[8px] text-neutral-400 w-6 shrink-0">
            {t('studio.reverbWet')}
          </span>
        </div>
      </div>
    </div>
  );
});
