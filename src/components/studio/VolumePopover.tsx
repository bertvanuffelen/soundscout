/**
 * VolumePopover - Reusable volume slider + mute toggle
 *
 * Used for both track-level and clip-level volume control.
 * Renders as a small floating panel with a horizontal slider and mute button.
 */

import { memo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import {
  VOLUME_MIN_DB,
  VOLUME_MAX_DB,
  VOLUME_DEFAULT_DB,
  VOLUME_STEP_DB,
} from '../../constants/config';

interface VolumePopoverProps {
  /** Current volume in dB */
  volumeDb: number;
  /** Whether currently muted */
  isMuted: boolean;
  /** Called when volume slider changes */
  onVolumeChange: (db: number) => void;
  /** Called when mute is toggled */
  onMuteToggle: (muted: boolean) => void;
  /** Called when popover should close */
  onClose: () => void;
  /** Label for accessibility (e.g. "Track 1" or sample name) */
  label: string;
}

export const VolumePopover = memo(function VolumePopover({
  volumeDb,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  onClose,
  label,
}: VolumePopoverProps) {
  const { t } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use timeout to avoid catching the opening click
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

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(Number(e.target.value));
    },
    [onVolumeChange],
  );

  const handleReset = useCallback(() => {
    onVolumeChange(VOLUME_DEFAULT_DB);
  }, [onVolumeChange]);

  // Display value
  const displayDb = volumeDb > 0 ? `+${volumeDb}` : `${volumeDb}`;

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-white rounded-xl shadow-lg border border-neutral-200 p-2.5 min-w-[200px]"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={t('studio.volumeFor', { name: label })}
    >
      {/* Header with label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide truncate max-w-[140px]">
          {label}
        </span>
        <span className="text-[10px] text-neutral-400 tabular-nums ml-2">
          {isMuted ? t('studio.muted') : `${displayDb} dB`}
        </span>
      </div>

      {/* Slider + Mute row */}
      <div className="flex items-center gap-2">
        {/* Mute toggle */}
        <button
          onClick={() => onMuteToggle(!isMuted)}
          aria-label={isMuted ? t('studio.unmute') : t('studio.mute')}
          className={`
            p-1.5 rounded-lg transition-colors shrink-0
            min-w-[32px] min-h-[32px] flex items-center justify-center
            ${isMuted
              ? 'bg-error-100 text-error-500 hover:bg-error-200'
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }
          `}
          title={isMuted ? t('studio.unmute') : t('studio.mute')}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Volume slider */}
        <input
          type="range"
          min={VOLUME_MIN_DB}
          max={VOLUME_MAX_DB}
          step={VOLUME_STEP_DB}
          value={volumeDb}
          onChange={handleSliderChange}
          onDoubleClick={handleReset}
          aria-label={t('studio.volume')}
          aria-valuemin={VOLUME_MIN_DB}
          aria-valuemax={VOLUME_MAX_DB}
          aria-valuenow={volumeDb}
          className={`
            flex-1 h-1.5 rounded-full appearance-none cursor-pointer
            bg-neutral-200 accent-accent-500
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500
            [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
            ${isMuted ? 'opacity-40' : ''}
          `}
          disabled={isMuted}
          title={t('studio.volumeSliderHint')}
        />
      </div>
    </div>
  );
});
