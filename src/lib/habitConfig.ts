import { Droplet, BookOpen, Dumbbell, Target, Brain, DollarSign, Heart, Circle, Flame, Moon, Sun, Coffee, Music, Bike, Footprints, Apple, Pill, Clock, type LucideIcon } from 'lucide-react';

export const iconOptions: Record<string, LucideIcon> = {
  droplet: Droplet,
  dumbbell: Dumbbell,
  book: BookOpen,
  target: Target,
  brain: Brain,
  dollar: DollarSign,
  heart: Heart,
  flame: Flame,
  moon: Moon,
  sun: Sun,
  coffee: Coffee,
  music: Music,
  bike: Bike,
  footprints: Footprints,
  apple: Apple,
  pill: Pill,
  clock: Clock,
  circle: Circle,
};

export const colorOptions = [
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export function getIcon(name: string): LucideIcon {
  return iconOptions[name] || Circle;
}
