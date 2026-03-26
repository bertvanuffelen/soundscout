/**
 * SubmissionCard - Kaart voor een compositie van een leerling
 */

import { useTranslation } from 'react-i18next';
import { Play, Trash2, Image, PenLine } from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';

interface SubmissionCardProps {
  submission: Submission;
  onPlay: () => void;
  onDelete: () => void;
  isWip?: boolean;
}

export function SubmissionCard({ submission, onPlay, onDelete, isWip }: SubmissionCardProps) {
  const { t } = useTranslation();
  const { student_name, composition_name, composition_data, created_at, last_updated_at } = submission;
  const hasStoryboard = !!composition_data?.storyboardId;

  // Show last_updated_at for work-in-progress, created_at for submissions
  const displayDate = (isWip && last_updated_at) ? last_updated_at : created_at;
  const formattedDate = new Date(displayDate).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
      {/* Play button */}
      <button
        onClick={onPlay}
        className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 rounded-full flex items-center justify-center text-white transition-colors shrink-0"
        title={t('teacher.submissionCard.play')}
      >
        <Play className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800 truncate">
            {composition_name}
          </h3>
          {isWip && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium shrink-0">
              <PenLine className="w-3 h-3" />
              {t('teacher.submissionCard.wip')}
            </span>
          )}
          {hasStoryboard && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-100 text-accent-700 text-xs font-medium shrink-0">
              <Image className="w-3 h-3" />
              {t('teacher.submissionCard.withStoryboard')}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm">
          {t('teacher.submissionCard.by')} <span className="font-medium text-gray-700">{student_name}</span>
        </p>
        <p className="text-gray-400 text-xs">
          {isWip && last_updated_at ? `${t('teacher.submissionCard.lastEdited')} ` : ''}{formattedDate}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 p-2 transition-colors shrink-0"
        title={t('teacher.submissionCard.delete')}
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export default SubmissionCard;
