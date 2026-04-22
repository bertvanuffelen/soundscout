/**
 * CreateClassModal - Modal voor het aanmaken van een nieuwe klas
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

interface CreateClassModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateClassModal({ onClose, onCreate }: CreateClassModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie
    if (!name.trim()) {
      setError(t('teacher.createClassModal.nameRequired'));
      return;
    }

    if (name.trim().length < 2) {
      setError(t('teacher.createClassModal.nameMinLength'));
      return;
    }

    try {
      setLoading(true);
      await onCreate(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacher.validation.genericError'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-main">
            {t('teacher.createClassModal.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="className" className="block text-sm font-medium text-text-muted mb-1">
              {t('teacher.createClassModal.nameLabel')}
            </label>
            <input
              id="className"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('teacher.createClassModal.namePlaceholder')}
              className="w-full px-4 py-3 border border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-transparent outline-none transition-all text-text-main placeholder:text-neutral-400"
              disabled={loading}
              autoFocus
            />
          </div>

          <p className="text-neutral-500 text-sm mb-4">
            {t('teacher.createClassModal.codeInfo')}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="flex-1"
            >
              {loading ? t('teacher.createClassModal.submitLoading') : t('teacher.createClassModal.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateClassModal;
