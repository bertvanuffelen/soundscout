/**
 * Modal - Reusable modal/dialog component
 *
 * Features:
 * - Backdrop click to close
 * - Escape key to close
 * - Focus trap (automatic Tab cycling)
 * - Auto-focus first focusable element
 * - Animations
 */

import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useModalBehavior } from '../../hooks/useModalBehavior';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Size of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Additional CSS classes for modal container */
  className?: string;
  /** Vaste voetregel (knoppen) die altijd zichtbaar blijft, ook als de
   *  inhoud scrolt (E11, eindtest) */
  footer?: ReactNode;
  /** Sluitkruisje rechtsboven */
  showClose?: boolean;
}

const sizeStyles = {
  sm: 'max-w-[280px] sm:max-w-sm',
  md: 'max-w-[320px] sm:max-w-md',
  lg: 'max-w-[360px] sm:max-w-lg',
  xl: 'max-w-[95vw] sm:max-w-3xl lg:max-w-5xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  footer,
  showClose = false,
}: ModalProps) {
  const { t } = useTranslation();
  // Gedeeld dialog-gedrag (focus trap, Escape, scroll-lock, focus-restore)
  const modalRef = useModalBehavior(onClose, { closeOnEscape, isOpen });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className={cn(
          // Altijd binnen het scherm; de inhoud scrolt, kop en voet niet
          'relative w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]',
          'transform transition-all',
          'animate-in fade-in zoom-in-95 duration-200',
          sizeStyles[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby="modal-body"
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-text-main hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        {title && (
          <div className={cn('px-4 sm:px-6 pt-4 sm:pt-6 pb-1 sm:pb-2 shrink-0', showClose && 'pr-14')}>
            <h2
              id="modal-title"
              className="text-xl sm:text-2xl font-bold text-text-main"
            >
              {title}
            </h2>
          </div>
        )}

        <div
          id="modal-body"
          className={cn(
            'min-h-0 overflow-y-auto',
            title ? 'px-4 sm:px-6' : 'px-4 sm:px-6 pt-4 sm:pt-6',
            footer ? 'pb-2' : 'pb-4 sm:pb-6',
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="shrink-0 px-4 sm:px-6 pt-2 pb-4 sm:pb-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
