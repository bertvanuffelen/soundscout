/**
 * cn - Class name utility for merging Tailwind classes
 *
 * Combines clsx (conditional classes) with tailwind-merge
 * (resolves conflicting Tailwind classes intelligently)
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
