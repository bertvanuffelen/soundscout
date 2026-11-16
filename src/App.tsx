import { useEffect, useRef } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { AudioService } from './services/AudioService';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { router } from './router/router';

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

  // Welk scherm er staat bepaalt de router: zie src/router/routes.tsx (de
  // routes), src/router/screenSync.ts (koppeling met de appStore) en
  // docs/v2/URL-CONTRACT.md (alle adressen, oud en nieuw).
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
