/**
 * ActivateLessonCardModal — kies de klas voor een leskaart (vanuit Lesideeën).
 *
 * De docent kiest een bestaande klas óf maakt een nieuwe klas; daarna gaat
 * het verder in de opdracht-wizard op stap 2 ("Controleer & pas aan") met
 * deze les al ingevuld, en daarna de code op het bord (ontwerp ronde 3b).
 * Activeren zelf gebeurt dus niet meer hier.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import type { LessonCard } from '../../lib/lessonCards';
import { localizeLessonCard } from '../../lib/lessonCards';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { logger } from '../../utils/logger';

interface ActivateLessonCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonCard: LessonCard | null;
  classes: TeacherClass[];
  onCreateClass: (name: string) => Promise<TeacherClass>;
  /** Verder naar de wizard (stap 2) voor deze klas */
  onContinue: (classData: TeacherClass, lessonCard: LessonCard) => void;
}

const NEW_CLASS = '__new__';

export function ActivateLessonCardModal({
  isOpen,
  onClose,
  lessonCard,
  classes,
  onCreateClass,
  onContinue,
}: ActivateLessonCardModalProps) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setChoice(classes.length > 0 ? classes[0].id : NEW_CLASS);
    setNewName('');
    setError(null);
    setSaving(false);
  }, [isOpen, classes]);

  if (!lessonCard) return null;

  const isNew = choice === NEW_CLASS;
  const lessonTitle = localizeLessonCard(t, lessonCard).title;

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      let target: TeacherClass | undefined;
      if (isNew) {
        const name = newName.trim();
        if (!name) {
          setError(t('lessonCards.activateModal.nameRequired'));
          setSaving(false);
          return;
        }
        target = await onCreateClass(name);
      } else {
        target = classes.find((c) => c.id === choice);
      }
      if (!target) {
        setError(t('lessonCards.activateModal.error'));
        setSaving(false);
        return;
      }
      onContinue(target, lessonCard);
    } catch (err) {
      logger.error('Klas kiezen/maken voor leskaart mislukt:', err);
      setError(err instanceof Error ? err.message : t('lessonCards.activateModal.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('lessonCards.activateModal.chooseClassTitle')}
      size="sm"
    >
        <>
          <p className="text-text-muted text-sm mb-4">
            {t('lessonCards.activateModal.description', { title: lessonTitle })}
          </p>

          {error && (
            <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-[40dvh] overflow-y-auto pr-1 -mr-1 mb-4">
            {classes.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  choice === c.id ? 'border-accent-500 bg-accent-50' : 'border-border-subtle hover:border-accent-300'
                }`}
              >
                <input
                  type="radio"
                  name="lesson-class"
                  value={c.id}
                  checked={choice === c.id}
                  onChange={() => setChoice(c.id)}
                  className="accent-accent-500"
                />
                <span className="font-medium text-text-main text-sm flex-1 truncate">{c.name}</span>
                <span className="text-xs font-mono text-text-muted">{c.code}</span>
              </label>
            ))}

            {/* Nieuwe klas */}
            <label
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                isNew ? 'border-accent-500 bg-accent-50' : 'border-border-subtle hover:border-accent-300'
              }`}
            >
              <input
                type="radio"
                name="lesson-class"
                value={NEW_CLASS}
                checked={isNew}
                onChange={() => setChoice(NEW_CLASS)}
                className="accent-accent-500"
              />
              <span className="inline-flex items-center gap-1.5 font-medium text-text-main text-sm">
                <Plus className="w-4 h-4" />
                {t('lessonCards.activateModal.newClass')}
              </span>
            </label>

            {isNew && (
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('lessonCards.activateModal.newClassPlaceholder')}
                maxLength={60}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-white text-text-main text-sm focus:outline-none focus:border-accent-400"
              />
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1"
            >
              {t('lessonCards.activateModal.continue')}
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </>
    </Modal>
  );
}

export default ActivateLessonCardModal;
