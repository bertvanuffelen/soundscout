/**
 * ShareCodeModal — "Ik heb een code" modal (#78).
 *
 * Wraps de bestaande `ShareCodeInput` in dezelfde modal-chrome als
 * `ThemeSelectionModal` / `ComposeModeModal`, zodat de twee primaire CTAs
 * op het startscherm visueel consistent zijn.
 *
 * De input regelt zelf de routing (klascode → AssignmentLandingScreen,
 * bewaarcode → studio, share/template-code → eigen flow); deze modal
 * voegt alleen de chrome + uitleg toe.
 */

import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ShareCodeInput } from './ShareCodeInput';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ShareCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCodeModal({ isOpen, onClose }: ShareCodeModalProps) {
  const { t } = useTranslation();
  const modalRef = useModalBehavior(onClose, { isOpen });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-code-title"
        className="relative bg-bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200">
          <h2 id="share-code-title" className="text-xl sm:text-2xl font-bold text-text-main">
            {t('shareCodeModal.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-text-muted mb-5 text-sm">
            {t('shareCodeModal.subtitle')}
          </p>
          <ShareCodeInput />
        </div>
      </div>
    </div>
  );
}
