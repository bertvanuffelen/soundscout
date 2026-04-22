/**
 * SectionBar - Visual representation of sections above the timeline ruler
 *
 * Renders colored segments for each section. Each segment is clickable
 * and opens a SectionPopover for editing. Drag handles between segments
 * allow resizing sections by dragging the boundary (#47).
 */

import { memo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Section } from '../../types';
import { SectionPopover } from './SectionPopover';

/** Minimum section width in beats — prevents invisible sections */
const MIN_SECTION_BEATS = 2;

interface SectionBarProps {
  sections: Section[];
  totalBeats: number;
  onUpdate: (sectionId: string, updates: Partial<Pick<Section, 'color' | 'label'>>) => void;
  onResize: (sectionId: string, newEndBeat: number) => void;
  onDelete: (sectionId: string) => void;
  readOnly?: boolean;
  /** Allow drag-resizing even when readOnly (used in storyboard mode) */
  resizable?: boolean;
}

export const SectionBar = memo(function SectionBar({
  sections,
  totalBeats,
  onUpdate,
  onResize,
  onDelete,
  readOnly = false,
  resizable = false,
}: SectionBarProps) {
  const { t, i18n } = useTranslation();
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const segmentRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const barRef = useRef<HTMLDivElement>(null);

  // --- Drag state ---
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Translate label if it's an i18n key, otherwise return as-is
  const translateLabel = useCallback((label?: string) => {
    if (!label) return undefined;
    return i18n.exists(label) ? t(label) : label;
  }, [t, i18n]);

  const handleSegmentClick = useCallback((sectionId: string) => {
    setActivePopover((prev) => (prev === sectionId ? null : sectionId));
  }, []);

  const handleClosePopover = useCallback(() => {
    setActivePopover(null);
  }, []);

  // --- Drag resize handlers ---

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    sectionId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(sectionId);
  }, []);

  const handlePointerMove = useCallback((
    e: React.PointerEvent,
    sectionId: string,
    minBeat: number,
    maxBeat: number,
  ) => {
    if (draggingId !== sectionId || !barRef.current) return;

    const bar = barRef.current;
    const rect = bar.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const rawBeat = (relativeX / rect.width) * totalBeats;

    // Clamp between min and max (respecting neighbours + MIN_SECTION_BEATS)
    const clampedBeat = Math.max(minBeat, Math.min(maxBeat, rawBeat));
    // Round to nearest 0.5 beat for slight smoothing
    const snappedBeat = Math.round(clampedBeat * 2) / 2;

    onResize(sectionId, snappedBeat);
  }, [draggingId, totalBeats, onResize]);

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Build segments: each section covers from previous endBeat to its own endBeat
  const segments: { section: Section; startBeat: number; endBeat: number; index: number }[] = [];
  let prevEnd = 0;
  for (let i = 0; i < sections.length; i++) {
    segments.push({
      section: sections[i],
      startBeat: prevEnd,
      endBeat: sections[i].endBeat,
      index: i,
    });
    prevEnd = sections[i].endBeat;
  }

  const canDrag = resizable || !readOnly;
  const canEdit = !readOnly;

  return (
    <div
      ref={barRef}
      className="relative h-5 w-full select-none"
      aria-label="Sections"
    >
      {segments.map(({ section, startBeat, endBeat, index }) => {
        const leftPercent = (startBeat / totalBeats) * 100;
        const widthPercent = ((endBeat - startBeat) / totalBeats) * 100;
        const isLast = index === segments.length - 1;

        const segmentStyle = {
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          backgroundColor: `${section.color}40`,
        };

        // Calculate drag bounds for this section's right handle
        const handleMinBeat = startBeat + MIN_SECTION_BEATS;
        const handleMaxBeat = isLast
          ? totalBeats  // last section can extend to end
          : sections[index + 1].endBeat - MIN_SECTION_BEATS;  // leave room for next section

        const segmentLabel = translateLabel(section.label);

        return (
          <div key={section.id} className="contents">
            {/* Segment */}
            {canEdit ? (
              <button
                ref={(el) => {
                  if (el) segmentRefs.current.set(section.id, el);
                  else segmentRefs.current.delete(section.id);
                }}
                onClick={() => handleSegmentClick(section.id)}
                className="absolute top-0 bottom-0 flex items-center justify-center
                           border-r-2 border-white/60 cursor-pointer transition-opacity
                           hover:opacity-80 overflow-hidden"
                style={segmentStyle}
                title={segmentLabel || undefined}
              >
                {section.label && (
                  <span className="text-[9px] font-bold text-neutral-700 truncate px-1 select-none">
                    {segmentLabel}
                  </span>
                )}
              </button>
            ) : (
              <div
                className="absolute top-0 bottom-0 flex items-center justify-center
                           border-r-2 border-white/60 overflow-hidden"
                style={segmentStyle}
                title={segmentLabel || undefined}
              >
                {section.label && (
                  <span className="text-[9px] font-bold text-neutral-700 truncate px-1 select-none">
                    {segmentLabel}
                  </span>
                )}
              </div>
            )}

            {/* Drag handle on right edge of each section */}
            {canDrag && (
              <div
                className={`absolute top-0 bottom-0 w-2 -translate-x-1/2 z-20
                           cursor-col-resize touch-none
                           ${draggingId === section.id
                             ? 'bg-accent-500/40'
                             : 'hover:bg-accent-400/30'
                           }`}
                style={{ left: `${(endBeat / totalBeats) * 100}%` }}
                onPointerDown={(e) => handlePointerDown(e, section.id)}
                onPointerMove={(e) => handlePointerMove(e, section.id, handleMinBeat, handleMaxBeat)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize ${segmentLabel || `section ${index + 1}`}`}
              />
            )}
          </div>
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
