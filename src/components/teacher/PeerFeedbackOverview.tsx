/**
 * PeerFeedbackOverview - Docent-overzicht van peer-feedback (migratie 028)
 *
 * Toont per inzending welke beoordelingen (sterren per criterium) zijn
 * ontvangen en gegeven, plus een top 3 op basis van het totaal aantal
 * ontvangen sterren — zodat de docent zonder alles te beluisteren weet
 * welke composities hij zeker moet laten horen.
 *
 * Data: client-side join — de docent mag peer_feedback van eigen klassen
 * lezen (RLS, migratie 027); namen komen uit de al geladen submissions.
 * Gever-namen zijn alleen hier zichtbaar; leerlingen blijven onderling
 * anoniem.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Medal, Award, Star, ChevronDown, Loader2, Inbox, Send, MonitorPlay } from 'lucide-react';
import { Modal, Button } from '../ui';
import { getSupabase } from '../../lib/supabase';
import type { Submission } from '../../hooks/useSubmissions';
import { logger } from '../../utils/logger';
import { cn } from '../../utils/cn';

interface PeerFeedbackRow {
  id: string;
  submission_id: string;
  from_submission_id: string;
  chips: string[] | null;
  ratings: Record<string, number> | null;
  created_at: string;
}

interface PeerFeedbackOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
  /** Start de presentatiemodus met deze inzendingen (top 3) */
  onPresentTop3?: (submissionIds: string[]) => void;
}

/** Totaal aantal sterren in één beoordeling (legacy chips-rijen tellen 0) */
function rowStars(row: PeerFeedbackRow): number {
  if (!row.ratings) return 0;
  return Object.values(row.ratings).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

const PODIUM = [
  { Icon: Trophy, wrap: 'bg-accent-100 text-accent-700 border-accent-300' },
  { Icon: Medal, wrap: 'bg-neutral-100 text-text-muted border-neutral-300' },
  { Icon: Award, wrap: 'bg-warning-100 text-warning-700 border-warning-300' },
] as const;

export function PeerFeedbackOverview({ isOpen, onClose, submissions, onPresentTop3 }: PeerFeedbackOverviewProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PeerFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'received' | 'given'>('received');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Peer-feedback van deze klas ophalen (RLS beschermt op klas-eigendom)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ids = submissions.map((s) => s.id);
        if (ids.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }
        const supabase = await getSupabase();
        const { data, error } = await supabase
          .from('peer_feedback')
          .select('*')
          .in('submission_id', ids);
        if (cancelled) return;
        if (error) {
          logger.warn('PeerFeedbackOverview: laden mislukt', error);
          setRows([]);
          return;
        }
        setRows((data ?? []) as PeerFeedbackRow[]);
      } catch (err) {
        logger.warn('PeerFeedbackOverview: laden mislukt', err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, submissions]);

  const nameById = useMemo(() => {
    const map = new Map<string, { student: string; composition: string }>();
    submissions.forEach((s) => map.set(s.id, { student: s.student_name, composition: s.composition_name }));
    return map;
  }, [submissions]);

  // Aggregatie per ontvanger: totaal sterren, beoordelaars, per-criterium
  const received = useMemo(() => {
    const bySubmission = new Map<string, {
      totalStars: number;
      raters: number;
      criteria: Map<string, { total: number; count: number }>;
      givers: PeerFeedbackRow[];
    }>();
    rows.forEach((row) => {
      const entry = bySubmission.get(row.submission_id) ?? {
        totalStars: 0,
        raters: 0,
        criteria: new Map<string, { total: number; count: number }>(),
        givers: [] as PeerFeedbackRow[],
      };
      entry.totalStars += rowStars(row);
      entry.raters += 1;
      entry.givers.push(row);
      if (row.ratings) {
        Object.entries(row.ratings).forEach(([chip, stars]) => {
          const c = entry.criteria.get(chip) ?? { total: 0, count: 0 };
          c.total += Number(stars) || 0;
          c.count += 1;
          entry.criteria.set(chip, c);
        });
      } else {
        (row.chips ?? []).forEach((chip) => {
          const c = entry.criteria.get(chip) ?? { total: 0, count: 0 };
          c.count += 1;
          entry.criteria.set(chip, c);
        });
      }
      bySubmission.set(row.submission_id, entry);
    });
    return bySubmission;
  }, [rows]);

  const ranking = useMemo(() =>
    [...received.entries()]
      .filter(([, agg]) => agg.totalStars > 0)
      .sort((a, b) => b[1].totalStars - a[1].totalStars || b[1].raters - a[1].raters),
  [received]);

  const top3 = ranking.slice(0, 3);

  // Gegeven-overzicht: per gever het aantal beoordelingen (monitoring 0..3)
  const given = useMemo(() => {
    const byGiver = new Map<string, PeerFeedbackRow[]>();
    rows.forEach((row) => {
      const list = byGiver.get(row.from_submission_id) ?? [];
      list.push(row);
      byGiver.set(row.from_submission_id, list);
    });
    // Alle ingeleverde composities meenemen, ook wie 0 gaf
    return submissions
      .filter((s) => s.submitted_at)
      .map((s) => ({ submission: s, gave: byGiver.get(s.id) ?? [] }))
      .sort((a, b) => a.gave.length - b.gave.length || a.submission.student_name.localeCompare(b.submission.student_name));
  }, [rows, submissions]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('teacher.peerOverview.title')} size="xl">
      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="w-8 h-8 text-accent-500 mx-auto animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center">
          <Inbox className="w-12 h-12 text-text-muted mx-auto mb-3" aria-hidden="true" />
          <p className="text-text-muted">{t('teacher.peerOverview.empty')}</p>
        </div>
      ) : (
        <div>
          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h3 className="font-bold text-text-main">{t('teacher.peerOverview.top3Title')}</h3>
                {onPresentTop3 && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onPresentTop3(top3.map(([id]) => id))}
                  >
                    <MonitorPlay className="w-4 h-4 mr-1.5" />
                    {t('teacher.peerOverview.presentTop3')}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {top3.map(([id, agg], i) => {
                  const { Icon, wrap } = PODIUM[i];
                  const names = nameById.get(id);
                  return (
                    <div key={id} className={cn('rounded-2xl border-2 p-4 text-center', wrap)}>
                      <Icon className="w-7 h-7 mx-auto mb-1.5" aria-hidden="true" />
                      <p className="font-bold text-text-main truncate">{names?.composition ?? '—'}</p>
                      <p className="text-sm text-text-muted truncate">{names?.student ?? '—'}</p>
                      <p className="text-sm font-semibold mt-1 inline-flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                        {t('teacher.peerOverview.starsTotal', { stars: agg.totalStars, raters: agg.raters })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs: ontvangen / gegeven */}
          <div className="flex gap-1 mb-4 bg-neutral-100 rounded-xl p-1">
            <button
              onClick={() => setTab('received')}
              className={cn('flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5',
                tab === 'received' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted hover:text-text-main')}
            >
              <Inbox className="w-4 h-4" aria-hidden="true" />
              {t('teacher.peerOverview.tabReceived')}
            </button>
            <button
              onClick={() => setTab('given')}
              className={cn('flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5',
                tab === 'given' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted hover:text-text-main')}
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {t('teacher.peerOverview.tabGiven')}
            </button>
          </div>

          {/* Ontvangen: per inzending criteria-gemiddelden + wie gaf wat */}
          {tab === 'received' && (
            <div className="space-y-2">
              {ranking.map(([id, agg], i) => {
                const names = nameById.get(id);
                const expanded = expandedId === id;
                return (
                  <div key={id} className="rounded-xl border border-border-subtle bg-bg-surface">
                    <button
                      onClick={() => setExpandedId(expanded ? null : id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="w-6 text-sm font-bold text-text-muted shrink-0">{i + 1}.</span>
                      <span className="flex-1 min-w-0">
                        <span className="font-bold text-text-main truncate block">{names?.composition ?? '—'}</span>
                        <span className="text-xs text-text-muted truncate block">{names?.student ?? '—'}</span>
                      </span>
                      <span className="text-sm font-semibold text-accent-700 inline-flex items-center gap-1 shrink-0">
                        <Star className="w-4 h-4 fill-accent-500 text-accent-500" aria-hidden="true" />
                        {t('teacher.peerOverview.starsTotal', { stars: agg.totalStars, raters: agg.raters })}
                      </span>
                      <ChevronDown className={cn('w-4 h-4 text-text-muted shrink-0 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                    </button>
                    {expanded && (
                      <div className="px-4 pb-3 border-t border-border-subtle pt-3 space-y-3">
                        {/* Criteria-gemiddelden */}
                        <div className="flex flex-wrap gap-2">
                          {[...agg.criteria.entries()].map(([chip, c]) => (
                            <span key={chip} className="inline-flex items-center gap-1 rounded-full bg-accent-50 border border-accent-200 text-accent-800 text-xs px-2.5 py-1">
                              {chip}
                              {c.total > 0 && (
                                <span className="inline-flex items-center gap-0.5 font-semibold">
                                  <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                                  {(c.total / c.count).toFixed(1)}
                                </span>
                              )}
                              <span className="text-accent-600">({c.count})</span>
                            </span>
                          ))}
                        </div>
                        {/* Wie gaf wat (alleen docent ziet dit) */}
                        <ul className="space-y-1">
                          {agg.givers.map((row) => (
                            <li key={row.id} className="text-xs text-text-muted">
                              <span className="font-semibold text-text-main">{nameById.get(row.from_submission_id)?.student ?? t('teacher.peerOverview.unknownGiver')}</span>
                              {': '}
                              {row.ratings
                                ? Object.entries(row.ratings).map(([chip, stars]) => `${chip} ${'★'.repeat(Number(stars))}`).join(' · ')
                                : (row.chips ?? []).join(' · ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Gegeven: monitoring wie 0/1/2/3 beoordelingen gaf */}
          {tab === 'given' && (
            <ul className="space-y-1.5">
              {given.map(({ submission, gave }) => (
                <li key={submission.id} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-2.5">
                  <span className="flex-1 min-w-0 text-sm font-semibold text-text-main truncate">
                    {submission.student_name}
                  </span>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
                    gave.length === 0 ? 'bg-neutral-100 text-text-muted' : 'bg-success-100 text-success-700')}>
                    {t('teacher.peerOverview.gaveCount', { count: gave.length })}
                  </span>
                  <span className="text-xs text-text-muted truncate hidden sm:block">
                    {gave.map((row) => nameById.get(row.submission_id)?.student ?? '—').join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

export default PeerFeedbackOverview;
