/**
 * TeacherPage - Container voor de docenten sectie
 *
 * Beheert de flow tussen:
 * - Login
 * - Registratie
 * - Dashboard
 * - Klas detail
 */

import { useState, type ReactNode } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useAppStore } from '../stores/appStore';
import { TeacherLogin, TeacherRegister, TeacherForgotPassword, TeacherResetPassword, TeacherDashboard, ClassDetail } from '../components/teacher';
import { AssignmentWizard } from '../components/teacher/wizard/AssignmentWizard';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import type { TeacherClass } from '../hooks/useClasses';

type TeacherView = 'login' | 'register' | 'forgot-password' | 'dashboard' | 'class-detail' | 'wizard';

/** Waar de opdracht-wizard vandaan kwam (Annuleren gaat daarheen terug) */
interface WizardState {
  returnTo: 'dashboard' | 'class-detail';
  lessonCardId: string | null;
}

/**
 * De auth-schermen (login/registreer/wachtwoord) zijn gecentreerde kaarten
 * zonder de TeacherPageHeader, dus zonder taalknop. Deze wrapper legt er een
 * vaste NL/EN-knop rechtsboven overheen, zodat de toggle op élk docentscherm
 * op dezelfde plek staat (testronde 5 / A2).
 */
function withLanguageSwitcher(node: ReactNode): ReactNode {
  return (
    <>
      {node}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher variant="light" />
      </div>
    </>
  );
}

export function TeacherPage() {
  const { user, loading, passwordRecovery, clearPasswordRecovery } = useAuth();
  const goToStart = useAppStore((s) => s.goToStart);

  // Bepaal welke view te tonen
  const [view, setView] = useState<TeacherView>(user ? 'dashboard' : 'login');
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  // Klaspagina openen op een bepaald tabblad (bijv. na de wizard: 'bezig')
  const [classTab, setClassTab] = useState<'klaar' | 'bezig' | 'terug' | null>(null);

  const openWizard = (classData: TeacherClass, returnTo: WizardState['returnTo'], lessonCardId: string | null = null) => {
    setSelectedClass(classData);
    setWizard({ returnTo, lessonCardId });
    setView('wizard');
  };

  // Update view als auth status verandert
  if (!loading && user && view === 'login') {
    setView('dashboard');
  }
  if (!loading && !user && (view === 'dashboard' || view === 'class-detail' || view === 'wizard')) {
    setView('login');
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center">
        <div className="text-text-muted text-lg">Laden...</div>
      </div>
    );
  }

  // Wachtwoord-reset view (binnengekomen via de reset-link uit de e-mail).
  // Gaat vóór alle andere views: de recovery-sessie logt de docent al in,
  // maar die moet eerst een nieuw wachtwoord instellen.
  if (passwordRecovery) {
    return withLanguageSwitcher(
      <TeacherResetPassword
        onDone={() => {
          clearPasswordRecovery();
          setView('dashboard');
        }}
        onRequestNew={() => {
          clearPasswordRecovery();
          setView('forgot-password');
        }}
      />
    );
  }

  // Login view
  if (view === 'login') {
    return withLanguageSwitcher(
      <TeacherLogin
        onSuccess={() => setView('dashboard')}
        onSwitchToRegister={() => setView('register')}
        onForgotPassword={() => setView('forgot-password')}
        onBack={goToStart}
      />
    );
  }

  // Forgot password view
  if (view === 'forgot-password') {
    return withLanguageSwitcher(
      <TeacherForgotPassword
        onSwitchToLogin={() => setView('login')}
        onBack={goToStart}
      />
    );
  }

  // Register view
  if (view === 'register') {
    return withLanguageSwitcher(
      <TeacherRegister
        onSwitchToLogin={() => setView('login')}
        onBack={goToStart}
      />
    );
  }

  // Opdracht-wizard (klaarzetten in 3 stappen)
  if (view === 'wizard' && selectedClass && wizard) {
    return (
      <AssignmentWizard
        key={`${selectedClass.id}-${wizard.lessonCardId ?? 'eigen'}`}
        classData={selectedClass}
        initialLessonCardId={wizard.lessonCardId}
        onCancel={() => {
          const back = wizard.returnTo;
          setWizard(null);
          if (back === 'dashboard') setSelectedClass(null);
          setView(back);
        }}
        onToClass={() => {
          setWizard(null);
          setClassTab('bezig');
          setView('class-detail');
        }}
      />
    );
  }

  // Class detail view
  if (view === 'class-detail' && selectedClass) {
    return (
      <ClassDetail
        key={selectedClass.id}
        classData={selectedClass}
        initialTab={classTab}
        onOpenWizard={() => openWizard(selectedClass, 'class-detail')}
        onBack={() => {
          setSelectedClass(null);
          setClassTab(null);
          setView('dashboard');
        }}
      />
    );
  }

  // Dashboard view (default when logged in)
  return (
    <TeacherDashboard
      onSelectClass={(classData, tab) => {
        setSelectedClass(classData);
        setClassTab(tab ?? null);
        setView('class-detail');
      }}
      onOpenWizard={(classData, lessonCardId) => openWizard(classData, 'dashboard', lessonCardId ?? null)}
      onLogout={() => {
        setView('login');
      }}
      onBack={goToStart}
    />
  );
}

export default TeacherPage;
