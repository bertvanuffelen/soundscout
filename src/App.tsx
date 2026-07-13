import { useEffect, useRef, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioService } from './services/AudioService';
import { useAppStore } from './stores/appStore';
import { useThemeStore } from './stores/themeStore';
import { useDevFlagsStore } from './stores/devFlagsStore';
import { lookupAndRouteAssignment } from './utils/compositionInit';
import { logger } from './utils/logger';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { FeatureErrorBoundary } from './components/common/FeatureErrorBoundary';
import { StartScreen } from './components/StartScreen';
import { MapView } from './components/map/MapView';
import { LocationScene } from './components/location/LocationScene';
import { LocationEditor } from './pages/LocationEditor';

// Lazy-loaded screen components for code splitting
const StudioView = lazy(() => import('./components/studio/StudioView'));
const StageView = lazy(() => import('./components/stage/StageView'));
const CompositionsView = lazy(() => import('./components/compositions/CompositionsView'));
const SharedPlayer = lazy(() => import('./components/share/SharedPlayer'));
const TeacherPage = lazy(() => import('./pages/TeacherPage'));
const ComposeModeScreen = lazy(() => import('./components/start/ComposeModeScreen'));
const TutorialScreen = lazy(() => import('./components/tutorial/TutorialScreen'));
const TeacherGuideScreen = lazy(() => import('./components/teacher/TeacherGuideScreen'));
const PraatplaatSelectScreen = lazy(() => import('./components/praatplaat/PraatplaatSelectScreen'));
const AssignmentLandingScreen = lazy(() => import('./components/assignment/AssignmentLandingScreen'));
const SharedPraatplaatViewer = lazy(() => import('./components/praatplaat/SharedPraatplaatViewer'));
const TeacherLandingPage = lazy(() => import('./pages/TeacherLandingPage'));

// Check if we're on the editor route
function isEditorRoute(): boolean {
  return window.location.pathname === '/editor';
}

// Check if we're on the public teacher landing route (#docentenpagina, stap 1).
// Losse, ontkoppelde pagina — geen dev-gate (publiek), geen AuthProvider nodig.
function isTeacherLandingRoute(): boolean {
  // /teacher.html is de multi-page build-output (eigen SEO-meta); Apache
  // rewrite't /teacher daarnaartoe, maar direct openen moet ook werken.
  const path = window.location.pathname;
  return path === '/teacher' || path === '/teacher.html';
}

// Loading fallback for lazy-loaded components
function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app text-text-muted">
      <div className="text-center">
        <div className="text-lg font-medium">{t('common.loading')}</div>
      </div>
    </div>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const currentScreen = useAppStore((s) => s.currentScreen);
  const shareCode = useAppStore((s) => s.shareCode);
  const sharedPraatplaatCode = useAppStore((s) => s.sharedPraatplaatCode);
  const goToShared = useAppStore((s) => s.goToShared);
  const goToSharedPraatplaat = useAppStore((s) => s.goToSharedPraatplaat);
  const goToStart = useAppStore((s) => s.goToStart);
  const goToTeacher = useAppStore((s) => s.goToTeacher);
  const setPendingLessonCardKey = useAppStore((s) => s.setPendingLessonCardKey);
  const setPendingTeacherTab = useAppStore((s) => s.setPendingTeacherTab);
  const initTheme = useThemeStore((s) => s.initTheme);
  const isThemeInitialized = useThemeStore((s) => s.isInitialized);

  // Update document title based on current screen
  useEffect(() => {
    const screenTitles: Record<string, string> = {
      start: t('start.startGame'),
      map: t('map.title'),
      location: t('common.location'),
      studio: t('studio.title'),
      stage: t('stage.title'),
      'compose-mode': t('composeMode.title'),
      tutorial: t('tutorial.title'),
      'teacher-guide': t('teacher.guide.title'),
      compositions: t('compositions.title'),
      teacher: 'Teacher Dashboard',
      shared: 'SoundScout',
      'praatplaat-select': 'SoundScout',
      'assignment-landing': 'SoundScout',
      'shared-praatplaat': 'SoundScout',
    };

    const screenTitle = screenTitles[currentScreen] || 'SoundScout';
    document.title = `${screenTitle} — SoundScout`;
  }, [currentScreen, t]);

  // Initialize theme on mount (reads URL param)
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Initialize dev flags: ?dev=true activates, persisted in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devParam = params.get('dev');
    const { hydrate, setAllFlags } = useDevFlagsStore.getState();

    // Always hydrate from localStorage first
    hydrate();

    // If ?dev=true is explicitly set, enable all flags
    if (devParam === 'true') {
      setAllFlags(true);
      // Clean URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('dev');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  // Check for ?share= query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('share');
    if (code) {
      goToShared(code);
      // Clean URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [goToShared]);

  // Check for ?pp= query parameter on mount (#73 — deelbare praatplaat-link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ppCode = params.get('pp');
    if (ppCode) {
      // Clean URL immediately (before async call)
      const url = new URL(window.location.href);
      url.searchParams.delete('pp');
      window.history.replaceState({}, '', url.pathname + url.search);

      // Route via AssignmentLandingScreen (#78) — ook voor praatplaat-deeplinks,
      // zodat de leerling eerst ziet welke opdracht ze binnengaan.
      lookupAndRouteAssignment(ppCode).then((success) => {
        if (!success) {
          logger.warn(`[App] ?pp=${ppCode}: lookup mislukt`);
          goToStart();
        }
      }).catch((err) => {
        logger.error('[App] ?pp= praatplaat lookup failed:', err);
        goToStart();
      });
    }
  }, [goToStart]);

  // Check for ?screen=teacher (+ optioneel ?lesson=<builtin_key>) op mount.
  // De publieke landingspagina stuurt docenten hierheen; met ?lesson= opent het
  // dashboard straks de Leskaarten-tab op de gekozen ingebouwde leskaart.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('screen') !== 'teacher') return;

    const lessonKey = params.get('lesson');
    if (lessonKey) setPendingLessonCardKey(lessonKey);
    const tab = params.get('tab');
    if (tab) setPendingTeacherTab(tab);
    goToTeacher();

    const url = new URL(window.location.href);
    url.searchParams.delete('screen');
    url.searchParams.delete('lesson');
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', url.pathname + url.search);
  }, [goToTeacher, setPendingLessonCardKey, setPendingTeacherTab]);

  // Wachtwoord-reset: de e-maillink verwijst naar ?screen=reset-password en
  // Supabase plakt zijn recovery-token (of otp_expired-fout) als #fragment.
  // Route naar het docentenscherm; AuthContext heeft de recovery-status al
  // gelezen (vóór deze cleanup) en TeacherPage toont het reset-formulier.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isRecovery =
      params.get('screen') === 'reset-password' ||
      hash.includes('type=recovery') ||
      hash.includes('error_code=otp_expired');
    if (!isRecovery) return;

    goToTeacher();

    if (params.get('screen') === 'reset-password') {
      const url = new URL(window.location.href);
      url.searchParams.delete('screen');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [goToTeacher]);

  // Check for ?pp-share= query parameter on mount (#73 — publieke praatplaat-viewer)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ppShareCode = params.get('pp-share');
    if (ppShareCode) {
      goToSharedPraatplaat(ppShareCode);
      // Clean URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('pp-share');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [goToSharedPraatplaat]);

  // Wait for theme to load
  if (!isThemeInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent-50">
        <div className="text-accent-600 text-lg font-medium">{t('common.loading')}</div>
      </div>
    );
  }

  switch (currentScreen) {
    case 'start':
      return <StartScreen />;

    case 'compose-mode':
      return (
        <FeatureErrorBoundary featureName="ComposeMode">
          <Suspense fallback={<LoadingFallback />}>
            <ComposeModeScreen />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'praatplaat-select':
      return (
        <FeatureErrorBoundary featureName="Praatplaat">
          <Suspense fallback={<LoadingFallback />}>
            <PraatplaatSelectScreen />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'assignment-landing':
      return (
        <FeatureErrorBoundary featureName="AssignmentLanding">
          <Suspense fallback={<LoadingFallback />}>
            <AssignmentLandingScreen />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'tutorial':
      return (
        <FeatureErrorBoundary featureName="Tutorial">
          <Suspense fallback={<LoadingFallback />}>
            <TutorialScreen />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'teacher-guide':
      return (
        <FeatureErrorBoundary featureName="TeacherGuide">
          <Suspense fallback={<LoadingFallback />}>
            <TeacherGuideScreen />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'map':
      return (
        <FeatureErrorBoundary featureName="Map">
          <MapView />
        </FeatureErrorBoundary>
      );

    case 'location':
      return (
        <FeatureErrorBoundary featureName="Location">
          <LocationScene />
        </FeatureErrorBoundary>
      );

    case 'studio':
      return (
        <FeatureErrorBoundary featureName="Studio">
          <Suspense fallback={<LoadingFallback />}>
            <StudioView />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'stage':
      return (
        <FeatureErrorBoundary featureName="Stage">
          <Suspense fallback={<LoadingFallback />}>
            <StageView />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'compositions':
      return (
        <FeatureErrorBoundary featureName="Compositions">
          <Suspense fallback={<LoadingFallback />}>
            <CompositionsView />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'teacher':
      return (
        <FeatureErrorBoundary featureName="Teacher">
          <Suspense fallback={<LoadingFallback />}>
            <TeacherPage />
          </Suspense>
        </FeatureErrorBoundary>
      );

    case 'shared':
      return shareCode ? (
        <FeatureErrorBoundary featureName="Player">
          <Suspense fallback={<LoadingFallback />}>
            <SharedPlayer code={shareCode} onBack={goToStart} />
          </Suspense>
        </FeatureErrorBoundary>
      ) : (
        <StartScreen />
      );

    case 'shared-praatplaat':
      return sharedPraatplaatCode ? (
        <FeatureErrorBoundary featureName="SharedPraatplaat">
          <Suspense fallback={<LoadingFallback />}>
            <SharedPraatplaatViewer code={sharedPraatplaatCode} onBack={goToStart} />
          </Suspense>
        </FeatureErrorBoundary>
      ) : (
        <StartScreen />
      );

    default:
      return <StartScreen />;
  }
}

function App() {
  // Unlock Web Audio context on first user gesture (tablets, Chromebooks)
  const audioUnlockedRef = useRef(false);
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      AudioService.unlockAudioContext();
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
    document.addEventListener('click', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    return () => {
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
  }, []);

  // Render LocationEditor for /editor route (dev-only content-authoring tool).
  // In productie valt /editor door naar de normale app-render (AppContent).
  if (isEditorRoute() && import.meta.env.DEV) {
    return (
      <ErrorBoundary>
        <LocationEditor />
      </ErrorBoundary>
    );
  }

  // Publieke docentenpagina (#docentenpagina) — losse route, ontkoppeld van de
  // reguliere app-flow (geen theme-init, geen AuthProvider, geen audio).
  if (isTeacherLandingRoute()) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <TeacherLandingPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Regular app
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
