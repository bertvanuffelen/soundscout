/**
 * SegmentedTabs — herbruikbare segmented tab-control (iOS-stijl) voor het
 * docenten-gedeelte. Actieve tab = witte pill op een grijze track. Optioneel een
 * telling per tab ("Mijn klassen · 10").
 */

import { cn } from '../../../utils/cn';

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
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
              active
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main'
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
