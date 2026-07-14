/**
 * EditToolbar - Contextual toolbar for clip editing
 *
 * Appears above the timeline when a clip is selected.
 * Provides quick access to trim, delete, duplicate, and volume/mute operations.
 */

import { memo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Scissors, Trash2, Copy, Volume2, VolumeX } from 'lucide-react';
import type { Clip, Sample } from '../../types';
import { SampleIcon } from '../../utils/iconMap';
import { getClipDuration } from '../../utils/audio';
import { VolumePopover } from './VolumePopover';

interface EditToolbarProps {
  clip: Clip;
  sample: Sample;
  onTrim: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onClipVolumeChange?: (db: number) => void;
  onClipMuteToggle?: (muted: boolean) => void;
  /** Locked clips (from template) — hide destructive actions */
  locked?: boolean;
}

export const EditToolbar = memo(function EditToolbar({
  clip,
  sample,
  onTrim,
  onDelete,
  onDuplicate,
  onClipVolumeChange,
  onClipMuteToggle,
  locked = false,
}: EditToolbarProps) {
  const { t } = useTranslation();
  // Popover-anker als state i.p.v. ref-lezen tijdens render (react-hooks/refs):
  // positie wordt vastgelegd op het klikmoment
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);
  const volumeBtnRef = useRef<HTMLButtonElement>(null);

  // Calculate current clip duration (respects trim)
  const duration = getClipDuration(clip, sample);
  const isTrimmed = clip.trimStart !== undefined || clip.trimEnd !== undefined;

  const clipVolume = clip.effects?.volume ?? 0;
  const clipMuted = clip.effects?.mute ?? false;

  const handleVolumeClick = useCallback(() => {
    setPopoverPos((prev) => {
      if (prev) return null;
      const rect = volumeBtnRef.current?.getBoundingClientRect();
      return rect ? { left: rect.left, top: rect.top - 8 } : null;
    });
  }, []);

  const handleClosePopover = useCallback(() => {
    setPopoverPos(null);
  }, []);

  return (
    <div
      className="relative flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-neutral-200 px-2 py-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sample info */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-neutral-200">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: sample.color }}
        />
        <SampleIcon name={sample.icon} size={14} className="text-neutral-600 shrink-0" />
        <span className="text-xs font-medium text-neutral-700 max-w-24 truncate">
          {t(sample.name)}
        </span>
        <span className="text-[10px] text-neutral-400 inline-flex items-center gap-0.5">
          {duration.toFixed(1)}s
          {isTrimmed && <Scissors size={10} aria-hidden="true" />}
        </span>
      </div>

      {/* Action buttons — min 44px touch targets (WCAG 2.5.8) */}
      <div className="flex items-center gap-1">
        {/* Trim button — hidden for locked clips */}
        {!locked && (
          <button
            onClick={onTrim}
            aria-label={t('studio.trim')}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1"
            title={t('studio.trim')}
          >
            <Scissors size={18} className="text-neutral-600" />
          </button>
        )}

        {/* Duplicate button (optional) — hidden for locked clips */}
        {!locked && onDuplicate && (
          <button
            onClick={onDuplicate}
            aria-label={t('studio.duplicate')}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1"
            title={t('studio.duplicate')}
          >
            <Copy size={18} className="text-neutral-600" />
          </button>
        )}

        {/* Volume button */}
        {onClipVolumeChange && onClipMuteToggle && (
          <button
            ref={volumeBtnRef}
            onClick={handleVolumeClick}
            aria-label={t('studio.clipVolume')}
            className={`
              p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors
              focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1
              ${clipMuted
                ? 'bg-error-50 hover:bg-error-100 active:bg-error-200'
                : 'hover:bg-neutral-100 active:bg-neutral-200'
              }
            `}
            title={clipMuted ? t('studio.muted') : t('studio.clipVolume')}
          >
            {clipMuted
              ? <VolumeX size={18} className="text-error-500" />
              : <Volume2 size={18} className="text-neutral-600" />
            }
          </button>
        )}

        {/* Delete button — hidden for locked clips */}
        {!locked && (
          <button
            onClick={onDelete}
            aria-label={t('studio.delete')}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-error-50 active:bg-error-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1"
            title={t('studio.delete')}
          >
            <Trash2 size={18} className="text-error-500" />
          </button>
        )}
      </div>

      {/* Volume popover for clip — portal to escape overflow clipping */}
      {popoverPos && onClipVolumeChange && onClipMuteToggle && createPortal(
        <div
          style={{
            position: 'fixed',
            left: popoverPos.left,
            top: popoverPos.top,
            transform: 'translateY(-100%)',
            zIndex: 9999,
          }}
        >
          <VolumePopover
            volumeDb={clipVolume}
            isMuted={clipMuted}
            onVolumeChange={onClipVolumeChange}
            onMuteToggle={onClipMuteToggle}
            onClose={handleClosePopover}
            label={t(sample.name)}
          />
        </div>,
        document.body,
      )}
    </div>
  );
});
