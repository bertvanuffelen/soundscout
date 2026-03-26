/**
 * PraatplaatCard - Kaart voor een praatplaat in het docenten dashboard (#72)
 *
 * Toont thumbnail, naam, actief/inactief badge, toggle knop, en verwijder knop.
 * Volgt TemplateCard patroon.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ToggleLeft, ToggleRight, Volume2 } from 'lucide-react';
import type { PraatplaatRow } from '../../lib/praatplaat';
import { Button } from '../ui/Button';

interface PraatplaatCardProps {
  praatplaat: PraatplaatRow;
  submissionCount?: number;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  onView: () => void;
}

export function PraatplaatCard({ praatplaat, submissionCount, onToggle, onDelete, onView }: PraatplaatCardProps) {
  const { t } = useTranslation();
  const { name, image_url, is_active, created_at } = praatplaat;

  const formattedDate = new Date(created_at).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleToggle = useCallback(() => {
    onToggle(!is_active);
  }, [is_active, onToggle]);

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden ${!is_active ? 'opacity-60' : ''}`}>
      {/* Thumbnail */}
      <div className="aspect-video w-full overflow-hidden bg-neutral-100 relative">
        <img
          src={image_url}
          alt={name}
          className="w-full h-full object-cover"
        />
        {/* Active badge overlay */}
        <span className={`absolute top-2 right-2 inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
          is_active ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {is_active ? t('teacher.praatplaat.active') : t('teacher.praatplaat.inactive')}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-800 text-lg truncate">
            {name}
          </h3>
          <p className="text-gray-500 text-sm">
            {formattedDate}
          </p>
        </div>

        {/* Submission count */}
        {typeof submissionCount === 'number' && (
          <p className="text-gray-500 text-xs mb-3">
            {t('teacher.praatplaat.submissionCount', { count: submissionCount })}
          </p>
        )}

        {/* Open praatplaat button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onView}
          className="w-full mb-2 inline-flex items-center justify-center gap-1.5"
        >
          <Volume2 className="w-4 h-4" />
          {t('teacher.praatplaat.openPraatplaat')}
        </Button>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggle}
            className="flex-1 inline-flex items-center justify-center gap-1"
          >
            {is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {is_active ? t('teacher.praatplaat.deactivate') : t('teacher.praatplaat.activate')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
            title={t('teacher.praatplaat.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PraatplaatCard;
