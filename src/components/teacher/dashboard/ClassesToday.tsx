/**
 * ClassesToday — dashboard-tab "Mijn klassen" als "Vandaag" (ontwerp ronde 3b,
 * variant B). Bovenaan één grote kaart voor de klas van nu (laatst geopend,
 * anders de meeste recente activiteit) met drie even grote knoppen:
 * Open klas (donkerblauw, wens Bert) · Presenteren · Code op het bord.
 * Daaronder de andere klassen als compacte rijen. Een nieuwe docent ziet
 * alleen "Maak je eerste klas" met de drie stappen in de stijl van nu.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Play, Monitor, Plus, BookOpen, Lightbulb } from 'lucide-react';
import type { TeacherClass } from '../../../hooks/useClasses';
import { useClassOverview } from '../../../hooks/useClassOverview';
import type { ClassSummary } from '../../../lib/classOverview';
import { TYPE_META } from '../assignmentTypeMeta';
import { ClassCodeBoard } from '../ClassCodeBoard';
import { ClassCodeOverlay } from '../ClassCodeOverlay';
import { cn } from '../../../utils/cn';

interface ClassesTodayProps {
  classes: TeacherClass[];
  loading: boolean;
  maxClasses: number | null;
  canCreateClass: boolean;
  onOpenClass: (c: TeacherClass, opts?: { present?: boolean }) => void;
  onWizard: (c: TeacherClass) => void;
  onNewClass: () => void;
  onLessons: () => void;
}

export function ClassesToday({ classes, loading, maxClasses, canCreateClass, onOpenClass, onWizard, onNewClass, onLessons }: ClassesTodayProps) {
  const { t } = useTranslation();
  const { summaries, currentId, loading: overviewLoading } = useClassOverview(classes);
  const [codeFor, setCodeFor] = useState<TeacherClass | null>(null);

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="w-10 h-10 text-accent-500 animate-spin mx-auto" aria-hidden="true" /></div>;
  }

  // ---------- Eerste keer: nog geen klassen ----------
  if (classes.length === 0) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-border-subtle bg-bg-surface p-6 sm:p-8 text-center">
          <span className="w-16 h-16 rounded-2xl bg-accent-50 text-accent-600 border border-accent-200 inline-flex items-center justify-center">
            <BookOpen className="w-8 h-8" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-extrabold text-text-main mt-3">{t('teacher.today.welcomeTitle')}</h2>
          <p className="text-text-muted max-w-md mx-auto mt-1 mb-5">{t('teacher.today.welcomeText')}</p>
          <button
            type="button"
            onClick={onNewClass}
            className="inline-flex items-center gap-2 rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 font-extrabold text-lg px-7 min-h-[56px]"
          >
            <Plus className="w-5 h-5" aria-hidden="true" /> {t('teacher.today.createFirst')}
          </button>
        </section>

        {/* Drie stappen — stijl zoals nu (HowItWorksSteps), wens Bert 14-10 */}
        <section className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
          <h3 className="flex items-center gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-text-main">
            <Lightbulb className="w-5 h-5 text-accent-500" aria-hidden="true" /> {t('teacher.today.howTitle')}
          </h3>
          <ol className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <li key={n} className="bg-bg-app rounded-xl border border-border-subtle p-4 flex flex-col gap-2">
                <span className="w-9 h-9 rounded-full bg-brand-900 text-text-inverse font-extrabold flex items-center justify-center">{n}</span>
                <h4 className="text-base font-bold text-text-main">{t(`teacher.today.how${n}Title`)}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{t(`teacher.today.how${n}Desc`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-sm text-text-muted text-center">
          {t('teacher.today.lessonsHint')}{' '}
          <button type="button" onClick={onLessons} className="font-extrabold text-accent-700 hover:underline">{t('teacher.today.lessonsLink')}</button>
        </p>
      </div>
    );
  }

  // ---------- Vandaag ----------
  const now = classes.find((c) => c.id === currentId) ?? classes[0];
  const nowSummary = summaries.get(now.id);
  const others = classes.filter((c) => c.id !== now.id);
  const bigBtn = 'w-full inline-flex items-center justify-center gap-2 rounded-full font-extrabold px-5 min-h-[52px]';

  return (
    <div>
      <p className="text-xs font-extrabold text-text-muted uppercase tracking-wide mb-2">{t('teacher.today.now')}</p>
      <section className="rounded-2xl border-2 border-accent-400 bg-bg-surface p-4 sm:p-5 grid gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_230px] items-center">
        <NowVisual summary={nowSummary} />
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-text-main flex items-center gap-2 flex-wrap">
            {now.name}
            <span className="font-mono font-black tracking-widest bg-accent-100 text-accent-900 rounded-xl px-3 py-0.5 text-xl">{now.code}</span>
          </h2>
          <p className="text-text-muted mt-1 flex items-center gap-2 flex-wrap">
            {overviewLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : nowSummary?.active ? (
              <>
                <span className="font-bold text-text-main">{t('teacher.today.running', { name: nowSummary.active.assignmentName })}</span>
                <span>· {t('teacher.today.submitted', { count: nowSummary.submittedCount })}</span>
                {nowSummary.newCount > 0 && <NewBadge count={nowSummary.newCount} />}
              </>
            ) : t('teacher.today.nothingReady')}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => onOpenClass(now)} className={cn(bigBtn, 'bg-brand-900 hover:bg-brand-800 text-white')}>
            {t('teacher.today.openClass')}
          </button>
          {nowSummary?.active ? (
            <>
              <button
                type="button"
                onClick={() => onOpenClass(now, { present: true })}
                disabled={nowSummary.submittedCount === 0}
                className={cn(bigBtn, 'bg-accent-400 hover:bg-accent-500 text-accent-900 disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <Play className="w-5 h-5" aria-hidden="true" /> {t('teacher.today.present')}
              </button>
              <button type="button" onClick={() => setCodeFor(now)} className={cn(bigBtn, 'border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 text-text-main')}>
                <Monitor className="w-5 h-5" aria-hidden="true" /> {t('teacher.today.codeOnBoard')}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onWizard(now)} className={cn(bigBtn, 'bg-accent-400 hover:bg-accent-500 text-accent-900')}>
              {t('teacher.today.chooseAssignment')}
            </button>
          )}
        </div>
      </section>

      {others.length > 0 && (
        <>
          <p className="text-xs font-extrabold text-text-muted uppercase tracking-wide mt-6 mb-2">{t('teacher.today.otherClasses')}</p>
          <ul className="space-y-2">
            {others.map((c) => {
              const s = summaries.get(c.id);
              const meta = s?.active ? TYPE_META[s.active.type] : null;
              return (
                <li key={c.id} className="rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2.5 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <span className="font-extrabold text-text-main min-w-[90px]">{c.name}</span>
                  <span className="font-mono font-black tracking-widest bg-accent-100 text-accent-900 rounded-lg px-2 py-0.5">{c.code}</span>
                  <span className="flex-1 min-w-[140px] text-sm text-text-muted flex items-center gap-1.5 truncate">
                    {meta && s?.active ? (
                      <><meta.Icon className={cn('w-4 h-4 shrink-0', meta.tone.icon)} aria-hidden="true" /> <span className="truncate">{s.active.assignmentName}</span></>
                    ) : (
                      <span className="font-bold text-warning-700">{t('teacher.today.noAssignment')}</span>
                    )}
                  </span>
                  {s && s.newCount > 0 && <NewBadge count={s.newCount} />}
                  {s?.active ? (
                    <button
                      type="button"
                      onClick={() => onOpenClass(c, { present: true })}
                      disabled={s.submittedCount === 0}
                      className="hidden sm:inline-flex w-10 h-10 rounded-full border-2 border-border-subtle items-center justify-center hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`${t('teacher.today.present')} · ${c.name}`}
                      title={t('teacher.today.present')}
                    >
                      <Play className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => onWizard(c)} className="rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 text-sm font-extrabold px-4 min-h-[40px]">
                      {t('teacher.today.chooseAssignment')}
                    </button>
                  )}
                  <button type="button" onClick={() => onOpenClass(c)} className="rounded-full bg-brand-900 hover:bg-brand-800 text-white text-sm font-extrabold px-4 min-h-[40px]">
                    {t('teacher.today.openClass')}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Nieuwe klas + teller (geen vastlopende melding meer bij het maximum) */}
      <div className="mt-5 flex items-center gap-3 flex-wrap">
        {canCreateClass ? (
          <button type="button" onClick={onNewClass} className="inline-flex items-center gap-1.5 rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 font-extrabold px-5 min-h-[44px]">
            <Plus className="w-4 h-4" aria-hidden="true" /> {t('teacher.today.newClass')}
          </button>
        ) : (
          <p className="rounded-xl bg-neutral-100 border border-border-subtle text-sm text-text-muted px-4 py-3 max-w-xl">
            <b className="text-text-main">{t('teacher.today.classesUsed', { used: classes.length, max: maxClasses })}.</b> {t('teacher.today.maxReachedText')}
          </p>
        )}
        {canCreateClass && maxClasses !== null && (
          <span className="text-xs text-text-muted">{t('teacher.today.classesUsed', { used: classes.length, max: maxClasses })}</span>
        )}
      </div>

      {/* Code op het bord */}
      {codeFor && (
        summaries.get(codeFor.id)?.active ? (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <ClassCodeBoard
              classData={codeFor}
              assignment={summaries.get(codeFor.id)!.active!}
              showSteps={false}
              onToClass={() => { const c = codeFor; setCodeFor(null); onOpenClass(c); }}
            />
          </div>
        ) : (
          <ClassCodeOverlay code={codeFor.code} onClose={() => setCodeFor(null)} />
        )
      )}
    </div>
  );
}

function NowVisual({ summary }: { summary: ClassSummary | undefined }) {
  const active = summary?.active;
  if (active?.imageUrl) return <img src={active.imageUrl} alt="" className="hidden sm:block w-full aspect-video object-cover rounded-xl" />;
  const meta = active ? TYPE_META[active.type] : null;
  return (
    <span className={cn('hidden sm:flex w-full aspect-video rounded-xl items-center justify-center', meta ? meta.tone.tile : 'bg-accent-50 text-accent-600 border border-accent-200')}>
      {meta ? <meta.Icon className="w-8 h-8" aria-hidden="true" /> : <BookOpen className="w-8 h-8" aria-hidden="true" />}
    </span>
  );
}

function NewBadge({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 text-accent-700 px-2 py-0.5 text-xs font-extrabold">
      <span className="w-1.5 h-1.5 rounded-full bg-accent-500" aria-hidden="true" />
      {t('teacher.classPage.newBadge', { count })}
    </span>
  );
}

export default ClassesToday;
