/**
 * Thema's-overzicht van /beheer: lijst (volgorde, status, seizoen, versie,
 * aantal fouten/waarschuwingen) + detailpaneel (zichtbaarheid, seizoen,
 * versies, publiceren, vorige versie, editor, bekijk als leerling).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Eye, Image as ImageIcon, PencilRuler, RefreshCw, Rocket, Undo2, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { resolveAsset, resolveAssetBase } from '../../themes/mapping';
import { reorder, rollbackTargets, themeName, type AdminThemeRow } from '../../admin/overview';
import { ConfirmModal, Field, IssueCounts, IssueList, Notice, StatusBadge } from './parts';
import { useAdminErrorText, useAdminMutations } from './useAdminData';

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function coverUrl(row: AdminThemeRow): string | null {
  const m = row.latest.manifest;
  const path = m.locations[0]?.image ?? m.map.image.nl;
  return path ? resolveAsset(resolveAssetBase(row.latest.url, m.assetBase), path) : null;
}

interface Props {
  rows: AdminThemeRow[];
  backendMissing: boolean;
  loadError: string | null;
  onOpenEditor: (row: AdminThemeRow) => void;
  onPreview: (row: AdminThemeRow) => void;
  onImport: () => void;
}

export function ThemesSection({ rows, backendMissing, loadError, onOpenEditor, onPreview, onImport }: Props) {
  const { t } = useTranslation();
  const errorText = useAdminErrorText();
  const { publish, rollback, updateMeta, refresh } = useAdminMutations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'publish' | 'rollback'; version: number } | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  const seasonLabel = (row: AdminThemeRow) =>
    row.season ? t('admin.themes.season', { from: row.season.from, until: row.season.until }) : t('admin.themes.yearRound');

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setMessage(null);
    try {
      await action();
      if (success) setMessage({ tone: 'success', text: success });
    } catch (error) {
      setMessage({ tone: 'error', text: errorText(error) });
    }
  };

  const onMove = (index: number, direction: -1 | 1) => {
    const changes = reorder(rows, index, direction);
    if (changes.length > 0) void run(() => updateMeta.mutateAsync(changes.map((c) => ({ id: c.id, patch: { sort: c.sort } }))));
  };

  const doConfirm = () => {
    if (!selected || !confirm) return;
    const args = { id: selected.id, version: confirm.version };
    const action = confirm.kind === 'publish' ? publish.mutateAsync(args) : rollback.mutateAsync(args);
    setConfirm(null);
    void run(() => action, confirm.kind === 'publish' ? t('admin.editor.published', { version: confirm.version }) : undefined);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h2 className="text-2xl font-extrabold tracking-tight text-text-main">{t('admin.themes.title')}</h2>
            <p className="text-sm text-text-muted">{t('admin.themes.subtitle')}</p>
          </div>
          <Button variant="secondary" onClick={() => void refresh()} className="inline-flex items-center gap-2">
            <RefreshCw size={16} aria-hidden /> {t('admin.themes.refresh')}
          </Button>
          <Button variant="primary" onClick={onImport} className="inline-flex items-center gap-2">
            <Upload size={16} aria-hidden /> {t('admin.themes.import')}
          </Button>
        </div>

        {loadError && <Notice tone="error">{t('admin.themes.loadError', { message: loadError })}</Notice>}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {rows.length === 0 ? (
          <p className="text-text-muted">{t('admin.themes.empty')}</p>
        ) : (
          <ul className="rounded-2xl bg-white border border-border-subtle divide-y divide-border-subtle overflow-hidden" aria-label={t('admin.themes.title')}>
            {rows.map((row, i) => {
              const name = themeName(row);
              const cover = coverUrl(row);
              const canMove = !backendMissing && row.source === 'database';
              return (
                <li key={row.id} className={cn('flex items-center gap-3 p-3', row.id === selected?.id && 'bg-accent-50')} data-theme-id={row.id}>
                  <div className="flex flex-col">
                    <button type="button" aria-label={t('admin.themes.moveUp', { name })} disabled={!canMove || i === 0} onClick={() => onMove(i, -1)} className="w-11 h-6 flex items-center justify-center rounded text-text-muted hover:bg-neutral-200 disabled:opacity-25"><ArrowUp size={14} aria-hidden /></button>
                    <button type="button" aria-label={t('admin.themes.moveDown', { name })} disabled={!canMove || i === rows.length - 1} onClick={() => onMove(i, 1)} className="w-11 h-6 flex items-center justify-center rounded text-text-muted hover:bg-neutral-200 disabled:opacity-25"><ArrowDown size={14} aria-hidden /></button>
                  </div>
                  <button type="button" onClick={() => setSelectedId(row.id)} aria-pressed={row.id === selected?.id} className="flex items-center gap-3 min-w-0 flex-1 text-left min-h-11">
                    <span className="w-20 aspect-video rounded-lg bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center text-neutral-400">
                      {cover ? <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon size={20} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold text-text-main break-words">{name}</span>
                      <span className="block text-sm text-text-muted">
                        {t('admin.themes.summary', { season: seasonLabel(row), locations: row.latest.manifest.locations.length, sounds: row.latest.manifest.samples.length })}
                      </span>
                      <span className="block mt-0.5"><IssueCounts errors={row.errors} warnings={row.warnings} /></span>
                    </span>
                  </button>
                  <StatusBadge status={row.status} />
                  <span className="hidden md:inline text-sm text-text-muted tabular-nums w-10 text-right">{t('admin.themes.version', { n: row.latest.version })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <ThemeDetail
          key={selected.id}
          row={selected}
          backendMissing={backendMissing}
          busy={publish.isPending || rollback.isPending || updateMeta.isPending}
          onOpenEditor={() => onOpenEditor(selected)}
          onPreview={() => onPreview(selected)}
          onPublish={(version) => setConfirm({ kind: 'publish', version })}
          onRollback={(version) => setConfirm({ kind: 'rollback', version })}
          onMeta={(patch) => void run(() => updateMeta.mutateAsync({ id: selected.id, patch }))}
          seasonLabel={seasonLabel(selected)}
        />
      )}

      <ConfirmModal
        isOpen={confirm !== null}
        title={t(confirm?.kind === 'rollback' ? 'admin.confirm.rollbackTitle' : 'admin.confirm.publishTitle')}
        body={selected && confirm ? t(confirm.kind === 'rollback' ? 'admin.confirm.rollbackBody' : 'admin.confirm.publishBody', { name: themeName(selected), version: confirm.version }) : ''}
        confirmLabel={t(confirm?.kind === 'rollback' ? 'admin.confirm.rollback' : 'admin.confirm.publish')}
        onConfirm={doConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

interface DetailProps {
  row: AdminThemeRow;
  backendMissing: boolean;
  busy: boolean;
  seasonLabel: string;
  onOpenEditor: () => void;
  onPreview: () => void;
  onPublish: (version: number) => void;
  onRollback: (version: number) => void;
  onMeta: (patch: { is_public?: boolean; status?: 'published' | 'hidden'; season_from?: string | null; season_until?: string | null }) => void;
}

function ThemeDetail({ row, backendMissing, busy, seasonLabel, onOpenEditor, onPreview, onPublish, onRollback, onMeta }: DetailProps) {
  const { t } = useTranslation();
  const [from, setFrom] = useState(row.season?.from ?? '');
  const [until, setUntil] = useState(row.season?.until ?? '');
  const managed = row.source === 'database' && !backendMissing;
  const live = row.publishedVersion !== null;
  const seasonValid = (from === '' && until === '') || (MONTH_DAY.test(from) && MONTH_DAY.test(until));
  const targets = rollbackTargets(row);

  return (
    <section className="rounded-2xl bg-white border border-border-subtle p-4 sm:p-5 flex flex-col gap-4 self-start" aria-label={themeName(row)}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold tracking-tight text-text-main break-words">{themeName(row)}</h3>
          <p className="text-sm text-text-muted">{t('admin.themes.version', { n: row.latest.version })} · {t(`admin.status.${row.status}`)} · {seasonLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" onClick={onOpenEditor} className="inline-flex items-center gap-1.5"><PencilRuler size={16} aria-hidden /> {t('admin.themes.openEditor')}</Button>
          <Button variant="secondary" onClick={onPreview} className="inline-flex items-center gap-1.5"><Eye size={16} aria-hidden /> {t('admin.themes.preview')}</Button>
        </div>
      </div>

      {row.source === 'static' && <Notice>{t('admin.themes.staticNote')}</Notice>}

      {managed && (
        <>
          <label className="flex items-center justify-between gap-3 min-h-11 text-sm font-bold text-text-main">
            <span>
              {t('admin.themes.visible')}
              <span className="block text-xs font-normal text-text-muted">{t('admin.themes.visibleHelp')}</span>
            </span>
            <input type="checkbox" checked={row.isPublic} disabled={busy} onChange={(e) => onMeta({ is_public: e.target.checked })} className="w-6 h-6 accent-[var(--color-success-600)]" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.themes.seasonFrom')} value={from} placeholder="11-15" onChange={(e) => setFrom(e.target.value.trim())} />
            <Field label={t('admin.themes.seasonUntil')} value={until} placeholder="12-06" onChange={(e) => setUntil(e.target.value.trim())} />
          </div>
          {!seasonValid && <p className="text-sm text-error-600">{t('admin.themes.seasonInvalid')}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={!seasonValid || busy} onClick={() => onMeta({ season_from: from || null, season_until: until || null })}>{t('admin.themes.seasonSave')}</Button>
            <Button variant="secondary" size="sm" disabled={busy || !row.season} onClick={() => { setFrom(''); setUntil(''); onMeta({ season_from: null, season_until: null }); }}>{t('admin.themes.seasonClear')}</Button>
          </div>

          <div>
            <p className="text-sm font-bold text-text-muted mb-1">{t('admin.themes.versions')}</p>
            <ul className="text-sm flex flex-wrap gap-2">
              {[...row.versions].reverse().map((v) => (
                <li key={v.version} className={cn('px-2.5 py-1 rounded-full border', v.version === row.publishedVersion ? 'border-success-500 text-success-700 font-bold' : 'border-border-subtle text-text-muted')}>
                  v{v.version} · {v.version === row.publishedVersion ? t('admin.themes.versionLive') : v.publishedAt ? t('admin.themes.versionOld') : t('admin.themes.versionDraft')}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div>
        <p className="text-sm font-bold text-text-muted mb-2">{t('admin.themes.checks')}</p>
        <div className="max-h-72 overflow-y-auto"><IssueList issues={row.issues} max={25} /></div>
      </div>

      {managed && (
        <div className="flex flex-wrap gap-2 pt-1">
          {row.hasDraft ? (
            <button
              type="button"
              disabled={row.errors > 0 || busy}
              onClick={() => onPublish(row.latest.version)}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-12 px-4 rounded-full bg-success-600 text-white font-extrabold disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              <Rocket size={18} aria-hidden /> {row.errors > 0 ? t('admin.themes.publishBlocked', { count: row.errors }) : t('admin.themes.publish')}
            </button>
          ) : (
            <p className="flex-1 text-sm text-text-muted self-center">{t('admin.themes.noDraft')}</p>
          )}
          {live && (
            <Button variant="secondary" disabled={busy} onClick={() => onMeta({ status: row.status === 'hidden' ? 'published' : 'hidden' })}>
              {row.status === 'hidden' ? t('admin.themes.unhide') : t('admin.themes.hide')}
            </Button>
          )}
          {targets.length > 0 && (
            <Button variant="secondary" disabled={busy} onClick={() => onRollback(targets[0])} className="inline-flex items-center gap-2">
              <Undo2 size={16} aria-hidden /> {t('admin.themes.rollbackTo', { n: targets[0] })}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
