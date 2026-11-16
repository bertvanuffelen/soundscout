/** Kleuren van de status-chips op klaspagina en feedbackscherm (los bestand: react-refresh). */
export const STATUS_CHIP = {
  new: 'bg-accent-100 text-accent-700',
  seen: 'bg-neutral-100 text-neutral-600',
  reviewed: 'bg-success-100 text-success-700',
  wip: 'bg-warning-100 text-warning-700',
} as const;

export type StatusKey = keyof typeof STATUS_CHIP;
