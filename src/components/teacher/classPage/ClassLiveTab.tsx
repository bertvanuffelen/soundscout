/**
 * ClassLiveTab — klaspagina, tab 2 "Tijdens de les" (ontwerp ronde 3b).
 *
 * Eén vraag: wie is klaar? Twee tellers (ingeleverd / nog bezig) en tegels
 * per leerling, nieuwste bovenaan op het moment van inleveren. De klaspagina
 * ververst de inzendingen vanzelf; tik op een tegel om te luisteren en
 * feedback te geven.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Submission } from '../../../hooks/useSubmissions';
import { getReviewStatus } from '../../../hooks/useSubmissions';
import { submissionSortTime } from '../../../lib/submissionDisplay';
import { useAgeLabel } from './useAgeLabel';
import { STATUS_CHIP } from './statusChip';
import { cn } from '../../../utils/cn';
import { DoorClosed } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

interface ClassLiveTabProps {
  submitted: Submission[];
  workInProgress: Submission[];
  newCount: number;
  /** Naam van de actieve opdracht (de lijst toont alleen werk daarbij) */
  activeName: string | null;
  classCode: string;
  onOpen: (s: Submission) => void;
  /**
   * "Les afronden" (migratie 045): maakt het werkblad leeg op alle apparaten
   * van deze klas. Gooit bij een fout een Error met een leesbare melding.
   */
  onEndLesson?: () => Promise<void>;
}

export function ClassLiveTab({ submitted, workInProgress, newCount, activeName, classCode, onOpen, onEndLesson }: ClassLiveTabProps) {
  const { t } = useTranslation();
  const [endOpen, setEndOpen] = useState(false);
  const [endBusy, setEndBusy] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [endDone, setEndDone] = useState(false);
  const total = submitted.length + workInProgress.length;
  const handleEndLesson = async () => {
    if (!onEndLesson) return;
    setEndBusy(true);
    setEndError(null);
    try {
      await onEndLesson();
      setEndDone(true);
      setEndOpen(false);
    } catch (err) {
      setEndError(err instanceof Error ? err.message : t('teacher.classPage.live.endLesson.error'));
    } finally {
      setEndBusy(false);
    }
  };
  const ageLabel = useAgeLabel();
  const [filter, setFilter] = useState<'in' | 'wip'>('in');
  const list = filter === 'in' ? submitted : workInProgress;

  return (
    <section aria-labelledby="live-title">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="live-title" className="text-lg font-extrabold text-text-main">{t('teacher.classPage.live.title')}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success-700">
          <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" aria-hidden="true" />
          {t('teacher.classPage.live.autoRefresh')}
        </span>
      </div>

      {/* Tellers = filter */}
      <div className="grid grid-cols-2 gap-3 mb-4" role="tablist">
        {([['in', submitted.length, t('teacher.classPage.live.submitted')], ['wip', workInProgress.length, t('teacher.classPage.live.wip')]] as const).map(([key, count, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              'text-left rounded-2xl border-2 bg-bg-surface px-4 py-3 transition-colors',
              filter === key ? 'border-accent-400 bg-accent-50' : 'border-border-subtle hover:border-accent-300',
            )}
          >
            <span className="block text-3xl font-black leading-none text-text-main">{count}</span>
            <span className="text-sm text-text-main">{label}</span>
            {key === 'in' && newCount > 0 && (
              <span className={cn('ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold', STATUS_CHIP.new)}>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-500" aria-hidden="true" />
                {t('teacher.classPage.newBadge', { count: newCount })}
              </span>
            )}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl bg-bg-surface border border-border-subtle px-4 py-6 text-center text-sm text-text-muted">
          {filter === 'in'
            ? t('teacher.classPage.live.emptySubmitted', { code: classCode })
            : t('teacher.classPage.live.emptyWip')}
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {list.map((s) => {
            const status = filter === 'wip' ? 'wip' : getReviewStatus(s);
            const age = ageLabel(submissionSortTime(s));
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onOpen(s)}
                  className="w-full h-full text-left rounded-2xl border-2 border-border-subtle bg-bg-surface hover:border-accent-300 px-3 py-2.5 flex flex-col gap-1 transition-colors"
                >
                  <span className="font-extrabold text-text-main truncate">{s.student_name}</span>
                  <span className="text-xs text-text-muted truncate">{s.composition_name}</span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold', STATUS_CHIP[status])}>
                      {status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-accent-500" aria-hidden="true" />}
                      {t(`teacher.classPage.status.${status}`)}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {filter === 'wip' ? t('teacher.classPage.live.lastSaved', { time: age }) : age}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-text-muted mt-3">
        {t('teacher.classPage.live.sortNote')}
        {activeName && <> {t('teacher.classPage.live.activeOnlyNote', { name: activeName })}</>}
      </p>

      {/* Les afronden: één knop aan het eind van de les (mockup B3) */}
      {onEndLesson && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">
          <Button variant="secondary" onClick={() => { setEndDone(false); setEndError(null); setEndOpen(true); }}>
            <DoorClosed className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('teacher.classPage.live.endLesson.button')}
          </Button>
          {endDone && (
            <p role="status" className="text-sm font-semibold text-success-700">{t('teacher.classPage.live.endLesson.done')}</p>
          )}
        </div>
      )}
      <Modal isOpen={endOpen} onClose={() => setEndOpen(false)} title={t('teacher.classPage.live.endLesson.title')} size="sm">
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">
          {total > 0
            ? t('teacher.classPage.live.endLesson.body', { done: submitted.length, total })
            : t('teacher.classPage.live.endLesson.bodyEmpty')}
        </p>
        {endError && <p role="alert" className="text-error-600 text-sm text-center mb-4">{endError}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setEndOpen(false)} className="flex-1" disabled={endBusy}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleEndLesson} className="flex-1" isLoading={endBusy}>{t('teacher.classPage.live.endLesson.confirm')}</Button>
        </div>
      </Modal>
    </section>
  );
}

export default ClassLiveTab;
