/**
 * ClassReviewTab — klaspagina, tab 3 "Terugkijken" (ontwerp ronde 3b).
 *
 * "(Eerdere) opdrachten" (de actieve eerst) met per rij één knop "Bekijk"
 * en een menu: Delen met ouders · Opnieuw gebruiken · Uit de lijst halen.
 * Elke rij krijgt het gekleurde vorm-icoon (geen emoji's, wens Bert 14-10).
 * Daaronder "Wat klasgenoten ervan vonden" (peer-sterren, top 3).
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ellipsis, Share2, RotateCcw, Trash2, Trophy, Medal, Award, Star, MonitorPlay } from 'lucide-react';
import type { ClassAssignmentRow } from '../../../lib/assignments';
import { TYPE_META } from '../assignmentTypeMeta';
import { cn } from '../../../utils/cn';

export interface ReviewRow {
  row: ClassAssignmentRow;
  isActive: boolean;
  count: number;
}

export interface PeerTopItem {
  id: string;
  title: string;
  student: string;
  stars: number;
}

interface ClassReviewTabProps {
  rows: ReviewRow[];
  onView: (row: ClassAssignmentRow) => void;
  onShare: (row: ClassAssignmentRow) => void;
  onReuse: (row: ClassAssignmentRow) => void;
  onRemove: (row: ClassAssignmentRow) => void;
  peerTop: PeerTopItem[];
  onPeerAll: () => void;
  onPresentAll: () => void;
  canPresentAll: boolean;
}

const PODIUM = [
  { Icon: Trophy, color: 'text-accent-500' },
  { Icon: Medal, color: 'text-neutral-400' },
  { Icon: Award, color: 'text-accent-700' },
];

export function ClassReviewTab({
  rows, onView, onShare, onReuse, onRemove, peerTop, onPeerAll, onPresentAll, canPresentAll,
}: ClassReviewTabProps) {
  const { t, i18n } = useTranslation();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu sluiten bij klik erbuiten of Escape
  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuFor(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuFor]);

  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <section aria-labelledby="review-title">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 id="review-title" className="text-lg font-extrabold text-text-main">{t('teacher.classPage.review.title')}</h2>
          {canPresentAll && (
            <button
              type="button"
              onClick={onPresentAll}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 text-sm font-bold px-4 min-h-[40px]"
            >
              <MonitorPlay className="w-4 h-4" aria-hidden="true" /> {t('teacher.classPage.review.presentAll')}
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">{t('teacher.classPage.review.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ row, isActive, count }) => {
              const meta = TYPE_META[row.type];
              const open = menuFor === row.id;
              return (
                <li key={row.id} className="rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2.5 flex items-center gap-3">
                  <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.tone.tile)}>
                    <meta.Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-text-main truncate">{row.assignmentName}</span>
                      {isActive && (
                        <span className="rounded-full bg-accent-100 text-accent-700 px-2 py-0.5 text-[11px] font-extrabold">
                          {t('teacher.classPage.review.activeBadge')}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {t(meta.labelKey)} · {dateFmt(row.activatedAt)} · {t('teacher.classPage.review.count', { count })}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onView(row)}
                    disabled={count === 0 && row.type !== 'praatplaat'}
                    className="rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold px-4 min-h-[40px] shrink-0"
                  >
                    {t('teacher.classPage.review.view')}
                  </button>
                  <div className="relative shrink-0" ref={open ? menuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setMenuFor(open ? null : row.id)}
                      aria-haspopup="menu"
                      aria-expanded={open}
                      aria-label={t('teacher.classPage.review.more')}
                      className="p-2 rounded-full text-text-muted hover:text-text-main hover:bg-neutral-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    >
                      <Ellipsis className="w-5 h-5" aria-hidden="true" />
                    </button>
                    {open && (
                      <div role="menu" className="absolute right-0 top-full mt-1 z-20 w-60 rounded-xl border border-border-subtle bg-bg-surface shadow-xl p-1.5">
                        <MenuItem icon={Share2} label={t('teacher.classPage.review.share')} onClick={() => { setMenuFor(null); onShare(row); }} />
                        {!isActive && (
                          <MenuItem icon={RotateCcw} label={t('teacher.classPage.review.reuse')} onClick={() => { setMenuFor(null); onReuse(row); }} />
                        )}
                        {!isActive && (
                          <MenuItem icon={Trash2} label={t('teacher.classPage.review.remove')} danger onClick={() => { setMenuFor(null); onRemove(row); }} />
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="peer-title" className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 id="peer-title" className="font-extrabold text-text-main">{t('teacher.classPage.review.peerTitle')}</h2>
          <button
            type="button"
            onClick={onPeerAll}
            className="rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 text-sm font-bold px-4 min-h-[40px]"
          >
            {t('teacher.classPage.review.peerAll')}
          </button>
        </div>
        {peerTop.length === 0 ? (
          <p className="text-sm text-text-muted mt-2">{t('teacher.classPage.review.peerEmpty')}</p>
        ) : (
          <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {peerTop.slice(0, 3).map((p, i) => {
              const { Icon, color } = PODIUM[i];
              return (
                <li key={p.id} className="inline-flex items-center gap-1.5 text-sm">
                  <Icon className={cn('w-5 h-5', color)} aria-hidden="true" />
                  <span className="font-extrabold text-text-main">{p.title}</span>
                  <span className="text-text-muted">{p.student}</span>
                  <span className="inline-flex items-center gap-0.5 font-bold text-accent-700">
                    <Star className="w-3.5 h-3.5 fill-accent-500 text-accent-500" aria-hidden="true" /> {p.stars}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }: { icon: typeof Share2; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-100',
        danger ? 'text-error-600' : 'text-text-main',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" /> {label}
    </button>
  );
}

export default ClassReviewTab;
