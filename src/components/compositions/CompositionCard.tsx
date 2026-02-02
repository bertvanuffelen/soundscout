/**
 * CompositionCard - Card displaying a saved composition
 *
 * Shows: name, date, duration, track count
 * Actions: Open (click card), Play, Delete
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Trash2, Music } from 'lucide-react';
import type { SavedComposition } from '../../types';
import { Button, Modal } from '../ui';

interface CompositionCardProps {
  composition: SavedComposition;
  onOpen: (composition: SavedComposition) => void;
  onPlay: (composition: SavedComposition) => void;
  onDelete: (id: string) => void;
}

export function CompositionCard({
  composition,
  onOpen,
  onPlay,
  onDelete,
}: CompositionCardProps) {
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatDate = useCallback((isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, []);

  const handleCardClick = useCallback(() => {
    onOpen(composition);
  }, [onOpen, composition]);

  const handlePlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPlay(composition);
    },
    [onPlay, composition]
  );

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete(composition.id);
    setShowDeleteModal(false);
  }, [onDelete, composition.id]);

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-bg-surface hover:bg-neutral-50 border border-border-subtle hover:border-primary-300 rounded-2xl p-4 cursor-pointer transition-all group shadow-sm hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Music size={20} className="text-primary-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-main truncate group-hover:text-primary-700 transition-colors">
              {composition.name}
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              {formatDate(composition.updatedAt)} •{' '}
              {formatDuration(composition.metadata.duration)} •{' '}
              {composition.metadata.trackCount} {t('compositions.tracks')}
            </p>
          </div>

          {/* Actions - always visible on touch, hover on desktop */}
          <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePlayClick}
              title={t('compositions.play')}
            >
              <Play size={16} className="mr-1" />
              {t('compositions.play')}
            </Button>
            <button
              onClick={handleDeleteClick}
              className="p-2 rounded-xl text-text-muted hover:text-error-600 hover:bg-error-50 active:bg-error-100 transition-colors"
              title={t('compositions.delete')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('compositions.deleteTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6">
          {t('compositions.deleteConfirm', { name: composition.name })}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            className="flex-1"
          >
            {t('compositions.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            className="flex-1"
          >
            {t('compositions.delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
