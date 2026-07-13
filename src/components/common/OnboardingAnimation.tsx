/**
 * OnboardingAnimation - Ingebedde "In 4 stappen"-animatie
 *
 * Herbruikbare iframe-embed van public/animaties/onboarding-4-stappen.html.
 * De hoogte groeit automatisch mee met de inhoud (ResizeObserver), zodat de
 * animatie op elke breedte netjes past. Gebruikt op de tutorialpagina en in
 * de first-run intro bij "Nieuwe compositie".
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export function OnboardingAnimation({ className }: { className?: string }) {
  const { t } = useTranslation();
  const animRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = animRef.current;
    if (!iframe) return;
    let ro: ResizeObserver | undefined;
    const setup = () => {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      const apply = () => { iframe.style.height = doc.documentElement.scrollHeight + 'px'; };
      apply();
      ro?.disconnect();
      ro = new ResizeObserver(apply);
      ro.observe(doc.documentElement);
    };
    iframe.addEventListener('load', setup);
    if (iframe.contentWindow?.document?.readyState === 'complete') setup();
    return () => { iframe.removeEventListener('load', setup); ro?.disconnect(); };
  }, []);

  return (
    <iframe
      ref={animRef}
      src="/animaties/onboarding-4-stappen.html"
      title={t('tutorial.quickStart')}
      loading="lazy"
      className={className ?? 'w-full block'}
      style={{ border: 0, height: 520 }}
    />
  );
}

export default OnboardingAnimation;
