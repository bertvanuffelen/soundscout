/**
 * OpdrachtCard — de opdrachtkaart op het podium (fase 2.3, v4)
 *
 * Kop altijd "Opdracht"; daaronder de titel van de docent als die een eigen
 * kaart maakte. Uitklapbaar, met afvinkbare punten (alleen voor de leerling
 * zelf, niet opgeslagen) en de tijdsduur als gewone tekstregel.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import type { ClassSession } from '../../types';

interface OpdrachtCardProps {
  session: ClassSession;
}

export function OpdrachtCard({ session }: OpdrachtCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const own = session.card && (session.card.title || session.card.bullets.length > 0) ? session.card : null;
  const base = `assignmentCards.defaults.${session.assignmentType}`;
  const rawDefault: unknown = t(`${base}.bullets`, { returnObjects: true });
  const bullets = own
    ? own.bullets
    : Array.isArray(rawDefault) ? rawDefault.filter((x): x is string => typeof x === 'string') : [];
  const doneCount = bullets.filter((_, i) => checked[i]).length;

  return (
    <div className="rounded-2xl border-2 border-accent-200 bg-accent-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <ClipboardList className="w-5 h-5 text-accent-700 shrink-0" aria-hidden="true" />
        <span className="flex-1 min-w-0">
          <span className="block font-extrabold text-text-main">{t('podium.assignment.title')}</span>
          {own?.title && <span className="block text-xs font-semibold text-text-muted truncate">{own.title}</span>}
        </span>
        {bullets.length > 0 && (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-accent-800">
            {doneCount}/{bullets.length}
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          {bullets.map((bullet, i) => (
            <label key={i} className="flex items-start gap-2 text-sm text-text-main cursor-pointer">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))}
                className="mt-0.5 accent-accent-600"
              />
              <span className={checked[i] ? 'line-through text-text-muted' : ''}>{bullet}</span>
            </label>
          ))}
          {session.durationLabel && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-text-main mt-1">
              <Clock className="w-4 h-4 text-accent-700" aria-hidden="true" />
              {t('podium.assignment.time', { label: session.durationLabel })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default OpdrachtCard;
