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
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const variantStyles = {
  primary: [
    'bg-amber-400 hover:bg-amber-500 active:bg-amber-600 active:scale-[0.98]',
    'text-amber-900 font-bold',
    'shadow-lg hover:shadow-xl active:shadow-md',
    'disabled:bg-amber-300 disabled:shadow-none disabled:active:scale-100',
  ].join(' '),

  secondary: [
    'bg-white/70 hover:bg-white/90 active:bg-white active:scale-[0.98]',
    'text-sky-700 font-semibold',
    'shadow-md hover:shadow-lg active:shadow-sm',
    'disabled:bg-white/50 disabled:text-sky-400 disabled:active:scale-100',
  ].join(' '),

  ghost: [
    'bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-[0.98]',
    'text-white font-semibold',
    'disabled:bg-white/5 disabled:text-white/50 disabled:active:scale-100',
  ].join(' '),

  danger: [
    'bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-[0.98]',
    'text-white font-bold',
    'shadow-md hover:shadow-lg active:shadow-sm',
    'disabled:bg-red-300 disabled:active:scale-100',
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
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
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
