/**
 * ClassPrepareTab — klaspagina, tab 1 "Klaarzetten" (ontwerp ronde 3b).
 *
 * De actieve opdracht met één knop om te wisselen (opent de wizard) en
 * "Zoals leerlingen het zien". Alles wat je zelden nodig hebt staat achter
 * "Meer opties": uitleg, geluiden, duur, klasgenoten laten luisteren,
 * opdracht stoppen en de klas verwijderen. Niets weggehaald, alleen verplaatst.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, ChevronDown } from 'lucide-react';
import type { ClassAssignmentRow } from '../../../lib/assignments';
import { TYPE_META } from '../assignmentTypeMeta';
import { LiveAssignmentSettings } from '../LiveAssignmentSettings';
import { cn } from '../../../utils/cn';

interface ClassPrepareTabProps {
  assignment: ClassAssignmentRow;
  onChange: () => void;
  onStudentView: () => void;
  onStop: () => void;
  onDeleteClass: () => void;
  onSettingsChanged: () => void;
}

export function ClassPrepareTab({ assignment, onChange, onStudentView, onStop, onDeleteClass, onSettingsChanged }: ClassPrepareTabProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[assignment.type];

  return (
    <section className="rounded-2xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-4 flex-wrap">
        {assignment.imageUrl ? (
          <img src={assignment.imageUrl} alt="" className="w-40 aspect-video object-cover rounded-xl" />
        ) : (
          <span className={cn('w-40 aspect-video rounded-xl flex items-center justify-center', meta.tone.tile)}>
            <meta.Icon className="w-8 h-8" aria-hidden="true" />
          </span>
        )}
        <div className="flex-1 min-w-[200px]">
          <p className="font-extrabold text-text-main text-lg">{t('teacher.classPage.prepare.ready', { name: assignment.assignmentName })}</p>
          <p className="text-sm text-text-muted">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-extrabold mr-1.5', meta.badge)}>{t(meta.labelKey)}</span>
            {t(meta.descKey)}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={onChange}
              className="rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 font-extrabold px-5 min-h-[44px]"
            >
              {t('teacher.classPage.prepare.change')}
            </button>
            <button
              type="button"
              onClick={onStudentView}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 font-bold px-5 min-h-[44px]"
            >
              <Eye className="w-4 h-4" aria-hidden="true" /> {t('teacher.classPage.prepare.studentView')}
            </button>
          </div>
        </div>
      </div>

      {/* Meer opties */}
      <div className="mt-5 rounded-xl border border-border-subtle bg-neutral-50">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 font-extrabold text-text-main"
        >
          {t('teacher.classPage.prepare.moreOptions')}
          <ChevronDown className={cn('w-5 h-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
        {open && (
          <div className="px-4 pb-3">
            <LiveAssignmentSettings key={assignment.id} assignment={assignment} onChanged={onSettingsChanged} />
            <div className="grid sm:grid-cols-[220px_1fr] gap-2 sm:gap-4 items-center py-3 border-t border-border-subtle">
              <span className="text-sm font-semibold text-text-main">{t('teacher.classPage.prepare.stop')}</span>
              <span className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={onStop}
                  className="rounded-full border-2 border-error-200 text-error-600 hover:bg-error-50 font-bold text-sm px-4 min-h-[40px]"
                >
                  {t('teacher.classPage.prepare.stopButton')}
                </button>
                <span className="text-xs text-text-muted">{t('teacher.classPage.prepare.stopHint')}</span>
              </span>
            </div>
            <div className="grid sm:grid-cols-[220px_1fr] gap-2 sm:gap-4 items-center py-3 border-t border-border-subtle">
              <span className="text-sm font-semibold text-text-main">{t('teacher.classPage.prepare.classLabel')}</span>
              <span>
                <button
                  type="button"
                  onClick={onDeleteClass}
                  className="rounded-full border-2 border-error-200 text-error-600 hover:bg-error-50 font-bold text-sm px-4 min-h-[40px]"
                >
                  {t('teacher.classPage.prepare.deleteClass')}
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ClassPrepareTab;
