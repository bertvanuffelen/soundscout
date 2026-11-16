/**
 * assignmentTypeMeta — gedeelde presentatie-metadata per opdrachtvorm
 * (icoon + badge-kleur + i18n-label). Gebruikt door LessonCardsTab,
 * de klaspagina en de opdracht-wizard; los bestand zodat
 * component-bestanden alleen componenten exporteren (react-refresh).
 *
 * Kleuren per vorm (ontwerp ronde 3b, wens Bert: "kleurnuance zodat ze
 * herkenbaar blijven"): praatplaat = teal, storyboard = paars,
 * template = amber (accent), vrij = roze — gelijk aan de bestaande
 * type-kaarten en badges.
 */

import { FileText, MapPin, Clapperboard, Music, type LucideIcon } from 'lucide-react';
import type { AssignmentType } from '../../lib/assignments';

export interface TypeTone {
  /** Lichte achtergrond van een vormkaart */
  bg: string;
  /** Rand in rust */
  border: string;
  /** Rand bij hover */
  hoverBorder: string;
  /** Rand + ring als de kaart gekozen is */
  selected: string;
  /** Icoonkleur */
  icon: string;
  /** Icoon in een tegel (vierkantje met tint) */
  tile: string;
}

export interface TypeMeta {
  Icon: LucideIcon;
  badge: string;
  labelKey: string;
  /** Gewone-taal-titel ("Samen één plaat verklanken") */
  plainKey: string;
  /** Eén zin uitleg */
  descKey: string;
  tone: TypeTone;
}

export const TYPE_META: Record<AssignmentType, TypeMeta> = {
  praatplaat: {
    Icon: MapPin,
    badge: 'bg-teal-100 text-teal-700',
    labelKey: 'templates.typePraatplaat',
    plainKey: 'teacher.wizard.types.praatplaat.plain',
    descKey: 'teacher.wizard.types.praatplaat.desc',
    tone: {
      bg: 'bg-teal-50', border: 'border-teal-200', hoverBorder: 'hover:border-teal-400',
      selected: 'border-teal-600 ring-2 ring-teal-200', icon: 'text-teal-500',
      tile: 'bg-teal-50 text-teal-600 border border-teal-200',
    },
  },
  storyboard: {
    Icon: Clapperboard,
    badge: 'bg-purple-100 text-purple-700',
    labelKey: 'templates.typeStoryboard',
    plainKey: 'teacher.wizard.types.storyboard.plain',
    descKey: 'teacher.wizard.types.storyboard.desc',
    tone: {
      bg: 'bg-purple-50', border: 'border-purple-200', hoverBorder: 'hover:border-purple-400',
      selected: 'border-purple-600 ring-2 ring-purple-200', icon: 'text-purple-500',
      tile: 'bg-purple-50 text-purple-600 border border-purple-200',
    },
  },
  template: {
    Icon: FileText,
    badge: 'bg-accent-100 text-accent-800',
    labelKey: 'templates.typeTemplate',
    plainKey: 'teacher.wizard.types.template.plain',
    descKey: 'teacher.wizard.types.template.desc',
    tone: {
      bg: 'bg-accent-50', border: 'border-accent-200', hoverBorder: 'hover:border-accent-400',
      selected: 'border-accent-600 ring-2 ring-accent-200', icon: 'text-accent-500',
      tile: 'bg-accent-50 text-accent-600 border border-accent-200',
    },
  },
  free: {
    Icon: Music,
    badge: 'bg-rose-100 text-rose-700',
    labelKey: 'templates.typeFree',
    plainKey: 'teacher.wizard.types.free.plain',
    descKey: 'teacher.wizard.types.free.desc',
    tone: {
      bg: 'bg-rose-50', border: 'border-rose-200', hoverBorder: 'hover:border-rose-400',
      selected: 'border-rose-600 ring-2 ring-rose-200', icon: 'text-rose-500',
      tile: 'bg-rose-50 text-rose-600 border border-rose-200',
    },
  },
};

/** Volgorde waarin de vormen in de wizard staan */
export const TYPE_ORDER: AssignmentType[] = ['praatplaat', 'storyboard', 'template', 'free'];
