/**
 * SectionPopover - Edit a section's color and label
 *
 * Portal-based popover (same pattern as VolumePopover).
 * Shows color swatches, label input, and delete button.
 * Closes on Escape or click outside.
 */

import { memo, useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Lock } from 'lucide-react';
import type { Section } from '../../types';
import { SECTION_COLORS } from '../../types';
import { SECTION_LABEL_MAX_LENGTH } from '../../constants/config';

interface SectionPopoverProps {
  section: Section;
  onUpdate: (sectionId: string, updates: Partial<Pick<Section, 'color' | 'label'>>) => void;
  onDelete: (sectionId: string) => void;
  onClose: () => void;
}

export const SectionPopover = memo(function SectionPopover({
  section,
  onUpdate,
  onDelete,
  onClose,
}: SectionPopoverProps) {
  const { t, i18n } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Translate i18n keys (storyboard labels) for display
  const displayLabel = section.label && i18n.exists(section.label) ? t(section.label) : (section.label ?? '');
  const [label, setLabel] = useState(displayLabel);

  // Keep a ref to the latest label so we can save it on unmount
  const labelRef = useRef(label);
  useLayoutEffect(() => {
    labelRef.current = label;
  }, [label]);

  // Save label on unmount (covers click-outside and Escape close)
  useEffect(() => {
    return () => {
      const trimmed = labelRef.current.trim();
      const current = section.label ?? '';
      if (trimmed !== current) {
        onUpdate(section.id, { label: trimmed || undefined });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleColorChange = useCallback(
    (color: string) => {
      onUpdate(section.id, { color });
    },
    [section.id, onUpdate],
  );

  const handleLabelBlur = useCallback(() => {
    const trimmed = label.trim();
    onUpdate(section.id, { label: trimmed || undefined });
  }, [section.id, label, onUpdate]);

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLabelBlur();
      }
    },
    [handleLabelBlur],
  );

  const handleDelete = useCallback(() => {
    onDelete(section.id);
    onClose();
  }, [section.id, onDelete, onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-white rounded-xl shadow-lg border border-neutral-200 p-3 min-w-[220px]"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={t('studio.sections.editSection')}
    >
      {/* Color swatches */}
      <div className="mb-2.5">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
          {t('studio.sections.colorLabel')}
        </span>
        <div className="flex gap-1.5 mt-1.5">
          {SECTION_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`
                w-6 h-6 rounded-full border-2 transition-all cursor-pointer
                ${section.color === color
                  ? 'border-neutral-800 scale-110 shadow-sm'
                  : 'border-transparent hover:border-neutral-300'
                }
              `}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      </div>

      {/* Label input */}
      <div className="mb-2.5">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, SECTION_LABEL_MAX_LENGTH))}
          onBlur={handleLabelBlur}
          onKeyDown={handleLabelKeyDown}
          placeholder={t('studio.sections.labelPlaceholder')}
          maxLength={SECTION_LABEL_MAX_LENGTH}
          readOnly={section.fromStoryboard}
          className={`w-full text-sm px-2 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50
                     focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent
                     placeholder:text-neutral-400 ${section.fromStoryboard ? 'text-text-muted cursor-default' : ''}`}
        />
      </div>

      {/* Delete button (hidden for storyboard-linked sections) */}
      {section.fromStoryboard ? (
        <div className="flex items-center gap-1.5 text-xs text-text-muted px-2 py-1.5">
          <Lock size={12} />
          {t('studio.sections.lockedStoryboard')}
        </div>
      ) : (
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs text-error-500 hover:text-error-600
                     hover:bg-error-50 rounded-lg px-2 py-1.5 transition-colors w-full cursor-pointer"
        >
          <Trash2 size={12} />
          {t('studio.sections.deleteSection')}
        </button>
      )}
    </div>
  );
});
