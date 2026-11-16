import { memo, useState, useEffect, useRef, type ReactNode } from 'react';
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
  /** Extra bediening rechts in de balk (tempo-keuze, V2 Fase 4). */
  trailing?: ReactNode;
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
  trailing,
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
    <div className="flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-brand-900 border-t border-brand-800 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Drie zones: lege linkerkant · knoppen in het midden · extra rechts.
          De zijkanten delen de ruimte, zodat het midden gecentreerd blijft en
          extra bediening (tempo) nooit over de knoppen heen valt. */}
      <div className="flex-1 min-w-0" aria-hidden="true" />
      <div className="flex items-center justify-center gap-2 sm:gap-3 shrink-0">
      {/* Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={!hasClips}
        aria-label={isPlaying ? t('transport.pause') : t('transport.play')}
        className={cn(
          'w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer',
          'bg-accent-400 hover:bg-accent-500 active:bg-accent-600 active:scale-95 text-accent-900',
          'disabled:bg-brand-700 disabled:text-brand-400 disabled:cursor-not-allowed disabled:active:scale-100'
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
          'bg-brand-800 hover:bg-brand-700 active:bg-brand-600 active:scale-95 text-white',
          'disabled:bg-brand-800/60 disabled:text-brand-500 disabled:cursor-not-allowed disabled:active:scale-100'
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
              : 'bg-brand-800 hover:bg-brand-700 active:bg-brand-600 text-white'
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
                <p className="text-xs text-text-muted px-2 pt-0.5 pb-1">{t('transport.loopSectionHint')}</p>
              )}
            </div>
          </>
        )}
      </div>
      </div>
      <div className="flex-1 flex items-center justify-end">{trailing}</div>
    </div>
  );
});
