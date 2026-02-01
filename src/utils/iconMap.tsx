import type { LucideIcon } from 'lucide-react';
import {
  // Boerderij samples
  Smile,
  Cat,
  Dog,
  Bird,
  Circle,
  Rabbit,
  // Speeltuin samples
  Plane,
  Zap,
  Fish,
  CircleDot,
  Castle,
  Bot,
  // Gymzaal samples
  Target,
  Megaphone,
  Swords,
  SmilePlus,
  Disc3,
  ArrowDownRight,
  // Muziekwinkel samples
  Volume2,
  AudioWaveform,
  Guitar,
  Music,
  Piano,
} from 'lucide-react';

const sampleIconMap: Record<string, LucideIcon> = {
  // Boerderij samples
  Smile,
  Cat,
  Dog,
  Bird,
  Circle,
  Rabbit,
  // Speeltuin samples
  Plane,
  Zap,
  Fish,
  CircleDot,
  Castle,
  Bot,
  // Gymzaal samples
  Target,
  Megaphone,
  Swords,
  SmilePlus,
  Disc3,
  ArrowDownRight,
  // Muziekwinkel samples
  Volume2,
  AudioWaveform,
  Guitar,
  Music,
  Piano,
};

interface SampleIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function SampleIcon({ name, size = 20, className }: SampleIconProps) {
  const Icon = sampleIconMap[name];
  if (!Icon) return <span className={className}>?</span>;
  return <Icon size={size} className={className} />;
}
