/**
 * ThemePicker — presentational thema-grid (map-preview + naam + omschrijving).
 *
 * Geëxtraheerd uit de oude ThemeSelectionModal zodat de "Nieuwe compositie"-
 * wizard dit als stap 2 (vrij componeren → thema kiezen) kan tonen, zonder eigen
 * modal-chrome.
 */

import { useTranslation } from 'react-i18next';
import { getMapBackgroundImage } from '../../data/themes';
import { getPublicThemes, type ThemeConfig } from '../../data/themes';

interface ThemePickerProps {
  onSelectTheme: (themeId: string) => void;
  isLoading?: boolean;
}

export function ThemePicker({ onSelectTheme, isLoading = false }: ThemePickerProps) {
  const themes = getPublicThemes();

  // Deeplink (?theme=, bv. via een themakaart op /teacher): toon dat thema
  // vooraan mét een "gekozen thema"-badge — de deeplink heeft zo zichtbaar
  // effect, maar de leerling houdt keuzevrijheid (testronde 1, 5c).
  const urlThemeId = new URLSearchParams(window.location.search).get('theme');
  const preselectedId = themes.some((th) => th.id === urlThemeId) ? urlThemeId : null;
  const sortedThemes = preselectedId
    ? [...themes].sort((a, b) => (a.id === preselectedId ? -1 : b.id === preselectedId ? 1 : 0))
    : themes;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {sortedThemes.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          onSelect={() => onSelectTheme(theme.id)}
          isLoading={isLoading}
          preselected={theme.id === preselectedId}
        />
      ))}
    </div>
  );
}

interface ThemeCardProps {
  theme: ThemeConfig;
  onSelect: () => void;
  isLoading: boolean;
  preselected?: boolean;
}

function ThemeCard({ theme, onSelect, isLoading, preselected = false }: ThemeCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={`group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-left ${
        preselected ? 'ring-2 ring-accent-500' : ''
      }`}
    >
      {preselected && (
        <span className="absolute top-2 right-2 z-10 bg-accent-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
          {t('themeSelection.preselected')}
        </span>
      )}
      {/* Map preview image */}
      <div className="aspect-video w-full overflow-hidden bg-neutral-100">
        <img
          src={getMapBackgroundImage(theme.map, i18n.language)}
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

      {/* Hover overlay met "Kiezen" */}
      <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="bg-brand-700 text-white px-6 py-2 rounded-full font-semibold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
          {t('themeSelection.select')}
        </span>
      </div>
    </button>
  );
}

export default ThemePicker;
