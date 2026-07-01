/**
 * ClassDetail - Detail pagina voor een klas
 *
 * Toont alle composities van leerlingen in deze klas
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Loader2, Music, PenLine, MapPin, FileText, Play, XCircle, Share2 } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useSubmissions } from '../../hooks/useSubmissions';
import type { Submission } from '../../hooks/useSubmissions';
import { useClassAssignment } from '../../hooks/useClassAssignment';
import { useTemplates } from '../../hooks/useTemplates';
import { usePraatplaten } from '../../hooks/usePraatplaten';
import { SubmissionCard } from './SubmissionCard';
import { SubmissionPlayer } from './SubmissionPlayer';
import { ActivateAssignmentModal } from './ActivateAssignmentModal';
import { CreatePraatplaatModal } from './CreatePraatplaatModal';
import { PraatplaatViewer } from '../praatplaat/PraatplaatViewer';
import { SharePraatplaatModal } from './SharePraatplaatModal';
import { createPraatplaat, type PraatplaatRow } from '../../lib/praatplaat';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { logger } from '../../utils/logger';

interface ClassDetailProps {
  classData: TeacherClass;
  onBack: () => void;
}

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
    deactivate: deactivateAssignment,
  } = useClassAssignment(classData.id);

  // Resources bepalen de knop-hiërarchie in de lege staat (zie hasResources).
  const { templates } = useTemplates();
  const { praatplaten } = usePraatplaten();
  const hasResources = templates.some((tmpl) => tmpl.isActive) || praatplaten.length > 0;

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showCreatePraatplaat, setShowCreatePraatplaat] = useState(false);
  const [viewingPraatplaat, setViewingPraatplaat] = useState<PraatplaatRow | null>(null);
  const [showActivatedCode, setShowActivatedCode] = useState(false);
  const [showSharePraatplaatModal, setShowSharePraatplaatModal] = useState(false);

  const handleActivateTemplate = useCallback(async (templateId: string) => {
    await activateTemplate(templateId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activateTemplate]);

  const handleActivatePraatplaat = useCallback(async (praatplaatId: string) => {
    await activatePraatplaatAssignment(praatplaatId);
    setShowActivatedCode(true);
    setTimeout(() => setShowActivatedCode(false), 8000);
  }, [activatePraatplaatAssignment]);

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
      {/* Header */}
      <header className="bg-bg-surface border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-main text-sm mb-2 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('teacher.classDetail.back')}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-main">
                {classData.name}
              </h1>
              <p className="text-sm text-text-muted">
                {t('teacher.classDetail.compositionCount', { count: submitted.length })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Ververs knop */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                title={t('teacher.classDetail.refreshTitle')}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              {/* Klascode prominent weergeven */}
              <div className="text-center">
                <p className="text-xs text-text-muted uppercase tracking-wide">{t('teacher.classDetail.classCodeLabel')}</p>
                <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-xl font-mono font-bold text-2xl">
                  {classData.code}
                </div>
                <p className="text-xs text-text-muted mt-1">{t('teacher.classCodeMeaning')}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
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
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-text-muted">{t('teacher.classDetail.loading')}</p>
          </div>
        )}

        {/* --- Actieve opdracht blok --- */}
        {!loading && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-text-main flex items-center gap-2 mb-1">
              <Play className="w-5 h-5 text-primary-500" />
              {t('assignments.activeTitle')}
            </h2>
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
              <div className="bg-primary-50 border border-primary-200 text-primary-800 px-4 py-3 rounded-xl mb-4 text-sm flex items-center justify-between">
                <span>{t('teacher.praatplaat.activatedMessage')}</span>
                <span className="font-mono font-bold text-lg ml-3">{classData.code}</span>
              </div>
            )}

            {assignmentLoading && (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
              </div>
            )}

            {/* Geen actieve opdracht */}
            {!assignmentLoading && !activeAssignment && (
              <div className="bg-bg-surface rounded-xl p-6 text-center border border-border-subtle">
                <p className="text-text-muted text-sm mb-1">
                  {t('assignments.noActive')}
                </p>
                <p className="text-text-main text-sm font-medium mb-4">
                  {t('assignments.noActiveGuidance', { code: classData.code })}
                </p>
                {/* Eén primaire actie: zonder resources is 'Nieuwe praatplaat'
                    het nuttigst (de activeer-modal is dan toch leeg); met
                    resources is 'Opdracht activeren' de logische primaire actie. */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant={hasResources ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => setShowActivateModal(true)}
                  >
                    {t('assignments.activateButton')}
                  </Button>
                  <Button
                    variant={hasResources ? 'secondary' : 'primary'}
                    size="md"
                    onClick={() => setShowCreatePraatplaat(true)}
                  >
                    {t('assignments.createPraatplaatForClass')}
                  </Button>
                </div>
              </div>
            )}

            {/* Actieve opdracht kaart */}
            {!assignmentLoading && activeAssignment && (
              <div className="bg-bg-surface rounded-xl p-4 sm:p-5 border border-primary-200 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Type icoon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    activeAssignment.type === 'template'
                      ? 'bg-warning-100 text-warning-700'
                      : 'bg-primary-100 text-primary-700'
                  }`}>
                    {activeAssignment.type === 'template' ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                        activeAssignment.type === 'template'
                          ? 'bg-warning-100 text-warning-800'
                          : 'bg-primary-100 text-primary-800'
                      }`}>
                        {activeAssignment.type === 'template'
                          ? t('templates.typeTemplate')
                          : t('templates.typePraatplaat')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-text-main text-lg">
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
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowActivateModal(true)}
                  >
                    {t('assignments.changeButton')}
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
              </div>
            )}
          </div>
        )}

        {/* --- Eerdere opdrachten --- */}
        {!loading && !assignmentLoading && pastAssignments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-text-main flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-primary-500" />
              {t('assignments.pastTitle')}
            </h2>
            <p className="text-sm text-text-muted mb-4 ml-7">
              {t('assignments.pastDescription')}
            </p>
            <div className="space-y-2">
              {pastAssignments.map((pa) => (
                <div
                  key={pa.id}
                  className="bg-bg-surface rounded-lg p-3 border border-border-subtle flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    pa.type === 'template' ? 'bg-warning-100 text-warning-600' : 'bg-primary-100 text-primary-600'
                  }`}>
                    {pa.type === 'template' ? <FileText className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
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
            <h2 className="text-lg font-semibold text-text-main flex items-center gap-2 mb-1">
              <Music className="w-5 h-5 text-primary-500" />
              {t('teacher.classDetail.submissionsTitle')}
            </h2>
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
                <Music className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-text-main mb-2">
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

      {/* Opdracht activeren modal */}
      <ActivateAssignmentModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onActivateTemplate={handleActivateTemplate}
        onActivatePraatplaat={handleActivatePraatplaat}
        onCreatePraatplaat={() => {
          setShowActivateModal(false);
          setShowCreatePraatplaat(true);
        }}
      />

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
