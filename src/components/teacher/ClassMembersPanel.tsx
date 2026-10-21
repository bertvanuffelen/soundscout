/**
 * ClassMembersPanel — leerlingcodes in het klaslokaal (fase 4.2, migratie 038)
 *
 * Codes maken, lijst met schuilnaam + activiteit, code vervangen of
 * uitzetten, alles een jaar verlengen en kaartjes printen. De echte naam
 * schrijft de docent alleen op het papieren kaartje.
 *
 * Verschijnt pas als migratie 038 gedraaid is (getClassMembers → null).
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Printer, RefreshCw, CalendarPlus, Power } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  getClassMembers, generateClassMembers, extendClassMembers, setMemberActive, replaceMemberCode,
  formatMemberCode, type ClassMember,
} from '../../lib/members';
import { cn } from '../../utils/cn';

interface ClassMembersPanelProps {
  classId: string;
  className: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch));
}

export function ClassMembersPanel({ classId, className }: ClassMembersPanelProps) {
  const { t, i18n } = useTranslation();
  const [members, setMembers] = useState<ClassMember[] | null | undefined>(undefined);
  const [count, setCount] = useState(25);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ClassMember | null>(null);

  const reload = useCallback(async () => {
    setMembers(await getClassMembers(classId));
  }, [classId]);

  useEffect(() => {
    let cancelled = false;
    void getClassMembers(classId).then((list) => { if (!cancelled) setMembers(list); });
    return () => { cancelled = true; };
  }, [classId]);

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await reload();
      if (success) setMessage({ type: 'success', text: success });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t('members.errors.generic') });
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return t('members.teacher.never');
    try {
      return new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
    } catch {
      return iso;
    }
  };

  // Print: een eigen venster met A4-kaartjes (code groot + schuilnaam + naamregel)
  const handlePrint = () => {
    if (!members?.length) return;
    const title = escapeHtml(t('members.teacher.printTitle', { className }));
    const how = escapeHtml(t('members.teacher.printHow'));
    const nameLabel = escapeHtml(t('members.teacher.printName'));
    const cards = members.filter((m) => m.isActive).map((m) => `
      <div class="card">
        <div class="brand">SoundScout</div>
        <div class="code">${escapeHtml(formatMemberCode(m.code))}</div>
        <div class="nick">${escapeHtml(m.pseudonym)}</div>
        <div class="how">${how}</div>
        <div class="name">${nameLabel} <span></span></div>
      </div>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:Nunito,system-ui,sans-serif;margin:12mm;color:#0f172a}
        h1{font-size:16pt;margin:0 0 8mm}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}
        .card{border:1.5px dashed #94a3b8;border-radius:4mm;padding:6mm;break-inside:avoid}
        .brand{font-size:9pt;font-weight:800;color:#b45309;letter-spacing:.05em;text-transform:uppercase}
        .code{font-family:ui-monospace,monospace;font-size:28pt;font-weight:800;letter-spacing:.12em;margin:2mm 0}
        .nick{font-size:13pt;font-weight:700}
        .how{font-size:9pt;color:#475569;margin-top:2mm}
        .name{margin-top:5mm;font-size:10pt}
        .name span{display:inline-block;width:60%;border-bottom:1px solid #0f172a}
      </style></head><body><h1>${title}</h1><div class="grid">${cards}</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  // Migratie 038 nog niet gedraaid, of nog aan het laden
  if (members === null || members === undefined) return null;

  return (
    <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound className="w-5 h-5 text-accent-600" aria-hidden="true" />
        <h3 className="text-lg font-bold text-text-main flex-1">{t('members.teacher.title')}</h3>
        {members.length > 0 && (
          <>
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('members.teacher.print')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void run(() => extendClassMembers(classId), t('members.teacher.extended'))}
            >
              <CalendarPlus className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('members.teacher.extend')}
            </Button>
          </>
        )}
      </div>
      <p className="mt-2 text-sm text-text-muted">{t('members.teacher.intro')}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="member-count" className="text-sm text-text-muted">{t('members.teacher.count')}</label>
        <input
          id="member-count"
          type="number"
          min={1}
          max={60}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
          className="w-20 px-3 py-1.5 text-sm border-2 border-border-subtle rounded-xl bg-neutral-50 text-text-main"
        />
        <Button variant="primary" size="sm" disabled={busy} isLoading={busy} onClick={() => void run(() => generateClassMembers(classId, count))}>
          {t('members.teacher.make')}
        </Button>
      </div>

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={cn('mt-3 text-sm', message.type === 'error' ? 'text-error-600' : 'text-success-600')}>
          {message.text}
        </p>
      )}

      {members.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">{t('members.teacher.empty')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border-subtle">
                <th className="py-2 pr-3 font-semibold">{t('members.teacher.code')}</th>
                <th className="py-2 pr-3 font-semibold">{t('members.teacher.pseudonym')}</th>
                <th className="py-2 pr-3 font-semibold">{t('members.teacher.activity')}</th>
                <th className="py-2 pr-3 font-semibold">{t('members.teacher.submissions')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className={cn('border-b border-border-subtle last:border-0', !m.isActive && 'opacity-50')}>
                  <td className="py-2 pr-3 font-mono font-bold tracking-wider text-text-main whitespace-nowrap">
                    {formatMemberCode(m.code)}
                    {!m.isActive && <span className="ml-2 text-xs font-sans font-semibold text-text-muted">({t('members.teacher.inactive')})</span>}
                  </td>
                  <td className="py-2 pr-3 text-text-main">{m.pseudonym}</td>
                  <td className="py-2 pr-3 text-text-muted whitespace-nowrap">{formatDate(m.lastActivity)}</td>
                  <td className="py-2 pr-3 text-text-muted">{m.submissionCount}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setReplaceTarget(m)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-text-muted hover:text-text-main hover:bg-neutral-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('members.teacher.replace')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void run(() => setMemberActive(m.id, !m.isActive))}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-text-muted hover:text-text-main hover:bg-neutral-100"
                    >
                      <Power className="w-3.5 h-3.5" aria-hidden="true" />
                      {m.isActive ? t('members.teacher.deactivate') : t('members.teacher.activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-text-muted">{t('members.teacher.expires', { date: formatDate(members[0].expiresAt) })}</p>
        </div>
      )}

      <Modal isOpen={!!replaceTarget} onClose={() => setReplaceTarget(null)} title={t('members.teacher.replace')} size="sm">
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">{t('members.teacher.replaceConfirm')}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setReplaceTarget(null)} className="flex-1">{t('common.cancel')}</Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              const target = replaceTarget;
              setReplaceTarget(null);
              if (target) void run(() => replaceMemberCode(target.id));
            }}
          >
            {t('members.teacher.replace')}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

export default ClassMembersPanel;
