/**
 * composeVariants — gedeelde config voor de drie compositievormen op de
 * publieke docentenpagina (praatplaat / storyboard / vrij).
 *
 * Eén bron van waarheid voor zowel de klikbare kaarten (sectie 2) als de
 * interactieve hero-preview + bijschrift (sectie 1). De mode-kleuren zijn
 * exact overgenomen uit ComposeModeModal (teal/purple/accent) zodat de
 * kleurcodering consistent is met de rest van de app.
 */

import { Image as ImageIcon, Film, Music, type LucideIcon } from 'lucide-react';

export type ComposeVariant = 'praatplaat' | 'storyboard' | 'vrij' | 'image';

interface VariantColors {
  /**
   * Border + achtergrond wanneer de kaart actief is. Alléén de actieve kaart
   * krijgt een variant-kleur; niet-actieve kaarten blijven neutraal (border-
   * subtle). Zo staan er nooit drie kleurranden naast elkaar (kleur-fix ronde 2).
   */
  active: string;
  /** Icoonkleur — kleine, begrensde kleuraccent. */
  icon: string;
  /** Pill/tag styling (tag boven de titel) — kleine, begrensde kleuraccent. */
  tag: string;
}

export interface VariantConfig {
  id: ComposeVariant;
  Icon: LucideIcon;
  colors: VariantColors;
  /** i18n-key-fragment onder teacherLanding.compose.variants.<key>. */
  key: ComposeVariant;
}

// Warme drieklank die harmonieert met de amber-hoofdkleur (rose/oranje/amber),
// i.p.v. de eerdere teal/paars. Bewuste rauwe Tailwind-kleuren op de
// marketing-landing; vrij gebruikt het accent-token (amber).
export const COMPOSE_VARIANTS: VariantConfig[] = [
  {
    id: 'praatplaat',
    key: 'praatplaat',
    Icon: ImageIcon,
    colors: {
      active: 'border-rose-400 bg-rose-50',
      icon: 'text-rose-500',
      tag: 'bg-rose-50 text-rose-600',
    },
  },
  {
    id: 'storyboard',
    key: 'storyboard',
    Icon: Film,
    colors: {
      active: 'border-orange-400 bg-orange-50',
      icon: 'text-orange-500',
      tag: 'bg-orange-50 text-orange-600',
    },
  },
  {
    id: 'vrij',
    key: 'vrij',
    Icon: Music,
    colors: {
      active: 'border-accent-400 bg-accent-50',
      icon: 'text-accent-500',
      tag: 'bg-accent-50 text-accent-700',
    },
  },
];
