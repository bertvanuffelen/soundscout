/**
 * SectionTitle — consistente sectiekop voor het docenten-gedeelte.
 *
 * Brengt de koppen op dezelfde schaal als de publieke docentenlandingspagina
 * (`text-2xl sm:text-3xl font-extrabold tracking-tight`), zodat dashboard en
 * landing als één product voelen. `size="md"` voor subsecties.
 */

import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface SectionTitleProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  size?: 'lg' | 'md';
  className?: string;
}

const sizeStyles = {
  lg: 'text-2xl sm:text-3xl',
  md: 'text-xl sm:text-2xl',
};

export function SectionTitle({ children, as: Tag = 'h2', size = 'lg', className }: SectionTitleProps) {
  return (
    <Tag
      className={cn(
        'font-extrabold tracking-tight text-text-main',
        sizeStyles[size],
        className
      )}
    >
      {children}
    </Tag>
  );
}
