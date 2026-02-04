/**
 * EditToolbar - Contextual toolbar for clip editing
 *
 * Appears above the timeline when a clip is selected.
 * Provides quick access to trim, delete, and other clip operations.
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Scissors, Trash2, Copy } from 'lucide-react';
import type { Clip, Sample } from '../../types';
import { SampleIcon } from '../../utils/iconMap';
import { getClipDuration } from '../../utils/audio';

interface EditToolbarProps {
  clip: Clip;
  sample: Sample;
  onTrim: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export const EditToolbar = memo(function EditToolbar({
  clip,
  sample,
  onTrim,
  onDelete,
  onDuplicate,
}: EditToolbarProps) {
  const { t } = useTranslation();

  // Calculate current clip duration (respects trim)
  const duration = getClipDuration(clip, sample);
  const isTrimmed = clip.trimStart !== undefined || clip.trimEnd !== undefined;

  return (
    <div
      className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-neutral-200 px-2 py-1.5"
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
        <span className="text-[10px] text-neutral-400">
          {duration.toFixed(1)}s
          {isTrimmed && ' ✂'}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        {/* Trim button */}
        <button
          onClick={onTrim}
          className="p-1.5 hover:bg-neutral-100 active:bg-neutral-200 rounded-lg transition-colors"
          title={t('studio.trim')}
        >
          <Scissors size={16} className="text-neutral-600" />
        </button>

        {/* Duplicate button (optional) */}
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="p-1.5 hover:bg-neutral-100 active:bg-neutral-200 rounded-lg transition-colors"
            title={t('studio.duplicate')}
          >
            <Copy size={16} className="text-neutral-600" />
          </button>
        )}

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-error-50 active:bg-error-100 rounded-lg transition-colors"
          title={t('studio.delete')}
        >
          <Trash2 size={16} className="text-error-500" />
        </button>
      </div>
    </div>
  );
});
