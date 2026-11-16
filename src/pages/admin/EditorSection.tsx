/**
 * De thema-editor als pagina van /beheer (ontwerpcorrectie G): hotspots
 * slepen met de veilige zone en live controles (rules.ts), geluiden
 * toevoegen/afspelen/verwijderen, kaartmarkers slepen, beelden vervangen
 * (maat melden, niets hercoderen) en teksten in NL en EN.
 *
 * Alle bewerkingen lopen via editorReducer (src/admin/editorState.ts).
 */

import { useMemo, useRef, useState, type Dispatch, type HTMLAttributes, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleAlert, Download, Eye, Image as ImageIcon, Map as MapIcon, Music, Play, Plus, Rocket, Save, Target, Trash2, Type, Upload } from 'lucide-react';
import { Scene } from '../../components/ui/Scene';
import { Button } from '../../components/ui/Button';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { HOTSPOT_SAFE_ZONE } from '../../themes/rules';
import { assetUrl, prepareVersionManifest, slugify, createDraft, uniqueAssetPath, validateDraft, type Draft, type EditorAction } from '../../admin/editorState';
import { countErrors, countWarnings, type AdminIssue, type CreditDraft } from '../../admin/checks';
import { detectFormat, extensionOf, SIZE_LIMITS } from '../../admin/media';
import { decodeAudioDuration, downloadBytes, fileBytes, measureImage } from '../../admin/browserMedia';
import { buildPackZip } from '../../admin/exportPack';
import { saveDraftVersion, versionManifestUrl } from '../../lib/themeAdmin';
import type { AdminThemeRow } from '../../admin/overview';
import { ConfirmModal, Field, IssueList, Notice } from './parts';
import { useAdminErrorText, useAdminMutations } from './useAdminData';

type Tab = 'hotspots' | 'map' | 'images' | 'texts';

interface Props {
  draft: Draft | null;
  dispatch: Dispatch<EditorAction>;
  replaceDraft: (draft: Draft) => void;
  rows: AdminThemeRow[];
  backendMissing: boolean;
  onPreview: (draft: Draft) => void;
}

/** Pointer-slepen binnen een kader: positie in procenten van het kader. */
function startDrag(e: ReactPointerEvent<HTMLElement>, frame: HTMLElement | null, onMove: (x: number, y: number) => void): void {
  if (!frame) return;
  e.preventDefault();
  const move = (ev: PointerEvent) => {
    const rect = frame.getBoundingClientRect();
    onMove(((ev.clientX - rect.left) / rect.width) * 100, ((ev.clientY - rect.top) / rect.height) * 100);
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/** Pijltjestoetsen verschuiven 1 % (met Shift 5 %). */
function arrowDelta(e: KeyboardEvent): [number, number] | null {
  const step = e.shiftKey ? 5 : 1;
  switch (e.key) {
    case 'ArrowLeft': return [-step, 0];
    case 'ArrowRight': return [step, 0];
    case 'ArrowUp': return [0, -step];
    case 'ArrowDown': return [0, step];
    default: return null;
  }
}

const textOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150 ? '#0f172a' : '#ffffff';
};

export function EditorSection({ draft, dispatch, replaceDraft, rows, backendMissing, onPreview }: Props) {
  const { t } = useTranslation();
  const errorText = useAdminErrorText();
  const { publish, refresh } = useAdminMutations();
  const [tab, setTab] = useState<Tab>('hotspots');
  const [busy, setBusy] = useState<'save' | 'download' | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const issues = useMemo(() => (draft ? validateDraft(draft) : []), [draft]);

  if (!draft) return <Notice>{t('admin.editor.chooseTheme')}</Notice>;

  const name = draft.manifest.texts.nl.name || draft.themeId;
  const errors = countErrors(issues);
  const warnings = countWarnings(issues);
  const row = rows.find((r) => r.id === draft.themeId);
  const savedUnpublished = !draft.dirty && draft.sourceVersion !== null && row?.source === 'database'
    && row.versions.some((v) => v.version === draft.sourceVersion && v.publishedAt === null);
  const hasLocalFiles = Object.keys(draft.assets).length > 0;

  const save = async () => {
    setBusy('save');
    setMessage(null);
    try {
      const m = draft.manifest;
      const version = await saveDraftVersion({
        themeId: draft.themeId,
        build: (v) => prepareVersionManifest(draft, v),
        credits: draft.credits,
        initialMeta: { is_public: m.isPublic, sort: m.sort ?? null, season_from: m.season?.from ?? null, season_until: m.season?.until ?? null },
      });
      const { manifest } = prepareVersionManifest(draft, version);
      replaceDraft(createDraft(manifest, versionManifestUrl(draft.themeId, version), version));
      setMessage({ tone: 'success', text: t('admin.editor.saved', { version }) });
      await refresh();
    } catch (error) {
      setMessage({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy('download');
    try {
      downloadBytes(await buildPackZip(draft), `${draft.themeId}.sspack`);
    } catch (error) {
      setMessage({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(null);
    }
  };

  const doPublish = async () => {
    setConfirmPublish(false);
    if (draft.sourceVersion === null) return;
    try {
      await publish.mutateAsync({ id: draft.themeId, version: draft.sourceVersion });
      setMessage({ tone: 'success', text: t('admin.editor.published', { version: draft.sourceVersion }) });
    } catch (error) {
      setMessage({ tone: 'error', text: errorText(error) });
    }
  };

  const publishReason = errors > 0 ? t('admin.editor.publishBlocked', { count: errors }) : !savedUnpublished ? t('admin.editor.publishNeedsSave') : null;

  const TABS: Array<[Tab, string, typeof Target]> = [
    ['hotspots', t('admin.editor.tabs.hotspots'), Target],
    ['map', t('admin.editor.tabs.map'), MapIcon],
    ['images', t('admin.editor.tabs.images'), ImageIcon],
    ['texts', t('admin.editor.tabs.texts'), Type],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main break-words">{t('admin.editor.title', { name })}</h2>
          <p className="text-sm text-text-muted">
            {t('admin.editor.draftNote')}
            {draft.dirty && <span className="ml-2 font-bold text-warning-800">{t('admin.editor.unsaved')}</span>}
          </p>
        </div>
        <div role="tablist" aria-label={t('admin.editor.tabs.label')} className="flex flex-wrap rounded-xl bg-white border border-border-subtle p-1">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn('inline-flex items-center gap-2 min-h-11 px-3 rounded-lg text-sm font-bold', tab === id ? 'bg-brand-900 text-white' : 'text-text-muted hover:bg-neutral-100')}>
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!backendMissing && (
          <Button variant="primary" onClick={() => void save()} isLoading={busy === 'save'} disabled={busy !== null || !draft.dirty && draft.sourceVersion !== null && row?.source === 'database'} className="inline-flex items-center gap-2">
            <Save size={16} aria-hidden /> {busy === 'save' ? t('admin.editor.saving') : t('admin.editor.save')}
          </Button>
        )}
        <Button variant="secondary" onClick={() => void download()} isLoading={busy === 'download'} disabled={busy !== null} className="inline-flex items-center gap-2">
          <Download size={16} aria-hidden /> {t('admin.editor.download')}
        </Button>
        <Button variant="secondary" onClick={() => onPreview(draft)} disabled={hasLocalFiles} title={hasLocalFiles ? t('admin.editor.previewNeedsSave') : undefined} className="inline-flex items-center gap-2">
          <Eye size={16} aria-hidden /> {t('admin.editor.preview')}
        </Button>
        {!backendMissing && (
          <button type="button" onClick={() => setConfirmPublish(true)} disabled={publishReason !== null || publish.isPending}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-success-600 text-white font-extrabold text-sm disabled:bg-neutral-200 disabled:text-neutral-500">
            <Rocket size={16} aria-hidden /> {t('admin.editor.publish')}
          </button>
        )}
        {publishReason && !backendMissing && <span className="text-sm text-text-muted" data-testid="publish-reason">{publishReason}</span>}
      </div>

      {backendMissing && <Notice>{t('admin.editor.localOnly')}</Notice>}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {tab === 'hotspots' && <HotspotsTab draft={draft} dispatch={dispatch} issues={issues} />}
      {tab === 'map' && <MapTab draft={draft} dispatch={dispatch} />}
      {tab === 'images' && <ImagesTab draft={draft} dispatch={dispatch} issues={issues} />}
      {tab === 'texts' && <TextsTab draft={draft} dispatch={dispatch} />}

      <section className="rounded-2xl bg-white border border-border-subtle p-4" aria-label={t('admin.editor.issuesTitle', { errors, warnings })}>
        <h3 className="font-bold text-text-main mb-2">{t('admin.editor.issuesTitle', { errors, warnings })}</h3>
        <div className="max-h-80 overflow-y-auto"><IssueList issues={issues} /></div>
      </section>

      <ConfirmModal
        isOpen={confirmPublish}
        title={t('admin.confirm.publishTitle')}
        body={t('admin.confirm.publishBody', { name, version: draft.sourceVersion ?? '' })}
        confirmLabel={t('admin.confirm.publish')}
        busy={publish.isPending}
        onConfirm={() => void doPublish()}
        onClose={() => setConfirmPublish(false)}
      />
    </div>
  );
}

// --- Bron/licentie ---

function CreditFields({ path, credit, onChange }: { path: string; credit: CreditDraft | undefined; onChange: (c: CreditDraft) => void }) {
  const { t } = useTranslation();
  const c = credit ?? {};
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-border-subtle p-3">
      <legend className="px-1 text-sm font-bold text-text-main">{t('admin.editor.credit')}</legend>
      <p className="text-xs text-text-muted">{t('admin.editor.creditRequired')} <span className="font-mono break-all">{path}</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label={t('admin.soundForm.source')} value={c.source ?? ''} onChange={(e) => onChange({ source: e.target.value })} />
        <Field label={t('admin.soundForm.licence')} value={c.licence ?? ''} onChange={(e) => onChange({ licence: e.target.value })} />
        <Field label={t('admin.soundForm.author')} value={c.author ?? ''} onChange={(e) => onChange({ author: e.target.value })} />
        <Field label={t('admin.soundForm.licenceUrl')} value={c.licenceUrl ?? ''} onChange={(e) => onChange({ licenceUrl: e.target.value })} />
      </div>
      <Field label={t('admin.soundForm.prompt')} value={c.generationPrompt ?? ''} onChange={(e) => onChange({ generationPrompt: e.target.value })} />
    </fieldset>
  );
}

// --- Locatiekeuze ---

function LocationChips({ draft, value, onChange }: { draft: Draft; value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('admin.editor.locations')}>
      {draft.manifest.locations.map((l) => (
        <button key={l.id} type="button" aria-pressed={l.id === value} onClick={() => onChange(l.id)}
          className={cn('inline-flex items-center gap-2 min-h-11 pl-1.5 pr-3 rounded-full border-2 bg-white text-sm font-bold', l.id === value ? 'border-brand-900' : 'border-border-subtle text-text-muted hover:bg-neutral-50')}>
          <img src={assetUrl(draft, l.image)} alt="" className="w-12 h-8 rounded-full object-cover" />
          {draft.manifest.texts.nl.locations[l.id]?.name ?? l.id}
          <span className="text-xs text-text-muted tabular-nums">{l.hotspots.length}</span>
        </button>
      ))}
    </div>
  );
}

function SafeZone() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 bg-error-500/25 pointer-events-none" style={{ height: `${HOTSPOT_SAFE_ZONE.minY}%` }} />
      <div className="absolute inset-x-0 bottom-0 bg-error-500/25 pointer-events-none" style={{ height: `${100 - HOTSPOT_SAFE_ZONE.maxY}%` }} />
      <div className="absolute inset-x-0 border-y-2 border-dashed border-white/70 pointer-events-none" style={{ top: `${HOTSPOT_SAFE_ZONE.minY}%`, bottom: `${100 - HOTSPOT_SAFE_ZONE.maxY}%` }} />
    </>
  );
}

// --- Hotspots & geluiden ---

function HotspotsTab({ draft, dispatch, issues }: { draft: Draft; dispatch: Dispatch<EditorAction>; issues: AdminIssue[] }) {
  const { t } = useTranslation();
  const m = draft.manifest;
  const [locId, setLocId] = useState(m.locations[0]?.id ?? '');
  const [selId, setSelId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loc = m.locations.find((l) => l.id === locId) ?? m.locations[0];
  if (!loc) return null;

  const sampleName = (id: string) => m.texts.nl.samples[id] ?? id;
  const badHotspots = new Set(issues.filter((i) => i.severity === 'error' && i.hotspotId && i.locationId === loc.id).map((i) => i.hotspotId));
  const sampleIssues = (sampleId: string) => {
    const file = m.samples.find((s) => s.id === sampleId)?.file;
    return issues.filter((i) => i.severity === 'error' && (i.sampleId === sampleId || (file !== undefined && i.path === file)));
  };
  const selected = loc.hotspots.find((h) => h.id === selId) ?? null;
  const selectedSample = selected ? m.samples.find((s) => s.id === selected.sampleId) : undefined;
  const samplesHere = m.samples.filter((s) => s.locationId === loc.id || loc.hotspots.some((h) => h.sampleId === s.id));

  const play = (file: string) => {
    audioRef.current?.pause();
    const audio = new Audio(assetUrl(draft, file));
    audioRef.current = audio;
    void audio.play().catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      <LocationChips draft={draft} value={loc.id} onChange={(id) => { setLocId(id); setSelId(null); }} />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] gap-4">
        <div className="rounded-2xl bg-brand-900 p-3 flex flex-col gap-2">
          <div className="flex aspect-video">
            <Scene frameRef={frameRef} frameClassName="rounded-lg" frameProps={{ 'data-testid': 'hotspot-scene' } as HTMLAttributes<HTMLDivElement>}>
              <img src={assetUrl(draft, loc.image)} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              <SafeZone />
              {loc.hotspots.map((h) => {
                const sample = m.samples.find((s) => s.id === h.sampleId);
                const color = sample?.color ?? '#64748b';
                const bad = badHotspots.has(h.id);
                const move = (x: number, y: number) => dispatch({ type: 'moveHotspot', locationId: loc.id, hotspotId: h.id, x, y });
                return (
                  <button
                    key={h.id}
                    type="button"
                    data-hotspot-id={h.id}
                    aria-label={t('admin.editor.hotspotLabel', { name: sampleName(h.sampleId), x: h.x, y: h.y })}
                    aria-invalid={bad || undefined}
                    onPointerDown={(e) => { setSelId(h.id); startDrag(e, frameRef.current, move); }}
                    onKeyDown={(e) => {
                      const d = arrowDelta(e);
                      if (!d) return;
                      e.preventDefault();
                      move(h.x + d[0], h.y + d[1]);
                    }}
                    onFocus={() => setSelId(h.id)}
                    className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none border-[3px]',
                      bad ? 'border-error-500 ring-4 ring-error-500/50' : 'border-white', h.id === selId && 'ring-4 ring-accent-400')}
                    style={{ left: `${h.x}%`, top: `${h.y}%`, width: '8%', minWidth: 44, aspectRatio: '1 / 1', backgroundColor: `${color}cc`, color: textOn(color) }}
                  >
                    <SampleIcon name={sample?.icon ?? 'Music'} size={18} />
                  </button>
                );
              })}
            </Scene>
          </div>
          <p className="text-xs text-brand-200 px-1">{t('admin.editor.safeZoneHint')}</p>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="rounded-2xl bg-white border border-border-subtle overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
              <Music size={16} className="text-text-muted" aria-hidden />
              <span className="font-bold text-sm text-text-main">{t('admin.editor.sounds')}</span>
              <Button variant="primary" size="sm" onClick={() => setAdding(true)} className="ml-auto inline-flex items-center gap-1.5"><Plus size={14} aria-hidden /> {t('admin.editor.addSound')}</Button>
            </div>
            <ul className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
              {samplesHere.map((s) => {
                const problems = sampleIssues(s.id);
                const hotspot = loc.hotspots.find((h) => h.sampleId === s.id);
                return (
                  <li key={s.id} className={cn('flex items-center gap-2 px-3 py-1', hotspot && hotspot.id === selId ? 'bg-accent-50' : '')}>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
                    <button type="button" className="min-w-0 flex-1 text-left min-h-11" onClick={() => hotspot && setSelId(hotspot.id)}>
                      <span className="block text-sm font-semibold text-text-main break-words">{sampleName(s.id)}</span>
                      <span className={cn('block text-xs', problems.length ? 'text-error-600 font-semibold' : 'text-text-muted')}>
                        {problems.length ? t(`admin.rules.${problems[0].rule}`) : `${s.duration.toFixed(1)} s${s.kind ? ` · ${s.kind}` : ''}`}
                      </span>
                    </button>
                    {problems.length ? <CircleAlert size={16} className="text-error-600 shrink-0" aria-hidden /> : <CheckCircle2 size={16} className="text-success-600 shrink-0" aria-hidden />}
                    <button type="button" aria-label={t('admin.editor.listen', { name: sampleName(s.id) })} onClick={() => play(s.file)} className="w-11 h-11 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center shrink-0"><Play size={14} aria-hidden /></button>
                  </li>
                );
              })}
            </ul>
          </div>

          {adding && <AddSoundForm draft={draft} locationId={loc.id} dispatch={dispatch} onDone={() => setAdding(false)} />}

          {!adding && selected && selectedSample ? (
            <div className="rounded-2xl bg-white border border-border-subtle p-3 flex flex-col gap-3">
              <p className="font-bold text-text-main break-words">{sampleName(selectedSample.id)}</p>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
                  {t('admin.editor.kind')}
                  <select value={selectedSample.kind ?? ''} onChange={(e) => dispatch({ type: 'updateSample', sampleId: selectedSample.id, patch: { kind: (e.target.value || undefined) as 'sfx' | 'loop' | undefined } })} className="h-11 px-2 rounded-lg border-2 border-border-subtle bg-white text-sm font-semibold text-text-main">
                    <option value="">—</option>
                    <option value="sfx">sfx</option>
                    <option value="loop">loop</option>
                  </select>
                </label>
                <Field label={t('admin.editor.icon')} value={selectedSample.icon} onChange={(e) => dispatch({ type: 'updateSample', sampleId: selectedSample.id, patch: { icon: e.target.value } })} />
                <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
                  {t('admin.editor.color')}
                  <input type="color" value={selectedSample.color} onChange={(e) => dispatch({ type: 'updateSample', sampleId: selectedSample.id, patch: { color: e.target.value.toUpperCase() } })} className="h-11 w-full rounded-lg border-2 border-border-subtle bg-white" />
                </label>
              </div>
              {draft.assets[selectedSample.file] && (
                <CreditFields path={selectedSample.file} credit={draft.credits[selectedSample.file]} onChange={(credit) => dispatch({ type: 'setCredit', path: selectedSample.file, credit })} />
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted tabular-nums">
                <span>{t('admin.editor.position', { x: selected.x, y: selected.y })}</span>
                <Button variant="secondary" size="sm" className="ml-auto" onClick={() => dispatch({ type: 'addHotspot', locationId: loc.id, sampleId: selectedSample.id })}>{t('admin.editor.addHotspot')}</Button>
                <Button variant="secondary" size="sm" onClick={() => { dispatch({ type: 'removeHotspot', locationId: loc.id, hotspotId: selected.id }); setSelId(null); }}>{t('admin.editor.removeHotspot')}</Button>
                <Button variant="danger" size="sm" className="inline-flex items-center gap-1" onClick={() => { dispatch({ type: 'removeSample', sampleId: selectedSample.id }); setSelId(null); }}><Trash2 size={14} aria-hidden /> {t('admin.editor.removeSound')}</Button>
              </div>
            </div>
          ) : !adding && (
            <p className="rounded-2xl border-2 border-dashed border-neutral-300 p-4 text-sm text-text-muted">{t('admin.editor.selectHint')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddSoundForm({ draft, locationId, dispatch, onDone }: { draft: Draft; locationId: string; dispatch: Dispatch<EditorAction>; onDone: () => void }) {
  const { t } = useTranslation();
  const [file, setFile] = useState<{ bytes: Uint8Array; contentType: string; ext: string; duration: number; objectUrl: string; base: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<'sfx' | 'loop'>('sfx');
  const [nameNl, setNameNl] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('Music');
  const [color, setColor] = useState('#0EA5E9');
  const [credit, setCredit] = useState<CreditDraft>({});

  const onFile = async (picked: File) => {
    setError(null);
    const bytes = await fileBytes(picked);
    const format = detectFormat(bytes);
    if (format?.kind !== 'audio') { setError(t('admin.soundForm.notAudio')); return; }
    if (bytes.length > SIZE_LIMITS.hardMax) { setError(t('admin.soundForm.tooLarge')); return; }
    const duration = await decodeAudioDuration(bytes);
    if (duration === null) { setError(t('admin.soundForm.undecodable')); return; }
    const base = slugify(picked.name);
    setFile({ bytes, contentType: format.contentType, ext: extensionOf(picked.name) || format.format, duration, objectUrl: URL.createObjectURL(picked), base });
    setNameNl((n) => n || picked.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  };

  const add = () => {
    if (!file || !nameNl.trim()) return;
    const id = `${locationId}-${file.base}`;
    const path = uniqueAssetPath(draft, 'audio', id, file.ext);
    dispatch({
      type: 'addSample', locationId, path, credit,
      asset: { bytes: file.bytes, contentType: file.contentType, objectUrl: file.objectUrl },
      sample: { id, file: path, duration: Math.round(file.duration * 1000) / 1000, icon: icon.trim() || 'Music', color: color.toUpperCase(), kind },
      names: { nl: nameNl, en: nameEn },
    });
    onDone();
  };

  return (
    <div className="rounded-2xl bg-white border border-border-subtle p-3 flex flex-col gap-3" role="group" aria-label={t('admin.soundForm.title')}>
      <p className="font-bold text-text-main">{t('admin.soundForm.title')}</p>
      <label className="inline-flex items-center gap-2 min-h-11 px-3 rounded-lg border-2 border-dashed border-border-subtle text-sm font-bold text-text-muted cursor-pointer w-fit">
        <Upload size={16} aria-hidden /> {t('admin.editor.addSound')}
        <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      {file && (
        <>
          <p className="text-sm text-text-main tabular-nums">{t('admin.soundForm.duration', { seconds: file.duration.toFixed(2) })}</p>
          <label className="flex flex-col gap-1 text-sm font-bold text-text-muted">
            {t('admin.soundForm.kind')}
            <select value={kind} onChange={(e) => setKind(e.target.value as 'sfx' | 'loop')} className="h-11 px-2 rounded-lg border-2 border-border-subtle bg-white text-text-main font-semibold">
              <option value="sfx">{t('admin.soundForm.kindSfx')}</option>
              <option value="loop">{t('admin.soundForm.kindLoop')}</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('admin.soundForm.nameNl')} value={nameNl} onChange={(e) => setNameNl(e.target.value)} required />
            <Field label={t('admin.soundForm.nameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            <Field label={t('admin.soundForm.icon')} value={icon} onChange={(e) => setIcon(e.target.value)} hint={<span className="inline-flex items-center gap-1"><SampleIcon name={icon} size={16} /> {icon}</span>} />
            <label className="flex flex-col gap-1 text-sm font-bold text-text-muted">
              {t('admin.soundForm.color')}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-full rounded-lg border-2 border-border-subtle bg-white" />
            </label>
          </div>
          <CreditFields path={file.base} credit={credit} onChange={(c) => setCredit((prev) => ({ ...prev, ...c }))} />
        </>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onDone} className="flex-1">{t('admin.soundForm.cancel')}</Button>
        <Button variant="primary" onClick={add} disabled={!file || !nameNl.trim()} className="flex-1">{t('admin.soundForm.add')}</Button>
      </div>
    </div>
  );
}

// --- Kaart ---

function MapTab({ draft, dispatch }: { draft: Draft; dispatch: Dispatch<EditorAction> }) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const m = draft.manifest;
  return (
    <div className="rounded-2xl bg-brand-900 p-3 flex flex-col gap-2">
      <div className="flex aspect-video max-h-[70dvh]">
        <Scene frameRef={frameRef} frameClassName="rounded-lg">
          <img src={assetUrl(draft, m.map.image.nl)} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          {m.locations.map((l) => {
            const pos = m.map.positions.find((p) => p.locationId === l.id) ?? { x: 50, y: 50 };
            const label = m.texts.nl.locations[l.id]?.name ?? l.id;
            const move = (x: number, y: number) => dispatch({ type: 'moveMarker', locationId: l.id, x, y });
            return (
              <button key={l.id} type="button" aria-label={t('admin.editor.markerLabel', { name: label, x: pos.x, y: pos.y })}
                onPointerDown={(e) => startDrag(e, frameRef.current, move)}
                onKeyDown={(e) => { const d = arrowDelta(e); if (d) { e.preventDefault(); move(pos.x + d[0], pos.y + d[1]); } }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing touch-none"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                <span className="w-12 h-12 rounded-2xl bg-white border-4 border-accent-400 text-accent-600 flex items-center justify-center shadow-lg"><MapIcon size={22} aria-hidden /></span>
                <span className="bg-white/90 px-2 py-0.5 rounded-lg text-xs font-bold text-text-main whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </Scene>
      </div>
      <p className="text-xs text-brand-200 px-1">{t('admin.editor.mapHint')}</p>
    </div>
  );
}

// --- Beelden ---

function ImagesTab({ draft, dispatch, issues }: { draft: Draft; dispatch: Dispatch<EditorAction>; issues: AdminIssue[] }) {
  const { t } = useTranslation();
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const m = draft.manifest;
  const items = [
    ...Object.entries(m.map.image).map(([lang, path]) => ({ key: `map-${lang}`, label: t('admin.images.mapImage', { lang }), path, target: { kind: 'map' as const, lang } })),
    ...m.locations.map((l) => ({ key: l.id, label: m.texts.nl.locations[l.id]?.name ?? l.id, path: l.image, target: { kind: 'location' as const, locationId: l.id } })),
  ];

  const replace = async (file: File, item: (typeof items)[number]) => {
    setError(null);
    const bytes = await fileBytes(file);
    const format = detectFormat(bytes);
    if (format?.kind !== 'image') { setError(t('admin.images.notImage')); return; }
    const size = await measureImage(bytes, format.contentType);
    const path = uniqueAssetPath(draft, 'images', `${item.key}-nieuw`, extensionOf(file.name) || format.format);
    dispatch({ type: 'replaceImage', target: item.target, path, asset: { bytes, contentType: format.contentType, objectUrl: URL.createObjectURL(file), size } });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{t('admin.images.noReencode')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => {
          const asset = draft.assets[item.path];
          const size = asset?.size ?? measured[item.path] ?? null;
          const bad = issues.some((i) => i.rule === 'image-size' && i.path === item.path) || (size && (size.width !== 1920 || size.height !== 1080));
          return (
            <div key={item.key} className="rounded-2xl bg-white border border-border-subtle overflow-hidden">
              <img src={assetUrl(draft, item.path)} alt="" className="w-full aspect-video object-cover"
                onLoad={(e) => { const img = e.currentTarget; if (!asset) setMeasured((prev) => ({ ...prev, [item.path]: { width: img.naturalWidth, height: img.naturalHeight } })); }} />
              <div className="p-3 flex flex-col gap-1.5">
                <p className="font-bold text-text-main break-words">{item.label}</p>
                <p className={cn('flex items-center gap-1.5 text-sm', bad ? 'text-error-700 font-semibold' : 'text-text-main')}>
                  {bad ? <CircleAlert size={16} className="text-error-600" aria-hidden /> : <CheckCircle2 size={16} className="text-success-600" aria-hidden />}
                  {!size ? t('admin.images.sizeUnknown') : bad ? t('admin.images.sizeBad', size) : t('admin.images.sizeOk')}
                </p>
                {asset && <p className="text-xs text-warning-800">{t('admin.images.newFile')}</p>}
                <label className="mt-1 inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg border-2 border-border-subtle text-sm font-bold hover:bg-neutral-50 cursor-pointer">
                  <Upload size={14} aria-hidden /> {t('admin.images.replace')}
                  <input type="file" accept="image/*" className="sr-only" aria-label={`${t('admin.images.replace')}: ${item.label}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void replace(f, item); e.target.value = ''; }} />
                </label>
                {asset && <CreditFields path={item.path} credit={draft.credits[item.path]} onChange={(credit) => dispatch({ type: 'setCredit', path: item.path, credit })} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Teksten ---

function TextsTab({ draft, dispatch }: { draft: Draft; dispatch: Dispatch<EditorAction> }) {
  const { t } = useTranslation();
  const m = draft.manifest;
  const langs = ['nl', 'en'];
  const tx = (lang: string) => (m.texts as Record<string, { name?: string; description?: string; locations?: Record<string, { name?: string; description?: string }>; samples?: Record<string, string> }>)[lang];
  const rows: Array<{ key: string; label: string; get: (lang: string) => string | undefined; set: (lang: string, value: string) => EditorAction; required: boolean }> = [
    { key: 'name', label: t('admin.texts.themeName'), get: (l) => tx(l)?.name, set: (lang, value) => ({ type: 'setThemeText', field: 'name', lang, value }), required: true },
    { key: 'description', label: t('admin.texts.themeDescription'), get: (l) => tx(l)?.description, set: (lang, value) => ({ type: 'setThemeText', field: 'description', lang, value }), required: false },
    ...m.locations.flatMap((loc) => {
      const name = tx('nl')?.locations?.[loc.id]?.name ?? loc.id;
      return [
        { key: `loc-${loc.id}`, label: t('admin.texts.locationName', { name }), get: (l: string) => tx(l)?.locations?.[loc.id]?.name, set: (lang: string, value: string): EditorAction => ({ type: 'setLocationText', locationId: loc.id, field: 'name', lang, value }), required: true },
        { key: `locd-${loc.id}`, label: t('admin.texts.locationDescription', { name }), get: (l: string) => tx(l)?.locations?.[loc.id]?.description, set: (lang: string, value: string): EditorAction => ({ type: 'setLocationText', locationId: loc.id, field: 'description', lang, value }), required: false },
      ];
    }),
    ...m.samples.map((s) => ({ key: `s-${s.id}`, label: t('admin.texts.sampleName', { id: s.id }), get: (l: string) => tx(l)?.samples?.[s.id], set: (lang: string, value: string): EditorAction => ({ type: 'setSampleName', sampleId: s.id, lang, value }), required: true })),
  ];

  return (
    <div className="rounded-2xl bg-white border border-border-subtle overflow-x-auto">
      <p className="text-sm text-text-muted p-3">{t('admin.texts.intro')}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border-subtle">
            <th className="py-2 px-3 font-semibold">{t('admin.texts.field')}</th>
            {langs.map((l) => <th key={l} className="py-2 px-3 font-semibold uppercase">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border-subtle/60 last:border-0 align-top">
              <th scope="row" className="py-2 px-3 text-left font-semibold text-text-main min-w-40">{row.label}</th>
              {langs.map((lang) => {
                const value = row.get(lang) ?? '';
                const missing = row.required && !value.trim();
                return (
                  <td key={lang} className="py-2 px-3 min-w-56">
                    <input
                      value={value}
                      aria-label={`${row.label} (${lang.toUpperCase()})`}
                      aria-invalid={missing || undefined}
                      onChange={(e) => dispatch(row.set(lang, e.target.value))}
                      className={cn('h-11 w-full px-3 rounded-lg border-2 bg-white text-text-main', missing ? (lang === 'nl' ? 'border-error-500' : 'border-warning-400') : 'border-border-subtle')}
                    />
                    {missing && <span className={cn('text-xs font-bold', lang === 'nl' ? 'text-error-600' : 'text-warning-700')}>{t('admin.texts.missing')}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
