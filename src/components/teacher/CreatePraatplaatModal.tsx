/**
 * CreatePraatplaatModal - Modal voor het aanmaken van een praatplaat (#72)
 *
 * Docent kiest een naam en een locatie-afbeelding uit het actieve thema.
 * De locatie bepaalt het thema, de locatie-ID en de afbeelding-URL.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useThemeStore } from '../../stores/themeStore';
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

export function CreatePraatplaatModal({ isOpen, onClose, onCreate }: CreatePraatplaatModalProps) {
  const { t } = useTranslation();
  const locations = useThemeStore((s) => s.getLocations());
  const activeThemeId = useThemeStore((s) => s.activeThemeId);

  const [name, setName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const handleSubmit = useCallback(async () => {
    if (!selectedLocation) return;

    // Auto-naam als leeg: "Locatienaam - dd-mm-yyyy"
    const finalName = name.trim() || `${t(selectedLocation.name)} - ${new Date().toLocaleDateString('nl-NL')}`;

    try {
      setSaving(true);
      setError(null);
      await onCreate({
        name: finalName,
        themeId: activeThemeId,
        locationId: selectedLocation.id,
        imageUrl: selectedLocation.backgroundImage,
      });
      // Reset form and close
      setName('');
      setSelectedLocationId(null);
      onClose();
    } catch (err) {
      logger.error('CreatePraatplaatModal submit failed:', err);
      setError(err instanceof Error ? err.message : t('teacher.praatplaat.createError'));
    } finally {
      setSaving(false);
    }
  }, [name, selectedLocation, activeThemeId, onCreate, onClose, t]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setName('');
    setSelectedLocationId(null);
    setError(null);
    onClose();
  }, [saving, onClose]);

  const canSubmit = selectedLocationId !== null && !saving;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('teacher.praatplaat.createTitle')} size="md">
      <div className="space-y-4">
        {/* Naam invoer */}
        <div>
          <label htmlFor="praatplaat-name" className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Locatie selectie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('teacher.praatplaat.locationLabel')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedLocationId(location.id)}
                disabled={saving}
                className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  selectedLocationId === location.id
                    ? 'border-primary-400 ring-2 ring-primary-200'
                    : 'border-transparent hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img
                  src={location.backgroundImage}
                  alt={t(location.name)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {/* Overlay met naam */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span className="text-white text-xs font-medium">
                    {t(location.name)}
                  </span>
                </div>
                {/* Selectie check */}
                {selectedLocationId === location.id && (
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary-400 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
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
