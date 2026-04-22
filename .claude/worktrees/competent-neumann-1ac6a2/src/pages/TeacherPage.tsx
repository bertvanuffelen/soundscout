/**
 * TeacherPage - Container voor de docenten sectie
 *
 * Beheert de flow tussen:
 * - Login
 * - Registratie
 * - Dashboard
 * - Klas detail
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { TeacherLogin, TeacherRegister, TeacherForgotPassword, TeacherDashboard, ClassDetail } from '../components/teacher';
import type { TeacherClass } from '../hooks/useClasses';

type TeacherView = 'login' | 'register' | 'forgot-password' | 'dashboard' | 'class-detail';

export function TeacherPage() {
  const { user, loading } = useAuth();
  const goToStart = useAppStore((s) => s.goToStart);

  // Bepaal welke view te tonen
  const [view, setView] = useState<TeacherView>(user ? 'dashboard' : 'login');
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);

  // Update view als auth status verandert
  if (!loading && user && view === 'login') {
    setView('dashboard');
  }
  if (!loading && !user && (view === 'dashboard' || view === 'class-detail')) {
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

  // Login view
  if (view === 'login') {
    return (
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
    return (
      <TeacherForgotPassword
        onSwitchToLogin={() => setView('login')}
        onBack={goToStart}
      />
    );
  }

  // Register view
  if (view === 'register') {
    return (
      <TeacherRegister
        onSuccess={() => setView('dashboard')}
        onSwitchToLogin={() => setView('login')}
        onBack={goToStart}
      />
    );
  }

  // Class detail view
  if (view === 'class-detail' && selectedClass) {
    return (
      <ClassDetail
        classData={selectedClass}
        onBack={() => {
          setSelectedClass(null);
          setView('dashboard');
        }}
      />
    );
  }

  // Dashboard view (default when logged in)
  return (
    <TeacherDashboard
      onSelectClass={(classData) => {
        setSelectedClass(classData);
        setView('class-detail');
      }}
      onLogout={() => {
        setView('login');
      }}
      onBack={goToStart}
    />
  );
}

export default TeacherPage;
