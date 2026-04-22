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

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

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
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Keep latest callbacks in refs so the keydown listener doesn't need to be
  // reattached on every render (which would also re-trigger the auto-focus
  // effect below, yanking focus out of inputs while the user is typing).
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  // Open/close lifecycle: store & restore focus, body-scroll lock, auto-focus.
  // Only depends on `isOpen` so it fires exactly once per open/close.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement> | undefined;

      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus({ preventScroll: true });
      }
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = '';

      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isOpen]);

  // Keydown listeners: Escape + Tab focus trap. Attached once per open and
  // read the latest callbacks through refs.
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscapeRef.current) {
        onCloseRef.current();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement> | undefined;

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
          'relative w-full bg-white rounded-2xl shadow-2xl',
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
        {title && (
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-1 sm:pb-2">
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
            title ? 'px-4 sm:px-6 pb-4 sm:pb-6' : 'p-4 sm:p-6',
            size === 'xl' && 'max-h-[75dvh] overflow-y-auto'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
