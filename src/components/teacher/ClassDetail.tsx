/**
 * ClassDetail - Detail pagina voor een klas
 *
 * Toont alle composities van leerlingen in deze klas
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Loader2, Music, PenLine, Plus, MapPin } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useSubmissions } from '../../hooks/useSubmissions';
import type { Submission } from '../../hooks/useSubmissions';
import { usePraatplaten } from '../../hooks/usePraatplaten';
import { SubmissionCard } from './SubmissionCard';
import { SubmissionPlayer } from './SubmissionPlayer';
import { PraatplaatCard } from './PraatplaatCard';
import { CreatePraatplaatModal } from './CreatePraatplaatModal';
import { Button } from '../ui/Button';
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

  // --- Praatplaten (#72) ---
  const {
    praatplaten,
    loading: praatplatenLoading,
    operationError: praatplaatError,
    create: createPraatplaatHook,
    activate: activatePraatplaat,
    deactivate: deactivatePraatplaat,
    remove: removePraatplaat,
  } = usePraatplaten(classData.id);
  const [showCreatePraatplaat, setShowCreatePraatplaat] = useState(false);

  const handleCreatePraatplaat = useCallback(async (params: {
    name: string;
    themeId: string;
    locationId: string;
    imageUrl: string;
  }) => {
    await createPraatplaatHook({
      classId: classData.id,
      ...params,
    });
  }, [classData.id, createPraatplaatHook]);

  const handleTogglePraatplaat = useCallback(async (id: string, activate: boolean) => {
    try {
      if (activate) {
        await activatePraatplaat(id);
      } else {
        await deactivatePraatplaat(id);
      }
    } catch (err) {
      logger.error('Toggle praatplaat failed:', err);
    }
  }, [activatePraatplaat, deactivatePraatplaat]);

  const handleDeletePraatplaat = useCallback(async (id: string) => {
    if (!confirm(t('teacher.praatplaat.deleteConfirm'))) return;
    try {
      await removePraatplaat(id);
    } catch (err) {
      logger.error('Delete praatplaat failed:', err);
    }
  }, [removePraatplaat, t]);

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

  const handleDelete = async (id: string) => {
    if (!confirm(t('teacher.classDetail.deleteConfirm'))) {
      return;
    }

    try {
      setActionError(null);
      await deleteSubmission(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.classDetail.deleteError'));
    }
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

              {/* Klas-code prominent weergeven */}
              <div className="text-center">
                <p className="text-xs text-text-muted uppercase tracking-wide">{t('teacher.classDetail.classCodeLabel')}</p>
                <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-xl font-mono font-bold text-2xl">
                  {classData.code}
                </div>
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

        {/* --- Praatplaten sectie (#72) --- */}
        {!loading && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" />
                {t('teacher.praatplaat.sectionTitle')}
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreatePraatplaat(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('teacher.praatplaat.create')}
              </Button>
            </div>

            {praatplaatError && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4 text-sm">
                {praatplaatError}
              </div>
            )}

            {praatplatenLoading && (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
              </div>
            )}

            {!praatplatenLoading && praatplaten.length === 0 && (
              <div className="bg-bg-surface rounded-xl p-6 text-center border border-border-subtle">
                <MapPin className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted text-sm">
                  {t('teacher.praatplaat.emptyDescription')}
                </p>
              </div>
            )}

            {!praatplatenLoading && praatplaten.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {praatplaten.map((pp) => (
                  <PraatplaatCard
                    key={pp.id}
                    praatplaat={pp}
                    onToggle={(activate) => handleTogglePraatplaat(pp.id, activate)}
                    onDelete={() => handleDeletePraatplaat(pp.id)}
                    onView={() => {/* TODO: Fase 5 — PraatplaatViewer */}}
                  />
                ))}
              </div>
            )}
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
                    onDelete={() => handleDelete(submission.id)}
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
                  onDelete={() => handleDelete(submission.id)}
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

      {/* Praatplaat aanmaken modal (#72) */}
      <CreatePraatplaatModal
        isOpen={showCreatePraatplaat}
        onClose={() => setShowCreatePraatplaat(false)}
        onCreate={handleCreatePraatplaat}
      />
    </div>
  );
}

export default ClassDetail;
