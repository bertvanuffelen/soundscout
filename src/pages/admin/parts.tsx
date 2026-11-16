/**
 * Kleine bouwstenen van /beheer: statuslabel, meldingenlijst, invulveld,
 * bevestiging (Modal-patroon, nooit window.confirm).
 */

import type { InputHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import type { AdminIssue } from '../../admin/checks';
import type { AdminThemeStatus } from '../../admin/overview';

const STATUS_STYLE: Record<AdminThemeStatus, string> = {
  published: 'bg-success-100 text-success-700',
  draft: 'bg-warning-100 text-warning-800',
  hidden: 'bg-neutral-200 text-neutral-700',
  static: 'bg-brand-100 text-brand-800',
};

export function StatusBadge({ status }: { status: AdminThemeStatus }) {
  const { t } = useTranslation();
  return <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap', STATUS_STYLE[status])}>{t(`admin.status.${status}`)}</span>;
}

export function IssueCounts({ errors, warnings }: { errors: number; warnings: number }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-2 text-sm font-bold">
      {errors > 0 && <span className="inline-flex items-center gap-1 text-error-600"><CircleAlert size={16} aria-hidden /> {t('admin.themes.errors', { count: errors })}</span>}
      {warnings > 0 && <span className="inline-flex items-center gap-1 text-warning-700"><TriangleAlert size={16} aria-hidden /> {t('admin.themes.warnings', { count: warnings })}</span>}
      {errors === 0 && warnings === 0 && <span className="inline-flex items-center gap-1 text-success-700"><CheckCircle2 size={16} aria-hidden /> {t('admin.themes.allGood')}</span>}
    </span>
  );
}

export function IssueList({ issues, max = 60, onSelect }: { issues: AdminIssue[]; max?: number; onSelect?: (issue: AdminIssue) => void }) {
  const { t } = useTranslation();
  if (issues.length === 0) {
    return <p className="flex items-center gap-2 text-sm text-success-700"><CheckCircle2 size={18} aria-hidden /> {t('admin.editor.noIssues')}</p>;
  }
  const sorted = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return (
    <ul className="flex flex-col gap-1.5 text-sm" aria-label={t('admin.themes.checks')}>
      {sorted.slice(0, max).map((issue, i) => {
        const error = issue.severity === 'error';
        const Icon = error ? CircleAlert : TriangleAlert;
        const body = (
          <>
            <Icon size={18} className={cn('shrink-0 mt-0.5', error ? 'text-error-600' : 'text-warning-600')} aria-hidden />
            <span className="min-w-0">
              <span className={cn('font-semibold', error ? 'text-error-700' : 'text-warning-800')}>
                <span className="sr-only">{t(`admin.severity.${issue.severity}`)}: </span>
                {t(`admin.rules.${issue.rule}`, { defaultValue: issue.rule })}
              </span>
              {issue.detail && <span className="block text-text-muted break-words">{issue.detail}</span>}
            </span>
          </>
        );
        return (
          <li key={`${issue.rule}-${i}`} data-rule={issue.rule} data-severity={issue.severity}>
            {onSelect && (issue.locationId || issue.hotspotId) ? (
              <button type="button" onClick={() => onSelect(issue)} className="flex items-start gap-2 text-left w-full min-h-11 rounded-lg hover:bg-neutral-50 px-1">{body}</button>
            ) : (
              <div className="flex items-start gap-2 px-1">{body}</div>
            )}
          </li>
        );
      })}
      {sorted.length > max && <li className="text-text-muted px-1">… +{sorted.length - max}</li>}
    </ul>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function Field({ label, hint, className, ...input }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-1 text-sm font-bold text-text-muted', className)}>
      {label}
      <input {...input} className="h-11 px-3 rounded-lg border-2 border-border-subtle bg-white text-text-main font-semibold disabled:bg-neutral-100" />
      {hint && <span className="text-xs font-normal">{hint}</span>}
    </label>
  );
}

interface ConfirmProps {
  isOpen: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ isOpen, title, body, confirmLabel, busy, onConfirm, onClose }: ConfirmProps) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-text-muted text-sm mb-6 leading-relaxed text-center whitespace-pre-line">{body}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1">{t('admin.confirm.cancel')}</Button>
        <Button variant="primary" onClick={onConfirm} isLoading={busy} className="flex-1">{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-xl px-3 py-2 text-sm border', {
        'bg-accent-50 border-accent-100 text-text-main': tone === 'info',
        'bg-error-50 border-error-200 text-error-700': tone === 'error',
        'bg-success-50 border-success-200 text-success-700': tone === 'success',
      })}
    >
      {children}
    </p>
  );
}
