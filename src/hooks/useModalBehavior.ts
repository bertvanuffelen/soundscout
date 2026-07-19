/**
 * useModalBehavior - Gedeeld dialog-gedrag voor modals/overlays
 *
 * Geeft handgerolde modals (bottom-sheets, custom overlays) dezelfde
 * a11y-garanties als de gedeelde <Modal>: Escape om te sluiten, Tab-focus-trap,
 * auto-focus op het eerste focusbare element, body-scroll-lock en
 * focus-restore naar het eerder actieve element bij sluiten.
 *
 * Gebruik: hang de teruggegeven ref aan de modal-container (het element mét de
 * inhoud, niet de backdrop) en zet daar role="dialog" aria-modal="true" op.
 * Voor conditioneel gerenderde modals (mount = open) volstaat de default;
 * geef anders `isOpen` mee.
 */

import { useEffect, useRef } from 'react';

// Let op: disabled elementen uitsluiten — een disabled knop kan geen focus
// krijgen, maar telde wél mee als "laatste element" waardoor de Tab-wrap
// nooit vuurde en de focus uit de modal ontsnapte (bug 1c: EffectsModal,
// waar de Toepassen-knop disabled start).
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseModalBehaviorOptions {
  /** Sluit bij Escape (default true) */
  closeOnEscape?: boolean;
  /** Voor modals die gemount blijven; default true (mount = open) */
  isOpen?: boolean;
  /** Auto-focus op het eerste focusbare element (default true) */
  autoFocus?: boolean;
}

export function useModalBehavior(
  onClose: () => void,
  { closeOnEscape = true, isOpen = true, autoFocus = true }: UseModalBehaviorOptions = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Callbacks in refs zodat de listeners niet per render opnieuw
  // aangekoppeld worden (zou focus uit inputs trekken tijdens typen).
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  // Open/close-lifecycle: focus bewaren/herstellen, scroll-lock, auto-focus.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      if (!autoFocus) return;
      const focusable = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable && focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      }
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
    // autoFocus is een statische optie; bewust alleen isOpen als trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keydown: Escape + Tab-focus-trap.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscapeRef.current) {
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!container || !focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      // Focus buiten de modal (bijv. op <body> na een klik op een
      // niet-focusbaar vlak, of nadat het gefocuste element uit de DOM
      // verdween — EffectsModal: reset-knop unmount bij waarde 0): een
      // native Tab zou dan uit de modal ontsnappen (bug 1c, hertest Bert).
      if (!container.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return containerRef;
}
