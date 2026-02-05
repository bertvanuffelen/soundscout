import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipBack, Repeat } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TransportControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  hasClips: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRewind: () => void;
  onToggleLoop: () => void;
}

export const TransportControls = memo(function TransportControls({
  isPlaying,
  isLooping,
  hasClips,
  onPlay,
  onPause,
  onRewind,
  onToggleLoop,
}: TransportControlsProps) {
  const { t } = useTranslation();

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

      {/* Rewind */}
      <button
        onClick={onRewind}
        disabled={!hasClips}
        className={cn(
          'w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full shadow-sm transition-all cursor-pointer',
          'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 active:scale-95 text-neutral-600',
          'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:active:scale-100'
        )}
        title={t('transport.rewind')}
      >
        <SkipBack className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
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
    </div>
  );
});
