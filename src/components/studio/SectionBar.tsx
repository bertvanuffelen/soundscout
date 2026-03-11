/**
 * SectionBar - Visual representation of sections above the timeline ruler
 *
 * Renders colored segments for each section. Each segment is clickable
 * and opens a SectionPopover for editing. Vertical lines mark section boundaries.
 * Only rendered when sections exist.
 */

import { memo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Section } from '../../types';
import { SectionPopover } from './SectionPopover';

interface SectionBarProps {
  sections: Section[];
  totalBeats: number;
  onUpdate: (sectionId: string, updates: Partial<Pick<Section, 'color' | 'label'>>) => void;
  onDelete: (sectionId: string) => void;
  readOnly?: boolean;
}

export const SectionBar = memo(function SectionBar({
  sections,
  totalBeats,
  onUpdate,
  onDelete,
  readOnly = false,
}: SectionBarProps) {
  const { t, i18n } = useTranslation();
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const segmentRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Translate label if it's an i18n key, otherwise return as-is
  const translateLabel = useCallback((label?: string) => {
    if (!label) return undefined;
    // If the key exists in i18n, translate it; otherwise show raw text
    return i18n.exists(label) ? t(label) : label;
  }, [t, i18n]);

  const handleSegmentClick = useCallback((sectionId: string) => {
    setActivePopover((prev) => (prev === sectionId ? null : sectionId));
  }, []);

  const handleClosePopover = useCallback(() => {
    setActivePopover(null);
  }, []);

  // Build segments: each section covers from previous endBeat to its own endBeat
  // Area after last section extends to totalBeats
  const segments: { section: Section; startBeat: number; endBeat: number }[] = [];
  let prevEnd = 0;
  for (const section of sections) {
    segments.push({
      section,
      startBeat: prevEnd,
      endBeat: section.endBeat,
    });
    prevEnd = section.endBeat;
  }

  return (
    <div className="relative h-5 w-full" aria-label="Sections">
      {segments.map(({ section, startBeat, endBeat }) => {
        const leftPercent = (startBeat / totalBeats) * 100;
        const widthPercent = ((endBeat - startBeat) / totalBeats) * 100;

        const segmentStyle = {
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          backgroundColor: `${section.color}40`,
        };

        // Read-only: non-interactive div
        if (readOnly) {
          return (
            <div
              key={section.id}
              className="absolute top-0 bottom-0 flex items-center justify-center
                         border-r-2 border-white/60 overflow-hidden"
              style={segmentStyle}
              title={translateLabel(section.label) || undefined}
            >
              {section.label && (
                <span className="text-[9px] font-bold text-neutral-700 truncate px-1 select-none">
                  {translateLabel(section.label)}
                </span>
              )}
            </div>
          );
        }

        return (
          <button
            key={section.id}
            ref={(el) => {
              if (el) segmentRefs.current.set(section.id, el);
              else segmentRefs.current.delete(section.id);
            }}
            onClick={() => handleSegmentClick(section.id)}
            className="absolute top-0 bottom-0 flex items-center justify-center
                       border-r-2 border-white/60 cursor-pointer transition-opacity
                       hover:opacity-80 overflow-hidden"
            style={segmentStyle}
            title={translateLabel(section.label) || undefined}
          >
            {section.label && (
              <span className="text-[9px] font-bold text-neutral-700 truncate px-1 select-none">
                {translateLabel(section.label)}
              </span>
            )}
          </button>
        );
      })}

      {/* Popover via portal */}
      {activePopover && (() => {
        const ref = segmentRefs.current.get(activePopover);
        const section = sections.find((s) => s.id === activePopover);
        if (!ref || !section) return null;

        const rect = ref.getBoundingClientRect();
        return createPortal(
          <div
            style={{
              position: 'fixed',
              left: Math.min(rect.left, window.innerWidth - 240),
              top: rect.bottom + 4,
              zIndex: 9999,
            }}
          >
            <SectionPopover
              section={section}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onClose={handleClosePopover}
            />
          </div>,
          document.body,
        );
      })()}
    </div>
  );
});
