import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Square, Repeat, Check, X } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils/cn';

interface TransportControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  hasClips: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onClearAll: () => void;
}

export const TransportControls = memo(function TransportControls({
  isPlaying,
  isLooping,
  hasClips,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
  onClearAll,
}: TransportControlsProps) {
  const { t } = useTranslation();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-t border-border-subtle">
      {/* Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={!hasClips}
        className={cn(
          'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer',
          'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 active:scale-95 text-white',
          'disabled:bg-neutral-300 disabled:cursor-not-allowed disabled:active:scale-100'
        )}
        title={isPlaying ? t('transport.pause') : t('transport.play')}
      >
        {isPlaying ? <Pause className="w-5 h-5 sm:w-[22px] sm:h-[22px]" /> : <Play className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />}
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        disabled={!hasClips}
        className={cn(
          'w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full shadow-sm transition-all cursor-pointer',
          'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 active:scale-95 text-neutral-600',
          'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:active:scale-100'
        )}
        title={t('transport.stop')}
      >
        <Square className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
      </button>

      {/* Loop */}
      <button
        onClick={onToggleLoop}
        className={cn(
          'w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full shadow-sm transition-all cursor-pointer active:scale-95',
          isLooping
            ? 'bg-accent-400 hover:bg-accent-500 active:bg-accent-600 text-accent-900'
            : 'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 text-neutral-600'
        )}
        title={t('transport.loop')}
      >
        <Repeat className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
      </button>

      {/* Divider */}
      <div className="w-px h-6 sm:h-8 bg-neutral-300 mx-0.5 sm:mx-1" />

      {/* Clear All */}
      {showConfirmClear ? (
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm text-danger-600 font-medium">
            {t('transport.confirmClear')}
          </span>
          <Button
            variant="danger"
            size="icon"
            onClick={() => {
              onClearAll();
              setShowConfirmClear(false);
            }}
          >
            <Check size={16} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowConfirmClear(false)}
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirmClear(true)}
          disabled={!hasClips}
          className="hover:bg-danger-100 hover:text-danger-600"
          title={t('transport.clearAll')}
        >
          {t('transport.clearAll')}
        </Button>
      )}
    </div>
  );
});
