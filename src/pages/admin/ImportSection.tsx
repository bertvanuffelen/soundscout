/**
 * Themapakket importeren: .sspack/.zip of een map (webkitdirectory). Elke
 * controle draait opnieuw (src/admin/pack.ts); het rapport uit het pakket
 * wordt alleen getoond. "Maak concept" opent het in de editor; bewaren maakt
 * er een nieuwe conceptversie van (bestanden naar Storage).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, PackageOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { validatePack, unpackZip, type PackResult } from '../../admin/pack';
import { decodeAudioDuration, fileBytes } from '../../admin/browserMedia';
import { createDraft, type Draft, type DraftAsset } from '../../admin/editorState';
import { countErrors, countWarnings } from '../../admin/checks';
import type { AdminThemeRow } from '../../admin/overview';
import { IssueList, Notice } from './parts';

interface Props {
  rows: AdminThemeRow[];
  onDraft: (draft: Draft) => void;
}

export function ImportSection({ rows, onDraft }: Props) {
  const { t } = useTranslation();
  const [result, setResult] = useState<PackResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async (files: Map<string, Uint8Array>) => {
    setResult(await validatePack(files, { decodeDuration: (bytes) => decodeAudioDuration(bytes) }));
  };

  const run = async (load: () => Promise<Map<string, Uint8Array>>) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      await check(await load());
    } catch (e) {
      setError(t('admin.import.unreadable', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const fromZip = (file: File) => run(async () => unpackZip(await fileBytes(file)));
  const fromFolder = (list: FileList) => run(async () => {
    const files = new Map<string, Uint8Array>();
    for (const file of Array.from(list)) files.set(file.webkitRelativePath || file.name, await fileBytes(file));
    return files;
  });

  const create = () => {
    if (!result?.manifest) return;
    const assets: Record<string, DraftAsset> = {};
    for (const [path, file] of result.files) {
      assets[path] = {
        bytes: file.bytes,
        contentType: file.contentType,
        objectUrl: URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.contentType })),
        ...(file.size !== undefined ? { size: file.size } : {}),
      };
    }
    const draft = createDraft(result.manifest, `/__pakket/${result.manifest.id}/manifest.json`, null, { assets, credits: result.credits });
    onDraft({ ...draft, dirty: true });
  };

  const errors = result ? countErrors(result.issues) : 0;
  const warnings = result ? countWarnings(result.issues) : 0;
  const exists = result?.manifest && rows.some((r) => r.id === result.manifest!.id);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-text-main">{t('admin.import.title')}</h2>
        <p className="text-sm text-text-muted">{t('admin.import.body')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-accent-400 text-brand-900 font-extrabold text-sm cursor-pointer">
          <PackageOpen size={16} aria-hidden /> {t('admin.import.chooseZip')}
          <input type="file" accept=".sspack,.zip,application/zip" className="sr-only" data-testid="pack-zip-input"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromZip(f); e.target.value = ''; }} />
        </label>
        <label className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-white border-2 border-border-subtle font-bold text-sm cursor-pointer">
          <FolderOpen size={16} aria-hidden /> {t('admin.import.chooseFolder')}
          <input type="file" className="sr-only" multiple
            ref={(el) => { if (el) { el.setAttribute('webkitdirectory', ''); el.setAttribute('directory', ''); } }}
            onChange={(e) => { if (e.target.files?.length) void fromFolder(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      {busy && <Notice>{t('admin.import.reading')}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {result && (
        <section className="rounded-2xl bg-white border border-border-subtle p-4 flex flex-col gap-3" aria-label={t('admin.import.reportTitle')}>
          <h3 className="font-bold text-text-main">{t('admin.import.reportTitle')}{result.manifest ? ` · ${result.manifest.texts.nl.name} (${result.manifest.id})` : ''}</h3>
          <p className="text-sm text-text-main" data-testid="import-summary">{t('admin.import.summary', { files: result.files.size, errors, warnings })}</p>
          {exists && <Notice>{t('admin.import.exists', { id: result.manifest!.id })}</Notice>}
          <div className="max-h-96 overflow-y-auto"><IssueList issues={result.issues} /></div>
          {result.packReport !== null && result.packReport !== undefined && (
            <details className="text-sm">
              <summary className="cursor-pointer font-bold text-text-muted min-h-11 flex items-center">{t('admin.import.packReport')}</summary>
              <pre className="mt-2 p-3 rounded-lg bg-bg-app text-xs overflow-x-auto">{JSON.stringify(result.packReport, null, 2)}</pre>
            </details>
          )}
          {result.manifest && (
            <Button variant={errors > 0 ? 'secondary' : 'primary'} onClick={create} className="self-start">
              {errors > 0 ? t('admin.import.createDraftWithErrors') : t('admin.import.createDraft')}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
