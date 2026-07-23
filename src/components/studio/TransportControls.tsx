import { memo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipBack, Repeat, ListMusic } from 'lucide-react';
import { cn } from '../../utils/cn';

type LoopMode = 'off' | 'whole' | 'section';

interface TransportControlsProps {
  isPlaying: boolean;
  hasClips: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRewind: () => void;
  /** Huidige loop-modus: uit / hele compositie / een sectie-bereik. */
  loopMode: LoopMode;
  /** Of "Deze sectie" gekozen kan worden (er bestaan secties). */
  canLoopSection: boolean;
  onLoopWhole: () => void;
  onLoopSection: () => void;
  onLoopOff: () => void;
}

export const TransportControls = memo(function TransportControls({
  isPlaying,
  hasClips,
  onPlay,
  onPause,
  onRewind,
  loopMode,
  canLoopSection,
  onLoopWhole,
  onLoopSection,
  onLoopOff,
}: TransportControlsProps) {
  const { t } = useTranslation();

  // Keuze-popover (testronde 6): klik op de loop-knop terwijl er niet geloopt
  // wordt → kies "Hele compositie" of "Deze sectie". Loopt hij al → uitzetten.
  const [chooserOpen, setChooserOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chooserOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChooserOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [chooserOpen]);

  const isLooping = loopMode !== 'off';

  const handleLoopClick = () => {
    if (isLooping) {
      onLoopOff();
    } else {
      setChooserOpen((v) => !v);
    }
  };

  const loopTitle = isLooping
    ? `${loopMode === 'section' ? t('transport.loopSection') : t('transport.loopWhole')} — ${t('transport.loopStop')}`
    : t('transport.loop');

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-t border-border-subtle">
      {/* Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={!hasClips}
        aria-label={isPlaying ? t('transport.pause') : t('transport.play')}
        className={cn(
          'w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer',
          'bg-accent-500 hover:bg-accent-600 active:bg-accent-700 active:scale-95 text-white',
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
        aria-label={t('transport.rewind')}
        className={cn(
          'w-11 h-11 flex items-center justify-center rounded-full shadow-sm transition-all cursor-pointer',
          'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 active:scale-95 text-neutral-600',
          'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:active:scale-100'
        )}
        title={t('transport.rewind')}
      >
        <SkipBack className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
      </button>

      {/* Loop + keuze-popover */}
      <div className="relative flex items-center gap-1.5">
        <button
          onClick={handleLoopClick}
          aria-label={t('transport.loop')}
          aria-expanded={chooserOpen}
          className={cn(
            'w-11 h-11 flex items-center justify-center rounded-full shadow-sm transition-all cursor-pointer active:scale-95',
            isLooping
              ? 'bg-accent-400 hover:bg-accent-500 active:bg-accent-600 text-accent-900'
              : 'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 text-neutral-600'
          )}
          title={loopTitle}
        >
          <Repeat className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
        </button>

        {/* Vermelding alleen bij sectie-loop (wens Bert TR6) */}
        {loopMode === 'section' && (
          <span className="text-xs font-semibold text-accent-800 bg-accent-100 rounded-full px-2 py-0.5 whitespace-nowrap">
            {t('transport.loopSectionBadge')}
          </span>
        )}

        {chooserOpen && (
          <>
            {/* Backdrop om buiten-klik te vangen */}
            <div className="fixed inset-0 z-40" onClick={() => setChooserOpen(false)} aria-hidden="true" />
            <div
              ref={wrapRef}
              role="menu"
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-56 bg-bg-surface border border-border-subtle rounded-xl shadow-lg p-1.5"
            >
              <p className="text-xs text-text-muted px-2 py-1">{t('transport.loopChoose')}</p>
              <button
                role="menuitem"
                onClick={() => { onLoopWhole(); setChooserOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-text-main hover:bg-neutral-100 transition-colors"
              >
                <Repeat className="w-4 h-4 text-accent-600 shrink-0" />
                {t('transport.loopWhole')}
              </button>
              <button
                role="menuitem"
                onClick={() => { onLoopSection(); setChooserOpen(false); }}
                disabled={!canLoopSection}
                title={!canLoopSection ? t('transport.loopSectionHint') : undefined}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-text-main hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ListMusic className="w-4 h-4 text-accent-600 shrink-0" />
                {t('transport.loopSection')}
              </button>
              {!canLoopSection && (
                <p className="text-[11px] text-text-muted px-2 pt-0.5 pb-1">{t('transport.loopSectionHint')}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
