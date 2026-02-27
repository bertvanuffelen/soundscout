import { useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './stores/appStore';
import { useThemeStore } from './stores/themeStore';
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

// Check if we're on the editor route
function isEditorRoute(): boolean {
  return window.location.pathname === '/editor';
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
  const goToShared = useAppStore((s) => s.goToShared);
  const goToStart = useAppStore((s) => s.goToStart);
  const initTheme = useThemeStore((s) => s.initTheme);
  const isThemeInitialized = useThemeStore((s) => s.isInitialized);

  // Update document title based on current screen
  useEffect(() => {
    const screenTitles: Record<string, string> = {
      start: t('start.startGame'),
      map: t('map.title'),
      location: t('location.backToMap'),
      studio: t('studio.title'),
      stage: t('stage.title'),
      compositions: t('compositions.title'),
      teacher: 'Teacher Dashboard',
      shared: 'SoundScout',
    };

    const screenTitle = screenTitles[currentScreen] || 'SoundScout';
    document.title = `${screenTitle} — SoundScout`;
  }, [currentScreen, t]);

  // Initialize theme on mount (reads URL param)
  useEffect(() => {
    initTheme();
  }, [initTheme]);

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

  // Wait for theme to load
  if (!isThemeInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-sky-600 text-lg font-medium">{t('common.loading')}</div>
      </div>
    );
  }

  switch (currentScreen) {
    case 'start':
      return <StartScreen />;

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

    default:
      return <StartScreen />;
  }
}

function App() {
  // Render LocationEditor for /editor route (admin tool)
  if (isEditorRoute()) {
    return (
      <ErrorBoundary>
        <LocationEditor />
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
