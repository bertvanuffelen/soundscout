/**
 * StartHeader — bovenbalk van het startscherm (V2): taalkeuze en "Voor docenten"
 * rechtsboven. "Ik heb een code" staat sinds de designronde (nov 2026) bij de
 * hoofdknoppen: in de klas is dat de meest gebruikte ingang.
 */

import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StartHeaderProps {
  onTeachers: () => void;
}

const LANGS = [
  { code: 'nl', label: 'NL', name: 'Nederlands' },
  { code: 'en', label: 'EN', name: 'English' },
] as const;

export function StartHeader({ onTeachers }: StartHeaderProps) {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'nl').startsWith('en') ? 'en' : 'nl';

  return (
    <header className="relative z-10 flex items-center justify-end gap-2 sm:gap-3 pt-safe px-safe pb-1 [--safe-min:0.75rem] sm:[--safe-min:1.5rem]">
      {/* Taalkeuze: twee knoppen van 44px, de actieve gevuld */}
      <div role="group" aria-label={t('start.languageLabel')} className="flex rounded-full bg-white/10 text-sm font-bold">
        {LANGS.map(({ code, label, name }) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-label={name}
            aria-pressed={current === code}
            onClick={() => { if (current !== code) void i18n.changeLanguage(code); }}
            className={cn(
              'h-11 min-w-11 px-3 rounded-full uppercase transition-colors',
              current === code ? 'bg-white text-brand-900' : 'text-brand-200 hover:text-white hover:bg-white/10',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Docenten: klein en rustig (O2) — op een telefoon alleen het icoon */}
      <button
        type="button"
        onClick={onTeachers}
        className="inline-flex items-center justify-center gap-1.5 h-11 min-w-11 px-2.5 sm:px-3 rounded-full text-sm font-semibold text-brand-200 hover:text-white hover:bg-white/10 transition-colors"
      >
        <GraduationCap className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{t('start.forTeachers')}</span>
      </button>

    </header>
  );
}
