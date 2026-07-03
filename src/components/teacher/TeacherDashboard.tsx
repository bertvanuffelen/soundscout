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
import { Loader2, BookOpen, Plus, LogOut, FileText, MapPin, ClipboardList, HelpCircle } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAuth } from '../../contexts/useAuth';
import { useClasses } from '../../hooks/useClasses';
import { useTemplates } from '../../hooks/useTemplates';
import { usePraatplaten } from '../../hooks/usePraatplaten';
import { useAssignmentCards } from '../../hooks/useAssignmentCards';
import type { TeacherClass } from '../../hooks/useClasses';
import type { PraatplaatRow } from '../../lib/praatplaat';
import type { CreateCardParams } from '../../lib/assignmentCards';
import type { Opdrachtkaart } from '../../types';
import { signOut } from '../../lib/auth';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { CreateClassModal } from './CreateClassModal';
import { ClassCard } from './ClassCard';
import { TemplateCard } from './TemplateCard';
import { PraatplaatCard } from './PraatplaatCard';
import { CreatePraatplaatModal } from './CreatePraatplaatModal';
import { AssignmentCardEditorModal } from './AssignmentCardEditorModal';
import { SectionTitle, HowItWorksSteps, TeacherPageHeader } from './common';
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
  const goToTeacherGuide = useAppStore((s) => s.goToTeacherGuide);
  const { classes, loading, error, createClass, deleteClass, refetch } = useClasses();
  const {
    templates, loading: templatesLoading, error: templatesError,
    remove: removeTemplate, refetch: refetchTemplates,
  } = useTemplates();
  const {
    praatplaten, loading: praatplatenLoading, error: praatplatenError,
    create: createPraatplaatHook, remove: removePraatplaat, refetch: refetchPraatplaten,
  } = usePraatplaten(); // Alle docent-praatplaten (geen classId)
  const {
    cards, loading: cardsLoading, error: cardsError,
    create: createCard, update: updateCard, remove: removeCard, refetch: refetchCards,
  } = useAssignmentCards();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePraatplaat, setShowCreatePraatplaat] = useState(false);
  const [showTemplateInfo, setShowTemplateInfo] = useState(false);
  const [viewingPraatplaat, setViewingPraatplaat] = useState<PraatplaatRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deletePraatplaatId, setDeletePraatplaatId] = useState<string | null>(null);
  // Opdrachtkaart-editor: showCardEditor stuurt de modal; editCard = te bewerken kaart (null = nieuw)
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editCard, setEditCard] = useState<Opdrachtkaart | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

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

  const handleDeleteClassConfirm = async () => {
    if (!deleteClassId) return;
    try {
      setActionError(null);
      await deleteClass(deleteClassId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.dashboard.deleteClassError'));
    }
    setDeleteClassId(null);
  };

  const handleDeleteTemplateConfirm = async () => {
    if (!deleteTemplateId) return;
    try {
      setActionError(null);
      await removeTemplate(deleteTemplateId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('templates.deleteError'));
    }
    setDeleteTemplateId(null);
  };

  const handleSaveCard = useCallback(async (params: CreateCardParams) => {
    if (editCard) {
      await updateCard(editCard.id, params);
    } else {
      await createCard(params);
    }
  }, [editCard, updateCard, createCard]);

  const handleDeleteCardConfirm = async () => {
    if (!deleteCardId) return;
    try {
      setActionError(null);
      await removeCard(deleteCardId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('assignmentCards.deleteError'));
    }
    setDeleteCardId(null);
  };

  const handleCreatePraatplaat = useCallback(async (params: {
    name: string;
    themeId: string;
    locationId: string;
    imageUrl: string;
  }) => {
    try {
      setActionError(null);
      await createPraatplaatHook(params);
      setShowCreatePraatplaat(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.praatplaat.createError'));
      logger.error('createPraatplaat failed:', err);
    }
  }, [createPraatplaatHook, t]);

  const handleDeletePraatplaatConfirm = async () => {
    if (!deletePraatplaatId) return;
    try {
      setActionError(null);
      await removePraatplaat(deletePraatplaatId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('teacher.praatplaat.deleteError'));
    }
    setDeletePraatplaatId(null);
  };

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header - gedeelde brand-900 shell */}
      <TeacherPageHeader
        title={t('teacher.dashboard.title')}
        subtitle={t('teacher.dashboard.welcome', { name: displayName })}
        onBack={onBack}
        backLabel={t('teacher.common.backToSoundScout')}
        actions={
          <>
            <button
              onClick={goToTeacherGuide}
              className="text-brand-300 hover:text-white text-sm inline-flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              {t('teacher.dashboard.guide')}
            </button>
            <button
              onClick={handleLogout}
              className="text-brand-300 hover:text-white text-sm inline-flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('teacher.dashboard.logout')}
            </button>
          </>
        }
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Title + Create button */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <SectionTitle>{t('teacher.dashboard.myClasses')}</SectionTitle>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 rounded-full flex-shrink-0"
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
            <Loader2 className="w-10 h-10 text-accent-500 animate-spin mx-auto mb-4" />
            <p className="text-text-muted">{t('teacher.dashboard.loading')}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && classes.length === 0 && (
          <div className="bg-bg-surface rounded-2xl shadow-lg p-8 text-center">
            <BookOpen className="w-16 h-16 text-accent-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-main mb-2">
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
                onDelete={() => setDeleteClassId(classData.id)}
              />
            ))}
          </div>
        )}

        {/* "Zo werkt het" — landing-stijl stap-kaarten, inklapbaar. Open bij
            een nieuwe docent (nog geen klassen), daarna inklapbaar. */}
        <HowItWorksSteps
          className="mt-8"
          title={t('teacher.dashboard.setup.title')}
          storageKey="ss-teacher-dashboard-setup"
          defaultOpen={classes.length === 0}
          steps={[
            {
              title: t('teacher.dashboard.setup.step1.title'),
              description: t('teacher.dashboard.setup.step1.description'),
            },
            {
              title: t('teacher.dashboard.setup.step2.title'),
              description: t('teacher.dashboard.setup.step2.description'),
            },
            {
              title: t('teacher.dashboard.setup.step3.title'),
              description: t('teacher.dashboard.setup.step3.description'),
            },
          ]}
        />

        {/* --- Opdrachten sectie --- */}
        <div className="mt-10">
          <SectionTitle className="flex items-center gap-2 mb-6">
            <FileText className="w-6 h-6 text-text-muted" />
            {t('templates.dashboardTitle')}
          </SectionTitle>

          {/* Errors */}
          {(templatesError || praatplatenError || cardsError) && (
            <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
              {templatesError || praatplatenError || cardsError}
              <button onClick={() => { refetchTemplates(); refetchPraatplaten(); refetchCards(); }} className="ml-2 underline">
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Loading */}
          {(templatesLoading || praatplatenLoading || cardsLoading) && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto mb-2" />
            </div>
          )}

          {!templatesLoading && !praatplatenLoading && !cardsLoading && (
            <>
              {/* --- Praatplaten subsectie --- */}
              <div className="mb-8">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <SectionTitle as="h3" size="md" className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-500" />
                    {t('templates.praatplatenTitle')}
                  </SectionTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCreatePraatplaat(true)}
                    className="inline-flex items-center gap-1 rounded-full flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('templates.newPraatplaat')}
                  </Button>
                </div>
                <p className="text-text-muted text-sm mb-4">
                  {t('templates.praatplatenDescription')}
                </p>

                {praatplaten.length === 0 && (
                  <div className="bg-bg-surface rounded-2xl p-6 text-center border border-border-subtle">
                    <MapPin className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                    <p className="text-text-muted text-sm">
                      {t('templates.praatplatenEmpty')}
                    </p>
                  </div>
                )}

                {praatplaten.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {praatplaten.map((pp) => (
                      <PraatplaatCard
                        key={pp.id}
                        praatplaat={pp}
                        classCode={classes.find((c) => c.id === pp.class_id)?.code}
                        onDelete={() => setDeletePraatplaatId(pp.id)}
                        onView={() => setViewingPraatplaat(pp)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* --- Templates subsectie --- */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <SectionTitle as="h3" size="md" className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent-600" />
                    {t('templates.templatesTitle')}
                  </SectionTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowTemplateInfo(true)}
                    className="inline-flex items-center gap-1 rounded-full flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('templates.newTemplate')}
                  </Button>
                </div>
                <p className="text-text-muted text-sm mb-4">
                  {t('templates.templatesDescription')}
                </p>

                {templates.length === 0 && (
                  <div className="bg-bg-surface rounded-2xl p-6 text-center border border-border-subtle">
                    <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                    <p className="text-text-muted text-sm">
                      {t('templates.templatesEmpty')}
                    </p>
                  </div>
                )}

                {templates.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {templates.map((tmpl) => (
                      <TemplateCard
                        key={tmpl.id}
                        template={tmpl}
                        onDelete={() => setDeleteTemplateId(tmpl.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* --- Opdrachtkaarten subsectie --- */}
              <div className="mt-8">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <SectionTitle as="h3" size="md" className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-accent-600" />
                    {t('assignmentCards.sectionTitle')}
                  </SectionTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setEditCard(null); setShowCardEditor(true); }}
                    className="inline-flex items-center gap-1 rounded-full flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    {t('assignmentCards.newButton')}
                  </Button>
                </div>
                <p className="text-text-muted text-sm mb-4">
                  {t('assignmentCards.sectionDescription')}
                </p>

                {cards.length === 0 && (
                  <div className="bg-bg-surface rounded-2xl p-6 text-center border border-border-subtle">
                    <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                    <p className="text-text-muted text-sm">
                      {t('assignmentCards.empty')}
                    </p>
                  </div>
                )}

                {cards.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="bg-bg-surface rounded-2xl p-4 border border-border-subtle flex flex-col"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-text-main text-sm min-w-0 truncate">{card.title}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditCard(card); setShowCardEditor(true); }}
                              className="text-xs text-accent-600 hover:text-accent-700 font-medium px-1"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => setDeleteCardId(card.id)}
                              className="text-text-muted hover:text-error-500 p-1 transition-colors"
                              title={t('common.delete')}
                            >
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        </div>
                        {card.bullets.length > 0 ? (
                          <ul className="text-text-muted text-xs space-y-1 list-disc pl-4">
                            {card.bullets.slice(0, 4).map((b, i) => (
                              <li key={i} className="truncate">{b}</li>
                            ))}
                            {card.bullets.length > 4 && (
                              <li className="list-none text-text-muted/70">
                                {t('assignmentCards.moreBullets', { count: card.bullets.length - 4 })}
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-text-muted/70 text-xs italic">{t('assignmentCards.noBullets')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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

      {/* Template info modal */}
      <Modal
        isOpen={showTemplateInfo}
        onClose={() => setShowTemplateInfo(false)}
        title={t('templates.newTemplateModalTitle')}
        size="sm"
      >
        <div className="space-y-3 text-text-main text-sm">
          <p>{t('templates.newTemplateModalStep1')}</p>
          <p>{t('templates.newTemplateModalStep2')}</p>
          <p>{t('templates.newTemplateModalStep3')}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowTemplateInfo(false)}
            className="flex-1"
          >
            {t('common.close')}
          </Button>
          {onBack && (
            <Button
              variant="primary"
              size="md"
              onClick={() => { setShowTemplateInfo(false); onBack(); }}
              className="flex-1"
            >
              {t('templates.newTemplateModalButton')}
            </Button>
          )}
        </div>
      </Modal>

      {/* Verwijder klas bevestiging (UX-DEST-2) */}
      <Modal
        isOpen={!!deleteClassId}
        onClose={() => setDeleteClassId(null)}
        title={t('teacher.dashboard.deleteClassTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed whitespace-pre-line">
          {t('teacher.dashboard.deleteClassConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteClassId(null)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteClassConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      {/* Verwijder template bevestiging (UX-DEST-2) */}
      <Modal
        isOpen={!!deleteTemplateId}
        onClose={() => setDeleteTemplateId(null)}
        title={t('templates.deleteTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          {t('templates.deleteConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteTemplateId(null)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteTemplateConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      {/* Verwijder praatplaat bevestiging (UX-DEST-2) */}
      <Modal
        isOpen={!!deletePraatplaatId}
        onClose={() => setDeletePraatplaatId(null)}
        title={t('teacher.praatplaat.deleteTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed whitespace-pre-line">
          {t('teacher.praatplaat.deleteConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeletePraatplaatId(null)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleDeletePraatplaatConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      {/* Opdrachtkaart editor */}
      <AssignmentCardEditorModal
        isOpen={showCardEditor}
        card={editCard}
        onClose={() => setShowCardEditor(false)}
        onSave={handleSaveCard}
      />

      {/* Verwijder opdrachtkaart bevestiging (UX-DEST-2) */}
      <Modal
        isOpen={!!deleteCardId}
        onClose={() => setDeleteCardId(null)}
        title={t('assignmentCards.deleteTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed whitespace-pre-line">
          {t('assignmentCards.deleteConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteCardId(null)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteCardConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default TeacherDashboard;
