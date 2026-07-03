/**
 * AssignmentCardEditorModal - Stel een opdrachtkaart samen (titel + bullets)
 *
 * Gebruikt voor zowel aanmaken (card = null) als bewerken. Bullets zijn korte
 * regels; maximaal MAX_CARD_BULLETS (spiegelt de DB-CHECK in migratie 016).
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { MAX_CARD_BULLETS, type CreateCardParams } from '../../lib/assignmentCards';
import type { Opdrachtkaart } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface AssignmentCardEditorModalProps {
  isOpen: boolean;
  /** Bestaande kaart om te bewerken, of null om een nieuwe aan te maken. */
  card: Opdrachtkaart | null;
  onClose: () => void;
  onSave: (params: CreateCardParams) => Promise<void>;
}

export function AssignmentCardEditorModal({
  isOpen,
  card,
  onClose,
  onSave,
}: AssignmentCardEditorModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [bullets, setBullets] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset het formulier telkens als de modal opent of van kaart wisselt.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(card?.title ?? '');
    setBullets(card && card.bullets.length > 0 ? [...card.bullets] : ['']);
    setError(null);
  }, [isOpen, card]);

  const updateBullet = (index: number, value: string) => {
    setBullets((prev) => prev.map((b, i) => (i === index ? value : b)));
  };

  const addBullet = () => {
    setBullets((prev) => (prev.length >= MAX_CARD_BULLETS ? prev : [...prev, '']));
  };

  const removeBullet = (index: number) => {
    setBullets((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  };

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), bullets });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignmentCards.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={card ? t('assignmentCards.editTitle') : t('assignmentCards.newTitle')}
      size="md"
    >
      <p className="text-text-muted text-sm mb-4">{t('assignmentCards.editorDescription')}</p>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Titel */}
      <label className="block text-sm font-medium text-text-main mb-1">
        {t('assignmentCards.titleLabel')}
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder={t('assignmentCards.titlePlaceholder')}
        className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-white text-text-main text-sm mb-5 focus:outline-none focus:border-accent-400"
      />

      {/* Bullets */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-text-main">
          {t('assignmentCards.bulletsLabel')}
        </label>
        <span className="text-xs text-text-muted">
          {bullets.filter((b) => b.trim()).length}/{MAX_CARD_BULLETS}
        </span>
      </div>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        {bullets.map((bullet, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-text-muted text-sm shrink-0 w-4 text-center">•</span>
            <input
              type="text"
              value={bullet}
              onChange={(e) => updateBullet(index, e.target.value)}
              maxLength={200}
              placeholder={t('assignmentCards.bulletPlaceholder')}
              className="flex-1 px-3 py-2 rounded-lg border border-border-subtle bg-white text-text-main text-sm focus:outline-none focus:border-accent-400"
            />
            <button
              onClick={() => removeBullet(index)}
              className="text-text-muted hover:text-error-500 p-1.5 transition-colors shrink-0"
              title={t('assignmentCards.removeBullet')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {bullets.length < MAX_CARD_BULLETS && (
        <button
          onClick={addBullet}
          className="mt-2 inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('assignmentCards.addBullet')}
        </button>
      )}

      {/* Footer */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
        <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 inline-flex items-center justify-center gap-1"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
}

export default AssignmentCardEditorModal;
