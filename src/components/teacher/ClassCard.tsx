/**
 * ClassCard - Kaart voor een klas in het dashboard
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, Trash2, Monitor } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { Button } from '../ui/Button';
import { ClassCodeOverlay } from './ClassCodeOverlay';

interface ClassCardProps {
  classData: TeacherClass;
  onOpen: () => void;
  onDelete: () => void;
}

export function ClassCard({ classData, onOpen, onDelete }: ClassCardProps) {
  const { t } = useTranslation();
  const { name, code, submission_count = 0, created_at } = classData;
  const [showCodeOverlay, setShowCodeOverlay] = useState(false);

  // Format datum
  const formattedDate = new Date(created_at).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-5">
        {/* Header met naam en code */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-text-main text-lg">
              {name}
            </h3>
            <p className="text-neutral-500 text-sm">
              {t('teacher.classCard.createdOn', { date: formattedDate })}
            </p>
          </div>

          {/* Klascode badge with show button */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <div className="bg-accent-100 text-accent-800 px-3 py-1 rounded-lg font-mono font-bold text-lg">
                {code}
              </div>
              <button
                onClick={() => setShowCodeOverlay(true)}
                className="flex-shrink-0 p-2 rounded-lg bg-accent-50 text-accent-700 hover:bg-accent-100 transition-colors"
                title={t('teacher.classCard.showOnScreen')}
                aria-label={t('teacher.classCard.showOnScreen')}
              >
                <Monitor className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-text-muted text-right max-w-36 leading-tight">{t('teacher.classCodeMeaning')}</p>
          </div>
        </div>

      {/* Aantal composities */}
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-6 h-6 text-accent-500" />
        <span className="text-text-muted">
          <strong>{submission_count}</strong> {t('teacher.classCard.compositionCount', { count: submission_count })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onOpen}
          className="flex-1"
        >
          {t('teacher.classCard.view')}
        </Button>
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

    {/* Code Overlay Modal */}
    {showCodeOverlay && (
      <ClassCodeOverlay
        code={code}
        onClose={() => setShowCodeOverlay(false)}
      />
    )}
    </>
  );
}

export default ClassCard;
