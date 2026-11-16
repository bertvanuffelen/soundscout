/**
 * StartFooter — rustige voetregel van het startscherm (V2): uitleg, hulp,
 * privacy, Over SoundScout, maker en sociale links.
 */

import { useTranslation } from 'react-i18next';
import { Facebook, HelpCircle, Info, Instagram, Linkedin, MessageCircleQuestion, Shield, Youtube } from 'lucide-react';

interface StartFooterProps {
  onTutorial: () => void;
  onFeedback: () => void;
  onPrivacy: () => void;
}

const SOCIALS = [
  { href: 'https://www.instagram.com/bvanuffelen/', label: 'Instagram', Icon: Instagram },
  { href: 'https://www.facebook.com/bvanuffelen', label: 'Facebook', Icon: Facebook },
  { href: 'https://www.linkedin.com/in/bvanuffelen/', label: 'LinkedIn', Icon: Linkedin },
  { href: 'https://www.youtube.com/@BertvanUffelen', label: 'YouTube', Icon: Youtube },
] as const;

const linkClass =
  'inline-flex items-center gap-1.5 min-h-11 px-3 rounded-full text-sm font-semibold text-brand-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-3 focus-visible:outline-accent-400 focus-visible:outline-offset-2';

export function StartFooter({ onTutorial, onFeedback, onPrivacy }: StartFooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 flex flex-col items-center gap-1 pt-4 pb-safe px-safe [--safe-min:0.75rem] sm:[--safe-min:1.5rem] text-brand-300">
      <nav aria-label={t('start.footerLabel')} className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
        <button type="button" onClick={onTutorial} className={linkClass}>
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
          {t('start.howItWorks')}
        </button>
        <button type="button" onClick={onFeedback} className={linkClass}>
          <MessageCircleQuestion className="w-4 h-4" aria-hidden="true" />
          {t('start.feedbackHint')}
        </button>
        <button type="button" onClick={onPrivacy} className={linkClass}>
          <Shield className="w-4 h-4" aria-hidden="true" />
          {t('privacy.button')}
        </button>
        {/* Over/colofon staat op zijn eigen pagina (/over) */}
        <a href="/over" className={linkClass}>
          <Info className="w-4 h-4" aria-hidden="true" />
          {t('start.aboutLink')}
        </a>
      </nav>
      <div className="flex flex-wrap items-center justify-center gap-x-2">
        <span className="text-sm">{t('start.createdBy')}</span>
        <div className="flex items-center">
          {SOCIALS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-3 focus-visible:outline-accent-400 focus-visible:outline-offset-2"
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
