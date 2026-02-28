/**
 * TemplateCard - Kaart voor een template in het docenten dashboard
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Trash2, ToggleLeft, ToggleRight, Lock, Unlock } from 'lucide-react';
import type { TeacherTemplate } from '../../lib/templates';
import { Button } from '../ui/Button';

interface TemplateCardProps {
  template: TeacherTemplate;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
}

export function TemplateCard({ template, onDelete, onToggle }: TemplateCardProps) {
  const { t } = useTranslation();
  const { name, code, description, clipsLocked, isActive, createdAt } = template;
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [code]);

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-5 ${!isActive ? 'opacity-60' : ''}`}>
      {/* Header met naam en code */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1 mr-3">
          <h3 className="font-semibold text-gray-800 text-lg truncate">
            {name}
          </h3>
          <p className="text-gray-500 text-sm">
            {formattedDate}
          </p>
        </div>

        {/* Template code badge + copy */}
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-mono font-bold text-sm hover:bg-amber-200 transition-colors shrink-0"
          title={t('templates.copyCode')}
        >
          {code}
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Beschrijving */}
      {description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
      )}

      {/* Status badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          isActive ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {isActive ? t('templates.active') : t('templates.inactive')}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          clipsLocked ? 'bg-amber-50 text-amber-700' : 'bg-neutral-50 text-neutral-500'
        }`}>
          {clipsLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {clipsLocked ? t('templates.locked') : t('templates.unlocked')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onToggle(!isActive)}
          className="flex-1 inline-flex items-center justify-center gap-1"
        >
          {isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {isActive ? t('templates.deactivate') : t('templates.activate')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default TemplateCard;
