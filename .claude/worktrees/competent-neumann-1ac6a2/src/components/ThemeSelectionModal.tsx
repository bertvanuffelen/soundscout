/**
 * ThemeSelectionModal - Modal for selecting a theme when starting a new composition
 *
 * Displays a grid of available themes with their map previews.
 * User clicks on a theme card to select and start.
 */

import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { getPublicThemes, type ThemeConfig } from '../data/themes';

interface ThemeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTheme: (themeId: string) => void;
  isLoading?: boolean;
}

export function ThemeSelectionModal({
  isOpen,
  onClose,
  onSelectTheme,
  isLoading = false,
}: ThemeSelectionModalProps) {
  const { t } = useTranslation();
  const themes = getPublicThemes();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200">
          <h2 className="text-xl sm:text-2xl font-bold text-text-main">
            {t('themeSelection.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-text-muted mb-6">
            {t('themeSelection.subtitle')}
          </p>

          {/* Theme grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                onSelect={() => onSelectTheme(theme.id)}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThemeCardProps {
  theme: ThemeConfig;
  onSelect: () => void;
  isLoading: boolean;
}

function ThemeCard({ theme, onSelect, isLoading }: ThemeCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      {/* Map preview image */}
      <div className="aspect-video w-full overflow-hidden bg-neutral-100">
        <img
          src={theme.map.backgroundImage}
          alt={t(theme.name)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Theme info */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-text-main mb-1">
          {t(theme.name)}
        </h3>
        <p className="text-sm text-text-muted">
          {t(theme.description)}
        </p>
      </div>

      {/* Hover overlay with "Kiezen" button */}
      <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="bg-brand-700 text-white px-6 py-2 rounded-full font-semibold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
          {t('themeSelection.select')}
        </span>
      </div>
    </button>
  );
}
