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
    ? 'bg-slate-700/60 text-slate-200'
    : 'bg-slate-200/80 text-slate-700';

  const dotStyles = variant === 'dark' ? 'text-slate-400' : 'text-slate-400';
  const codeStyles = variant === 'dark' ? 'text-slate-300' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap ${styles}`}>
      <span className="font-medium">{classSession.className}</span>
      <span className={dotStyles}>·</span>
      <span className={`font-mono ${codeStyles}`}>{classSession.classCode}</span>
    </div>
  );
}

export default ClassSessionBadge;
