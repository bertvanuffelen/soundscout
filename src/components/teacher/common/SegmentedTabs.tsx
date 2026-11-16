/**
 * SegmentedTabs — herbruikbare tab-control voor het docenten-gedeelte.
 *
 * Twee varianten:
 *  - `pill`  (default): compacte iOS-stijl segmented control (witte pill op grijze track).
 *  - `large`: grote, volle-breedte tab-kaarten met icoon + telling — prominent,
 *             in lijn met de landing (rounded-2xl, brand-900 als actieve vulling).
 */

import { type LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: 'pill' | 'large';
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = 'pill',
  className,
}: SegmentedTabsProps<T>) {
  if (variant === 'large') {
    // Drie tabs passen op een telefoon alleen naast elkaar als het icoon boven
    // het label staat; twee tabs (o.a. de landing) houden hun vorm.
    const compact = tabs.length > 2;
    return (
      <div
        role="tablist"
        className={cn(
          'grid gap-3 sm:gap-4',
          compact ? 'grid-cols-3' : 'grid-cols-2',
          className
        )}
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center justify-center gap-2.5 rounded-2xl px-4 py-4 sm:py-5',
                'text-base sm:text-lg font-extrabold tracking-tight border-2 transition-all',
                compact && 'flex-col sm:flex-row gap-1 sm:gap-2.5 px-2 sm:px-4 py-3 text-sm leading-tight text-center',
                active
                  ? 'bg-brand-900 text-white border-brand-900 shadow-md'
                  : 'bg-bg-surface text-text-main border-border-subtle hover:border-brand-300 hover:shadow-sm'
              )}
            >
              {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-sm font-bold',
                    compact && 'min-w-5 h-5 text-xs sm:min-w-6 sm:h-6 sm:text-sm',
                    active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-text-muted'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // pill-variant
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center gap-1 bg-neutral-100 rounded-full p-1', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 sm:px-5 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap',
              active ? 'bg-white text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={cn('ml-1.5 font-semibold', active ? 'text-text-muted' : 'opacity-70')}>
                · {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
