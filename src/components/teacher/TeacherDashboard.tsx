/**
 * TeacherDashboard - Hoofdscherm voor docenten
 *
 * Toont:
 * - Overzicht van alle klassen
 * - Knop om nieuwe klas aan te maken
 * - Unified "Mijn opdrachten" sectie (templates + praatplaten)
 * - Mogelijkheid om klas te openen voor details
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, BookOpen, Lightbulb, Plus, LogOut, ArrowLeft, FileText, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClasses } from '../../hooks/useClasses';
import { useTemplates } from '../../hooks/useTemplates';
import { usePraatplaten } from '../../hooks/usePraatplaten';
import type { TeacherClass } from '../../hooks/useClasses';
import type { PraatplaatRow } from '../../lib/praatplaat';
import { signOut } from '../../lib/auth';
import { Button } from '../ui/Button';
import { CreateClassModal } from './CreateClassModal';
import { ClassCard } from './ClassCard';
import { TemplateCard } from './TemplateCard';
import { PraatplaatCard } from './PraatplaatCard';
import { CreatePraatplaatModal } from './CreatePraatplaatModal';
import { PraatplaatViewer } from '../praatplaat/PraatplaatViewer';
import { logger } from '../../utils/logger';

interface TeacherDashboardProps {
  onSelectClass: (classData: TeacherClass) => void;
  onLogout: () => void;
  onBack?: () => void;
}

export function TeacherDashboard({ onSelectClass, onLogout, onBack }: TeacherDashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { classes, loading, error, createClass, deleteClass, refetch } = useClasses();
  const {
    templates, loading: templatesLoading, error: templatesError,
    remove: removeTemplate, toggle: toggleTemplate, refetch: refetchTemplates,
  } = useTemplates();
  const {
    praatplaten, loading: praatplatenLoading, error: praatplatenError,
    remove: removePraatplaat, refetch: refetchPraatplaten,
  } = usePraatplaten(); // Alle docent-praatplaten (geen classId)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePraatplaat, setShowCreatePraatplaat] = useState(false);
  const [viewingPraatplaat, setViewingPraatplaat] = useState<PraatplaatRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Haal display name op uit user metadata
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Docent';

  const handleLogout = async () => {
    try {
      await signOut();
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCreateClass = async (name: string) => {
    try {
      setActionError(null);
      await createClass(name);
      setShowCreateModal(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.dashboard.createClassError'));
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm(t('teacher.dashboard.deleteClassConfirm'))) {
      return;
    }

    try {
      setActionError(null);
      await deleteClass(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.dashboard.deleteClassError'));
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t('templates.deleteConfirm'))) return;
    try {
      setActionError(null);
      await removeTemplate(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('templates.deleteError'));
    }
  };

  const handleToggleTemplate = async (id: string, isActive: boolean) => {
    try {
      setActionError(null);
      await toggleTemplate(id, isActive);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('templates.toggleError'));
    }
  };

  const handleCreatePraatplaat = useCallback(async (params: {
    name: string;
    themeId: string;
    locationId: string;
    imageUrl: string;
  }) => {
    try {
      setActionError(null);
      const { createPraatplaat } = await import('../../lib/praatplaat');
      await createPraatplaat(params);
      await refetchPraatplaten();
      setShowCreatePraatplaat(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.praatplaat.createError'));
      logger.error('createPraatplaat failed:', err);
    }
  }, [refetchPraatplaten, t]);

  const handleDeletePraatplaat = async (id: string) => {
    if (!confirm(t('teacher.praatplaat.deleteConfirm'))) return;
    try {
      setActionError(null);
      await removePraatplaat(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.praatplaat.deleteError'));
    }
  };

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header - branding donkerblauw */}
      <header className="bg-brand-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="text-brand-300 hover:text-white text-sm mb-2 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('teacher.common.backToSoundScout')}
              </button>
            )}
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {t('teacher.dashboard.title')}
              </h1>
            </div>
            <p className="text-sm text-brand-300">
              {t('teacher.dashboard.welcome', { name: displayName })}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-brand-300 hover:text-white text-sm inline-flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            {t('teacher.dashboard.logout')}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Title + Create button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-text-main">
            {t('teacher.dashboard.myClasses')}
          </h2>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('teacher.dashboard.newClass')}
          </Button>
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
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-text-muted">{t('teacher.dashboard.loading')}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && classes.length === 0 && (
          <div className="bg-bg-surface rounded-2xl shadow-lg p-8 text-center">
            <BookOpen className="w-16 h-16 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-main mb-2">
              {t('teacher.dashboard.emptyTitle')}
            </h3>
            <p className="text-text-muted mb-6">
              {t('teacher.dashboard.emptyDescription')}
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {t('teacher.dashboard.createFirstClass')}
            </Button>
          </div>
        )}

        {/* Classes grid */}
        {!loading && classes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((classData) => (
              <ClassCard
                key={classData.id}
                classData={classData}
                onOpen={() => onSelectClass(classData)}
                onDelete={() => handleDeleteClass(classData.id)}
              />
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="mt-8 bg-primary-50 border border-primary-200 rounded-xl p-4">
          <h4 className="font-medium text-primary-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            {t('teacher.dashboard.howItWorks')}
          </h4>
          <ol className="text-primary-700 text-sm space-y-1">
            <li>{t('teacher.dashboard.step1')}</li>
            <li>{t('teacher.dashboard.step2')}</li>
            <li>{t('teacher.dashboard.step3')}</li>
            <li>{t('teacher.dashboard.step4')}</li>
          </ol>
        </div>

        {/* --- Opdrachten sectie (Templates + Praatplaten) --- */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-text-main flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('templates.dashboardTitle')}
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreatePraatplaat(true)}
              className="inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {t('templates.newPraatplaat')}
            </Button>
          </div>

          <p className="text-text-muted text-sm mb-4">
            {t('templates.dashboardDescription')}
          </p>

          {/* Errors */}
          {(templatesError || praatplatenError) && (
            <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
              {templatesError || praatplatenError}
              <button onClick={() => { refetchTemplates(); refetchPraatplaten(); }} className="ml-2 underline">
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Loading */}
          {(templatesLoading || praatplatenLoading) && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
            </div>
          )}

          {/* Empty state */}
          {!templatesLoading && !praatplatenLoading && templates.length === 0 && praatplaten.length === 0 && (
            <div className="bg-bg-surface rounded-xl shadow p-6 text-center">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-text-muted text-sm">
                {t('templates.emptyState')}
              </p>
            </div>
          )}

          {/* Unified grid: templates + praatplaten */}
          {!templatesLoading && !praatplatenLoading && (templates.length > 0 || praatplaten.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Templates */}
              {templates.map((tmpl) => (
                <div key={`t-${tmpl.id}`} className="relative">
                  <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    <FileText className="w-3 h-3" />
                    {t('templates.typeTemplate')}
                  </span>
                  <TemplateCard
                    template={tmpl}
                    onDelete={() => handleDeleteTemplate(tmpl.id)}
                    onToggle={(active) => handleToggleTemplate(tmpl.id, active)}
                  />
                </div>
              ))}
              {/* Praatplaten */}
              {praatplaten.map((pp) => (
                <div key={`p-${pp.id}`} className="relative">
                  <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 font-medium">
                    <MapPin className="w-3 h-3" />
                    {t('templates.typePraatplaat')}
                  </span>
                  <PraatplaatCard
                    praatplaat={pp}
                    onToggle={() => {}} // Activering gaat nu via ClassDetail
                    onDelete={() => handleDeletePraatplaat(pp.id)}
                    onView={() => setViewingPraatplaat(pp)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create class modal */}
      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateClass}
        />
      )}

      {/* Create praatplaat modal */}
      <CreatePraatplaatModal
        isOpen={showCreatePraatplaat}
        onClose={() => setShowCreatePraatplaat(false)}
        onCreate={handleCreatePraatplaat}
      />

      {/* Praatplaat viewer */}
      {viewingPraatplaat && (
        <PraatplaatViewer
          praatplaat={viewingPraatplaat}
          onClose={() => setViewingPraatplaat(null)}
        />
      )}
    </div>
  );
}

export default TeacherDashboard;
