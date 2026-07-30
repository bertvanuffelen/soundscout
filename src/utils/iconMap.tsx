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
  // Piraten samples
  Beer,
  DoorOpen,
  Dice5,
  Waves,
  Bell,
  Anchor,
  Package,
  Sailboat,
  Wind,
  Droplet,
  Bug,
  Skull,
  // Sequencer-bundels (fase 2)
  Grid3x3,
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
  // Piraten samples
  Beer,
  DoorOpen,
  Dice5,
  Waves,
  Bell,
  Anchor,
  Package,
  Sailboat,
  Wind,
  Droplet,
  Bug,
  Skull,
  // Sequencer-bundels (fase 2)
  Grid3x3,
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
