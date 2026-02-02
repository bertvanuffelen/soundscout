/**
 * ClassCard - Kaart voor een klas in het dashboard
 */

import { Music, Trash2 } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { Button } from '../ui/Button';

interface ClassCardProps {
  classData: TeacherClass;
  onOpen: () => void;
  onDelete: () => void;
}

export function ClassCard({ classData, onOpen, onDelete }: ClassCardProps) {
  const { name, code, submission_count = 0, created_at } = classData;

  // Format datum
  const formattedDate = new Date(created_at).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-5">
      {/* Header met naam en code */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 text-lg">
            {name}
          </h3>
          <p className="text-gray-500 text-sm">
            Aangemaakt op {formattedDate}
          </p>
        </div>

        {/* Klas-code badge */}
        <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-mono font-bold text-lg">
          {code}
        </div>
      </div>

      {/* Aantal composities */}
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-6 h-6 text-amber-500" />
        <span className="text-gray-700">
          <strong>{submission_count}</strong> {submission_count === 1 ? 'compositie' : 'composities'}
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
          Bekijken
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

export default ClassCard;
