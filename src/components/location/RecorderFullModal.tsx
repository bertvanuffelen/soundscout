/**
 * RecorderFullModal - Shown when recorder slots are full
 *
 * Prompts user to go to studio or stay and replace samples.
 */

import { useTranslation } from 'react-i18next';
import { Button, Modal } from '../ui';

interface RecorderFullModalProps {
  isOpen: boolean;
  onGoToStudio: () => void;
  onStay: () => void;
}

export function RecorderFullModal({
  isOpen,
  onGoToStudio,
  onStay,
}: RecorderFullModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onStay}
      title={t('location.recorderFull')}
      size="sm"
    >
      <p className="text-text-muted mb-6 text-center">
        {t('location.goToStudio')}
      </p>

      <div className="flex flex-col gap-3">
        <Button onClick={onGoToStudio} size="lg" className="w-full">
          {t('location.toStudio')}
        </Button>
        <Button
          onClick={onStay}
          variant="secondary"
          className="w-full bg-neutral-100 hover:bg-neutral-200 text-text-muted"
        >
          {t('location.stayHere')}
        </Button>
      </div>
    </Modal>
  );
}
