import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Play } from 'lucide-react';
import type { Sample } from '../../types';
import { SampleIcon } from '../../utils/iconMap';

interface SampleLibraryProps {
  samples: Sample[];
  onPreview: (sampleId: string) => void;
}

const DraggableSample = memo(function DraggableSample({
  sample,
  onPreview,
}: {
  sample: Sample;
  onPreview: (sampleId: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `library-${sample.id}`,
      data: { type: 'sample', sample },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-xl border sm:border-2
        transition-opacity duration-150 select-none shrink-0
        ${isDragging ? 'opacity-30 scale-95' : 'hover:shadow-md active:shadow-sm'}
      `}
    >
      {/* Drag handle - only this element triggers drag */}
      <div
        {...listeners}
        {...attributes}
        className="flex items-center justify-center w-4 sm:w-6 h-5 sm:h-10 -ml-0.5 sm:-ml-1 cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 transition-colors"
        style={{
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
        title={t('studio.dragToTimeline')}
      >
        <svg
          width="12"
          height="20"
          viewBox="0 0 12 20"
          fill="currentColor"
          className="pointer-events-none w-2 sm:w-3 h-3 sm:h-5"
        >
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="10" r="1.5" />
          <circle cx="9" cy="10" r="1.5" />
          <circle cx="3" cy="17" r="1.5" />
          <circle cx="9" cy="17" r="1.5" />
        </svg>
      </div>

      <div
        className="w-1 sm:w-2 h-4 sm:h-8 rounded-full shrink-0"
        style={{ backgroundColor: sample.color }}
      />
      <SampleIcon name={sample.icon} size={12} className="text-text-main sm:w-5 sm:h-5" />
      <span className="text-[10px] sm:text-sm font-medium text-text-main whitespace-nowrap">
        {t(sample.name)}
      </span>
      <button
        onClick={() => onPreview(sample.id)}
        className="ml-0.5 sm:ml-1 w-5 h-5 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-500 hover:text-neutral-700 text-sm cursor-pointer shrink-0 transition-colors"
        title={t('recorder.preview')}
      >
        <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
      </button>
    </div>
  );
});

export const SampleLibrary = memo(function SampleLibrary({ samples, onPreview }: SampleLibraryProps) {
  const { t } = useTranslation();

  if (samples.length === 0) {
    return (
      <div className="flex-1 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-b border-border-subtle">
        <p className="text-xs sm:text-sm text-text-muted italic">{t('studio.emptyLibrary')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-b border-border-subtle">
      <h2 className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5 sm:mb-2">
        {t('studio.library')}
      </h2>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 content-start overflow-y-auto">
        {samples.map((sample) => (
          <DraggableSample
            key={sample.id}
            sample={sample}
            onPreview={onPreview}
          />
        ))}
      </div>
    </div>
  );
});
