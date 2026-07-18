/**
 * UsageStatsPanel - Beheerders-dashboardje voor de anonieme gebruiksstatistieken
 *
 * Toont de tellingen uit usage_stats (migration 025): per gebeurtenis de
 * totalen van vandaag / 7 dagen / 30 dagen, plus een staafgrafiekje van de
 * sessies (app_start) per dag over de laatste 30 dagen. Alleen zichtbaar
 * voor accounts in VITE_ADMIN_EMAILS (zie usageStatsAdmin.isAdminEmail).
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, BarChart3 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { fetchUsageStats, type UsageStatRow } from '../../lib/usageStatsAdmin';

interface UsageStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Vaste volgorde = de allowlist van migration 025 (leesbaarheid boven alfabet)
const EVENT_ORDER = [
  'app_start',
  'composition_started',
  'stage_reached',
  'composition_saved',
  'composition_submitted',
  'save_code_created',
  'class_code_entered',
  'share_link_created',
  'mp3_export',
  'video_export',
  'teacher_dashboard_opened',
] as const;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function sumSince(rows: UsageStatRow[], event: string, sinceDay: string): number {
  return rows
    .filter((r) => r.event === event && r.day >= sinceDay)
    .reduce((acc, r) => acc + r.count, 0);
}

export function UsageStatsPanel({ isOpen, onClose }: UsageStatsPanelProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<UsageStatRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    fetchUsageStats(90)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) setError(t('teacher.stats.loadError')); });
    return () => { cancelled = true; };
  }, [isOpen, t]);

  const today = isoDaysAgo(0);
  const since7 = isoDaysAgo(6);
  const since30 = isoDaysAgo(29);

  // Tabelregels: alleen events met minstens één telling in 90 dagen
  const tableRows = useMemo(() => {
    if (!rows) return [];
    return EVENT_ORDER
      .map((event) => ({
        event,
        today: sumSince(rows, event, today),
        week: sumSince(rows, event, since7),
        month: sumSince(rows, event, since30),
      }))
      .filter((r) => rows.some((row) => row.event === r.event));
  }, [rows, today, since7, since30]);

  // Staafgrafiek: sessies (app_start) per dag, laatste 30 dagen
  const chart = useMemo(() => {
    if (!rows) return [];
    const byDay = new Map(rows.filter((r) => r.event === 'app_start').map((r) => [r.day, r.count]));
    const days: Array<{ day: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const day = isoDaysAgo(i);
      days.push({ day, count: byDay.get(day) ?? 0 });
    }
    return days;
  }, [rows]);
  const chartMax = Math.max(1, ...chart.map((d) => d.count));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('teacher.stats.title')} size="lg">
      <p className="text-sm text-text-muted mb-5">{t('teacher.stats.subtitle')}</p>

      {error && (
        <p role="alert" className="text-error-500 text-sm text-center py-8">{error}</p>
      )}

      {!error && !rows && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-accent-500 animate-spin" />
        </div>
      )}

      {!error && rows && (
        <>
          {/* Sessies per dag (30 dagen) */}
          <div className="mb-6">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-text-main mb-2">
              <BarChart3 className="w-4 h-4 text-accent-500" />
              {t('teacher.stats.chartTitle')}
            </h3>
            <div className="flex items-end gap-[2px] h-24 bg-bg-app rounded-lg p-2">
              {chart.map(({ day, count }) => (
                <div
                  key={day}
                  className="flex-1 bg-accent-400 rounded-t-sm min-h-[2px]"
                  style={{ height: `${Math.round((count / chartMax) * 100)}%` }}
                  title={`${day}: ${count}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>{chart[0]?.day}</span>
              <span>{t('teacher.stats.today')}</span>
            </div>
          </div>

          {/* Tabel per gebeurtenis */}
          {tableRows.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">{t('teacher.stats.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-subtle">
                    <th className="py-2 pr-2 font-semibold">{t('teacher.stats.colEvent')}</th>
                    <th className="py-2 px-2 font-semibold text-right">{t('teacher.stats.colToday')}</th>
                    <th className="py-2 px-2 font-semibold text-right">{t('teacher.stats.col7')}</th>
                    <th className="py-2 pl-2 font-semibold text-right">{t('teacher.stats.col30')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.event} className="border-b border-border-subtle/60 last:border-0">
                      <td className="py-2 pr-2 text-text-main">{t(`teacher.stats.events.${r.event}`)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-text-main">{r.today}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-text-main">{r.week}</td>
                      <td className="py-2 pl-2 text-right tabular-nums font-semibold text-text-main">{r.month}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-text-muted mt-5">{t('teacher.stats.privacyNote')}</p>
        </>
      )}
    </Modal>
  );
}

export default UsageStatsPanel;
