/**
 * TempoPicker — tempo van de soundscape kiezen (V2 Fase 4).
 *
 * Eén compacte knop in de transportbalk ("Tempo" + het getal). Klik opent
 * een keuzelijst met vier tempi in kindertaal: traag 90 · rustig 105 ·
 * normaal 120 · snel 135. Kiezen roept `setBpm` aan; tijdens het afspelen
 * plant de motor opnieuw in en blijft de afspeellijn op dezelfde tel.
 *
 * Gedrag na een tempowissel: muziekloops houden hun lengte in tellen, losse
 * geluiden houden hun lengte in seconden. Die laatste kunnen daardoor over
 * hun buurman vallen; we verschuiven niets (Track toont de overlap) en één
 * keer "Ongedaan maken" zet het tempo terug.
 *
 * Opdracht (template) met vergrendelde clips: tempo ligt vast — een ander
 * tempo zou de opdracht-clips laten verschuiven ten opzichte van elkaar.
 */

import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { ALLOWED_BPMS, type AllowedBpm } from '../../constants/config';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/cn';

const TEMPO_WORD_KEYS: Record<AllowedBpm, string> = {
  90: 'tempo.slow',
  105: 'tempo.calm',
  120: 'tempo.normal',
  135: 'tempo.fast',
};

/** Ligt het tempo vast door een opdracht met vergrendelde clips? */
function useTempoLocked(): boolean {
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const clipsLocked = useAppStore((s) => s.templateLockOptions.clipsLocked);
  const hasTemplateClips = useTimelineStore((s) =>
    s.tracks.some((track) => track.clips.some((clip) => clip.fromTemplate === true)),
  );
  return activeTemplate !== null && clipsLocked && hasTemplateClips;
}

export const TempoPicker = memo(function TempoPicker() {
  const { t } = useTranslation();
  const bpm = useTimelineStore((s) => s.bpm);
  const setBpm = useTimelineStore((s) => s.setBpm);
  const locked = useTempoLocked();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const currentWordKey = TEMPO_WORD_KEYS[bpm as AllowedBpm] ?? 'tempo.normal';
  const buttonLabel = locked
    ? t('tempo.locked', { bpm })
    : t('tempo.buttonLabel', { word: t(currentWordKey), bpm });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={locked}
        aria-label={buttonLabel}
        title={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="tempo-button"
        className={cn(
          'h-11 min-w-11 px-2.5 flex flex-col items-center justify-center rounded-full shadow-sm transition-all leading-none',
          'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 active:scale-95 text-text-main',
          'disabled:bg-neutral-100 disabled:text-text-muted disabled:cursor-not-allowed disabled:active:scale-100',
        )}
      >
        <span className="text-xs font-semibold text-text-muted">{t('tempo.title')}</span>
        <span className="text-sm font-extrabold tabular-nums">{bpm}</span>
      </button>

      {open && !locked && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            aria-label={t('tempo.title')}
            className="absolute bottom-full mb-2 right-0 z-50 w-52 bg-bg-surface border border-border-subtle rounded-xl shadow-lg p-1.5"
          >
            <p className="text-xs text-text-muted px-2 py-1">{t('tempo.choose')}</p>
            {ALLOWED_BPMS.map((option) => {
              const selected = option === bpm;
              return (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setBpm(option);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full min-h-11 flex items-center gap-2 px-2 rounded-lg text-sm text-text-main transition-colors',
                    selected ? 'bg-accent-100 font-bold' : 'hover:bg-neutral-100',
                  )}
                >
                  <span className="flex-1 text-left">{t(TEMPO_WORD_KEYS[option])}</span>
                  <span className="tabular-nums text-text-muted">{option}</span>
                  <Check
                    size={16}
                    aria-hidden="true"
                    className={cn('shrink-0 text-accent-600', selected ? 'opacity-100' : 'opacity-0')}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

export default TempoPicker;
