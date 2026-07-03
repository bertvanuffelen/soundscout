/**
 * TemplateCard - Kaart voor een template in het docenten dashboard
 *
 * Resource-kaart: toont naam, template-code, beschrijving, lock badges en verwijderen.
 * Activering per klas gaat via ClassDetail → ActivateAssignmentModal.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Trash2, Lock, Unlock } from 'lucide-react';
import type { TeacherTemplate } from '../../lib/templates';
import { Button } from '../ui/Button';
import { copyToClipboard } from '../../utils/copyToClipboard';

interface TemplateCardProps {
  template: TeacherTemplate;
  onDelete: () => void;
}

export function TemplateCard({ template, onDelete }: TemplateCardProps) {
  const { t } = useTranslation();
  const { name, code, description, lockOptions, createdAt } = template;
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleCopyCode = useCallback(async () => {
    if (await copyToClipboard(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="bg-bg-surface rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-5">
      {/* Header met naam en code */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1 mr-3">
          <h3 className="font-bold text-text-main text-lg truncate">
            {name}
          </h3>
          <p className="text-text-muted text-sm">
            {formattedDate}
          </p>
        </div>

        {/* Template code badge + copy */}
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 bg-accent-100 text-accent-800 px-3 py-1 rounded-full font-mono font-bold text-sm hover:bg-accent-200 transition-colors shrink-0"
          title={t('templates.copyCode')}
        >
          {code}
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Beschrijving */}
      {description && (
        <p className="text-text-muted text-sm mb-3 line-clamp-2">{description}</p>
      )}

      {/* Lock badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {lockOptions.clipsLocked && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent-50 text-accent-700">
            <Lock className="w-3 h-3" />
            {t('templates.lockClipsShort')}
          </span>
        )}
        {lockOptions.sectionsLocked && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent-50 text-accent-700">
            <Lock className="w-3 h-3" />
            {t('templates.lockSectionsShort')}
          </span>
        )}
        {!lockOptions.clipsLocked && !lockOptions.sectionsLocked && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-500">
            <Unlock className="w-3 h-3" />
            {t('templates.unlocked')}
          </span>
        )}
      </div>

      {/* Delete action */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-error-600 hover:bg-error-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default TemplateCard;
