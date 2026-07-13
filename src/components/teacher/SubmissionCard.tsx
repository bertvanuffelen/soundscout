/**
 * SubmissionCard - Kaart voor een compositie van een leerling
 */

import { useTranslation } from 'react-i18next';
import { Play, Trash2, Image, PenLine, FileText, MapPin, Star } from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';
import { getReviewStatus } from '../../hooks/useSubmissions';
import { StickerIcon } from '../../utils/stickerMap';

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
  const reviewStatus = getReviewStatus(submission);

  // Show last_updated_at for work-in-progress, created_at for submissions
  const displayDate = (isWip && last_updated_at) ? last_updated_at : created_at;
  const formattedDate = new Date(displayDate).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-bg-surface rounded-2xl shadow-md p-4 flex items-center gap-4">
      {/* Play button */}
      <button
        onClick={onPlay}
        className="w-12 h-12 sm:w-14 sm:h-14 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 rounded-full flex items-center justify-center text-white transition-colors shrink-0"
        title={t('teacher.submissionCard.play')}
      >
        <Play className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-text-main truncate">
            {composition_name}
          </h3>
          {isWip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-100 text-warning-700 text-xs font-medium shrink-0">
              <PenLine className="w-3 h-3" />
              {t('teacher.submissionCard.wip')}
            </span>
          )}
          {/* Review-status (migratie 026): nieuw → beluisterd → beoordeeld */}
          {!isWip && reviewStatus === 'new' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-xs font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" aria-hidden="true" />
              {t('teacher.submissionCard.new')}
            </span>
          )}
          {reviewStatus === 'reviewed' && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-100 text-success-700 text-xs font-medium shrink-0"
              title={submission.feedback_text ?? undefined}
            >
              <StickerIcon sticker={submission.feedback_sticker} size={12} className="text-success-700" />
              {submission.feedback_level != null && (
                <span className="inline-flex items-center">
                  {Array.from({ length: submission.feedback_level }, (_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </span>
              )}
              {t('teacher.submissionCard.reviewed')}
            </span>
          )}
          {hasStoryboard && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium shrink-0">
              <Image className="w-3 h-3" />
              {t('teacher.submissionCard.withStoryboard')}
            </span>
          )}
          {submission.assignment_type === 'template' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 text-xs font-medium shrink-0">
              <FileText className="w-3 h-3" />
              {t('teacher.submissionCard.fromTemplate')}
            </span>
          )}
          {submission.assignment_type === 'praatplaat' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium shrink-0">
              <MapPin className="w-3 h-3" />
              {t('teacher.submissionCard.fromPraatplaat')}
            </span>
          )}
        </div>
        <p className="text-text-muted text-sm">
          {t('teacher.submissionCard.by')} <span className="font-medium text-text-main">{student_name}</span>
        </p>
        <p className="text-text-muted text-xs">
          {isWip && last_updated_at ? `${t('teacher.submissionCard.lastEdited')} ` : ''}{formattedDate}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="text-text-muted hover:text-error-500 p-2 transition-colors shrink-0"
        title={t('teacher.submissionCard.delete')}
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export default SubmissionCard;
