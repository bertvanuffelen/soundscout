/**
 * SoundScoutAnimation — herbruikbare iframe-embed van een uitleg-animatie uit
 * public/animaties/. De hoogte groeit automatisch mee met de inhoud
 * (ResizeObserver), zodat de animatie op elke breedte netjes past.
 *
 * Animaties zijn tweetalig: ?lang=nl|en kiest de woordenlijst in het
 * html-bestand. Bij een taalwissel krijgt het iframe een nieuwe src en herlaadt
 * het vanzelf.
 *
 * `OnboardingAnimation` is de dunne wrapper voor "In 4 stappen aan de slag"
 * (tutorialpagina, first-run intro bij "Nieuwe compositie", hero van /teacher).
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface SoundScoutAnimationProps {
  /** Bestandsnaam zonder extensie in public/animaties/ */
  name: string;
  /** Toegankelijke titel van het iframe */
  title: string;
  className?: string;
  /** Starthoogte in px vóór de eerste meting (voorkomt springen) */
  initialHeight?: number;
}

export function SoundScoutAnimation({
  name,
  title,
  className,
  initialHeight = 520,
}: SoundScoutAnimationProps) {
  const { i18n } = useTranslation();
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
      // LET OP: documentElement.scrollHeight is minstens de viewport-hoogte van
      // het iframe — daarmee kan het frame wel groeien maar nooit krimpen. De
      // body groeit alleen met de inhoud mee, dus die is de juiste maatstaf.
      const apply = () => {
        const h = Math.ceil(doc.body?.getBoundingClientRect().height || 0);
        iframe.style.height = (h || doc.documentElement.scrollHeight) + 'px';
      };
      apply();
      ro?.disconnect();
      ro = new ResizeObserver(apply);
      ro.observe(doc.body ?? doc.documentElement);
    };
    iframe.addEventListener('load', setup);
    if (getDoc()?.readyState === 'complete') setup();
    return () => { iframe.removeEventListener('load', setup); ro?.disconnect(); };
    // lang: bij een taalwissel herlaadt het iframe → opnieuw meten.
  }, [lang]);

  return (
    <iframe
      ref={animRef}
      src={`/animaties/${name}.html?lang=${lang}`}
      title={title}
      loading="lazy"
      className={className ?? 'w-full block'}
      style={{ border: 0, height: initialHeight }}
    />
  );
}

export function OnboardingAnimation({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <SoundScoutAnimation
      name="onboarding-4-stappen"
      title={t('tutorial.quickStart')}
      className={className}
    />
  );
}

export default OnboardingAnimation;
