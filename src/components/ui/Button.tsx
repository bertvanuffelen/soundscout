/**
 * Button - Reusable button component with variants
 *
 * Variants:
 * - primary: Amber CTA buttons (Start, Naar Studio)
 * - secondary: White/transparent secondary actions (Terug)
 * - ghost: Transparent with hover (Club controls)
 * - danger: Red for destructive actions (Clear, Delete)
 *
 * Sizes:
 * - sm: Small buttons
 * - md: Default size
 * - lg: Large CTA buttons
 * - icon: Square icon buttons
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const variantStyles = {
  primary: [
    // 3D tactile button effect with soft shadow
    'bg-accent-400 hover:bg-accent-500 active:bg-accent-500',
    'text-accent-900 font-bold',
    'shadow-[0_4px_0_0_rgba(180,83,9,0.5)] hover:shadow-[0_4px_0_0_rgba(146,64,14,0.5)]',
    'active:shadow-[0_1px_0_0_rgba(180,83,9,0.5)] active:translate-y-[3px]',
    'disabled:bg-accent-300 disabled:shadow-[0_4px_0_0_rgba(217,119,6,0.4)] disabled:translate-y-0',
  ].join(' '),

  secondary: [
    // 3D tactile effect with soft shadow
    'bg-white hover:bg-neutral-50 active:bg-neutral-100',
    'text-text-main font-semibold',
    'border border-border-subtle',
    'shadow-[0_3px_0_0_rgba(148,163,184,0.5)] hover:shadow-[0_3px_0_0_rgba(100,116,139,0.5)]',
    'active:shadow-[0_1px_0_0_rgba(148,163,184,0.5)] active:translate-y-[2px]',
    'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:translate-y-0',
  ].join(' '),

  ghost: [
    'bg-transparent hover:bg-white/10 active:bg-white/20',
    'text-white font-semibold',
    'active:translate-y-[1px]',
    'disabled:bg-transparent disabled:text-white/50 disabled:translate-y-0',
  ].join(' '),

  danger: [
    // 3D tactile effect with soft shadow
    'bg-error-500 hover:bg-error-600 active:bg-error-600',
    'text-white font-bold',
    'shadow-[0_4px_0_0_rgba(153,27,27,0.5)] hover:shadow-[0_4px_0_0_rgba(127,29,29,0.5)]',
    'active:shadow-[0_1px_0_0_rgba(153,27,27,0.5)] active:translate-y-[3px]',
    'disabled:bg-error-300 disabled:shadow-[0_4px_0_0_rgba(220,38,38,0.4)] disabled:translate-y-0',
  ].join(' '),
};

const sizeStyles = {
  sm: 'px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg min-h-[36px] sm:min-h-[40px]',
  md: 'px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-xl min-h-[40px] sm:min-h-[44px]',
  lg: 'px-6 py-3 sm:px-8 sm:py-4 text-lg sm:text-xl rounded-2xl min-h-[48px] sm:min-h-[56px]',
  icon: 'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'transition-all duration-150',
          'cursor-pointer disabled:cursor-not-allowed',
          'select-none',
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          // Loading state
          isLoading && 'opacity-70 cursor-wait',
          // Custom classes
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
