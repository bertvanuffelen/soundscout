/**
 * SubmissionCard - Kaart voor een compositie van een leerling
 */

import { Play, Trash2 } from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';

interface SubmissionCardProps {
  submission: Submission;
  onPlay: () => void;
  onDelete: () => void;
}

export function SubmissionCard({ submission, onPlay, onDelete }: SubmissionCardProps) {
  const { student_name, composition_name, created_at } = submission;

  // Format datum
  const formattedDate = new Date(created_at).toLocaleDateString('nl-NL', {
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
        title="Afspelen"
      >
        <Play className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 truncate">
          {composition_name}
        </h3>
        <p className="text-gray-500 text-sm">
          Door: <span className="font-medium text-gray-700">{student_name}</span>
        </p>
        <p className="text-gray-400 text-xs">
          {formattedDate}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 p-2 transition-colors shrink-0"
        title="Verwijderen"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export default SubmissionCard;
