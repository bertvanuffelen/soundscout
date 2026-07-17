/**
 * useFullscreen — browser-Fullscreen API voor het presentatiescherm.
 *
 * Digibord-scenario: de docent wil de browserbalk weg. `toggle()` zet het
 * meegegeven element (of de hele pagina) fullscreen; `isFullscreen` volgt de
 * werkelijke stand via het fullscreenchange-event, dus ook wanneer de
 * gebruiker met Escape uit fullscreen gaat.
 *
 * Escape-guard voor aanroepers: als `document.fullscreenElement` gezet is,
 * verlaat Escape éérst fullscreen (browsergedrag) — een eigen Escape-handler
 * die het scherm sluit moet die stand dus checken vóór hij sluit.
 *
 * iPad Safari kent alleen de webkit-varianten; die worden hier afgedekt.
 * Als fullscreen helemaal niet kan (isSupported false) hoort de knop
 * verborgen te worden.
 */

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { logger } from '../utils/logger';

// Webkit-prefixvarianten (iPad Safari) zonder `any`
interface WebkitDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function getFullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported(): boolean {
  const doc = document as WebkitDocument;
  return Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

/** True zodra iets fullscreen staat — voor Escape-guards in keyboard-handlers. */
export function isDocumentFullscreen(): boolean {
  return getFullscreenElement() !== null;
}

export function useFullscreen(targetRef?: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSupported = isFullscreenSupported();

  // Werkelijke stand volgen (dekt ook Escape en systeem-exits af)
  useEffect(() => {
    const onChange = () => setIsFullscreen(getFullscreenElement() !== null);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (getFullscreenElement()) {
        const doc = document as WebkitDocument;
        await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        return;
      }
      const el = (targetRef?.current ?? document.documentElement) as WebkitElement;
      await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
    } catch (err) {
      // Fullscreen kan geweigerd worden (permissies, iframe) — geen harde fout
      logger.warn('Fullscreen wisselen mislukt:', err);
    }
  }, [targetRef]);

  return { isFullscreen, isSupported, toggle };
}
