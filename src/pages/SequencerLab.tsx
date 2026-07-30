/**
 * SequencerLab — dev-only prototype van de step sequencer (/sequencer).
 *
 * Volledig geïsoleerd van de reguliere app: eigen route buiten de app-shell
 * (zelfde patroon als /editor), eigen store, eigen audio-engine met eigen
 * Tone.Clock — géén interactie met AudioService of Tone.Transport.
 * Zie docs-plan "Step Sequencer Lab" voor het ontwerp.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Music } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

export default function SequencerLab() {
  const { t } = useTranslation();
  const initTheme = useThemeStore((s) => s.initTheme);
  const isThemeInitialized = useThemeStore((s) => s.isInitialized);

  // Theme zelf bootstrappen — deze route rendert buiten AppContent,
  // dus niemand anders roept initTheme() aan (zelfde patroon als de editor).
  useEffect(() => {
    if (!isThemeInitialized) {
      initTheme();
    }
  }, [isThemeInitialized, initTheme]);

  if (!isThemeInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app text-text-muted">
        <div className="text-lg font-medium">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg-app flex flex-col">
      {/* --- Header --- */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-white">
        <div className="w-10 h-10 rounded-xl bg-accent-400 flex items-center justify-center">
          <Music className="w-5 h-5 text-accent-900" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text-main leading-tight">
            {t('sequencer.title')}
          </h1>
          <p className="text-xs text-text-muted">{t('sequencer.subtitle')}</p>
        </div>
        <span className="px-2 py-1 rounded-md bg-error-500 text-white text-xs font-bold tracking-wide">
          {t('sequencer.devBadge')}
        </span>
      </header>

      {/* --- Inhoud (grid + transport volgen in latere stappen) --- */}
      <main className="flex-1 flex items-center justify-center p-4">
        <p className="text-text-muted text-sm">{t('sequencer.loading')}</p>
      </main>
    </div>
  );
}
