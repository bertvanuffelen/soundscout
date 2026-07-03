/**
 * HowItWorksSteps — genummerde "Zo werkt het"-stap-kaarten in landing-stijl.
 *
 * Herbruikt de visuele taal van de publieke docentenpagina (genummerde
 * brand-900-cirkels + korte titel/omschrijving). Inklapbaar; de open/dicht-staat
 * wordt onthouden in localStorage (`storageKey`). `defaultOpen` bepaalt de staat
 * bij een eerste bezoek (bv. open tonen zolang de docent nog geen klas/opdracht
 * heeft, en daarna inklapbaar voor ervaren docenten).
 */

import { useState, useEffect, type ReactNode } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface HowItWorksStep {
  title: string;
  description: string;
}

interface HowItWorksStepsProps {
  title: string;
  steps: HowItWorksStep[];
  /** localStorage-sleutel om de open/dicht-staat te onthouden. */
  storageKey: string;
  /** Staat bij een eerste bezoek (nog geen opgeslagen voorkeur). */
  defaultOpen?: boolean;
  /** Optionele CTA onder de stappen. */
  action?: ReactNode;
  className?: string;
}

export function HowItWorksSteps({
  title,
  steps,
  storageKey,
  defaultOpen = true,
  action,
  className,
}: HowItWorksStepsProps) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? defaultOpen : stored === '1';
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? '1' : '0');
    } catch {
      /* localStorage niet beschikbaar — negeren */
    }
  }, [storageKey, open]);

  return (
    <section
      className={cn(
        'bg-bg-surface rounded-2xl border border-border-subtle p-5 sm:p-6',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 text-left group"
      >
        <Lightbulb className="w-5 h-5 text-accent-500 flex-shrink-0" />
        <span className="flex-1 text-lg sm:text-xl font-extrabold tracking-tight text-text-main">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-text-muted transition-transform duration-200 group-hover:text-text-main',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="mt-5 flex flex-col gap-4 sm:gap-5">
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {steps.map((step, i) => (
              <li
                key={i}
                className="bg-bg-app rounded-xl border border-border-subtle p-4 flex flex-col gap-2"
              >
                <span className="w-9 h-9 rounded-full bg-brand-900 text-text-inverse font-extrabold flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="text-base font-bold text-text-main">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
              </li>
            ))}
          </ol>
          {action && <div>{action}</div>}
        </div>
      )}
    </section>
  );
}
