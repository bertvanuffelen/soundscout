/**
 * ThemeSeasonBadge — "buiten seizoen"-badge voor docent-materiaal.
 *
 * Seizoensregel (opdrachten-model 17-7): docenten zien buiten-seizoen
 * materiaal gewoon, mét deze badge ("weer beschikbaar in {maand}");
 * activeren geeft een zachte bevestiging, nooit een blokkade. Rendert
 * niets wanneer het thema in seizoen is of geen venster heeft.
 */

import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { getThemeSeasonInfo } from '../../data/themes';
import { cn } from '../../utils/cn';

interface ThemeSeasonBadgeProps {
  themeId: string | null | undefined;
  className?: string;
}

export function ThemeSeasonBadge({ themeId, className }: ThemeSeasonBadgeProps) {
  const { t, i18n } = useTranslation();
  const info = getThemeSeasonInfo(themeId);
  if (info.inSeason || !info.returnsInMonth) return null;

  const month = new Intl.DateTimeFormat(i18n.language, { month: 'long' })
    .format(new Date(2000, info.returnsInMonth - 1, 1));

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full text-[10px] font-bold px-2 py-0.5 bg-warning-100 text-warning-600',
        className,
      )}
    >
      <Clock className="w-3 h-3" aria-hidden="true" />
      {t('themes.seasonBadge', { month })}
    </span>
  );
}

export default ThemeSeasonBadge;
