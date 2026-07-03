/**
 * AssignmentTypeCards - Drie type-kaarten om een opdracht te kiezen
 *
 * Landing-stijl (gespiegeld op ComposeSection / ModeCard): Praatplaat (teal),
 * Storyboard (purple), Template van docent (accent). Klik → onSelect(type),
 * waarna ClassDetail de type-gescoopte activeer-modal opent.
 */

import { useTranslation } from 'react-i18next';
import { MapPin, Clapperboard, FileText, type LucideIcon } from 'lucide-react';
import type { AssignmentType } from '../../lib/assignments';
import { cn } from '../../utils/cn';

interface TypeCardConfig {
  type: AssignmentType;
  Icon: LucideIcon;
  /** Hover-rand + achtergrond per type (neutrale basisrand). */
  hover: string;
  icon: string;
  tag: string;
}

// Kleuren consistent met de landing "Drie manieren om te componeren".
const TYPE_CARDS: TypeCardConfig[] = [
  {
    type: 'praatplaat',
    Icon: MapPin,
    hover: 'hover:border-teal-400 hover:bg-teal-50',
    icon: 'text-teal-500',
    tag: 'bg-teal-50 text-teal-600',
  },
  {
    type: 'storyboard',
    Icon: Clapperboard,
    hover: 'hover:border-purple-400 hover:bg-purple-50',
    icon: 'text-purple-500',
    tag: 'bg-purple-50 text-purple-600',
  },
  {
    type: 'template',
    Icon: FileText,
    hover: 'hover:border-accent-400 hover:bg-accent-50',
    icon: 'text-accent-500',
    tag: 'bg-accent-50 text-accent-700',
  },
];

interface AssignmentTypeCardsProps {
  onSelect: (type: AssignmentType) => void;
  className?: string;
}

export function AssignmentTypeCards({ onSelect, className }: AssignmentTypeCardsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-4', className)}>
      {TYPE_CARDS.map(({ type, Icon, hover, icon, tag }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          className={cn(
            'group flex flex-col items-start text-left p-5 rounded-2xl border-2 border-border-subtle bg-bg-surface',
            'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm cursor-pointer',
            hover,
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className={icon}>
              <Icon size={26} />
            </span>
            <span className={cn('inline-flex items-center rounded-full text-[11px] font-bold px-2.5 py-0.5', tag)}>
              {t(`assignments.types.${type}.tag`)}
            </span>
          </div>
          <h3 className="text-lg font-bold text-text-main mb-1">
            {t(`assignments.types.${type}.title`)}
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            {t(`assignments.types.${type}.description`)}
          </p>
        </button>
      ))}
    </div>
  );
}

export default AssignmentTypeCards;
