/**
 * assignmentTypeMeta — gedeelde presentatie-metadata per opdrachtvorm
 * (icoon + badge-kleur + i18n-label). Gebruikt door LessonCardsTab en
 * LessonCardPickerModal; los bestand zodat component-bestanden alleen
 * componenten exporteren (react-refresh).
 */

import { FileText, MapPin, Clapperboard, Music, type LucideIcon } from 'lucide-react';
import type { AssignmentType } from '../../lib/assignments';

export const TYPE_META: Record<AssignmentType, { Icon: LucideIcon; badge: string; labelKey: string }> = {
  template: { Icon: FileText, badge: 'bg-accent-100 text-accent-800', labelKey: 'templates.typeTemplate' },
  praatplaat: { Icon: MapPin, badge: 'bg-teal-100 text-teal-700', labelKey: 'templates.typePraatplaat' },
  storyboard: { Icon: Clapperboard, badge: 'bg-purple-100 text-purple-700', labelKey: 'templates.typeStoryboard' },
  free: { Icon: Music, badge: 'bg-rose-100 text-rose-700', labelKey: 'templates.typeFree' },
};
