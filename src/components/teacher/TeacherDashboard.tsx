/**
 * TeacherDashboard - Hoofdscherm voor docenten
 *
 * Toont:
 * - Overzicht van alle klassen
 * - Knop om nieuwe klas aan te maken
 * - Mogelijkheid om klas te openen voor details
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, BookOpen, Lightbulb, Plus, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClasses } from '../../hooks/useClasses';
import type { TeacherClass } from '../../hooks/useClasses';
import { signOut } from '../../lib/auth';
import { Button } from '../ui/Button';
import { CreateClassModal } from './CreateClassModal';
import { ClassCard } from './ClassCard';

interface TeacherDashboardProps {
  onSelectClass: (classData: TeacherClass) => void;
  onLogout: () => void;
  onBack?: () => void;
}

export function TeacherDashboard({ onSelectClass, onLogout, onBack }: TeacherDashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { classes, loading, error, createClass, deleteClass, refetch } = useClasses();
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      </main>

      {/* Create class modal */}
      {showCreateModal && (
        <CreateClassModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateClass}
        />
      )}
    </div>
  );
}

export default TeacherDashboard;
