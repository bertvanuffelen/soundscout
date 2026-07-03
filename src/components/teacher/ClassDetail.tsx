/**
 * ClassDetail - Detail pagina voor een klas
 *
 * Toont alle composities van leerlingen in deze klas
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Loader2, Music, PenLine, MapPin, FileText, Clapperboard, Play, XCircle, Share2 } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useSubmissions } from '../../hooks/useSubmissions';
import type { Submission } from '../../hooks/useSubmissions';
import { useClassAssignment } from '../../hooks/useClassAssignment';
import type { AssignmentType } from '../../lib/assignments';
import { SubmissionCard } from './SubmissionCard';
import { SubmissionPlayer } from './SubmissionPlayer';
import { ActivateAssignmentModal } from './ActivateAssignmentModal';
import { AssignmentTypeCards } from './AssignmentTypeCards';
import { CreatePraatplaatModal } from './CreatePraatplaatModal';
import { PraatplaatViewer } from '../praatplaat/PraatplaatViewer';
import { SharePraatplaatModal } from './SharePraatplaatModal';
import { createPraatplaat, type PraatplaatRow } from '../../lib/praatplaat';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SectionTitle, TeacherPageHeader } from './common';
import { logger } from '../../utils/logger';

interface ClassDetailProps {
  classData: TeacherClass;
  onBack: () => void;
}

type AssignmentKind = 'template' | 'praatplaat' | 'storyboard';

// Type-geleide presentatie (icoon/kleur/label) voor de opdracht-kaarten.
const ASSIGNMENT_ICON = {
  template: FileText,
  praatplaat: MapPin,
  storyboard: Clapperboard,
} as const;

const ASSIGNMENT_LABEL_KEY = {
  template: 'templates.typeTemplate',
  praatplaat: 'templates.typePraatplaat',
  storyboard: 'templates.typeStoryboard',
} as const;

// Kleurcodering per opdracht-type, in lijn met de compose-mode-kleuren van de
// landingspagina: template = accent (amber), praatplaat = teal, storyboard =
// paars. Zo zijn de drie types visueel duidelijk te onderscheiden.
const ASSIGNMENT_ICON_WRAP = {
  template: 'bg-accent-100 text-accent-700',
  praatplaat: 'bg-teal-100 text-teal-700',
  storyboard: 'bg-purple-100 text-purple-700',
} as const;

const ASSIGNMENT_BADGE = {
  template: 'bg-accent-100 text-accent-800',
  praatplaat: 'bg-teal-100 text-teal-700',
  storyboard: 'bg-purple-100 text-purple-700',
} as const;

const ASSIGNMENT_ICON_WRAP_SM = {
  template: 'bg-accent-100 text-accent-600',
  praatplaat: 'bg-teal-100 text-teal-600',
  storyboard: 'bg-purple-100 text-purple-600',
} as const;

export function ClassDetail({ classData, onBack }: ClassDetailProps) {
  const { t } = useTranslation();
  const { submissions, loading, error, deleteSubmission, refetch } = useSubmissions(classData.id);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
    activateStoryboard: activateStoryboardAssignment,
    deactivate: deactivateAssignment,
  } = useClassAssignment(classData.id);

  const [showActivateModal, setShowActivateModal] = useState(false);
  // Type-eerste flow: welk type toont de scoped modal + welk type wacht op vervang-bevestiging.
  const [activateType, setActivateType] = useState<AssignmentType | null>(null);
  const [pendingType, setPendingType] = useState<AssignmentType | null>(null);
  const [showCreatePraatplaat, setShowCreatePraatplaat] = useState(false);
  const [viewingPraatplaat, setViewingPraatplaat] = useState<PraatplaatRow | null>(null);
  const [showActivatedCode, setShowActivatedCode] = useState(false);
  const [showSharePraatplaatModal, setShowSharePraatplaatModal] = useState(false);

  const handleActivateTemplate = useCallback(async (templateId: string, cardId?: string | null) => {
    await activateTemplate(templateId, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activateTemplate]);

  const handleActivatePraatplaat = useCallback(async (praatplaatId: string, cardId?: string | null) => {
    await activatePraatplaatAssignment(praatplaatId, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activatePraatplaatAssignment]);

  const handleActivateStoryboard = useCallback(async (storyboardRef: string, cardId?: string | null) => {
    await activateStoryboardAssignment(storyboardRef, cardId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activateStoryboardAssignment]);

  // Klik op een type-kaart. Staat er al een opdracht → eerst vervang-melding;
  // anders direct de type-gescoopte keuze-modal openen.
  const handlePickType = useCallback((type: AssignmentType) => {
    if (activeAssignment) {
      setPendingType(type);
    } else {
      setActivateType(type);
      setShowActivateModal(true);
    }
  }, [activeAssignment]);

  const confirmReplace = useCallback(() => {
    if (!pendingType) return;
    setActivateType(pendingType);
    setPendingType(null);
    setShowActivateModal(true);
  }, [pendingType]);

  const closeActivateModal = useCallback(() => {
    setShowActivateModal(false);
    setActivateType(null);
  }, []);

  // Fase 2: praatplaat maken + activeren in één handeling. De praatplaat wordt aan
  // deze klas gebonden en meteen als opdracht geactiveerd (activate_assignment →
  // class_assignments, wat de leerling-lookup leest). Fouten propageren naar de
  // CreatePraatplaatModal, die ze inline toont en open blijft.
  const handleCreateAndActivatePraatplaat = useCallback(async (params: {
    name: string;
    themeId: string;
    locationId: string;
    imageUrl: string;
  }) => {
    const newId = await createPraatplaat({ classId: classData.id, ...params });
    await activatePraatplaatAssignment(newId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [classData.id, activatePraatplaatAssignment]);

  const handleDeactivateAssignment = useCallback(async () => {
    try {
      await deactivateAssignment();
      setShowActivatedCode(false);
    } catch (err) {
      logger.error('Deactivate assignment failed:', err);
    }
  }, [deactivateAssignment]);

  // Split submissions into submitted (no save_code) and work-in-progress (has save_code)
  const { submitted, workInProgress } = useMemo(() => {
    const submitted: Submission[] = [];
    const workInProgress: Submission[] = [];
    for (const s of submissions) {
      if (s.save_code) {
        workInProgress.push(s);
      } else {
        submitted.push(s);
      }
    }
    return { submitted, workInProgress };
  }, [submissions]);

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
          <p className="text-sm text-text-muted max-w-xs leading-relaxed">
            {t('teacher.classCodeMeaning')}
          </p>
        </div>

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
            <SectionTitle as="h2" size="md" className="flex items-center gap-2 mb-1">
              <Play className="w-5 h-5 text-accent-600" />
              {t('assignments.activeTitle')}
            </SectionTitle>
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
              <div className="bg-success-50 border border-success-200 text-success-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center justify-between">
                <span>{t('teacher.praatplaat.activatedMessage')}</span>
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
                <p className="text-text-main text-sm font-medium mb-4">
                  {t('assignments.pickPrompt', { code: classData.code })}
                </p>
                <AssignmentTypeCards onSelect={handlePickType} />
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

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {/* Als het een praatplaat is: open viewer */}
                  {activeAssignment.type === 'praatplaat' && activeAssignment.praatplaatId && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        // Haal praatplaat-data op voor de viewer
                        try {
                          const { fetchPraatplaten } = await import('../../lib/praatplaat');
                          const all = await fetchPraatplaten();
                          const pp = all.find((p) => p.id === activeAssignment.praatplaatId);
                          if (pp) setViewingPraatplaat(pp);
                        } catch (err) {
                          logger.error('Fetch praatplaat for viewer failed:', err);
                        }
                      }}
                      className="inline-flex items-center gap-1"
                    >
                      <MapPin className="w-4 h-4" />
                      {t('teacher.praatplaat.openPraatplaat')}
                    </Button>
                  )}
                  {/* Deel link — voor praatplaat (#73) */}
                  {activeAssignment.type === 'praatplaat' && activeAssignment.praatplaatId && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowSharePraatplaatModal(true)}
                      className="inline-flex items-center gap-1"
                    >
                      <Share2 className="w-4 h-4" />
                      {t('teacher.praatplaat.share')}
                    </Button>
                  )}
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
              </div>
            )}

            {/* Wijzig opdracht → dezelfde type-kaarten, altijd zichtbaar */}
            {!assignmentLoading && activeAssignment && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-text-main mb-3">
                  {t('assignments.changeAssignment')}
                </p>
                <AssignmentTypeCards onSelect={handlePickType} />
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
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${ASSIGNMENT_ICON_WRAP_SM[pa.type as AssignmentKind]}`}>
                    {(() => {
                      const Icon = ASSIGNMENT_ICON[pa.type as AssignmentKind];
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-main truncate">{pa.assignmentName}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(pa.activatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
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
            </SectionTitle>
            <p className="text-sm text-text-muted ml-7">
              {t('teacher.classDetail.submissionsDescription')}
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

      {/* Player modal */}
      {selectedSubmission && (
        <SubmissionPlayer
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}

      {/* Opdracht activeren modal (type-gescoopt) */}
      <ActivateAssignmentModal
        isOpen={showActivateModal}
        onClose={closeActivateModal}
        typeFilter={activateType ?? undefined}
        onActivateTemplate={handleActivateTemplate}
        onActivatePraatplaat={handleActivatePraatplaat}
        onActivateStoryboard={handleActivateStoryboard}
        onCreatePraatplaat={() => {
          closeActivateModal();
          setShowCreatePraatplaat(true);
        }}
      />

      {/* Vervang-bevestiging: klik op een type-kaart terwijl er al een opdracht actief is */}
      <Modal
        isOpen={!!pendingType}
        onClose={() => setPendingType(null)}
        title={t('assignments.replaceConfirmTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          {t('assignments.replaceConfirmBody', { name: activeAssignment?.assignmentName ?? '' })}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setPendingType(null)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={confirmReplace} className="flex-1">
            {t('assignments.replaceConfirmButton')}
          </Button>
        </div>
      </Modal>

      <CreatePraatplaatModal
        isOpen={showCreatePraatplaat}
        onClose={() => setShowCreatePraatplaat(false)}
        onCreate={handleCreateAndActivatePraatplaat}
      />

      {/* Praatplaat viewer */}
      {viewingPraatplaat && (
        <PraatplaatViewer
          praatplaat={viewingPraatplaat}
          classId={classData.id}
          onClose={() => setViewingPraatplaat(null)}
        />
      )}

      {/* Share praatplaat modal (#73) */}
      {activeAssignment?.type === 'praatplaat' && activeAssignment.praatplaatId && (
        <SharePraatplaatModal
          isOpen={showSharePraatplaatModal}
          onClose={() => setShowSharePraatplaatModal(false)}
          classCode={classData.code}
          praatplaatName={activeAssignment.assignmentName}
          praatplaatId={activeAssignment.praatplaatId}
        />
      )}

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

export default ClassDetail;
