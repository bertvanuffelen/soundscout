import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App.tsx';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { installThemeRepository } from './themes/install';

registerServiceWorker();
// Themabron: statisch + Supabase (migratie 043) + concept-voorbeeld (docs/v2/ADMIN-DASHBOARD.md)
installThemeRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
