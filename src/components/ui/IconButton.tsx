/**
 * IconButton — compacte icoonknop met een raakvlak van minstens 44px
 * (V2 Fase 1, v2-architecture-proposal.md §6.1 regel 8).
 *
 * Vervangt de lange, tientallen keren gekopieerde class-string van de
 * werkbalkknoppen in de tijdlijn. De ZICHTBARE knop is compact (28–32px,
 * zodat een werkbalk past); het RAAKVLAK wordt met een onzichtbare ::after
 * vergroot tot 44px, de minimale maat voor een vinger.
 *
 * Altijd een `label` meegeven: dat wordt aria-label én tooltip.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type IconButtonTone = 'neutral' | 'accent' | 'danger';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Toegankelijke naam + tooltip. */
  label: string;
  children: ReactNode;
  tone?: IconButtonTone;
  /** Ingedrukt/actief (bv. een schakelaar die aan staat). */
  active?: boolean;
  /** `md` = 44px zichtbaar (losse knop); `sm` = compact in een werkbalk. */
  size?: 'sm' | 'md';
}

const TONES: Record<IconButtonTone, { idle: string; active: string }> = {
  neutral: {
    idle: 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 active:bg-neutral-200',
    active: 'bg-neutral-200 text-neutral-800',
  },
  accent: {
    idle: 'text-neutral-400 hover:text-accent-600 hover:bg-accent-100/60 active:bg-accent-100',
    active: 'bg-accent-50 text-accent-600 hover:bg-accent-100',
  },
  danger: {
    idle: 'text-neutral-400 hover:text-error-500 hover:bg-error-50 active:bg-error-100',
    active: 'bg-error-50 text-error-600',
  },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, tone = 'neutral', active = false, size = 'sm', className, type = 'button', title, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      aria-pressed={rest['aria-pressed'] ?? (active ? true : undefined)}
      className={cn(
        'relative flex items-center justify-center rounded-lg transition-colors',
        'disabled:opacity-25 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400',
        size === 'sm'
          // compact zichtbaar; ::after vergroot het raakvlak tot 44px
          ? 'icon-btn p-1 sm:p-1.5'
          : 'w-11 h-11',
        active ? TONES[tone].active : TONES[tone].idle,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
