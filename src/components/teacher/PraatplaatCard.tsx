/**
 * PraatplaatCard - Kaart voor een praatplaat in het docenten dashboard
 *
 * Resource-kaart: toont thumbnail, naam, datum, bekijken, delen en verwijderen.
 * Activering per klas gaat via ClassDetail → ActivateAssignmentModal.
 * Deel-knop (#73) opent SharePraatplaatModal met directe link + QR-code.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Volume2, Share2 } from 'lucide-react';
import type { PraatplaatRow } from '../../lib/praatplaat';
import { Button } from '../ui/Button';
import { SharePraatplaatModal } from './SharePraatplaatModal';

interface PraatplaatCardProps {
  praatplaat: PraatplaatRow;
  submissionCount?: number;
  /** Klascode van de klas waartoe deze praatplaat behoort (nodig voor deel-link) */
  classCode?: string;
  onDelete: () => void;
  onView: () => void;
}

export function PraatplaatCard({ praatplaat, submissionCount, classCode, onDelete, onView }: PraatplaatCardProps) {
  const { t } = useTranslation();
  const { name, image_url, created_at } = praatplaat;
  const [showShareModal, setShowShareModal] = useState(false);

  const formattedDate = new Date(created_at).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-video w-full overflow-hidden bg-neutral-100">
        <img
          src={image_url}
          alt={name}
          className="w-full h-full object-cover"
        />
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

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onView}
            className="flex-1 inline-flex items-center justify-center gap-1.5"
          >
            <Volume2 className="w-4 h-4" />
            {t('teacher.praatplaat.openPraatplaat')}
          </Button>
          {classCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareModal(true)}
              title={t('teacher.praatplaat.share')}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
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

      {/* Share modal (#73) */}
      {classCode && (
        <SharePraatplaatModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          classCode={classCode}
          praatplaatName={name}
        />
      )}
    </div>
  );
}

export default PraatplaatCard;
