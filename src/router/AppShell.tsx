/**
 * AppShell — de layout rond alle schermen van de eigenlijke app.
 *
 * Alles wat vroeger in `AppContent` (App.tsx) stond behalve de schermkeuze:
 * thema laden, werk-in-uitvoering terugzetten, paginatitel, tellers, en de
 * providers voor inloggen en server-state (TanStack Query). Welk
 * scherm er staat bepaalt de router (`<Outlet />`); links met oude parameters
 * handelt `beforeLoad` in routes.tsx af.
 */
import { useEffect } from 'react';
import { Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore';
import { useThemeStore } from '../stores/themeStore';
import { useDevFlagsStore } from '../stores/devFlagsStore';
import { logUsageEvent, installErrorCounter } from '../utils/usageStats';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { startWorkInProgressPersistence } from '../services/workInProgress';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { queryClient } from '../query/queryClient';
import { QueryAuthSync } from '../query/QueryAuthSync';
import LandscapeHint from '../components/ui/LandscapeHint';
import { ThemePreviewBanner } from '../components/common/ThemePreviewBanner';
import { syncLessonState } from '../lib/lessonState';

function AppContent() {
  const { t } = useTranslation();
  const currentScreen = useAppStore((s) => s.currentScreen);
  const initTheme = useThemeStore((s) => s.initTheme);
  const isThemeInitialized = useThemeStore((s) => s.isInitialized);

  // Waarschuwing bij verlaten met werk (AUD-03)
  useLeaveGuard();

  // Update document title based on current screen
  useEffect(() => {
    const screenTitles: Record<string, string> = {
      map: t('map.title'),
      location: t('common.location'),
      studio: t('studio.title'),
      stage: t('stage.title'),
      'compose-mode': t('composeMode.title'),
      tutorial: t('tutorial.title'),
      'teacher-guide': t('teacher.guide.title'),
      compositions: t('compositions.title'),
      teacher: t('teacher.dashboard.title'),
    };

    // Startscherm en schermen zonder eigen titel: gewoon "SoundScout" (O11)
    const screenTitle = screenTitles[currentScreen];
    document.title = screenTitle ? `${screenTitle} — SoundScout` : 'SoundScout';
  }, [currentScreen, t]);

  // Initialize theme on mount (reads the ?theme= URL param)
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Werk-in-uitvoering overleeft herladen (A1, B32): na initTheme, zodat het
  // bewaarde thema het standaardthema overschrijft
  useEffect(() => startWorkInProgressPersistence(), []);

  // Anonieme sessieteller (cookieloos, geen persoonsgegevens — zie usageStats)
  useEffect(() => {
    logUsageEvent('app_start');
    installErrorCounter();
  }, []);

  // "Les afronden" (migratie 045): heeft de docent de les afgerond sinds dit
  // kind begon, dan ruimt dit apparaat zijn werkblad op. Controle bij het
  // openen, bij het koppelen aan een klas en bij terugkomen op het tabblad;
  // nooit midden in het werk op een zichtbaar tabblad.
  const classCode = useAppStore((s) => s.classSession?.classCode ?? null);
  useEffect(() => {
    if (!classCode) return;
    void syncLessonState();
    const onVisible = () => { if (document.visibilityState === 'visible') void syncLessonState(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [classCode]);

  // Tel schermmijlpalen (eenmalig per sessie, alleen aggregaat per dag)
  useEffect(() => {
    if (currentScreen === 'stage') logUsageEvent('stage_reached');
    if (currentScreen === 'teacher') logUsageEvent('teacher_dashboard_opened');
  }, [currentScreen]);

  // Ontwikkelvlaggen uit localStorage (?dev=true zet ze aan: legacyEntry.ts)
  useEffect(() => {
    useDevFlagsStore.getState().hydrate();
  }, []);

  // Wait for theme to load
  if (!isThemeInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent-50">
        <div className="text-accent-600 text-lg font-medium">{t('common.loading')}</div>
      </div>
    );
  }

  return <Outlet />;
}

export default function AppShell() {
  return (
    // Server-state (TanStack Query, V2 Fase 2): één cache voor de hele app;
    // QueryAuthSync ruimt hem op zodra er een andere docent inlogt.
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QueryAuthSync />
        <AppContent />
        <LandscapeHint />
        <ThemePreviewBanner />
      </AuthProvider>
    </QueryClientProvider>
  );
}
