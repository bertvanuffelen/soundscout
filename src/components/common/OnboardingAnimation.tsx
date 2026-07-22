/**
 * OnboardingAnimation - Ingebedde "In 4 stappen"-animatie
 *
 * Herbruikbare iframe-embed van public/animaties/onboarding-4-stappen.html.
 * De hoogte groeit automatisch mee met de inhoud (ResizeObserver), zodat de
 * animatie op elke breedte netjes past. Gebruikt op de tutorialpagina, in de
 * first-run intro bij "Nieuwe compositie" en in de hero van /teacher.
 *
 * De animatie is tweetalig: ?lang=nl|en kiest de woordenlijst in het
 * html-bestand. Bij een taalwissel krijgt het iframe een nieuwe src en herlaadt
 * het vanzelf.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export function OnboardingAnimation({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const animRef = useRef<HTMLIFrameElement>(null);
  const lang = i18n.language?.startsWith('en') ? 'en' : 'nl';

  useEffect(() => {
    const iframe = animRef.current;
    if (!iframe) return;
    let ro: ResizeObserver | undefined;
    // `.document` op een cross-origin (of door CSP geblokkeerde) frame gooit een
    // SecurityError — dat is een property-getter, dus optional chaining vangt
    // het niet af. Zonder try/catch crasht een verkeerd geconfigureerde
    // frame-src CSP dit hele component i.p.v. gewoon de hoogte-sync over te slaan.
    const getDoc = () => {
      try {
        return iframe.contentWindow?.document ?? null;
      } catch {
        return null;
      }
    };
    const setup = () => {
      const doc = getDoc();
      if (!doc) return;
      const apply = () => { iframe.style.height = doc.documentElement.scrollHeight + 'px'; };
      apply();
      ro?.disconnect();
      ro = new ResizeObserver(apply);
      ro.observe(doc.documentElement);
    };
    iframe.addEventListener('load', setup);
    if (getDoc()?.readyState === 'complete') setup();
    return () => { iframe.removeEventListener('load', setup); ro?.disconnect(); };
    // lang: bij een taalwissel herlaadt het iframe → opnieuw meten.
  }, [lang]);

  return (
    <iframe
      ref={animRef}
      src={`/animaties/onboarding-4-stappen.html?lang=${lang}`}
      title={t('tutorial.quickStart')}
      loading="lazy"
      className={className ?? 'w-full block'}
      style={{ border: 0, height: 520 }}
    />
  );
}

export default OnboardingAnimation;
