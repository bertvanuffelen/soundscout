/**
 * SaveAsTemplateModal - Modal voor het opslaan van de huidige compositie als template
 *
 * Beschikbaar voor ingelogde docenten wanneer de templates dev flag actief is.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Copy, Check, ImageIcon, GraduationCap } from 'lucide-react';
import { Button, Modal } from '../ui';
import { createTemplate, type TeacherTemplate } from '../../lib/templates';
import { createLessonCard } from '../../lib/lessonCards';
import { LessonCardEditorModal } from '../teacher/LessonCardEditorModal';
import { useAppStore } from '../../stores/appStore';
import type { CompositionData, TemplateLockOptions } from '../../types';
import { DEFAULT_LOCK_OPTIONS } from '../../types';
import { logger } from '../../utils/logger';
import { copyToClipboard } from '../../utils/copyToClipboard';

interface SaveAsTemplateModalProps {
  compositionData: CompositionData;
  defaultName: string;
  onClose: () => void;
}

export function SaveAsTemplateModal({ compositionData, defaultName, onClose }: SaveAsTemplateModalProps) {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [lockOptions, setLockOptions] = useState<TemplateLockOptions>({ ...DEFAULT_LOCK_OPTIONS });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [createdTemplate, setCreatedTemplate] = useState<TeacherTemplate | null>(null);
  const [copied, setCopied] = useState(false);
  // "Bewaar als leskaart" (M4): editor voorgevuld met het zojuist bewaarde template
  const [showLessonEditor, setShowLessonEditor] = useState(false);
  const [lessonSaved, setLessonSaved] = useState(false);
  const createdCode = createdTemplate?.code ?? null;

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
        lockOptions,
      });

      setCreatedTemplate(result);
    } catch (err) {
      logger.error('Template opslaan mislukt:', err);
      setError(err instanceof Error ? err.message : t('templates.saveError'));
    } finally {
      setSaving(false);
    }
  }, [name, description, instructions, lockOptions, compositionData, t]);

  const handleCopyCode = useCallback(async () => {
    if (!createdCode) return;
    if (await copyToClipboard(createdCode)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [createdCode]);

  // --- Success view ---
  if (createdCode && createdTemplate) {
    return (
      <>
        <Modal isOpen onClose={onClose} title={t('templates.savedTitle')} size="sm">
          <div className="text-center">
            <p className="text-text-muted text-sm mb-4">
              {t('templates.savedDescription')}
            </p>

            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 bg-accent-100 text-accent-800 px-6 py-3 rounded-xl font-mono font-bold text-2xl hover:bg-accent-200 transition-colors mx-auto mb-4"
            >
              {createdCode}
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>

            {copied && (
              <p className="text-success-600 text-sm mb-4">{t('share.copied')}</p>
            )}

            {/* Knutselroute rond (M4): template + opdrachtkaart bundelen */}
            {lessonSaved ? (
              <p className="text-success-600 text-sm mb-2 flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" aria-hidden="true" />
                {t('templates.lessonCardSaved')}
              </p>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setShowLessonEditor(true)}
                className="w-full inline-flex items-center justify-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                {t('templates.makeLessonCard')}
              </Button>
            )}

            <Button variant="primary" onClick={onClose} className="w-full mt-2">
              {t('common.close')}
            </Button>
          </div>
        </Modal>

        <LessonCardEditorModal
          isOpen={showLessonEditor}
          onClose={() => setShowLessonEditor(false)}
          card={null}
          prefill={{ assignmentType: 'template', templateId: createdTemplate.id, title: createdTemplate.name }}
          onSave={async (input) => {
            await createLessonCard(input);
            setShowLessonEditor(false);
            setLessonSaved(true);
          }}
        />
      </>
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
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-main text-sm focus:outline-none focus:border-accent-400 transition-colors"
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
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-main text-sm focus:outline-none focus:border-accent-400 transition-colors resize-none"
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
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-main text-sm focus:outline-none focus:border-accent-400 transition-colors resize-none"
          />
        </div>

        {/* Vergrendelingsopties (#59) */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium text-text-main">{t('templates.lockOptionsTitle')}</p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lockOptions.clipsLocked}
              onChange={(e) => setLockOptions((prev) => ({ ...prev, clipsLocked: e.target.checked }))}
              className="rounded border-border-subtle w-4 h-4"
            />
            <div>
              <span className="text-sm text-text-main">{t('templates.lockClipsLabel')}</span>
              <p className="text-xs text-text-muted">{t('templates.lockClipsDescription')}</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lockOptions.sectionsLocked}
              onChange={(e) => setLockOptions((prev) => ({ ...prev, sectionsLocked: e.target.checked }))}
              className="rounded border-border-subtle w-4 h-4"
            />
            <div>
              <span className="text-sm text-text-main">{t('templates.lockSectionsLabel')}</span>
              <p className="text-xs text-text-muted">{t('templates.lockSectionsDescription')}</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lockOptions.libraryLocked}
              onChange={(e) => setLockOptions((prev) => ({ ...prev, libraryLocked: e.target.checked }))}
              className="rounded border-border-subtle w-4 h-4"
            />
            <div>
              <span className="text-sm text-text-main">{t('templates.lockLibraryLabel')}</span>
              <p className="text-xs text-text-muted">{t('templates.lockLibraryDescription')}</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lockOptions.allowNewClips}
              onChange={(e) => setLockOptions((prev) => ({ ...prev, allowNewClips: e.target.checked }))}
              className="rounded border-border-subtle w-4 h-4"
            />
            <div>
              <span className="text-sm text-text-main">{t('templates.allowNewClipsLabel')}</span>
              <p className="text-xs text-text-muted">{t('templates.allowNewClipsDescription')}</p>
            </div>
          </label>
        </div>

        {/* Storyboard indicator (read-only info) */}
        {activeStoryboard && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-accent-50 border border-accent-200 rounded-lg">
            <ImageIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-text-main">{t('templates.storyboardIncluded')}</span>
              <p className="text-xs text-text-muted">{t('templates.storyboardIncludedDescription')}</p>
            </div>
          </div>
        )}

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
