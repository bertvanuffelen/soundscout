/**
 * LanguageSwitcher - Toggle between NL and EN
 *
 * Compact pill-shaped switcher with flag indicators.
 * Saves preference to localStorage via i18n languageChanged event.
 */

import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

interface LanguageSwitcherProps {
  /** Visual variant for different backgrounds */
  variant?: 'dark' | 'light';
  className?: string;
}

export function LanguageSwitcher({ variant = 'dark', className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'nl' ? 'en' : 'nl';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer',
        variant === 'dark'
          ? 'bg-brand-700/50 hover:bg-brand-700 text-brand-300 hover:text-white'
          : 'bg-neutral-100 hover:bg-neutral-200 text-text-muted hover:text-text-main',
        className,
      )}
      title={currentLang === 'nl' ? 'Switch to English' : 'Schakel naar Nederlands'}
    >
      <span className={cn(
        'transition-opacity',
        currentLang === 'nl' ? 'opacity-100' : 'opacity-50'
      )}>
        NL
      </span>
      <span className={cn(
        'w-px h-3',
        variant === 'dark' ? 'bg-brand-500' : 'bg-neutral-300'
      )} />
      <span className={cn(
        'transition-opacity',
        currentLang === 'en' ? 'opacity-100' : 'opacity-50'
      )}>
        EN
      </span>
    </button>
  );
}
