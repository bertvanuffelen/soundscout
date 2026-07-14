/**
 * LandscapeHint — eenmalige "draai je apparaat"-banner (UX-LANDSCAPE)
 *
 * Op touch-apparaten in portret-stand is er weinig horizontale ruimte;
 * vooral de studio (tijdlijn) werkt prettiger in landschap. Deze subtiele,
 * dismissbare banner nudge't de gebruiker om te draaien.
 *
 * - Orientatie: puur CSS (`landscape:hidden`) — geen resize-listener nodig.
 * - Dismissal: eenmalig via het first-run-patroon (localStorage).
 * - Alleen op de brede compositie-schermen; niet op start/teacher.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw, X } from 'lucide-react';
import { hasSeenFirstRun, markFirstRunSeen } from '../../utils/firstRun';
import { useAppStore } from '../../stores/appStore';
import type { GameScreen } from '../../types';

const IS_TOUCH = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
const WIDE_SCREENS = new Set<GameScreen>(['studio', 'map', 'location', 'stage']);

export default function LandscapeHint() {
  const { t } = useTranslation();
  const currentScreen = useAppStore((s) => s.currentScreen);
  const [dismissed, setDismissed] = useState(() => hasSeenFirstRun('landscape-hint'));

  const handleDismiss = useCallback(() => {
    markFirstRunSeen('landscape-hint');
    setDismissed(true);
  }, []);

  if (dismissed || !IS_TOUCH || !WIDE_SCREENS.has(currentScreen)) return null;

  return (
    <div className="landscape:hidden fixed top-0 inset-x-0 z-[100] flex items-center gap-2 px-4 py-2 bg-accent-50 border-b border-accent-200 text-xs sm:text-sm text-accent-800 shadow-sm">
      <RotateCw size={16} className="shrink-0" />
      <span className="flex-1">{t('landscapeHint.message')}</span>
      <button
        onClick={handleDismiss}
        aria-label={t('common.close')}
        className="p-0.5 rounded hover:bg-accent-100 text-accent-600 hover:text-accent-800 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
