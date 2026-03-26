/**
 * VolumePopover - Reusable volume slider + mute toggle
 *
 * Used for both track-level and clip-level volume control.
 * Renders as a small floating panel with a horizontal slider and mute button.
 *
 * The slider operates in PERCENTAGE space (0–200%) for intuitive UX:
 *   0% = silent, 100% = normal (center), 200% = boosted
 * Internally, values are stored in dB and converted at the boundary.
 */

import { memo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import {
  VOLUME_MIN_DB,
  VOLUME_DEFAULT_DB,
} from '../../constants/config';

// --- Conversion helpers ---

/** Convert dB to percentage (0 dB = 100%) */
function dbToPercent(db: number): number {
  if (db <= VOLUME_MIN_DB) return 0;
  return Math.round(Math.pow(10, db / 20) * 100);
}

/** Convert percentage to dB (100% = 0 dB). Clamps to VOLUME_MIN_DB at 0%. */
function percentToDb(percent: number): number {
  if (percent <= 0) return VOLUME_MIN_DB;
  return 20 * Math.log10(percent / 100);
}

// Slider constants (in percentage space)
const SLIDER_MIN = 0;
const SLIDER_MAX = 200;
const SLIDER_STEP = 5;

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
  /** Optional: current track color (#67) — shows color picker when provided */
  trackColor?: string;
  /** Optional: callback when track color changes (#67) */
  onTrackColorChange?: (color: string | undefined) => void;
  /** Optional: color palette to choose from (#67) */
  colorPalette?: readonly string[];
}

export const VolumePopover = memo(function VolumePopover({
  volumeDb,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  onClose,
  label,
  trackColor,
  onTrackColorChange,
  colorPalette,
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

  // Convert dB → percentage for the slider
  const sliderPercent = dbToPercent(volumeDb);

  // Slider change: convert percentage → dB and propagate
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const percent = Number(e.target.value);
      onVolumeChange(percentToDb(percent));
    },
    [onVolumeChange],
  );

  // Reset to 100% (0 dB)
  const handleReset = useCallback(() => {
    onVolumeChange(VOLUME_DEFAULT_DB);
  }, [onVolumeChange]);

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
          {isMuted ? t('studio.muted') : `${sliderPercent}%`}
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

        {/* Volume slider — operates in percentage space (0–200%) */}
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={sliderPercent}
          onChange={handleSliderChange}
          onDoubleClick={handleReset}
          aria-label={t('studio.volume')}
          aria-valuemin={SLIDER_MIN}
          aria-valuemax={SLIDER_MAX}
          aria-valuenow={sliderPercent}
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

      {/* Track color picker (#67) — only shown when colorPalette is provided */}
      {colorPalette && onTrackColorChange && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-neutral-100">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide shrink-0">
            {t('studio.trackColor')}
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {/* No-color option */}
            <button
              onClick={() => onTrackColorChange(undefined)}
              aria-label={t('studio.noColor')}
              className={`
                w-4 h-4 rounded-full border transition-all
                ${!trackColor
                  ? 'border-neutral-400 ring-1 ring-neutral-400 ring-offset-1 bg-white'
                  : 'border-neutral-300 bg-neutral-100 hover:border-neutral-400'
                }
              `}
            />
            {colorPalette.map((color) => (
              <button
                key={color}
                onClick={() => onTrackColorChange(color)}
                aria-label={color}
                className={`
                  w-4 h-4 rounded-full border transition-all
                  ${trackColor === color
                    ? 'ring-1 ring-offset-1 border-transparent'
                    : 'border-transparent hover:scale-110'
                  }
                `}
                style={{
                  backgroundColor: color,
                  ...(trackColor === color ? { ringColor: color } : {}),
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
