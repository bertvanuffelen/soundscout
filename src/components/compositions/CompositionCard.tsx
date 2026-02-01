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
        className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all group"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
            <Music size={20} className="text-accent-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-accent-300 transition-colors">
              {composition.name}
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              {formatDate(composition.updatedAt)} •{' '}
              {formatDuration(composition.metadata.duration)} •{' '}
              {composition.metadata.trackCount} {t('compositions.tracks')}
            </p>
          </div>

          {/* Actions - always visible on touch, hover on desktop */}
          <div className="flex items-center gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayClick}
              className="bg-accent-500/20 hover:bg-accent-500/40 active:bg-accent-500/60 text-accent-300 px-2 sm:px-3"
              title={t('compositions.play')}
            >
              <Play size={16} className="mr-1" />
              {t('compositions.play')}
            </Button>
            <button
              onClick={handleDeleteClick}
              className="p-2 rounded-lg text-slate-400 sm:text-slate-500 hover:text-error-400 hover:bg-error-500/20 active:bg-error-500/30 transition-colors"
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
        <p className="text-slate-600 text-sm mb-6">
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
            variant="primary"
            onClick={handleDeleteConfirm}
            className="flex-1 bg-error-500 hover:bg-error-600"
          >
            {t('compositions.delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
