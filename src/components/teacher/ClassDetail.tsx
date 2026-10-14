/**
 * ClassDetail — de klaspagina (ontwerp ronde 3b, tabs volgens de les).
 *
 * Altijd bovenaan: klascode + "Op het bord", de actieve opdracht en de twee
 * knoppen die je elke les nodig hebt (Presenteren, Feedback geven).
 * Daaronder drie tabbladen die de les volgen:
 *   1 Klaarzetten   — opdracht + "Meer opties" (alle zelden-gebruikte instellingen)
 *   2 Tijdens de les — wie is klaar / nog bezig (ververst vanzelf)
 *   3 Terugkijken   — (eerdere) opdrachten, delen, wat klasgenoten vonden
 * Opdracht kiezen/wisselen gaat via de wizard (TeacherPage → AssignmentWizard).
 * Presenteren is ongewijzigd ("zoals nu", keuze Bert 13-10).
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Monitor, Play, MessageCircle, AlertTriangle, BookOpen, ArrowRight } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useSubmissions, getReviewStatus } from '../../hooks/useSubmissions';
import type { Submission } from '../../hooks/useSubmissions';
import { useClassAssignment } from '../../hooks/useClassAssignment';
import { submissionMatchesAssignment } from '../../lib/assignments';
import type { ClassAssignmentRow } from '../../lib/assignments';
import { getClassDeletionWarning } from '../../lib/retention';
import { deleteClassById } from '../../lib/classes';
import { getPeerStarsForClass } from '../../lib/peerFeedback';
import { type PraatplaatRow } from '../../lib/praatplaat';
import { SubmissionPlayer } from './SubmissionPlayer';
import { PeerFeedbackOverview } from './PeerFeedbackOverview';
import { ClassPresentationView } from './ClassPresentationView';
import { PraatplaatViewer } from '../praatplaat/PraatplaatViewer';
import { SharePraatplaatModal } from './SharePraatplaatModal';
import { ShareAlbumModal } from './ShareAlbumModal';
import { ClassCodeOverlay } from './ClassCodeOverlay';
import { ClassCodeBoard } from './ClassCodeBoard';
import { ClassPrepareTab } from './classPage/ClassPrepareTab';
import { ClassLiveTab } from './classPage/ClassLiveTab';
import { ClassReviewTab, type ReviewRow, type PeerTopItem } from './classPage/ClassReviewTab';
import { StudentViewModal } from './classPage/StudentViewModal';
import { FeedbackWorklist } from './FeedbackWorklist';
import { TYPE_META } from './assignmentTypeMeta';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TeacherPageHeader } from './common';
import { cn } from '../../utils/cn';
import { logger } from '../../utils/logger';

type ClassTab = 'klaar' | 'bezig' | 'terug';

/** Hoe vaak de klaspagina de inzendingen ververst tijdens de les */
const LIVE_POLL_MS = 20_000;

interface ClassDetailProps {
  classData: TeacherClass;
  onBack: () => void;
  /** Opdracht-wizard openen (klaarzetten in 3 stappen) */
  onOpenWizard: () => void;
  /** Openen op een bepaald tabblad (null = automatisch) */
  initialTab?: ClassTab | null;
  /** Meteen de presentatiekeuze openen (vanaf het dashboard "Presenteren") */
  autoPresent?: boolean;
}

export function ClassDetail({ classData, onBack, onOpenWizard, initialTab = null, autoPresent = false }: ClassDetailProps) {
  const { t } = useTranslation();
  const { submissions, loading, error, deleteSubmission, setFeedback, markSeen, refetch } = useSubmissions(classData.id);
  const {
    activeAssignment,
    pastAssignments,
    loading: assignmentLoading,
    operationError: assignmentError,
    activateTemplate,
    activatePraatplaat,
    activateStoryboard,
    activateFree,
    deactivate: deactivateAssignment,
    removeFromHistory,
    refetch: refetchAssignment,
  } = useClassAssignment(classData.id);

  // --- Weergave ---
  const [tabChoice, setTabChoice] = useState<ClassTab | null>(initialTab);
  const tab: ClassTab = tabChoice ?? (activeAssignment ? 'bezig' : 'klaar');
  const [showFeedback, setShowFeedback] = useState<{ submissionId: string | null } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // --- Modals / overlays ---
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showPeerOverview, setShowPeerOverview] = useState(false);
  const [presentIds, setPresentIds] = useState<string[] | null>(null);
  const [showPresentChoice, setShowPresentChoice] = useState(false);
  const [presentMode, setPresentMode] = useState<'active' | 'all' | 'custom'>('custom');
  const [showStopModal, setShowStopModal] = useState(false);
  const [showDeleteClass, setShowDeleteClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reuseRow, setReuseRow] = useState<ClassAssignmentRow | null>(null);
  const [removeRow, setRemoveRow] = useState<ClassAssignmentRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [viewingPraatplaat, setViewingPraatplaat] = useState<PraatplaatRow | null>(null);
  const [shareTarget, setShareTarget] = useState<{ praatplaatId: string; name: string } | null>(null);
  const [albumTarget, setAlbumTarget] = useState<{ assignmentId: string; name: string; submittedCount: number } | null>(null);
  const [shareChoice, setShareChoice] = useState<{ assignmentId: string; name: string; praatplaatId: string; submittedCount: number } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [showStudentView, setShowStudentView] = useState(false);
  const [peerStars, setPeerStars] = useState<Map<string, number>>(new Map());

  // --- Inzendingen splitsen: ingeleverd vs. in bewerking (submitted_at, migratie 026) ---
  const { submitted, workInProgress } = useMemo(() => {
    const submitted: Submission[] = [];
    const workInProgress: Submission[] = [];
    for (const s of submissions) {
      if (s.submitted_at || !s.save_code) submitted.push(s);
      else workInProgress.push(s);
    }
    return { submitted, workInProgress };
  }, [submissions]);

  // Bij een actieve opdracht: alleen het werk dáárbij (ouder werk staat onder Terugkijken)
  const activeMatching = useMemo(
    () => (activeAssignment ? submitted.filter((s) => submissionMatchesAssignment(s, activeAssignment)) : []),
    [submitted, activeAssignment],
  );
  const liveSubmitted = activeAssignment ? activeMatching : submitted;
  const liveWip = useMemo(
    () => (activeAssignment ? workInProgress.filter((s) => submissionMatchesAssignment(s, activeAssignment)) : workInProgress),
    [workInProgress, activeAssignment],
  );
  const newCount = liveSubmitted.filter((s) => getReviewStatus(s) === 'new').length;

  // --- Vanzelf verversen tijdens de les ---
  useEffect(() => {
    if (tab !== 'bezig' || showFeedback || presentIds) return;
    const id = setInterval(() => { if (document.visibilityState === 'visible') void refetch(); }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [tab, showFeedback, presentIds, refetch]);

  // --- Peer-sterren (top 3 onder Terugkijken) ---
  useEffect(() => {
    let cancelled = false;
    void getPeerStarsForClass(classData.id).then((m) => { if (!cancelled) setPeerStars(m); });
    return () => { cancelled = true; };
  }, [classData.id, submissions.length]);
  const peerTop: PeerTopItem[] = useMemo(() => {
    const byId = new Map(submissions.map((s) => [s.id, s]));
    return [...peerStars.entries()]
      .filter(([id, stars]) => stars > 0 && byId.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, stars]) => ({ id, stars, title: byId.get(id)!.composition_name, student: byId.get(id)!.student_name }));
  }, [peerStars, submissions]);

  // --- AVG-bewaartermijn: 30 dagen vooraf waarschuwen (migratie 035) ---
  const deletionWarning = useMemo(() => getClassDeletionWarning(submissions), [submissions]);
  const dateLocale = t('common.dateLocale');
  const formatDate = useCallback(
    (d: Date | string) => new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [dateLocale],
  );

  // --- Presenteren (ongewijzigd: keuze actieve opdracht / alles, polling) ---
  const handlePresentClick = useCallback(() => {
    if (activeAssignment) {
      setShowPresentChoice(true);
    } else {
      setPresentMode('all');
      setPresentIds(submitted.map((s) => s.id));
    }
  }, [activeAssignment, submitted]);

  useEffect(() => {
    if (!presentIds || presentMode === 'custom') return;
    const interval = setInterval(() => { void refetch(); }, LIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [presentIds, presentMode, refetch]);

  useEffect(() => {
    if (!presentIds || presentMode === 'custom') return;
    const target = presentMode === 'active' ? activeMatching : submitted;
    const missing = target.filter((s) => !presentIds.includes(s.id)).map((s) => s.id);
    if (missing.length === 0) return;
    const timer = setTimeout(() => {
      setPresentIds((prev) => (prev ? [...prev, ...missing.filter((id) => !prev.includes(id))] : prev));
    }, 0);
    return () => clearTimeout(timer);
  }, [presentIds, presentMode, activeMatching, submitted]);

  // Vanaf het dashboard: meteen presenteren zodra opdracht + inzendingen geladen zijn
  const [autoPresentDone, setAutoPresentDone] = useState(!autoPresent);
  useEffect(() => {
    if (autoPresentDone || loading || assignmentLoading) return;
    const timer = setTimeout(() => {
      setAutoPresentDone(true);
      if (submitted.length > 0) handlePresentClick();
    }, 0);
    return () => clearTimeout(timer);
  }, [autoPresentDone, loading, assignmentLoading, submitted.length, handlePresentClick]);

  // --- Terugkijken ---
  const reviewRows: ReviewRow[] = useMemo(() => {
    const rows: ReviewRow[] = [];
    if (activeAssignment) {
      rows.push({ row: activeAssignment, isActive: true, count: activeMatching.length });
    }
    for (const pa of pastAssignments) {
      rows.push({ row: pa, isActive: false, count: submitted.filter((s) => submissionMatchesAssignment(s, pa)).length });
    }
    return rows;
  }, [activeAssignment, activeMatching.length, pastAssignments, submitted]);

  const openPraatplaatById = useCallback(async (praatplaatId: string) => {
    try {
      const { fetchPraatplaten } = await import('../../lib/praatplaat');
      const all = await fetchPraatplaten();
      const pp = all.find((p) => p.id === praatplaatId);
      if (pp) setViewingPraatplaat(pp);
    } catch (err) {
      logger.error('Fetch praatplaat for viewer failed:', err);
    }
  }, []);

  const handleView = useCallback((row: ClassAssignmentRow) => {
    if (row.type === 'praatplaat' && row.praatplaatId) {
      void openPraatplaatById(row.praatplaatId);
      return;
    }
    setPresentMode('custom');
    setPresentIds(submitted.filter((s) => submissionMatchesAssignment(s, row)).map((s) => s.id));
  }, [openPraatplaatById, submitted]);

  const handleShare = useCallback((row: ClassAssignmentRow) => {
    const submittedCount = submitted.filter((s) => submissionMatchesAssignment(s, row)).length;
    if (row.type === 'praatplaat' && row.praatplaatId) {
      setShareChoice({ assignmentId: row.id, name: row.assignmentName, praatplaatId: row.praatplaatId, submittedCount });
    } else {
      setAlbumTarget({ assignmentId: row.id, name: row.assignmentName, submittedCount });
    }
  }, [submitted]);

  const runReuse = useCallback(async (row: ClassAssignmentRow) => {
    try {
      if (row.type === 'template' && row.templateId) await activateTemplate(row.templateId);
      else if (row.type === 'praatplaat' && row.praatplaatId) await activatePraatplaat(row.praatplaatId);
      else if (row.type === 'storyboard' && row.storyboardRef) await activateStoryboard(row.storyboardRef);
      else if (row.type === 'free' && row.freeThemeId) await activateFree(row.freeThemeId);
      setTabChoice('klaar');
      setShowCode(true);
    } catch (err) {
      logger.error('Opnieuw gebruiken mislukt:', err);
    }
  }, [activateTemplate, activatePraatplaat, activateStoryboard, activateFree]);

  const handleReuse = useCallback((row: ClassAssignmentRow) => {
    if (activeAssignment) setReuseRow(row);
    else void runReuse(row);
  }, [activeAssignment, runReuse]);

  // --- Klas verwijderen ---
  const handleDeleteClass = async () => {
    setDeletingClass(true);
    try {
      await deleteClassById(classData.id);
      setShowDeleteClass(false);
      onBack();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.dashboard.deleteClassError'));
      setShowDeleteClass(false);
    } finally {
      setDeletingClass(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!deleteConfirmId) return;
    try {
      setActionError(null);
      await deleteSubmission(deleteConfirmId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.classDetail.deleteError'));
    }
    setDeleteConfirmId(null);
  };

  // ===================== Feedbackscherm (eigen weergave) =====================
  if (showFeedback) {
    return (
      <>
        <FeedbackWorklist
          classData={classData}
          submissions={submitted}
          assignments={reviewRows.map((r) => r.row)}
          activeAssignmentId={activeAssignment?.id ?? null}
          initialSubmissionId={showFeedback.submissionId}
          onBack={() => { setShowFeedback(null); void refetch(); }}
          onSetFeedback={setFeedback}
          onMarkSeen={markSeen}
          onDelete={(id) => setDeleteConfirmId(id)}
        />
        <DeleteSubmissionModal
          open={!!deleteConfirmId}
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={() => void handleDeleteSubmission()}
        />
      </>
    );
  }

  const meta = activeAssignment ? TYPE_META[activeAssignment.type] : null;

  return (
    <div className="min-h-screen bg-bg-app">
      <TeacherPageHeader
        title={classData.name}
        breadcrumb={<>{t('teacher.classPage.crumb')} <span className="opacity-60">›</span></>}
        onBack={onBack}
        backLabel={t('teacher.classPage.backToOverview')}
        actions={
          <span className="flex items-center gap-2">
            <span className="font-mono font-black tracking-widest bg-accent-100 text-accent-900 rounded-xl px-3 py-1 text-xl sm:text-2xl">
              {classData.code}
            </span>
            <button
              type="button"
              onClick={() => setShowCode(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-800 hover:bg-brand-700 text-white text-sm font-bold px-3 min-h-[40px]"
              title={t('teacher.classPage.codeOnBoard')}
            >
              <Monitor className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('teacher.classPage.codeOnBoard')}</span>
            </button>
          </span>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {(error || actionError || assignmentError) && (
          <div role="alert" className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error || actionError || assignmentError}
            <button onClick={() => { setActionError(null); void refetch(); }} className="ml-2 underline">{t('common.retry')}</button>
          </div>
        )}

        {/* Kop: actieve opdracht + de twee knoppen voor elke les */}
        {assignmentLoading ? (
          <div className="py-10 text-center"><Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto" aria-hidden="true" /></div>
        ) : activeAssignment && meta ? (
          <section className="rounded-2xl border border-border-subtle bg-bg-surface p-4 flex items-center gap-4 flex-wrap">
            {activeAssignment.imageUrl ? (
              <img src={activeAssignment.imageUrl} alt="" className="w-28 aspect-video object-cover rounded-xl" />
            ) : (
              <span className={cn('w-28 aspect-video rounded-xl flex items-center justify-center', meta.tone.tile)}>
                <meta.Icon className="w-7 h-7" aria-hidden="true" />
              </span>
            )}
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-text-muted">{t('teacher.classPage.activeSince', { date: formatDate(activeAssignment.activatedAt) })}</p>
              <h2 className="text-xl font-extrabold text-text-main flex items-center gap-2 flex-wrap">
                {activeAssignment.assignmentName}
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-extrabold', meta.badge)}>{t(meta.labelKey)}</span>
              </h2>
            </div>
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePresentClick}
                disabled={submitted.length === 0}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-40 disabled:cursor-not-allowed text-accent-900 font-extrabold px-5 min-h-[52px]"
              >
                <Play className="w-5 h-5" aria-hidden="true" /> {t('teacher.classPage.present')}
                <span className="rounded-full bg-accent-900/15 px-2 text-sm">{activeMatching.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFeedback({ submissionId: null })}
                disabled={submitted.length === 0}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed font-extrabold px-5 min-h-[52px]"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" /> {t('teacher.classPage.feedback')}
                {newCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 text-accent-700 px-2 text-xs font-extrabold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500" aria-hidden="true" />
                    {t('teacher.classPage.newBadge', { count: newCount })}
                  </span>
                )}
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border-subtle bg-bg-surface p-6 sm:p-8 text-center">
            <span className="w-14 h-14 rounded-2xl bg-accent-50 text-accent-600 border border-accent-200 inline-flex items-center justify-center">
              <BookOpen className="w-7 h-7" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-extrabold text-text-main mt-3">{t('teacher.classPage.noActiveTitle', { className: classData.name })}</h2>
            <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-4">{t('teacher.classPage.noActiveText', { code: classData.code })}</p>
            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-2 rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 font-extrabold text-lg px-7 min-h-[56px]"
            >
              {t('teacher.classPage.chooseAssignment')} <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </section>
        )}

        {/* AVG-bewaartermijn */}
        {!loading && deletionWarning && (
          <div className="mt-4 bg-warning-50 border border-warning-200 text-warning-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-warning-600" aria-hidden="true" />
            <p className="text-sm leading-relaxed">
              {t('teacher.classDetail.retentionWarning', { count: deletionWarning.count, date: formatDate(deletionWarning.date) })}
            </p>
          </div>
        )}

        {/* Tabs volgens de les */}
        <div role="tablist" className="flex gap-1.5 bg-bg-surface border border-border-subtle rounded-2xl p-1.5 my-5">
          {(['klaar', 'bezig', 'terug'] as ClassTab[]).map((k) => {
            const key = k === 'klaar' ? 'prepare' : k === 'bezig' ? 'live' : 'review';
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTabChoice(k)}
                className={cn(
                  'flex-1 rounded-xl px-2 py-2.5 text-center transition-colors',
                  tab === k ? 'bg-brand-900 text-white' : 'text-text-muted hover:text-text-main',
                )}
              >
                <span className="block font-extrabold text-sm sm:text-base">{t(`teacher.classPage.tabs.${key}`)}</span>
                <span className={cn('hidden sm:block text-xs', tab === k ? 'text-brand-300' : 'text-text-muted')}>
                  {t(`teacher.classPage.tabs.${key}Sub`)}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-10 text-center"><Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto" aria-hidden="true" /></div>
        ) : (
          <>
            {tab === 'klaar' && (
              activeAssignment ? (
                <ClassPrepareTab
                  assignment={activeAssignment}
                  onChange={onOpenWizard}
                  onStudentView={() => setShowStudentView(true)}
                  onStop={() => setShowStopModal(true)}
                  onDeleteClass={() => setShowDeleteClass(true)}
                  onSettingsChanged={() => void refetchAssignment()}
                />
              ) : (
                <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-text-muted">{t('teacher.classPage.noActiveText', { code: classData.code })}</p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteClass(true)}
                    className="rounded-full border-2 border-error-200 text-error-600 hover:bg-error-50 font-bold text-sm px-4 min-h-[40px]"
                  >
                    {t('teacher.classPage.prepare.deleteClass')}
                  </button>
                </div>
              )
            )}
            {tab === 'bezig' && (
              <ClassLiveTab
                submitted={liveSubmitted}
                workInProgress={liveWip}
                newCount={newCount}
                activeName={activeAssignment?.assignmentName ?? null}
                classCode={classData.code}
                onOpen={(s) => {
                  if (s.submitted_at || !s.save_code) setShowFeedback({ submissionId: s.id });
                  else setSelectedSubmission(s);
                }}
              />
            )}
            {tab === 'terug' && (
              <ClassReviewTab
                rows={reviewRows}
                onView={handleView}
                onShare={handleShare}
                onReuse={handleReuse}
                onRemove={(row) => setRemoveRow(row)}
                peerTop={peerTop}
                onPeerAll={() => setShowPeerOverview(true)}
                onPresentAll={() => { setPresentMode('all'); setPresentIds(submitted.map((s) => s.id)); }}
                canPresentAll={submitted.length > 0}
              />
            )}
          </>
        )}
      </main>

      {/* ===================== Overlays & modals ===================== */}

      {showCode && (
        activeAssignment ? (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <ClassCodeBoard
              classData={classData}
              assignment={activeAssignment}
              showSteps={false}
              onToClass={() => setShowCode(false)}
            />
          </div>
        ) : (
          <ClassCodeOverlay code={classData.code} onClose={() => setShowCode(false)} />
        )
      )}

      <StudentViewModal isOpen={showStudentView} onClose={() => setShowStudentView(false)} classCode={classData.code} />

      <PeerFeedbackOverview
        isOpen={showPeerOverview}
        onClose={() => setShowPeerOverview(false)}
        submissions={submissions}
        onPresentTop3={(ids) => {
          setShowPeerOverview(false);
          setPresentMode('custom');
          setPresentIds(ids);
        }}
      />

      {/* Delen bij een praatplaat: het bord of de composities */}
      <Modal isOpen={!!shareChoice} onClose={() => setShareChoice(null)} title={t('teacher.share.chooseTitle')} size="sm">
        <p className="text-text-muted text-sm mb-4 leading-relaxed">{t('teacher.share.chooseDescription')}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              if (!shareChoice) return;
              setShareTarget({ praatplaatId: shareChoice.praatplaatId, name: shareChoice.name });
              setShareChoice(null);
            }}
            className="w-full text-left rounded-xl border-2 border-accent-300 bg-accent-50 hover:bg-accent-100 px-4 py-3 transition-colors"
          >
            <span className="block text-sm font-bold text-text-main">{t('teacher.share.chooseBoard')}</span>
            <span className="block text-xs text-text-muted">{t('teacher.share.chooseBoardHint')}</span>
          </button>
          <button
            onClick={() => {
              if (!shareChoice) return;
              setAlbumTarget({ assignmentId: shareChoice.assignmentId, name: shareChoice.name, submittedCount: shareChoice.submittedCount });
              setShareChoice(null);
            }}
            className="w-full text-left rounded-xl border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 px-4 py-3 transition-colors"
          >
            <span className="block text-sm font-bold text-text-main">{t('teacher.share.chooseAlbum')}</span>
            <span className="block text-xs text-text-muted">{t('teacher.share.chooseAlbumHint')}</span>
          </button>
        </div>
      </Modal>

      {/* Presenteren-keuze (zoals nu) */}
      <Modal isOpen={showPresentChoice} onClose={() => setShowPresentChoice(false)} title={t('teacher.presentation.chooseTitle')} size="sm">
        <p className="text-text-muted text-sm mb-4 leading-relaxed">{t('teacher.presentation.chooseDescription')}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setShowPresentChoice(false);
              setPresentMode('active');
              setPresentIds(activeMatching.map((s) => s.id));
            }}
            disabled={activeMatching.length === 0}
            className="w-full text-left rounded-xl border-2 border-accent-300 bg-accent-50 hover:bg-accent-100 px-4 py-3 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="block text-sm font-bold text-text-main">{t('teacher.presentation.chooseActive', { count: activeMatching.length })}</span>
            <span className="block text-xs text-text-muted truncate">
              {activeMatching.length === 0 ? t('teacher.presentation.chooseActiveEmpty') : activeAssignment?.assignmentName}
            </span>
          </button>
          <button
            onClick={() => {
              setShowPresentChoice(false);
              setPresentMode('all');
              setPresentIds(submitted.map((s) => s.id));
            }}
            className="w-full text-left rounded-xl border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 px-4 py-3 transition-colors"
          >
            <span className="block text-sm font-bold text-text-main">{t('teacher.presentation.chooseAll', { count: submitted.length })}</span>
            <span className="block text-xs text-text-muted">{t('teacher.presentation.chooseAllHint')}</span>
          </button>
        </div>
      </Modal>

      {/* Presentatie (ongewijzigd) */}
      {presentIds && (
        <ClassPresentationView
          playlist={presentIds.map((id) => submissions.find((s) => s.id === id)).filter((s): s is Submission => !!s)}
          onClose={() => setPresentIds(null)}
          onSetFeedback={(id, feedback) => setFeedback(id, feedback)}
          classId={classData.id}
          onRefresh={() => void refetch()}
          interactiveBoard={
            presentMode === 'active' && activeAssignment?.type === 'praatplaat' && activeAssignment.imageUrl
              ? { imageUrl: activeAssignment.imageUrl, name: activeAssignment.assignmentName }
              : null
          }
        />
      )}

      {/* Werk in uitvoering beluisteren */}
      {selectedSubmission && (
        <SubmissionPlayer
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSetFeedback={(feedback) => setFeedback(selectedSubmission.id, feedback)}
          onMarkSeen={() => markSeen(selectedSubmission.id)}
        />
      )}

      {viewingPraatplaat && (
        <PraatplaatViewer praatplaat={viewingPraatplaat} classId={classData.id} onClose={() => setViewingPraatplaat(null)} />
      )}

      {shareTarget && (
        <SharePraatplaatModal
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          classCode={classData.code}
          praatplaatName={shareTarget.name}
          praatplaatId={shareTarget.praatplaatId}
        />
      )}

      {albumTarget && (
        <ShareAlbumModal
          isOpen={!!albumTarget}
          onClose={() => setAlbumTarget(null)}
          assignmentId={albumTarget.assignmentId}
          assignmentName={albumTarget.name}
          submittedCount={albumTarget.submittedCount}
        />
      )}

      {/* Opnieuw gebruiken terwijl er al een opdracht loopt */}
      <Modal isOpen={!!reuseRow} onClose={() => setReuseRow(null)} title={t('assignments.replaceConfirmTitle')} size="sm">
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          {t('assignments.replaceConfirmBody', { name: activeAssignment?.assignmentName ?? '' })}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setReuseRow(null)} className="flex-1">{t('common.cancel')}</Button>
          <Button
            variant="primary"
            onClick={() => { const row = reuseRow; setReuseRow(null); if (row) void runReuse(row); }}
            className="flex-1"
          >
            {t('teacher.classPage.review.reuse')}
          </Button>
        </div>
      </Modal>

      {/* Uit de lijst halen — leerlingwerk blijft bewaard */}
      <Modal isOpen={!!removeRow} onClose={() => setRemoveRow(null)} title={t('assignments.historyDeleteTitle')} size="sm">
        <p className="text-text-muted text-sm mb-6 leading-relaxed whitespace-pre-line text-center">
          {t('assignments.historyDeleteConfirm', { name: removeRow?.assignmentName ?? '' })}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setRemoveRow(null)} className="flex-1" disabled={removing}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            isLoading={removing}
            onClick={async () => {
              if (!removeRow) return;
              setRemoving(true);
              try {
                await removeFromHistory(removeRow.id);
                setRemoveRow(null);
              } catch (err) {
                logger.error('Opdracht uit de lijst halen mislukt:', err);
              }
              setRemoving(false);
            }}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      {/* Opdracht stoppen */}
      <Modal isOpen={showStopModal} onClose={() => setShowStopModal(false)} title={t('teacher.classPage.stopTitle')} size="sm">
        <p className="text-text-muted text-sm mb-6 leading-relaxed">{t('teacher.classPage.stopConfirm', { code: classData.code })}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowStopModal(false)} className="flex-1">{t('common.cancel')}</Button>
          <Button
            variant="primary"
            onClick={async () => {
              setShowStopModal(false);
              try {
                await deactivateAssignment();
                setTabChoice('klaar');
              } catch (err) {
                logger.error('Opdracht stoppen mislukt:', err);
              }
            }}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('teacher.classPage.stopAction')}
          </Button>
        </div>
      </Modal>

      {/* Klas verwijderen */}
      <Modal
        isOpen={showDeleteClass}
        onClose={() => setShowDeleteClass(false)}
        title={t('teacher.classPage.prepare.deleteClassTitle', { className: classData.name })}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed">{t('teacher.classPage.prepare.deleteClassBody')}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteClass(false)} className="flex-1" disabled={deletingClass}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            isLoading={deletingClass}
            onClick={() => void handleDeleteClass()}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      <DeleteSubmissionModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => void handleDeleteSubmission()}
      />
    </div>
  );
}

function DeleteSubmissionModal({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={open} onClose={onCancel} title={t('teacher.classDetail.deleteTitle')} size="sm">
      <p className="text-text-muted text-sm mb-6 leading-relaxed">{t('teacher.classDetail.deleteConfirm')}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">{t('common.cancel')}</Button>
        <Button variant="primary" onClick={onConfirm} className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white">
          {t('common.delete')}
        </Button>
      </div>
    </Modal>
  );
}

export default ClassDetail;
