/**
 * AssignmentWizard — opdracht klaarzetten in drie stappen (ontwerp ronde 3b):
 *
 *   1 Kies              — D-indeling: links kiezen, rechts "Zo ziet de leerling
 *                          het"; Zelf samenstellen eerst, daarna Kant-en-klare les.
 *                          De knoppen staan onder het voorbeeld en schuiven mee.
 *   2 Controleer & pas aan — het overzicht uit A, vóór de code in beeld komt.
 *   3 Code op het bord  — ClassCodeBoard (B), met instellingen nog te wijzigen.
 *
 * Vervangt de typekaarten, ActivateAssignmentModal en LessonCardPickerModal (verwijderd) en
 * de losse vervangbevestiging op de klaspagina. Activeren gebeurt via
 * wizardActivation (bestaande RPC's, geen migratie).
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ArrowLeft, ArrowRight, Loader2, TriangleAlert, Eye } from 'lucide-react';
import type { TeacherClass } from '../../../hooks/useClasses';
import { useTemplates } from '../../../hooks/useTemplates';
import { useAssignmentCards } from '../../../hooks/useAssignmentCards';
import { useLessonCards } from '../../../hooks/useLessonCards';
import {
  activateAssignment, fetchClassAssignment, updateAssignmentCard, updateAssignmentDuration,
  type AssignmentType, type ClassAssignmentRow,
} from '../../../lib/assignments';
import { activatePraatplaatFromCatalog, updatePraatplaatTheme } from '../../../lib/praatplaat';
import { activateLessonCard, localizeLessonCard, getLessonCardThemeId, formatLevel, type LessonCard } from '../../../lib/lessonCards';
import { setAssignmentPeerReview } from '../../../lib/peerFeedback';
import { activateFromWizard, choiceType, type WizardChoice, type WizardSettings } from '../../../lib/wizardActivation';
import {
  getTeacherThemes, getThemeSeasonInfo, DEFAULT_THEME_ID,
} from '../../../data/themes';
import { getPraatplaatCatalog } from '../../../data/praatplaatCatalog';
import { TYPE_META, TYPE_ORDER } from '../assignmentTypeMeta';
import { TeacherPageHeader } from '../common';
import { ThemeSeasonBadge } from '../ThemeSeasonBadge';
import { ClassCodeBoard } from '../ClassCodeBoard';
import { StudentPreview } from './StudentPreview';
import { SourceGrid } from './SourceGrid';
import { useAssignmentSources, type SourceItem } from './useAssignmentSources';
import { AssignmentSettingsFields } from './AssignmentSettingsFields';
import { cn } from '../../../utils/cn';
import { logger } from '../../../utils/logger';

// App-content (registry/catalogus): voor elke docent hetzelfde
const praatplaatCatalog = getPraatplaatCatalog();
const assignableThemes = getTeacherThemes();

type Step = 1 | 2 | 3;
type Tab = 'own' | 'lesson';

interface AssignmentWizardProps {
  classData: TeacherClass;
  /** Openen met een kant-en-klare les al gekozen (vanuit Lesideeën) → start op stap 2 */
  initialLessonCardId?: string | null;
  onCancel: () => void;
  /** Na stap 3: naar de klaspagina */
  onToClass: () => void;
}

const EMPTY_SETTINGS: WizardSettings = { cardId: null, cardTouched: false, durationLabel: '', peerEnabled: false, praatplaatThemeId: null };

export function AssignmentWizard({ classData, initialLessonCardId = null, onCancel, onToClass }: AssignmentWizardProps) {
  const { t } = useTranslation();
  const { templates } = useTemplates();
  const { sourcesFor, templatesLoading } = useAssignmentSources();
  const { cards: ownCards } = useAssignmentCards();
  const { cards: lessons, loading: lessonsLoading } = useLessonCards();

  const [step, setStep] = useState<Step>(initialLessonCardId ? 2 : 1);
  const [tab, setTab] = useState<Tab>(initialLessonCardId ? 'lesson' : 'own');
  const [ownType, setOwnType] = useState<AssignmentType | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(initialLessonCardId);
  const [settings, setSettings] = useState<WizardSettings>(EMPTY_SETTINGS);
  const [current, setCurrent] = useState<ClassAssignmentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ assignment: ClassAssignmentRow; partial: boolean } | null>(null);

  // Huidige opdracht (voor de vervangmelding)
  useEffect(() => {
    let cancelled = false;
    void fetchClassAssignment(classData.id).then((row) => { if (!cancelled) setCurrent(row); });
    return () => { cancelled = true; };
  }, [classData.id]);

  const selectedLesson: LessonCard | null = useMemo(
    () => (lessonId ? lessons.find((l) => l.id === lessonId) ?? null : null),
    [lessonId, lessons],
  );

  // --- De keuze (of null) ---
  const choice: WizardChoice | null = useMemo(() => {
    if (tab === 'lesson') {
      return selectedLesson ? { kind: 'lesson', lessonCardId: selectedLesson.id, type: selectedLesson.assignmentType } : null;
    }
    if (!ownType || !sourceId) return null;
    switch (ownType) {
      case 'praatplaat': {
        const e = praatplaatCatalog.find((x) => x.ref === sourceId);
        return e ? { kind: 'praatplaat', entry: { name: t(e.nameKey), themeId: e.themeId, locationId: e.locationId, imageUrl: e.imageUrl } } : null;
      }
      case 'storyboard': return { kind: 'storyboard', storyboardRef: sourceId };
      case 'template': return { kind: 'template', templateId: sourceId };
      case 'free': return { kind: 'free', themeId: sourceId };
    }
  }, [tab, selectedLesson, ownType, sourceId, t]);

  const type = choice ? choiceType(choice) : null;

  // --- Weergavegegevens van de keuze (titel, beeld, thema) ---
  const display = useMemo(() => {
    if (!choice) return null;
    if (choice.kind === 'lesson' && selectedLesson) {
      const loc = localizeLessonCard(t, selectedLesson);
      return { name: loc.title, imageUrl: selectedLesson.coverImage ?? selectedLesson.ppImageUrl, themeId: getLessonCardThemeId(selectedLesson) };
    }
    if (!ownType || !sourceId) return null;
    const item = sourcesFor(ownType).find((s) => s.id === sourceId);
    return item ? { name: item.name, imageUrl: item.imageUrl, themeId: item.themeId ?? null } : null;
    // sourcesFor is afgeleid van stabiele bronnen + t; bewust niet als dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, selectedLesson, ownType, sourceId, t, templates]);

  // --- Uitleg voor het voorbeeld ---
  const preview = useMemo(() => {
    if (!type) return { title: t('assignmentCards.defaults.praatplaat.title'), bullets: [] as string[] };
    const own = settings.cardId ? ownCards.find((c) => c.id === settings.cardId) : null;
    if (own) return { title: own.title, bullets: own.bullets };
    if (choice?.kind === 'lesson' && selectedLesson?.cardInline) {
      return { title: selectedLesson.cardInline.title, bullets: selectedLesson.cardInline.bullets };
    }
    const bullets = t(`assignmentCards.defaults.${type}.bullets`, { returnObjects: true }) as unknown;
    return {
      title: t(`assignmentCards.defaults.${type}.title`),
      bullets: Array.isArray(bullets) ? bullets.map(String) : [],
    };
  }, [type, settings.cardId, ownCards, choice, selectedLesson, t]);

  const outOfSeason = display?.themeId ? !getThemeSeasonInfo(display.themeId).inSeason : false;

  // --- Keuzes vastleggen (met passende standaard-instellingen) ---
  const pickOwnType = (ty: AssignmentType) => {
    setOwnType(ty);
    setSourceId(null);
  };
  const pickSource = (ty: AssignmentType, item: SourceItem) => {
    setSourceId(item.id);
    if (ty === 'praatplaat') {
      const th = item.themeId && assignableThemes.some((x) => x.id === item.themeId) ? item.themeId : DEFAULT_THEME_ID;
      setSettings((s) => ({ ...s, praatplaatThemeId: th }));
    }
  };
  const pickLesson = (card: LessonCard) => {
    setLessonId(card.id);
    setSettings((s) => ({
      ...s,
      cardId: null,
      cardTouched: false,
      praatplaatThemeId: card.assignmentType === 'praatplaat' ? (card.ppThemeId ?? DEFAULT_THEME_ID) : null,
    }));
  };

  // Les meegegeven vanuit Lesideeën: thema van die les voorinvullen
  useEffect(() => {
    if (!initialLessonCardId || !selectedLesson || settings.praatplaatThemeId) return;
    if (selectedLesson.assignmentType !== 'praatplaat') return;
    const timer = setTimeout(() => {
      setSettings((s) => ({ ...s, praatplaatThemeId: selectedLesson.ppThemeId ?? DEFAULT_THEME_ID }));
    }, 0);
    return () => clearTimeout(timer);
  }, [initialLessonCardId, selectedLesson, settings.praatplaatThemeId]);

  const handleActivate = async () => {
    if (!choice) return;
    setSaving(true);
    setError(null);
    try {
      const res = await activateFromWizard(classData.id, choice, settings, {
        activateAssignment,
        activatePraatplaatFromCatalog,
        activateLessonCard,
        fetchClassAssignment,
        updateAssignmentDuration,
        updateAssignmentCard,
        updatePraatplaatTheme,
        setAssignmentPeerReview,
      });
      setResult({ assignment: res.assignment, partial: res.failedSettings.length > 0 });
      setStep(3);
    } catch (err) {
      logger.error('Opdracht klaarzetten mislukt:', err);
      setError(t('teacher.wizard.activateError'));
    } finally {
      setSaving(false);
    }
  };

  // ===================== Stap 3 =====================
  if (step === 3 && result) {
    return (
      <ClassCodeBoard
        classData={classData}
        assignment={result.assignment}
        partialSettings={result.partial}
        onToClass={onToClass}
      />
    );
  }

  // ===================== Stap 1 + 2 =====================
  const steps = [t('teacher.wizard.steps.choose'), t('teacher.wizard.steps.check'), t('teacher.wizard.steps.board')];
  const stepBar = (
    <ol className="flex flex-wrap items-center gap-1.5 mb-5" aria-label={t('teacher.wizard.title')}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const on = n === step;
        return (
          <li key={label} className="inline-flex items-center gap-1.5">
            <span
              aria-current={on ? 'step' : undefined}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold',
                on && 'bg-brand-900 text-white',
                done && 'bg-success-100 text-success-700',
                !on && !done && 'bg-neutral-200/70 text-text-muted',
              )}
            >
              {done && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              {n} {label}
            </span>
            {n < 3 && <span className="text-neutral-300" aria-hidden="true">›</span>}
          </li>
        );
      })}
    </ol>
  );

  const replaceWarning = current && (
    <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 text-warning-800 text-sm px-4 py-3 flex items-start gap-2">
      <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        {step === 1
          ? t('teacher.wizard.replaceWarning', { className: classData.name, name: current.assignmentName })
          : t('teacher.wizard.replaceWarningShort', { name: current.assignmentName })}
      </span>
    </div>
  );

  const previewEl = (
    <StudentPreview
      title={display?.name ?? null}
      imageUrl={display?.imageUrl ?? null}
      type={type}
      cardTitle={preview.title}
      bullets={preview.bullets}
      durationLabel={settings.durationLabel.trim() || undefined}
    />
  );

  // Knoppen: op laptop onder het voorbeeld (schuift mee), op telefoon een vaste balk onderaan
  const primary = step === 1 ? (
    <button
      type="button"
      onClick={() => setStep(2)}
      disabled={!choice}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-40 disabled:cursor-not-allowed text-accent-900 font-extrabold min-h-[52px] px-6 w-full"
    >
      {t('teacher.wizard.next')} <ArrowRight className="w-5 h-5" aria-hidden="true" />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => void handleActivate()}
      disabled={!choice || saving}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-60 text-accent-900 font-extrabold min-h-[52px] px-6 w-full"
    >
      {saving ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Check className="w-5 h-5" aria-hidden="true" />}
      {saving ? t('teacher.wizard.activating') : t('teacher.wizard.activate')}
    </button>
  );
  const secondary = step === 1 ? (
    <button type="button" onClick={onCancel} className="rounded-full text-text-muted hover:text-text-main font-bold min-h-[44px] px-4 w-full">
      {t('common.cancel')}
    </button>
  ) : (
    <button type="button" onClick={() => setStep(1)} disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-full text-text-muted hover:text-text-main font-bold min-h-[44px] px-4 w-full">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t('teacher.wizard.back')}
    </button>
  );

  return (
    <div className="min-h-screen bg-bg-app pb-32 md:pb-10">
      <TeacherPageHeader
        title={t('teacher.wizard.title')}
        breadcrumb={classData.name}
        onBack={onCancel}
        backLabel={t('common.cancel')}
        actions={
          <span className="font-mono font-extrabold tracking-widest bg-accent-100 text-accent-900 rounded-lg px-3 py-1 text-base">
            {classData.code}
          </span>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {stepBar}
        {replaceWarning}

        <div className="grid md:grid-cols-[minmax(0,1fr)_220px] gap-6 items-start">
          <div className="min-w-0">
            {step === 1 ? (
              <StepChoose
                tab={tab}
                onTab={setTab}
                ownType={ownType}
                onOwnType={pickOwnType}
                sourceId={sourceId}
                sources={ownType ? sourcesFor(ownType) : []}
                sourcesLoading={ownType === 'template' && templatesLoading}
                onSource={(item) => ownType && pickSource(ownType, item)}
                lessons={lessons}
                lessonsLoading={lessonsLoading}
                lessonId={lessonId}
                onLesson={pickLesson}
              />
            ) : (
              <StepCheck
                className={classData.name}
                display={display}
                type={type}
                outOfSeason={outOfSeason}
                settings={settings}
                onSettings={setSettings}
                ownCards={ownCards}
                fromLesson={choice?.kind === 'lesson'}
                onChange={() => setStep(1)}
              />
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm px-4 py-3">{error}</p>
            )}

            {/* Telefoon: korte samenvatting i.p.v. het voorbeeld */}
            {display && (
              <p className="md:hidden mt-4 rounded-xl bg-bg-surface border border-border-subtle text-sm px-4 py-3 inline-flex items-start gap-2">
                <Eye className="w-4 h-4 shrink-0 mt-0.5 text-text-muted" aria-hidden="true" />
                {t('teacher.wizard.mobilePreview', { name: display.name, count: preview.bullets.length })}
              </p>
            )}
          </div>

          {/* Rechterkolom: voorbeeld + knoppen (schuift mee) */}
          <aside className="hidden md:flex md:flex-col gap-4 md:sticky md:top-4">
            {previewEl}
            <div className="flex flex-col gap-2 w-[210px]">
              {primary}
              {secondary}
            </div>
          </aside>
        </div>
      </main>

      {/* Telefoon: vaste knoppenbalk onderaan */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-app/95 backdrop-blur border-t border-border-subtle px-4 py-3 flex flex-row-reverse gap-2">
        <div className="flex-1">{primary}</div>
        <div className="flex-1">{secondary}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stap 1 · Kies
// ---------------------------------------------------------------------------

interface StepChooseProps {
  tab: Tab;
  onTab: (t: Tab) => void;
  ownType: AssignmentType | null;
  onOwnType: (t: AssignmentType) => void;
  sourceId: string | null;
  sources: SourceItem[];
  sourcesLoading: boolean;
  onSource: (item: SourceItem) => void;
  lessons: LessonCard[];
  lessonsLoading: boolean;
  lessonId: string | null;
  onLesson: (card: LessonCard) => void;
}

function StepChoose({
  tab, onTab, ownType, onOwnType, sourceId, sources, sourcesLoading, onSource, lessons, lessonsLoading, lessonId, onLesson,
}: StepChooseProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Tabs: Zelf samenstellen (eerst) · Kant-en-klare les */}
      <div role="tablist" className="flex gap-1.5 bg-bg-surface border border-border-subtle rounded-2xl p-1.5 mb-5">
        {(['own', 'lesson'] as Tab[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            type="button"
            onClick={() => onTab(k)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2.5 text-center transition-colors',
              tab === k ? 'bg-brand-900 text-white' : 'text-text-muted hover:text-text-main',
            )}
          >
            <span className="block font-extrabold text-sm sm:text-base">
              {k === 'own' ? t('teacher.wizard.tabs.own') : t('teacher.wizard.tabs.lesson')}
            </span>
            <span className={cn('hidden sm:block text-xs', tab === k ? 'text-brand-300' : 'text-text-muted')}>
              {k === 'own' ? t('teacher.wizard.tabs.ownSub') : t('teacher.wizard.tabs.lessonSub')}
            </span>
          </button>
        ))}
      </div>

      {tab === 'own' ? (
        <>
          <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide mb-2">{t('teacher.wizard.whatDo')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {TYPE_ORDER.map((ty) => {
              const meta = TYPE_META[ty];
              const selected = ownType === ty;
              return (
                <button
                  key={ty}
                  type="button"
                  onClick={() => onOwnType(ty)}
                  aria-pressed={selected}
                  className={cn(
                    'text-left rounded-2xl border-2 p-4 transition-all',
                    meta.tone.bg,
                    selected ? meta.tone.selected : cn(meta.tone.border, meta.tone.hoverBorder),
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <meta.Icon className={cn('w-6 h-6 shrink-0', meta.tone.icon)} aria-hidden="true" />
                    <span className="font-extrabold text-text-main">{t(meta.plainKey)}</span>
                  </span>
                  <span className="block text-xs text-text-muted mt-1.5">{t(meta.descKey)}</span>
                  <span className={cn('inline-flex mt-2 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold', meta.badge)}>
                    {t(meta.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>

          {ownType && (
            <>
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide mt-6 mb-2">
                {t(`teacher.wizard.pick.${ownType}`)}
              </h2>
              <SourceGrid type={ownType} sources={sources} loading={sourcesLoading} selectedId={sourceId} onSelect={onSource} />
            </>
          )}
        </>
      ) : (
        <LessonList lessons={lessons} loading={lessonsLoading} lessonId={lessonId} onLesson={onLesson} />
      )}
    </>
  );
}

function LessonList({ lessons, loading, lessonId, onLesson }: {
  lessons: LessonCard[]; loading: boolean; lessonId: string | null; onLesson: (c: LessonCard) => void;
}) {
  const { t } = useTranslation();
  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto" aria-hidden="true" /></div>;
  if (lessons.length === 0) return <p className="text-sm text-text-muted">{t('teacher.wizard.noLessons')}</p>;
  return (
    <ul className="space-y-2">
      {lessons.map((card) => {
        const loc = localizeLessonCard(t, card);
        const meta = TYPE_META[card.assignmentType];
        const img = card.coverImage ?? card.ppImageUrl;
        const selected = lessonId === card.id;
        return (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => onLesson(card)}
              aria-pressed={selected}
              className={cn(
                'w-full text-left flex items-center gap-3 rounded-2xl border-2 bg-bg-surface p-2.5 transition-all',
                selected ? 'border-accent-400 bg-accent-50' : 'border-border-subtle hover:border-accent-300',
              )}
            >
              {img ? (
                <img src={img} alt="" className="w-20 h-12 object-cover rounded-lg shrink-0" />
              ) : (
                <span className={cn('w-20 h-12 rounded-lg flex items-center justify-center shrink-0', meta.tone.tile)}>
                  <meta.Icon className="w-6 h-6" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-text-main">{loc.title}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-extrabold', meta.badge)}>{t(meta.labelKey)}</span>
                  <ThemeSeasonBadge themeId={getLessonCardThemeId(card)} />
                </span>
                {loc.level && <span className="block text-xs text-text-muted">{formatLevel(t, loc.level)}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Stap 2 · Controleer & pas aan
// ---------------------------------------------------------------------------

interface StepCheckProps {
  className: string;
  display: { name: string; imageUrl: string | null; themeId: string | null } | null;
  type: AssignmentType | null;
  outOfSeason: boolean;
  settings: WizardSettings;
  onSettings: (s: WizardSettings) => void;
  ownCards: import('../../../types').Opdrachtkaart[];
  fromLesson: boolean;
  onChange: () => void;
}

function StepCheck({ className, display, type, outOfSeason, settings, onSettings, ownCards, fromLesson, onChange }: StepCheckProps) {
  const { t } = useTranslation();
  if (!display || !type) {
    return <div className="py-10 text-center"><Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto" aria-hidden="true" /></div>;
  }
  const meta = TYPE_META[type];
  return (
    <>
      <div className="rounded-2xl bg-bg-surface border border-border-subtle p-4 flex items-center gap-4 flex-wrap">
        {display.imageUrl ? (
          <img src={display.imageUrl} alt="" className="w-36 aspect-video object-cover rounded-xl" />
        ) : (
          <span className={cn('w-36 aspect-video rounded-xl flex items-center justify-center', meta.tone.tile)}>
            <meta.Icon className="w-8 h-8" aria-hidden="true" />
          </span>
        )}
        <div className="flex-1 min-w-[160px]">
          <p className="text-xs text-text-muted">{t('teacher.wizard.chosenFor', { className })}</p>
          <h2 className="text-xl font-extrabold text-text-main">{display.name}</h2>
          <p className="text-sm text-text-muted mt-0.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-extrabold mr-1.5', meta.badge)}>{t(meta.labelKey)}</span>
            {t(meta.plainKey)}
          </p>
        </div>
        <button type="button" onClick={onChange} className="rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 font-bold text-sm px-4 min-h-[40px]">
          {t('teacher.wizard.change')}
        </button>
      </div>

      {outOfSeason && (
        <p className="mt-3 rounded-xl border border-warning-200 bg-warning-50 text-warning-800 text-sm px-4 py-3">{t('teacher.wizard.seasonNotice')}</p>
      )}

      <div className="mt-4 rounded-2xl bg-bg-surface border border-border-subtle px-4 pt-4 pb-1">
        <h3 className="font-extrabold text-text-main">{t('teacher.wizard.settingsTitle')}</h3>
        <p className="text-xs text-text-muted mb-2">{t('teacher.wizard.settingsHint')}</p>
        <AssignmentSettingsFields
          type={type}
          values={settings}
          onChange={onSettings}
          ownCards={ownCards}
          themes={assignableThemes}
          fromLesson={fromLesson}
        />
      </div>
    </>
  );
}

export default AssignmentWizard;
