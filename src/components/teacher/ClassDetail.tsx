/**
 * ClassDetail - Detail pagina voor een klas
 *
 * Toont alle composities van leerlingen in deze klas
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Loader2, Music, PenLine, MapPin, FileText, Clapperboard, Play, XCircle, Share2, Info, Star, MonitorPlay, Eye, Trash2, GraduationCap, Clock, Check, AlertTriangle } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useSubmissions, getReviewStatus } from '../../hooks/useSubmissions';
import type { Submission } from '../../hooks/useSubmissions';
import { useClassAssignment } from '../../hooks/useClassAssignment';
import { useAssignmentCards } from '../../hooks/useAssignmentCards';
import { updateAssignmentDuration, submissionMatchesAssignment } from '../../lib/assignments';
import { getClassDeletionWarning } from '../../lib/retention';
import type { AssignmentType, ClassAssignmentRow } from '../../lib/assignments';
import { SubmissionCard } from './SubmissionCard';
import { SubmissionPlayer } from './SubmissionPlayer';
import { PeerReviewSettings } from './PeerReviewSettings';
import { PeerFeedbackOverview } from './PeerFeedbackOverview';
import { ClassPresentationView } from './ClassPresentationView';
import { ActivateAssignmentModal } from './ActivateAssignmentModal';
import { AssignmentTypeCards } from './AssignmentTypeCards';
import { PraatplaatViewer } from '../praatplaat/PraatplaatViewer';
import { SharePraatplaatModal } from './SharePraatplaatModal';
import { ShareAlbumModal } from './ShareAlbumModal';
import { LessonCardPickerModal } from './LessonCardPickerModal';
import { type PraatplaatRow, updatePraatplaatTheme } from '../../lib/praatplaat';
import { getTeacherThemes } from '../../data/themes';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SectionTitle, TeacherPageHeader, GuideLink } from './common';
import { logger } from '../../utils/logger';

interface ClassDetailProps {
  classData: TeacherClass;
  onBack: () => void;
}

type AssignmentKind = 'template' | 'praatplaat' | 'storyboard' | 'free';

// Type-geleide presentatie (icoon/kleur/label) voor de opdracht-kaarten.
const ASSIGNMENT_ICON = {
  template: FileText,
  praatplaat: MapPin,
  storyboard: Clapperboard,
  free: Music,
} as const;

// Docent-thema's voor de praatplaat-thema-keuze op de actieve opdracht (TR5).
const assignableThemes = getTeacherThemes();

const ASSIGNMENT_LABEL_KEY = {
  template: 'templates.typeTemplate',
  praatplaat: 'templates.typePraatplaat',
  storyboard: 'templates.typeStoryboard',
  free: 'templates.typeFree',
} as const;

// Kleurcodering per opdracht-type, in lijn met de compose-mode-kleuren van de
// landingspagina: template = accent (amber), praatplaat = teal, storyboard =
// paars, vrij = rose. Zo zijn de types visueel duidelijk te onderscheiden.
const ASSIGNMENT_ICON_WRAP = {
  template: 'bg-accent-100 text-accent-700',
  praatplaat: 'bg-teal-100 text-teal-700',
  storyboard: 'bg-purple-100 text-purple-700',
  free: 'bg-rose-100 text-rose-700',
} as const;

const ASSIGNMENT_BADGE = {
  template: 'bg-accent-100 text-accent-800',
  praatplaat: 'bg-teal-100 text-teal-700',
  storyboard: 'bg-purple-100 text-purple-700',
  free: 'bg-rose-100 text-rose-700',
} as const;

const ASSIGNMENT_ICON_WRAP_SM = {
  template: 'bg-accent-100 text-accent-600',
  praatplaat: 'bg-teal-100 text-teal-600',
  storyboard: 'bg-purple-100 text-purple-600',
  free: 'bg-rose-100 text-rose-600',
} as const;

export function ClassDetail({ classData, onBack }: ClassDetailProps) {
  const { t } = useTranslation();
  const { submissions, loading, error, deleteSubmission, setFeedback, markSeen, refetch } = useSubmissions(classData.id);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Peer-feedback-overzicht + top 3 (migratie 028)
  const [showPeerOverview, setShowPeerOverview] = useState(false);
  // Presentatiemodus: ids in presentatievolgorde (null = gesloten)
  const [presentIds, setPresentIds] = useState<string[] | null>(null);
  // Keuzemodaal Presenteren: actieve opdracht of alles (I8, testronde 4)
  const [showPresentChoice, setShowPresentChoice] = useState(false);
  // Welke lijst er draait (I7): bij 'active'/'all' komen nieuwe inzendingen
  // via polling achteraan de playlist; 'custom' (top 3, historie) blijft vast.
  const [presentMode, setPresentMode] = useState<'active' | 'all' | 'custom'>('custom');
  const [activeTab, setActiveTab] = useState<'submitted' | 'wip'>('submitted');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // --- Actieve opdracht ---
  const {
    activeAssignment,
    pastAssignments,
    loading: assignmentLoading,
    operationError: assignmentError,
    activateTemplate,
    activatePraatplaat: activatePraatplaatAssignment,
    activatePraatplaatFromCatalog: activatePraatplaatFromCatalogAssignment,
    activateStoryboard: activateStoryboardAssignment,
    activateFree: activateFreeAssignment,
    deactivate: deactivateAssignment,
    removeFromHistory,
    updateCard,
    refetch: refetchAssignment,
  } = useClassAssignment(classData.id);

  // Opdrachtkaarten van de docent — voor de kaart-keuze op de actieve opdracht (TR5#2).
  const { cards: assignmentCards } = useAssignmentCards();
  const [cardSaved, setCardSaved] = useState(false);
  const handleChangeCard = useCallback(async (cardId: string | null) => {
    if (!activeAssignment) return;
    try {
      await updateCard(activeAssignment.id, cardId);
      setCardSaved(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [activeAssignment, updateCard]);

  // Thema-geluidenpalet van de actieve praatplaat wijzigen (TR5 / D2).
  const [themeSaved, setThemeSaved] = useState(false);
  const handleChangePraatplaatTheme = useCallback(async (themeId: string) => {
    if (!activeAssignment?.praatplaatId) return;
    try {
      await updatePraatplaatTheme(activeAssignment.praatplaatId, themeId);
      setThemeSaved(true);
      void refetchAssignment();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [activeAssignment, refetchAssignment]);

  // Tijdsduur-vermelding (migratie 033): draft volgt de actieve opdracht;
  // opslaan op blur/Enter. setTimeout-tick wegens de set-state-in-effect-regel.
  const [durationDraft, setDurationDraft] = useState('');
  const [durationSaved, setDurationSaved] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDurationDraft(activeAssignment?.durationLabel ?? '');
      setDurationSaved(false);
      setCardSaved(false);
      setThemeSaved(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeAssignment?.id, activeAssignment?.durationLabel]);
  const saveDuration = useCallback(async () => {
    if (!activeAssignment) return;
    const val = durationDraft.trim();
    if ((activeAssignment.durationLabel ?? '') === val) return;
    try {
      await updateAssignmentDuration(activeAssignment.id, val || null);
      setDurationSaved(true);
      void refetchAssignment();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [activeAssignment, durationDraft, refetchAssignment]);

  const [showActivateModal, setShowActivateModal] = useState(false);
  // Type-eerste flow: welk type toont de scoped modal + welk type wacht op vervang-bevestiging.
  const [activateType, setActivateType] = useState<AssignmentType | null>(null);
  // Wacht op vervang-bevestiging: een nieuw type kiezen ('pick') of een eerdere opdracht heractiveren ('reactivate').
  const [pendingAction, setPendingAction] = useState<
    { kind: 'pick'; type: AssignmentType } | { kind: 'reactivate'; row: ClassAssignmentRow } | null
  >(null);
  const [viewingPraatplaat, setViewingPraatplaat] = useState<PraatplaatRow | null>(null);
  const [showActivatedCode, setShowActivatedCode] = useState(false);
  // Delen: één target voor zowel de actieve opdracht als historie-rijen (M3)
  const [shareTarget, setShareTarget] = useState<{ praatplaatId: string; name: string } | null>(null);
  // Klas-album delen (R4): per opdracht, elk type
  const [albumTarget, setAlbumTarget] = useState<
    { assignmentId: string; name: string; submittedCount: number } | null
  >(null);
  // Eén "Delen"-knop per rij (wens Bert 19-7). Bij een praatplaat kun je twee
  // dingen delen — het klikbare bord óf de composities als afspeellijst — dus
  // vraagt dit keuzemodaal eerst welke van de twee. Andere types: direct album.
  const [shareChoice, setShareChoice] = useState<
    { assignmentId: string; name: string; praatplaatId: string; submittedCount: number } | null
  >(null);

  // Startkeuze (opdrachten-model 17-7): leskaart-picker of zelf samenstellen
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  // Historie: praatplaat verwijderen (incl. inzendingen) met bevestiging
  const [deletePastRow, setDeletePastRow] = useState<ClassAssignmentRow | null>(null);
  const [deletingPast, setDeletingPast] = useState(false);

  // Praatplaat-viewer openen vanuit actieve opdracht óf historie
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

  const handleActivateTemplate = useCallback(async (templateId: string, cardId?: string | null) => {
    await activateTemplate(templateId, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activateTemplate]);

  // Heractiveren van een bestaande praatplaat-instance (via "Eerder gebruikt").
  const handleActivatePraatplaat = useCallback(async (praatplaatId: string, cardId?: string | null) => {
    await activatePraatplaatAssignment(praatplaatId, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activatePraatplaatAssignment]);

  // Activeren van een praatplaat uit de catalogus (find-or-create instance).
  const handleActivatePraatplaatFromCatalog = useCallback(async (
    entry: { name: string; themeId: string; locationId: string; imageUrl: string },
    cardId?: string | null,
  ) => {
    await activatePraatplaatFromCatalogAssignment(entry, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activatePraatplaatFromCatalogAssignment]);

  const handleActivateStoryboard = useCallback(async (storyboardRef: string, cardId?: string | null) => {
    await activateStoryboardAssignment(storyboardRef, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activateStoryboardAssignment]);

  const handleActivateFree = useCallback(async (themeId: string, cardId?: string | null) => {
    await activateFreeAssignment(themeId, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activateFreeAssignment]);

  // Heractiveer een eerdere opdracht direct (standaard-opdrachtkaart; de rij draagt geen card-info).
  const runReactivate = useCallback(async (row: ClassAssignmentRow) => {
    try {
      if (row.type === 'template' && row.templateId) {
        await handleActivateTemplate(row.templateId);
      } else if (row.type === 'praatplaat' && row.praatplaatId) {
        await handleActivatePraatplaat(row.praatplaatId);
      } else if (row.type === 'storyboard' && row.storyboardRef) {
        await handleActivateStoryboard(row.storyboardRef);
      } else if (row.type === 'free' && row.freeThemeId) {
        await handleActivateFree(row.freeThemeId);
      }
    } catch (err) {
      logger.error('Reactiveren mislukt:', err);
    }
  }, [handleActivateTemplate, handleActivatePraatplaat, handleActivateStoryboard, handleActivateFree]);

  // Klik op een type-kaart. Staat er al een opdracht → eerst vervang-melding;
  // anders direct de type-gescoopte keuze-modal openen.
  const handlePickType = useCallback((type: AssignmentType) => {
    if (activeAssignment) {
      setPendingAction({ kind: 'pick', type });
    } else {
      setActivateType(type);
      setShowActivateModal(true);
    }
  }, [activeAssignment]);

  // Klik op "Activeer" bij een eerdere opdracht. Bij een actieve opdracht eerst vervang-melding.
  const handleReactivate = useCallback((row: ClassAssignmentRow) => {
    if (activeAssignment) {
      setPendingAction({ kind: 'reactivate', row });
    } else {
      runReactivate(row);
    }
  }, [activeAssignment, runReactivate]);

  const confirmReplace = useCallback(() => {
    if (!pendingAction) return;
    if (pendingAction.kind === 'pick') {
      setActivateType(pendingAction.type);
      setShowActivateModal(true);
    } else {
      runReactivate(pendingAction.row);
    }
    setPendingAction(null);
  }, [pendingAction, runReactivate]);

  const closeActivateModal = useCallback(() => {
    setShowActivateModal(false);
    setActivateType(null);
  }, []);

  const handleDeactivateAssignment = useCallback(async () => {
    try {
      await deactivateAssignment();
      setShowActivatedCode(false);
    } catch (err) {
      logger.error('Deactivate assignment failed:', err);
    }
  }, [deactivateAssignment]);

  // Split: ingeleverd vs. werk-in-uitvoering. Sinds migratie 026 mint élke
  // klas-inzending een save_code, dus het onderscheid is submitted_at:
  //   ingeleverd   = submitted_at gezet, of legacy-rij zonder save_code
  //   in bewerking = wel save_code (online bewaard), niet formeel ingeleverd
  const { submitted, workInProgress, newCount } = useMemo(() => {
    const submitted: Submission[] = [];
    const workInProgress: Submission[] = [];
    for (const s of submissions) {
      if (s.submitted_at || !s.save_code) {
        submitted.push(s);
      } else {
        workInProgress.push(s);
      }
    }
    const newCount = submitted.filter((s) => getReviewStatus(s) === 'new').length;
    return { submitted, workInProgress, newCount };
  }, [submissions]);

  // AVG-bewaartermijn: inzendingen worden na 1 schooljaar automatisch
  // verwijderd (server-side, migratie 035). Waarschuw de docent 30 dagen
  // vooraf zodat werk dat bewaard moet blijven geëxporteerd/gedeeld kan worden.
  const deletionWarning = useMemo(
    () => getClassDeletionWarning(submissions),
    [submissions]
  );
  const formatRetentionDate = useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat(t('common.dateLocale', { defaultValue: 'nl-NL' }), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date),
    [t]
  );

  // Inzendingen die bij de actieve opdracht horen (I8): drijft de
  // Presenteren-keuze "actieve opdracht" vs "alle composities".
  const activeMatching = useMemo(
    () => (activeAssignment ? submitted.filter((s) => submissionMatchesAssignment(s, activeAssignment)) : []),
    [submitted, activeAssignment]
  );

  /** Deel-actie voor één opdrachtrij: keuze bij praatplaat, anders het album.
   *  Telt de formeel ingeleverde composities mee, zodat de deelmodal een leeg
   *  album kan tegenhouden in plaats van er een code voor te minten (B1). */
  const openShare = useCallback((row: ClassAssignmentRow) => {
    const submittedCount = submitted.filter((s) => submissionMatchesAssignment(s, row)).length;
    if (row.type === 'praatplaat' && row.praatplaatId) {
      setShareChoice({ assignmentId: row.id, name: row.assignmentName, praatplaatId: row.praatplaatId, submittedCount });
    } else {
      setAlbumTarget({ assignmentId: row.id, name: row.assignmentName, submittedCount });
    }
  }, [submitted]);

  const handlePresentClick = useCallback(() => {
    // Zodra er een actieve opdracht is, vraagt hij wát je wilt presenteren
    // (I8, wens Bert). Ook bij nul inzendingen: dan zie je in de keuze dat
    // die opdracht nog leeg is, i.p.v. verrast te worden door "alles".
    if (activeAssignment) {
      setShowPresentChoice(true);
    } else {
      setPresentMode('all');
      setPresentIds(submitted.map((s) => s.id));
    }
  }, [activeAssignment, submitted]);

  // I7: tijdens een lopende presentatie elke 20s de inzendingen verversen;
  // nieuwe items komen achteraan de playlist (append-effect hieronder), de
  // playback blijft onverstoord (dataKey in useCompositionPlayback is
  // inhouds-gebaseerd, geen referentie-churn).
  useEffect(() => {
    if (!presentIds || presentMode === 'custom') return;
    const interval = setInterval(() => { void refetch(); }, 20_000);
    return () => clearInterval(interval);
  }, [presentIds, presentMode, refetch]);

  useEffect(() => {
    if (!presentIds || presentMode === 'custom') return;
    const target = presentMode === 'active' ? activeMatching : submitted;
    const missing = target.filter((s) => !presentIds.includes(s.id)).map((s) => s.id);
    if (missing.length === 0) return;
    // setTimeout-tick: huispatroon voor set-state-in-effect
    const timer = setTimeout(() => {
      setPresentIds((prev) => (prev ? [...prev, ...missing.filter((id) => !prev.includes(id))] : prev));
    }, 0);
    return () => clearTimeout(timer);
  }, [presentIds, presentMode, activeMatching, submitted]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    // Korte delay voor visuele feedback
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      setActionError(null);
      await deleteSubmission(deleteConfirmId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.classDetail.deleteError'));
    }
    setDeleteConfirmId(null);
  };

  const handlePlay = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header - gedeelde brand-900 shell met broodkruimel */}
      <TeacherPageHeader
        title={classData.name}
        subtitle={t('teacher.classDetail.compositionCount', { count: submitted.length })}
        onBack={onBack}
        backLabel={t('teacher.classDetail.back')}
        breadcrumb={
          <>
            {t('teacher.classDetail.dashboardCrumb')} <span className="opacity-60">›</span> {classData.name}
          </>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title={t('teacher.classDetail.refreshTitle')}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Klascode als 'held' — het belangrijkste dat de docent deelt */}
        <div className="mb-8 bg-bg-surface rounded-2xl border border-border-subtle p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">
              {t('teacher.classDetail.classCodeLabel')}
            </p>
            <span className="inline-flex items-center bg-accent-100 text-accent-800 px-4 py-2 rounded-full font-mono font-extrabold text-2xl sm:text-3xl tracking-wider">
              {classData.code}
            </span>
          </div>
          <div className="max-w-xs">
            <p className="text-sm text-text-muted leading-relaxed">
              {t('teacher.classCodeMeaning')}
            </p>
            <GuideLink sectionId="classes" variant="inline" className="mt-1" />
          </div>
        </div>

        {/* Presenteren + Feedback-overzicht — essentiële klasacties, prominent
            bovenaan (testronde 2, Notion-wens Bert). Uitgeschakeld zolang er
            niets te presenteren/tonen is. */}
        {!loading && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={handlePresentClick}
              disabled={submitted.length === 0}
              className="flex items-center justify-center gap-2.5 rounded-2xl px-4 py-4 sm:py-5 text-base sm:text-lg font-extrabold tracking-tight border-2 bg-accent-400 text-accent-900 border-accent-400 shadow-md hover:bg-accent-500 hover:border-accent-500 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <MonitorPlay className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true" />
              {t('teacher.presentation.openButton')}
              {submitted.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-sm font-bold bg-accent-900/15 text-accent-900">
                  {submitted.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowPeerOverview(true)}
              disabled={submissions.length === 0}
              className="flex items-center justify-center gap-2.5 rounded-2xl px-4 py-4 sm:py-5 text-base sm:text-lg font-extrabold tracking-tight border-2 bg-bg-surface text-text-main border-border-subtle hover:border-brand-300 hover:shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-accent-500 shrink-0" aria-hidden="true" />
              {t('teacher.peerOverview.openButton')}
            </button>
          </div>
        )}

        {/* Error message */}
        {(error || actionError) && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
            {error || actionError}
            <button
              onClick={() => { setActionError(null); refetch(); }}
              className="ml-2 underline"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-accent-500 animate-spin mx-auto mb-4" />
            <p className="text-text-muted">{t('teacher.classDetail.loading')}</p>
          </div>
        )}

        {/* --- Actieve opdracht blok --- */}
        {!loading && (
          <div className="mb-8">
            <div className="flex items-center gap-1">
              <SectionTitle as="h2" size="md" className="flex items-center gap-2 mb-1">
                <Play className="w-5 h-5 text-accent-600" />
                {t('assignments.activeTitle')}
              </SectionTitle>
              <GuideLink sectionId="assignments" />
            </div>
            <p className="text-sm text-text-muted mb-4 ml-7">
              {t('assignments.activeDescription')}
            </p>

            {assignmentError && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4 text-sm">
                {assignmentError}
              </div>
            )}

            {/* Klascode tonen na activeren */}
            {showActivatedCode && (
              <div className="bg-success-50 border border-success-200 text-success-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
                <span>{t('assignments.activatedMessage')}</span>
                <span className="font-mono font-bold text-lg ml-3">{classData.code}</span>
              </div>
            )}

            {assignmentLoading && (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto" />
              </div>
            )}

            {/* Geen actieve opdracht → kies een type */}
            {!assignmentLoading && !activeAssignment && (
              <div className="bg-bg-surface rounded-2xl p-5 sm:p-6 border border-border-subtle">
                <div className="flex items-start gap-3 mb-4">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-warning-100 text-warning-700 flex items-center justify-center">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-text-main">{t('assignments.noActiveTitle')}</h3>
                    <p className="text-text-muted text-sm mt-0.5">
                      {t('assignments.noActiveExplain', { code: classData.code })}
                    </p>
                  </div>
                </div>
                {/* Startkeuze (I9, wens Bert 19-7): de vier type-kaarten staan
                    meteen open — de tussenklik "Stel zelf samen" verviel. Wie
                    liever een kant-en-klare leskaart pakt, klikt de knop eronder. */}
                <AssignmentTypeCards onSelect={handlePickType} />
                <LessonCardChoice onClick={() => setShowLessonPicker(true)} />
              </div>
            )}

            {/* Actieve opdracht kaart */}
            {!assignmentLoading && activeAssignment && (
              <div className="bg-bg-surface rounded-2xl p-4 sm:p-5 border border-border-subtle shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Type icoon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ASSIGNMENT_ICON_WRAP[activeAssignment.type as AssignmentKind]}`}>
                    {(() => {
                      const Icon = ASSIGNMENT_ICON[activeAssignment.type as AssignmentKind];
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${ASSIGNMENT_BADGE[activeAssignment.type as AssignmentKind]}`}>
                        {t(ASSIGNMENT_LABEL_KEY[activeAssignment.type as AssignmentKind])}
                      </span>
                    </div>
                    <h3 className="font-bold text-text-main text-lg">
                      {activeAssignment.assignmentName}
                    </h3>
                    <p className="text-text-muted text-sm">
                      {t('assignments.activatedAt', {
                        date: new Date(activeAssignment.activatedAt).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }),
                      })}
                    </p>
                  </div>
                </div>

                {/* Preview-afbeelding: welke praatplaat/storyboard is dit precies */}
                {activeAssignment.imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden bg-neutral-100 aspect-video max-w-xs border border-border-subtle">
                    <img
                      src={activeAssignment.imageUrl}
                      alt={activeAssignment.assignmentName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Tijdsduur-vermelding (migratie 033, wens testronde 1):
                    optioneel, alleen als vermelding voor leerlingen op de landing */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label htmlFor="assignment-duration" className="text-sm text-text-muted inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-accent-500" aria-hidden="true" />
                    {t('assignments.durationLabel')}
                  </label>
                  <input
                    id="assignment-duration"
                    type="text"
                    maxLength={60}
                    value={durationDraft}
                    onChange={(e) => setDurationDraft(e.target.value)}
                    onBlur={() => void saveDuration()}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder={t('assignments.durationPlaceholder')}
                    className="w-44 px-3 py-1.5 text-sm border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none bg-neutral-50 text-text-main placeholder:text-text-muted/50"
                  />
                  {durationSaved && (
                    <span className="text-xs text-success-600 inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {t('common.saved')}
                    </span>
                  )}
                </div>

                {/* Opdrachtkaart-keuze op de actieve opdracht (TR5#2): de docent
                    kan hier een kaart aan-/uitzetten; leeg = per-type default. */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label htmlFor="assignment-card" className="text-sm text-text-muted inline-flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-accent-500" aria-hidden="true" />
                    {t('assignments.cardLabel')}
                  </label>
                  <select
                    id="assignment-card"
                    value={activeAssignment.cardId ?? ''}
                    onChange={(e) => void handleChangeCard(e.target.value || null)}
                    className="w-56 px-3 py-1.5 text-sm border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none bg-neutral-50 text-text-main"
                  >
                    <option value="">{t('assignments.cardNone')}</option>
                    {assignmentCards.map((card) => (
                      <option key={card.id} value={card.id}>{card.title}</option>
                    ))}
                  </select>
                  {cardSaved && (
                    <span className="text-xs text-success-600 inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {t('common.saved')}
                    </span>
                  )}
                </div>

                {/* Praatplaat: thema-geluidenpalet wijzigen op de actieve opdracht
                    (TR5 / D2 — de leerling verzamelt geluiden uit dit thema). */}
                {activeAssignment.type === 'praatplaat' && activeAssignment.praatplaatId && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label htmlFor="assignment-pp-theme" className="text-sm text-text-muted inline-flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-accent-500" aria-hidden="true" />
                      {t('assignments.praatplaatThemeLabel')}
                    </label>
                    <select
                      id="assignment-pp-theme"
                      value={activeAssignment.praatplaatThemeId ?? ''}
                      onChange={(e) => void handleChangePraatplaatTheme(e.target.value)}
                      className="w-56 px-3 py-1.5 text-sm border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none bg-neutral-50 text-text-main"
                    >
                      {assignableThemes.map((theme) => (
                        <option key={theme.id} value={theme.id}>{t(theme.name)}</option>
                      ))}
                    </select>
                    {themeSaved && (
                      <span className="text-xs text-success-600 inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {t('common.saved')}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {/* Als het een praatplaat is: open viewer */}
                  {activeAssignment.type === 'praatplaat' && activeAssignment.praatplaatId && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void openPraatplaatById(activeAssignment.praatplaatId!)}
                      className="inline-flex items-center gap-1"
                    >
                      <MapPin className="w-4 h-4" />
                      {t('teacher.praatplaat.openPraatplaat')}
                    </Button>
                  )}
                  {/* Eén deelknop (wens Bert 19-7): bij een praatplaat vraagt
                      hij eerst bord of afspeellijst, anders direct het album. */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openShare(activeAssignment)}
                    className="inline-flex items-center gap-1"
                  >
                    <Share2 className="w-4 h-4" />
                    {t('teacher.share.button')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeactivateModal(true)}
                    className="text-error-600 hover:bg-error-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {t('assignments.deactivate')}
                  </Button>
                </div>

                {/* Klasgenoten luisteren (peer-feedback, migratie 027) */}
                <PeerReviewSettings assignmentId={activeAssignment.id} />
              </div>
            )}

            {/* Wijzig opdracht → type-kaarten open + leskaart-knop (I9) */}
            {!assignmentLoading && activeAssignment && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-text-main mb-3">
                  {t('assignments.changeAssignment')}
                </p>
                <AssignmentTypeCards onSelect={handlePickType} />
                <LessonCardChoice onClick={() => setShowLessonPicker(true)} />
              </div>
            )}
          </div>
        )}

        {/* --- Eerdere opdrachten --- */}
        {!loading && !assignmentLoading && pastAssignments.length > 0 && (
          <div className="mb-8">
            <SectionTitle as="h2" size="md" className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-accent-600" />
              {t('assignments.pastTitle')}
            </SectionTitle>
            <p className="text-sm text-text-muted mb-4 ml-7">
              {t('assignments.pastDescription')}
            </p>
            <div className="space-y-2">
              {pastAssignments.map((pa) => (
                <div
                  key={pa.id}
                  className="bg-bg-surface rounded-xl p-3 border border-border-subtle flex items-center gap-3"
                >
                  {pa.imageUrl ? (
                    <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 bg-neutral-100">
                      <img src={pa.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${ASSIGNMENT_ICON_WRAP_SM[pa.type as AssignmentKind]}`}>
                      {(() => {
                        const Icon = ASSIGNMENT_ICON[pa.type as AssignmentKind];
                        return <Icon className="w-4 h-4" />;
                      })()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-main truncate">{pa.assignmentName}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(pa.activatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {/* Elke rij dezelfde twee acties (wens Bert 19-7): bekijken
                      en delen. Bij een praatplaat opent het oog het klikbare
                      bord; bij de rest de presentatie met díe inzendingen. */}
                  {(() => {
                    const matching = submitted.filter((s) => submissionMatchesAssignment(s, pa));
                    const isBoard = pa.type === 'praatplaat' && !!pa.praatplaatId;
                    return (
                      <button
                        onClick={() => {
                          if (isBoard) {
                            void openPraatplaatById(pa.praatplaatId!);
                          } else {
                            setPresentMode('custom');
                            setPresentIds(matching.map((s) => s.id));
                          }
                        }}
                        disabled={!isBoard && matching.length === 0}
                        className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-neutral-100 transition-colors shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                        title={isBoard
                          ? t('teacher.praatplaat.openPraatplaat')
                          : matching.length === 0
                            ? t('assignments.historyViewEmpty')
                            : t('assignments.historyView', { count: matching.length })}
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => openShare(pa)}
                    className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-neutral-100 transition-colors shrink-0"
                    title={t('teacher.share.button')}
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  {/* Uit je overzicht halen — bij élk type hetzelfde, en nooit
                      destructief: het leerlingwerk blijft bij de inzendingen
                      staan (besluit Bert 19-7; voorheen alleen bij praatplaat,
                      en dáár verdwenen de inzendingen wél mee). */}
                  <button
                    onClick={() => setDeletePastRow(pa)}
                    className="p-2 text-text-muted hover:text-error-500 rounded-lg hover:bg-neutral-100 transition-colors shrink-0"
                    title={t('assignments.historyDeleteTitle')}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReactivate(pa)}
                    className="shrink-0"
                  >
                    {t('assignments.reactivate')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Inzendingen van leerlingen --- */}
        {!loading && (
          <div className="mb-4">
            <SectionTitle as="h2" size="md" className="flex items-center gap-2 mb-1">
              <Music className="w-5 h-5 text-accent-600" />
              {t('teacher.classDetail.submissionsTitle')}
              {newCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-sm font-bold">
                  <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" aria-hidden="true" />
                  {t('teacher.classDetail.newCount', { count: newCount })}
                </span>
              )}
            </SectionTitle>
            <p className="text-sm text-text-muted ml-7">
              {t('teacher.classDetail.submissionsDescription')}
              {' '}
              <GuideLink
                sectionId="feedback-tips"
                variant="inline"
                label={t('teacher.guide.sections.feedback-tips.title')}
              />
            </p>
          </div>
        )}

        {/* AVG-bewaartermijn-waarschuwing: inzendingen worden na 1 schooljaar
            automatisch verwijderd; 30 dagen vooraf waarschuwen */}
        {!loading && deletionWarning && (
          <div className="mb-6 bg-warning-50 border border-warning-200 text-warning-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-warning-600" aria-hidden="true" />
            <p className="text-sm leading-relaxed">
              {t('teacher.classDetail.retentionWarning', {
                count: deletionWarning.count,
                date: formatRetentionDate(deletionWarning.date),
              })}
            </p>
          </div>
        )}

        {/* Tabs — only show when there are work-in-progress compositions */}
        {!loading && workInProgress.length > 0 && (
          <div className="flex gap-1 mb-6 bg-bg-surface rounded-xl p-1 border border-border-subtle">
            <button
              onClick={() => setActiveTab('submitted')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'submitted'
                  ? 'bg-white text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Music className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              {t('teacher.classDetail.tabSubmitted', { count: submitted.length })}
            </button>
            <button
              onClick={() => setActiveTab('wip')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'wip'
                  ? 'bg-white text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <PenLine className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              {t('teacher.classDetail.tabWip', { count: workInProgress.length })}
            </button>
          </div>
        )}

        {/* Submitted tab (default) */}
        {(!loading && (activeTab === 'submitted' || workInProgress.length === 0)) && activeTab === 'submitted' && (
          <>
            {/* Empty state */}
            {submitted.length === 0 && (
              <div className="bg-bg-surface rounded-2xl shadow-lg p-8 text-center">
                <Music className="w-16 h-16 text-accent-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text-main mb-2">
                  {t('teacher.classDetail.emptyTitle')}
                </h3>
                <p className="text-text-muted mb-4">
                  {t('teacher.classDetail.emptyDescription', { code: classData.code })}
                </p>
                <p className="text-text-muted text-sm">
                  {t('teacher.classDetail.instruction', { code: classData.code })}
                </p>
              </div>
            )}

            {/* Submissions list */}
            {submitted.length > 0 && (
              <div className="space-y-3">
                {submitted.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    onPlay={() => handlePlay(submission)}
                    onDelete={() => handleDeleteRequest(submission.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Work in progress tab */}
        {!loading && activeTab === 'wip' && workInProgress.length > 0 && (
          <>
            <p className="text-text-muted text-sm mb-4">
              {t('teacher.classDetail.wipDescription')}
            </p>
            <div className="space-y-3">
              {workInProgress.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onPlay={() => handlePlay(submission)}
                  onDelete={() => handleDeleteRequest(submission.id)}
                  isWip
                />
              ))}
            </div>
          </>
        )}

        {/* Instructie box */}
        <div className="mt-8 bg-bg-surface rounded-xl p-4 text-center border border-border-subtle">
          <p className="text-text-muted text-sm">
            {t('teacher.classDetail.instruction', { code: classData.code })}
          </p>
        </div>
      </main>

      {/* Peer-feedback-overzicht + top 3 (migratie 028) */}
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

      {/* Deel-keuze bij een praatplaat: bord of afspeellijst (wens Bert 19-7) */}
      <Modal
        isOpen={!!shareChoice}
        onClose={() => setShareChoice(null)}
        title={t('teacher.share.chooseTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          {t('teacher.share.chooseDescription')}
        </p>
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

      {/* Presenteren-keuze: actieve opdracht of alles (I8, testronde 4) */}
      <Modal
        isOpen={showPresentChoice}
        onClose={() => setShowPresentChoice(false)}
        title={t('teacher.presentation.chooseTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          {t('teacher.presentation.chooseDescription')}
        </p>
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
            <span className="block text-sm font-bold text-text-main">
              {t('teacher.presentation.chooseActive', { count: activeMatching.length })}
            </span>
            <span className="block text-xs text-text-muted truncate">
              {activeMatching.length === 0
                ? t('teacher.presentation.chooseActiveEmpty')
                : activeAssignment?.assignmentName}
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
            <span className="block text-sm font-bold text-text-main">
              {t('teacher.presentation.chooseAll', { count: submitted.length })}
            </span>
            <span className="block text-xs text-text-muted">
              {t('teacher.presentation.chooseAllHint')}
            </span>
          </button>
        </div>
      </Modal>

      {/* Universele presentatiemodus (digibord) */}
      {presentIds && (
        <ClassPresentationView
          playlist={presentIds
            .map((id) => submissions.find((s) => s.id === id))
            .filter((s): s is Submission => !!s)}
          onClose={() => setPresentIds(null)}
          onSetFeedback={(id, feedback) => setFeedback(id, feedback)}
          classId={classData.id}
          onRefresh={() => void refetch()}
          /* Praatplaat-opdracht → klikbaar bord i.p.v. losse visuals. Alleen
             als je de áctieve opdracht presenteert: bij "alle composities"
             zitten er ook inzendingen van andere opdrachten in de lijst, die
             geen plek op dit bord hebben (bevinding Bert 19-7). */
          interactiveBoard={
            presentMode === 'active'
              && activeAssignment?.type === 'praatplaat'
              && activeAssignment.imageUrl
              ? { imageUrl: activeAssignment.imageUrl, name: activeAssignment.assignmentName }
              : null
          }
        />
      )}

      {/* Player modal — met feedback-paneel + gezien-stempel (migratie 026) */}
      {selectedSubmission && (
        <SubmissionPlayer
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSetFeedback={(feedback) => setFeedback(selectedSubmission.id, feedback)}
          onMarkSeen={() => markSeen(selectedSubmission.id)}
        />
      )}

      {/* Opdracht activeren modal (type-gescoopt) */}
      <ActivateAssignmentModal
        isOpen={showActivateModal}
        onClose={closeActivateModal}
        typeFilter={activateType ?? undefined}
        onActivateTemplate={handleActivateTemplate}
        onActivatePraatplaatFromCatalog={handleActivatePraatplaatFromCatalog}
        onActivateStoryboard={handleActivateStoryboard}
        onActivateFree={handleActivateFree}
      />

      {/* Vervang-bevestiging: nieuw type kiezen of eerdere opdracht heractiveren terwijl er al een opdracht actief is */}
      <Modal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        title={t('assignments.replaceConfirmTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          {t('assignments.replaceConfirmBody', { name: activeAssignment?.assignmentName ?? '' })}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setPendingAction(null)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={confirmReplace} className="flex-1">
            {t('assignments.replaceConfirmButton')}
          </Button>
        </div>
      </Modal>

      {/* Praatplaat viewer */}
      {viewingPraatplaat && (
        <PraatplaatViewer
          praatplaat={viewingPraatplaat}
          classId={classData.id}
          onClose={() => setViewingPraatplaat(null)}
        />
      )}

      {/* Share praatplaat modal (#73) — actieve opdracht én historie (M3) */}
      {shareTarget && (
        <SharePraatplaatModal
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          classCode={classData.code}
          praatplaatName={shareTarget.name}
          praatplaatId={shareTarget.praatplaatId}
        />
      )}

      {/* Klas-album delen (R4) */}
      {albumTarget && (
        <ShareAlbumModal
          isOpen={!!albumTarget}
          onClose={() => setAlbumTarget(null)}
          assignmentId={albumTarget.assignmentId}
          assignmentName={albumTarget.name}
          submittedCount={albumTarget.submittedCount}
        />
      )}

      {/* Leskaart-picker (startkeuze 17-7) */}
      <LessonCardPickerModal
        isOpen={showLessonPicker}
        onClose={() => { setShowLessonPicker(false); void refetchAssignment(); }}
        classId={classData.id}
        classCode={classData.code}
        hasActiveAssignment={!!activeAssignment}
        onActivated={() => { void refetchAssignment(); }}
      />

      {/* Opdracht uit de historie halen — leerlingwerk blijft bewaard */}
      <Modal
        isOpen={!!deletePastRow}
        onClose={() => setDeletePastRow(null)}
        title={t('assignments.historyDeleteTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed whitespace-pre-line text-center">
          {t('assignments.historyDeleteConfirm', { name: deletePastRow?.assignmentName ?? '' })}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeletePastRow(null)} className="flex-1" disabled={deletingPast}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            isLoading={deletingPast}
            onClick={async () => {
              if (!deletePastRow) return;
              setDeletingPast(true);
              try {
                await removeFromHistory(deletePastRow.id);
                setDeletePastRow(null);
              } catch (err) {
                logger.error('Opdracht uit historie halen mislukt:', err);
              }
              setDeletingPast(false);
            }}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      {/* Deactiveer opdracht bevestiging (UX-DEST-1) */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title={t('assignments.deactivate')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          {t('assignments.deactivateConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeactivateModal(false)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => { setShowDeactivateModal(false); handleDeactivateAssignment(); }}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('assignments.deactivate')}
          </Button>
        </div>
      </Modal>

      {/* Verwijder compositie bevestiging (UX-DEST-2) */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t('teacher.classDetail.deleteTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          {t('teacher.classDetail.deleteConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirmId(null)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// --- Alternatief onder de type-kaarten: kant-en-klare leskaart (I9) ---

function LessonCardChoice({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full text-left p-4 rounded-2xl border-2 border-border-subtle bg-bg-surface hover:border-accent-300 transition-all flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
        <GraduationCap className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-text-main text-sm">{t('assignments.startChoiceLessonAlt')}</p>
        <p className="text-text-muted text-xs mt-0.5">{t('assignments.startChoiceLessonDesc')}</p>
      </div>
    </button>
  );
}

export default ClassDetail;
