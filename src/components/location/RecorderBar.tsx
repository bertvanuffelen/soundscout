import { useTranslation } from 'react-i18next';
import type { Sample } from '../../types';
import { SampleIcon } from '../../utils/iconMap';

interface RecorderBarProps {
  slots: (Sample | null)[];
  onEject: (sampleId: string) => void;
  onPreview: (sampleId: string) => void;
}

export function RecorderBar({ slots, onEject, onPreview }: RecorderBarProps) {
  const { t } = useTranslation();
  const count = slots.filter((s) => s !== null).length;

  return (
    <div className="absolute bottom-0 left-0 right-0 md:bottom-2 md:left-2 md:right-2 bg-white/95 backdrop-blur-sm border-t border-border-subtle md:border md:rounded-2xl md:shadow-lg px-2 sm:px-4 py-2 sm:py-3 z-10">
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        <h3 className="text-xs sm:text-sm font-bold text-text-main">{t('recorder.title')}</h3>
        <span className="text-[10px] sm:text-xs font-semibold text-text-muted bg-neutral-100 px-1.5 sm:px-2 py-0.5 rounded-full">
          {count}/{slots.length}
        </span>
      </div>

      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto">
        {slots.map((slot, i) => (
          <div key={i} className="flex-1 min-w-[48px] sm:min-w-[56px]">
            {slot ? (
              <div
                className="flex flex-col items-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-colors duration-150 cursor-pointer hover:bg-neutral-50 active:bg-neutral-100"
                style={{
                  backgroundColor: `${slot.color}15`,
                  borderColor: slot.color,
                  borderWidth: '2px',
                  borderStyle: 'solid',
                }}
                onClick={() => onPreview(slot.id)}
              >
                <SampleIcon name={slot.icon} size={18} className="text-text-main sm:w-[22px] sm:h-[22px]" />
                <span className="text-[9px] sm:text-[10px] font-medium text-text-muted truncate w-full text-center leading-tight">
                  {t(slot.name)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEject(slot.id);
                  }}
                  className="text-[10px] sm:text-xs text-error-400 hover:text-error-600 active:text-error-600 font-semibold cursor-pointer transition-colors px-2 sm:px-3 py-1 sm:py-1.5 -mb-0.5 sm:-mb-1 rounded-md hover:bg-error-50 active:bg-error-100"
                  title={t('recorder.eject')}
                >
                  {t('recorder.eject')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl p-1.5 sm:p-2 border-2 border-dashed border-neutral-300 min-h-[60px] sm:min-h-[72px]">
                <span className="text-neutral-300 text-[10px] sm:text-xs">{t('recorder.empty')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
