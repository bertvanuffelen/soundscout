/**
 * CreatePraatplaatModal - Modal voor het aanmaken van een praatplaat (#72)
 *
 * Primair: kies uit de universele praatplaat-bibliotheek.
 * Secundair: uitklapbare sectie met locatie-afbeeldingen uit alle thema's.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Check, ChevronDown } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getAllLocationsByTheme } from '../../data/themes';
import { praatplaatImages, isAvailableForTeacher } from '../../data/praatplaatImages';
import { logger } from '../../utils/logger';

interface CreatePraatplaatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    name: string;
    themeId: string;
    locationId: string;
    imageUrl: string;
  }) => Promise<void>;
}

/** Selected image can come from either the library or a theme location */
interface SelectedImage {
  source: 'library' | 'theme';
  id: string;
  imageUrl: string;
  displayName: string;
  /** Only set for theme images — needed for the correct themeId on submit */
  themeId?: string;
}

export function CreatePraatplaatModal({ isOpen, onClose, onCreate }: CreatePraatplaatModalProps) {
  const { t } = useTranslation();

  // All locations from all themes (auto-updates when a theme is added)
  const allThemeLocations = useMemo(() => getAllLocationsByTheme(), []);

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const [showThemeImages, setShowThemeImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectLibrary = useCallback((imgId: string, imageUrl: string, nameKey: string) => {
    setSelected({ source: 'library', id: imgId, imageUrl, displayName: t(nameKey) });
  }, [t]);

  const handleSelectTheme = useCallback((themeId: string, locationId: string, imageUrl: string, locationName: string) => {
    setSelected({ source: 'theme', id: locationId, imageUrl, displayName: t(locationName), themeId });
  }, [t]);

  const handleSubmit = useCallback(async () => {
    if (!selected) return;

    // Auto-naam als leeg: "Afbeeldingnaam - dd-mm-yyyy"
    const finalName = name.trim() || `${selected.displayName} - ${new Date().toLocaleDateString('nl-NL')}`;

    // For library images: use 'general' as themeId (not tied to a theme)
    // For theme images: use the themeId stored on the selection
    const themeId = selected.source === 'theme' ? (selected.themeId ?? 'general') : 'general';
    const locationId = selected.id;

    try {
      setSaving(true);
      setError(null);
      await onCreate({
        name: finalName,
        themeId,
        locationId,
        imageUrl: selected.imageUrl,
      });
      // Reset form and close
      setName('');
      setSelected(null);
      setShowThemeImages(false);
      onClose();
    } catch (err) {
      logger.error('CreatePraatplaatModal submit failed:', err);
      setError(err instanceof Error ? err.message : t('teacher.praatplaat.createError'));
    } finally {
      setSaving(false);
    }
  }, [name, selected, onCreate, onClose, t]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setName('');
    setSelected(null);
    setShowThemeImages(false);
    setError(null);
    onClose();
  }, [saving, onClose]);

  const canSubmit = selected !== null && !saving;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('teacher.praatplaat.createTitle')} size="xl">
      <div className="space-y-4">
        {/* Naam invoer */}
        <div>
          <label htmlFor="praatplaat-name" className="block text-sm font-medium text-text-main mb-1">
            {t('teacher.praatplaat.nameLabel')}
          </label>
          <input
            id="praatplaat-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('teacher.praatplaat.namePlaceholder')}
            maxLength={200}
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-main text-sm focus:outline-none focus:border-primary-400"
            disabled={saving}
          />
        </div>

        {/* Praatplaat-bibliotheek (primair) */}
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            {t('teacher.praatplaat.imageLabel')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {praatplaatImages.filter(isAvailableForTeacher).map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => handleSelectLibrary(img.id, img.imageUrl, img.nameKey)}
                disabled={saving}
                className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  selected?.id === img.id
                    ? 'border-primary-400 ring-2 ring-primary-200'
                    : 'border-transparent hover:border-neutral-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img
                  src={img.imageUrl}
                  alt={t(img.nameKey)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {/* Overlay met naam */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <span className="text-white text-xs font-medium">
                    {t(img.nameKey)}
                  </span>
                </div>
                {/* Selectie check */}
                {selected?.id === img.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary-400 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Thema-locaties (uitklapbaar, secundair) — alle thema's */}
        {allThemeLocations.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowThemeImages((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showThemeImages ? 'rotate-180' : ''}`} />
              {t('teacher.praatplaat.themeImagesToggle')}
            </button>
            {showThemeImages && (
              <div className="space-y-3 mt-2">
                {allThemeLocations.map((group) => (
                  <div key={group.themeId}>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                      {t(group.themeName)}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {group.locations.map((location) => (
                        <button
                          key={`${group.themeId}-${location.id}`}
                          type="button"
                          onClick={() => handleSelectTheme(group.themeId, location.id, location.backgroundImage, location.name)}
                          disabled={saving}
                          className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                            selected?.id === location.id && selected?.source === 'theme' && selected?.themeId === group.themeId
                              ? 'border-primary-400 ring-2 ring-primary-200'
                              : 'border-transparent hover:border-neutral-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <img
                            src={location.backgroundImage}
                            alt={t(location.name)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                            <span className="text-white text-xs font-medium">
                              {t(location.name)}
                            </span>
                          </div>
                          {selected?.id === location.id && selected?.source === 'theme' && selected?.themeId === group.themeId && (
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary-400 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-error-600 text-sm">{error}</p>
        )}

        {/* Acties */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={saving}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={saving}
            className="flex-1"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('teacher.praatplaat.createButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default CreatePraatplaatModal;
