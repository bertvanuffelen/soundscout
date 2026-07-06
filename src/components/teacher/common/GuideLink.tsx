/**
 * GuideLink — kleine "?"-knop die de docentenhandleiding op een specifieke
 * sectie opent (contextuele, just-in-time hulp).
 *
 * Deeplinkt via `goToTeacherGuide(sectionId)`; de handleiding opent dan direct
 * op dat hoofdstuk (zie appStore `pendingGuideSection`). Twee varianten:
 * `icon` (compact "?"-knopje naast een sectiekop) en `inline` (knop met label).
 */

import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import { cn } from '../../../utils/cn';

interface GuideLinkProps {
  /** Sectie-id in de handleiding (bv. 'lesson-cards'). */
  sectionId: string;
  /** Optioneel zichtbaar label (verplicht zichtbaar bij variant 'inline'). */
  label?: string;
  variant?: 'icon' | 'inline';
  className?: string;
}

export function GuideLink({ sectionId, label, variant = 'icon', className }: GuideLinkProps) {
  const { t } = useTranslation();
  const goToTeacherGuide = useAppStore((s) => s.goToTeacherGuide);
  const aria = label ?? t('teacher.guide.openSection');

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={() => goToTeacherGuide(sectionId)}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors',
          className
        )}
      >
        <HelpCircle className="w-4 h-4" />
        {label ?? t('teacher.guide.openSection')}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => goToTeacherGuide(sectionId)}
      aria-label={aria}
      title={aria}
      className={cn(
        'inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full flex-shrink-0',
        'text-text-muted hover:text-brand-700 hover:bg-neutral-100 transition-colors',
        className
      )}
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
