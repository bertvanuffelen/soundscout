/**
 * ClassCodeBoard — "Code op het bord" (wizard stap 3, ontwerp ronde 3b).
 *
 * Groot op het digibord: "Ga naar soundscout.nl en typ: 7077", welke
 * opdracht klaarstaat, en de namen van leerlingen die al bezig of klaar
 * zijn. Een leerling verschijnt zodra die voor het eerst opslaat (sinds
 * migratie 026 maakt dat al een inzendingsrij aan) — er is geen apart
 * "begonnen"-signaal, dus geen migratie nodig. Via ⚙ Instellingen kan de
 * docent hier nog alles wijzigen (wens Bert, variant B).
 *
 * Vervangt de groene balk van 8 seconden ("Opdracht is actief!") en de
 * omweg naar de klaskaart om de code schermvullend te tonen.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Maximize, Minimize, Settings, ArrowRight, X, TriangleAlert } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useSubmissions } from '../../hooks/useSubmissions';
import { submissionMatchesAssignment, type ClassAssignmentRow } from '../../lib/assignments';
import { useFullscreen } from '../../hooks/useFullscreen';
import { LiveAssignmentSettings } from './LiveAssignmentSettings';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

const POLL_MS = 10_000;

interface ClassCodeBoardProps {
  classData: TeacherClass;
  assignment: ClassAssignmentRow;
  onToClass: () => void;
  /** Niet alle instellingen uit stap 2 konden worden opgeslagen */
  partialSettings?: boolean;
  /** Toon de stappenbalk van de wizard (false = losse weergave) */
  showSteps?: boolean;
}

export function ClassCodeBoard({ classData, assignment, onToClass, partialSettings = false, showSteps = true }: ClassCodeBoardProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, isSupported, toggle } = useFullscreen(rootRef);
  const [showSettings, setShowSettings] = useState(false);
  const { submissions, refetch } = useSubmissions(classData.id);

  // Vanzelf verversen zolang het scherm open is
  useEffect(() => {
    const id = setInterval(() => { void refetch(); }, POLL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  // Namen van leerlingen met werk bij deze opdracht, in volgorde van binnenkomst
  const names = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of [...submissions].reverse()) {
      if (!submissionMatchesAssignment(s, assignment)) continue;
      const n = (s.student_name ?? '').trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out;
  }, [submissions, assignment]);

  const host = typeof window !== 'undefined' ? window.location.hostname.replace(/^www\./, '') : 'soundscout.nl';

  return (
    <div ref={rootRef} className="relative min-h-screen bg-brand-900 text-white flex flex-col">
      {/* Bovenbalk: stappen + taal */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {showSteps ? (
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
            <li className="inline-flex items-center gap-1 rounded-full bg-success-100 text-success-700 px-3 py-1">
              <Check className="w-3.5 h-3.5" aria-hidden="true" /> 1 {t('teacher.wizard.steps.choose')}
            </li>
            <li className="inline-flex items-center gap-1 rounded-full bg-success-100 text-success-700 px-3 py-1">
              <Check className="w-3.5 h-3.5" aria-hidden="true" /> 2 {t('teacher.wizard.steps.check')}
            </li>
            <li aria-current="step" className="rounded-full bg-white text-brand-900 px-3 py-1">
              3 {t('teacher.wizard.steps.board')}
            </li>
          </ol>
        ) : <span />}
        <LanguageSwitcher variant="dark" />
      </div>

      {/* Midden: de code */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-10 gap-4">
        <p className="text-brand-300 text-lg sm:text-xl">
          {t('teacher.codeBoard.ready', { className: classData.name, name: assignment.assignmentName })}
        </p>
        <p className="text-2xl sm:text-4xl font-extrabold">
          {t('teacher.codeBoard.goTo')} <span className="text-accent-400">{host}</span> {t('teacher.codeBoard.andType')}
        </p>
        <p
          className="font-mono font-black tracking-[0.12em] leading-none text-[clamp(84px,20vw,220px)]"
          aria-label={classData.code.split('').join(' ')}
        >
          {classData.code}
        </p>

        {/* Wie is bezig of klaar */}
        <div className="min-h-[72px] max-w-2xl">
          {names.length > 0 ? (
            <>
              <p className="text-sm font-bold text-success-500 mb-2" aria-live="polite">
                {t('teacher.codeBoard.active', { count: names.length })}
              </p>
              <ul className="flex flex-wrap justify-center gap-1.5">
                {names.map((n) => (
                  <li key={n} className="rounded-full bg-brand-800 px-3 py-1 text-sm font-bold">{n}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-brand-300">{t('teacher.codeBoard.activeNone')}</p>
          )}
        </div>

        {partialSettings && (
          <p role="alert" className="max-w-xl rounded-xl bg-warning-50 text-warning-800 text-sm px-4 py-2 inline-flex items-start gap-2 text-left">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {t('teacher.wizard.settingsPartial')}
          </p>
        )}

        {/* Knoppen */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {isSupported && (
            <button
              type="button"
              onClick={() => void toggle()}
              className="inline-flex items-center gap-2 rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 font-extrabold px-6 min-h-[52px]"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" aria-hidden="true" /> : <Maximize className="w-5 h-5" aria-hidden="true" />}
              {isFullscreen ? t('teacher.codeBoard.exitFullscreen') : t('teacher.codeBoard.fullscreen')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-800 hover:bg-brand-700 text-white font-extrabold px-6 min-h-[52px]"
          >
            <Settings className="w-5 h-5" aria-hidden="true" /> {t('teacher.codeBoard.settings')}
          </button>
          <button
            type="button"
            onClick={onToClass}
            className="inline-flex items-center gap-2 rounded-full bg-brand-800 hover:bg-brand-700 text-white font-extrabold px-6 min-h-[52px]"
          >
            {t('teacher.codeBoard.toClass')} <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Instellingenpaneel */}
      {showSettings && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowSettings(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t('teacher.codeBoard.settings')}
            className="absolute top-0 right-0 bottom-0 z-50 w-full max-w-md bg-bg-surface text-text-main shadow-2xl overflow-y-auto p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-extrabold">{t('teacher.codeBoard.settings')}</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-neutral-100"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-text-muted mb-3">{t('teacher.codeBoard.settingsLive')}</p>
            <LiveAssignmentSettings assignment={assignment} compact />
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full rounded-full bg-brand-900 text-white font-extrabold min-h-[48px]"
            >
              {t('teacher.codeBoard.done')}
            </button>
          </aside>
        </>
      )}
    </div>
  );
}

export default ClassCodeBoard;
