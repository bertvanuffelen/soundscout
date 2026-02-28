/**
 * SaveAsTemplateModal - Modal voor het opslaan van de huidige compositie als template
 *
 * Beschikbaar voor ingelogde docenten wanneer de templates dev flag actief is.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Copy, Check } from 'lucide-react';
import { Button, Modal } from '../ui';
import { createTemplate } from '../../lib/templates';
import type { CompositionData } from '../../types';
import { logger } from '../../utils/logger';

interface SaveAsTemplateModalProps {
  compositionData: CompositionData;
  defaultName: string;
  onClose: () => void;
}

export function SaveAsTemplateModal({ compositionData, defaultName, onClose }: SaveAsTemplateModalProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [clipsLocked, setClipsLocked] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const result = await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        compositionData,
        instructions: instructions.trim() || undefined,
        clipsLocked,
      });

      setCreatedCode(result.code);
    } catch (err) {
      logger.error('Template opslaan mislukt:', err);
      setError(err instanceof Error ? err.message : t('templates.saveError'));
    } finally {
      setSaving(false);
    }
  }, [name, description, instructions, clipsLocked, compositionData, t]);

  const handleCopyCode = useCallback(async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [createdCode]);

  // --- Success view ---
  if (createdCode) {
    return (
      <Modal isOpen onClose={onClose} title={t('templates.savedTitle')} size="sm">
        <div className="text-center">
          <p className="text-text-muted text-sm mb-4">
            {t('templates.savedDescription')}
          </p>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-6 py-3 rounded-xl font-mono font-bold text-2xl hover:bg-amber-200 transition-colors mx-auto mb-4"
          >
            {createdCode}
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>

          {copied && (
            <p className="text-success-600 text-sm mb-4">{t('share.copied')}</p>
          )}

          <Button variant="primary" onClick={onClose} className="w-full mt-2">
            {t('common.close')}
          </Button>
        </div>
      </Modal>
    );
  }

  // --- Form view ---
  return (
    <Modal isOpen onClose={onClose} title={t('templates.saveTitle')} size="sm">
      <div className="flex flex-col gap-4">
        {/* Naam */}
        <div>
          <label htmlFor="tmpl-name" className="text-sm font-medium text-text-main mb-1 block">
            {t('templates.nameLabel')} *
          </label>
          <input
            id="tmpl-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('templates.namePlaceholder')}
            maxLength={200}
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-main text-sm focus:outline-none focus:border-primary-400 transition-colors"
          />
        </div>

        {/* Beschrijving */}
        <div>
          <label htmlFor="tmpl-desc" className="text-sm font-medium text-text-main mb-1 block">
            {t('templates.descriptionLabel')}
          </label>
          <textarea
            id="tmpl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('templates.descriptionPlaceholder')}
            maxLength={1000}
            rows={2}
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-main text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none"
          />
        </div>

        {/* Instructies */}
        <div>
          <label htmlFor="tmpl-instr" className="text-sm font-medium text-text-main mb-1 block">
            {t('templates.instructionsLabel')}
          </label>
          <textarea
            id="tmpl-instr"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t('templates.instructionsPlaceholder')}
            maxLength={5000}
            rows={3}
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-main text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none"
          />
        </div>

        {/* Clips vergrendeld */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={clipsLocked}
            onChange={(e) => setClipsLocked(e.target.checked)}
            className="rounded border-border-subtle w-4 h-4"
          />
          <div>
            <span className="text-sm font-medium text-text-main">{t('templates.lockClipsLabel')}</span>
            <p className="text-xs text-text-muted">{t('templates.lockClipsDescription')}</p>
          </div>
        </label>

        {/* Error */}
        {error && (
          <p className="text-error-500 text-sm">{error}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : null}
            {t('templates.saveButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SaveAsTemplateModal;
