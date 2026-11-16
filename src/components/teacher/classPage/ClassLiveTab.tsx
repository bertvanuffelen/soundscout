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

interface ClassLiveTabProps {
  submitted: Submission[];
  workInProgress: Submission[];
  newCount: number;
  /** Naam van de actieve opdracht (de lijst toont alleen werk daarbij) */
  activeName: string | null;
  classCode: string;
  onOpen: (s: Submission) => void;
}

export function ClassLiveTab({ submitted, workInProgress, newCount, activeName, classCode, onOpen }: ClassLiveTabProps) {
  const { t } = useTranslation();
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
    </section>
  );
}

export default ClassLiveTab;
