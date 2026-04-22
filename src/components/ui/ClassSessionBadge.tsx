/**
 * ClassSessionBadge - Visuele indicator dat leerling in klascode-flow zit.
 *
 * Toont klasnaam + code als subtiele badge in de studio/stage header.
 * Alleen zichtbaar wanneer classSession actief is.
 *
 * @param variant - 'dark' for dark headers (stage), 'light' for light headers (studio)
 */

import { useAppStore } from '../../stores/appStore';

interface ClassSessionBadgeProps {
  variant?: 'dark' | 'light';
}

export function ClassSessionBadge({ variant = 'dark' }: ClassSessionBadgeProps) {
  const classSession = useAppStore((s) => s.classSession);

  if (!classSession) return null;

  const styles = variant === 'dark'
    ? 'bg-brand-700/60 text-brand-200'
    : 'bg-brand-200/80 text-brand-700';

  const dotStyles = variant === 'dark' ? 'text-brand-400' : 'text-brand-400';
  const codeStyles = variant === 'dark' ? 'text-brand-300' : 'text-brand-500';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap ${styles}`}>
      <span className="font-medium">{classSession.className}</span>
      <span className={dotStyles}>·</span>
      <span className={`font-mono ${codeStyles}`}>{classSession.classCode}</span>
    </div>
  );
}

export default ClassSessionBadge;
