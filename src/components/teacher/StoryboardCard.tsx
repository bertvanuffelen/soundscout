/**
 * StoryboardCard - Alleen-lezen kaart voor een ingebouwd storyboard.
 *
 * Storyboards zijn vaste app-content (geen docent-CRUD): de docent kan ze niet
 * aanmaken of verwijderen, alleen per klas activeren (via ClassDetail →
 * ActivateAssignmentModal). Deze kaart toont dus enkel: cover, naam, omschrijving
 * en het aantal beelden. Zelfde kaart-stijl als PraatplaatCard.
 */

import { useTranslation } from 'react-i18next';
import { Clapperboard } from 'lucide-react';
import type { StoryboardWithTheme } from '../../data/themes';

interface StoryboardCardProps {
  entry: StoryboardWithTheme;
}

export function StoryboardCard({ entry }: StoryboardCardProps) {
  const { t } = useTranslation();
  const sb = entry.storyboard;

  return (
    <div className="bg-bg-surface rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Cover */}
      <div className="aspect-video w-full overflow-hidden bg-neutral-100">
        <img src={sb.coverImage} alt={t(sb.name)} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-text-main text-lg truncate">{t(sb.name)}</h3>
          <span className="inline-flex items-center gap-1 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            <Clapperboard className="w-3 h-3" />
            {t('templates.storyboardFrames', { count: sb.images.length })}
          </span>
        </div>
        <p className="text-text-muted text-sm line-clamp-2">{t(sb.description)}</p>
      </div>
    </div>
  );
}

export default StoryboardCard;
