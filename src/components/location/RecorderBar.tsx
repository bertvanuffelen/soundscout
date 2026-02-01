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
    <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t-2 border-sky-200 px-2 sm:px-4 py-2 sm:py-3 z-10">
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        <h3 className="text-xs sm:text-sm font-bold text-sky-700">{t('recorder.title')}</h3>
        <span className="text-[10px] sm:text-xs font-semibold text-sky-500 bg-sky-100 px-1.5 sm:px-2 py-0.5 rounded-full">
          {count}/{slots.length}
        </span>
      </div>

      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto">
        {slots.map((slot, i) => (
          <div key={i} className="flex-1 min-w-[48px] sm:min-w-[56px]">
            {slot ? (
              <div
                className="flex flex-col items-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-colors duration-150 cursor-pointer hover:bg-sky-50 active:bg-sky-100"
                style={{
                  backgroundColor: `${slot.color}15`,
                  borderColor: slot.color,
                  borderWidth: '2px',
                  borderStyle: 'solid',
                }}
                onClick={() => onPreview(slot.id)}
              >
                <SampleIcon name={slot.icon} size={18} className="text-gray-700 sm:w-[22px] sm:h-[22px]" />
                <span className="text-[9px] sm:text-[10px] font-medium text-gray-600 truncate w-full text-center leading-tight">
                  {t(slot.name)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEject(slot.id);
                  }}
                  className="text-[10px] sm:text-xs text-red-400 hover:text-red-600 active:text-red-700 font-semibold cursor-pointer transition-colors px-2 sm:px-3 py-1 sm:py-1.5 -mb-0.5 sm:-mb-1 rounded-md hover:bg-red-50 active:bg-red-100"
                  title={t('recorder.eject')}
                >
                  {t('recorder.eject')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg sm:rounded-xl p-1.5 sm:p-2 border-2 border-dashed border-gray-300 min-h-[60px] sm:min-h-[72px]">
                <span className="text-gray-300 text-[10px] sm:text-xs">{t('recorder.empty')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
