/**
 * TeacherPageHeader — gedeelde donkerblauwe (brand-900) header voor het
 * docenten-gedeelte. Zorgt voor één consistente "shell" over dashboard,
 * klas-detail en handleiding: terug-link, optionele broodkruimel, titel +
 * subtitel, en een acties-slot (bv. Hulp/Uitloggen).
 */

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TeacherPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Optionele broodkruimel boven de titel, bv. "Dashboard › Klas 3B". */
  breadcrumb?: ReactNode;
  /** Rechtsboven: knoppen zoals Hulp / Uitloggen. */
  actions?: ReactNode;
  className?: string;
}

export function TeacherPageHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  breadcrumb,
  actions,
  className,
}: TeacherPageHeaderProps) {
  return (
    <header className={cn('bg-brand-900', className)}>
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-brand-300 hover:text-white text-sm mb-2 inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </button>
          )}
          {breadcrumb && <div className="text-brand-400 text-xs font-medium mb-1">{breadcrumb}</div>}
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white truncate">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-brand-300 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
