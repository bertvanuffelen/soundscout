/**
 * stickerMap - Lucide-iconen voor de feedback-stickers (patroon: iconMap.tsx)
 *
 * Vervangt de emoji-stickerset (⭐🎵🔊👏💡🎯) door consistente Lucide-iconen
 * (huisstijl-eis: overal Lucide). De sticker-keys blijven identiek aan de
 * CHECK-constraint in migratie 026.
 */

/* eslint-disable react-refresh/only-export-components -- icoon-constanten en
   het StickerIcon-component horen bij elkaar (zelfde patroon als iconMap) */
import { Star, Music, Volume2, Users, Lightbulb, Target, Mail, type LucideIcon } from 'lucide-react';
import type { FeedbackSticker } from '../lib/submissions';
import { cn } from './cn';

export const STICKER_ICONS: Record<FeedbackSticker, LucideIcon> = {
  star: Star,
  rhythm: Music,
  build: Volume2,
  teamwork: Users,
  surprise: Lightbulb,
  target: Target,
};

export const STICKER_KEYS = Object.keys(STICKER_ICONS) as FeedbackSticker[];

interface StickerIconProps {
  /** Sticker-key; onbekend/null → Mail-fallback (of niets als fallback uitstaat) */
  sticker: string | null | undefined;
  size?: number;
  className?: string;
  /** Toon een Mail-icoon wanneer er geen (geldige) sticker is */
  fallback?: boolean;
}

export function StickerIcon({ sticker, size = 20, className, fallback = false }: StickerIconProps) {
  const Icon = STICKER_ICONS[sticker as FeedbackSticker];
  if (!Icon) {
    if (!fallback) return null;
    return <Mail size={size} className={cn('text-accent-600', className)} aria-hidden="true" />;
  }
  return <Icon size={size} className={cn('text-accent-600', className)} aria-hidden="true" />;
}

export default StickerIcon;
