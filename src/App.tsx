import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { useThemeStore } from './stores/themeStore';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { StartScreen } from './components/StartScreen';
import { MapView } from './components/map/MapView';
import { LocationScene } from './components/location/LocationScene';
import { StudioView } from './components/studio/StudioView';
import { StageView } from './components/stage/StageView';
import { CompositionsView } from './components/compositions';
import { LocationEditor } from './pages/LocationEditor';
import { TeacherPage } from './pages/TeacherPage';

// Check if we're on the editor route
function isEditorRoute(): boolean {
  return window.location.pathname === '/editor';
}

function AppContent() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const initTheme = useThemeStore((s) => s.initTheme);
  const isThemeInitialized = useThemeStore((s) => s.isInitialized);

  // Initialize theme on mount (reads URL param)
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Wait for theme to load
  if (!isThemeInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-sky-600 text-lg font-medium">Laden...</div>
      </div>
    );
  }

  switch (currentScreen) {
    case 'start':
      return <StartScreen />;

    case 'map':
      return <MapView />;

    case 'location':
      return <LocationScene />;

    case 'studio':
      return <StudioView />;

    case 'stage':
      return <StageView />;

    case 'compositions':
      return <CompositionsView />;

    case 'teacher':
      return <TeacherPage />;

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
