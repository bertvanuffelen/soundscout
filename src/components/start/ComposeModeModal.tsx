/**
 * ComposeModeModal — Eerste stap na "Nieuwe compositie" (#78).
 *
 * Sketch A scheidt de twee assen expliciet:
 *   1. Soort compositie kiezen  (vrij / bij afbeelding / bij storyboard)
 *   2. Daarna pas thema kiezen
 *
 * Deze modal is stap 1. Op selectie zet hij de compose-mode in `appStore`
 * en geeft via `onModeSelected` aan de aanroeper door dat we naar stap 2
 * (ThemeSelectionModal) mogen. ComposeModeScreen wordt later gebruikt om
 * binnen het gekozen thema een specifieke afbeelding/storyboard te kiezen
 * (alleen voor 'image' en 'storyboard').
 *
 * Visueel sluit dit aan bij `ThemeSelectionModal`: zelfde modal-chrome,
 * grid van keuze-cards.
 */

import { useTranslation } from 'react-i18next';
import { X, Music, Image as ImageIcon, Film } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import type { ComposeMode } from '../../types';

interface ComposeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModeSelected: (mode: ComposeMode) => void;
}

export function ComposeModeModal({ isOpen, onClose, onModeSelected }: ComposeModeModalProps) {
  const { t } = useTranslation();
  const setComposeMode = useAppStore((s) => s.setComposeMode);

  if (!isOpen) return null;

  const handleSelect = (mode: ComposeMode) => {
    setComposeMode(mode);
    onModeSelected(mode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200">
          <h2 className="text-xl sm:text-2xl font-bold text-text-main">
            {t('composeMode.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-text-muted mb-6">{t('composeMode.subtitle')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ModeCard
              icon={<Music size={28} />}
              title={t('composeMode.free')}
              description={t('composeMode.freeDescription')}
              onClick={() => handleSelect('free')}
              color="accent"
            />
            {/* Mode-specific card colors — visual distinction between free/image/storyboard, no semantic token equivalent */}
            <ModeCard
              icon={<ImageIcon size={28} />}
              title={t('composeMode.image')}
              description={t('composeMode.imageDescription')}
              onClick={() => handleSelect('image')}
              color="teal"
            />
            {/* Mode-specific card colors — visual distinction between free/image/storyboard, no semantic token equivalent */}
            <ModeCard
              icon={<Film size={28} />}
              title={t('composeMode.storyboard')}
              description={t('composeMode.storyboardDescription')}
              onClick={() => handleSelect('storyboard')}
              color="purple"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: 'accent' | 'teal' | 'purple';
}

function ModeCard({ icon, title, description, onClick, color }: ModeCardProps) {
  const colorClasses = {
    accent: 'border-accent-200 hover:border-accent-400 hover:bg-accent-50',
    teal: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50',
    purple: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50',
  };
  const iconColorClasses = {
    accent: 'text-accent-500',
    teal: 'text-teal-500',
    purple: 'text-purple-500',
  };

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center text-center p-5 rounded-xl border-2 bg-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${colorClasses[color]}`}
    >
      <div className={`mb-3 ${iconColorClasses[color]}`}>{icon}</div>
      <h3 className="text-base font-bold text-text-main mb-1">{title}</h3>
      <p className="text-xs text-text-muted">{description}</p>
    </button>
  );
}
