/**
 * ThemeWizard - Begeleide pijplijn voor nieuwe thema-pakketten (week 4)
 *
 * Van thema-idee → AI-prompts (afbeeldingen + geluiden zoeken) → assets &
 * kaartposities → code-export met een kant-en-klare Claude Code-opdracht.
 * Dev-tool (bereikbaar via /editor, net als de Locatie-editor); bewust
 * Nederlandstalig en niet ge-i18n'd. Het concept wordt automatisch bewaard
 * in localStorage zodat je in sessies kunt werken.
 *
 * De hotspot-plaatsing zelf blijft in de Locatie-editor; stap 4 verwijst
 * daarnaar en de export bevat de merge-instructie.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Check, ChevronLeft, ChevronRight, Copy, Download, Map as MapIcon,
  Plus, RotateCcw, Trash2, Wand2, AlertTriangle,
} from 'lucide-react';
import {
  makeEmptyDraft, makeEmptyLocation, makeEmptySample,
  buildImagePrompt, buildSoundSearchPack, validateDraft, generateThemeFiles,
  type ThemeDraft, type WizardLocation,
} from '../utils/themeCodegen';
import { copyToClipboard } from '../utils/copyToClipboard';

const DRAFT_KEY = 'soundscout:theme-wizard-draft';
const STEPS = ['Concept', 'Locaties & geluiden', 'Prompts', 'Kaart & export'] as const;

// --- Kleine bouwstenen (dev-tool-stijl) ---

function Field({ label, value, onChange, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-muted mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border-2 border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none text-sm bg-white ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}

function Area({ label, value, onChange, rows = 3, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-muted mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border-2 border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none text-sm bg-white resize-y"
      />
    </label>
  );
}

function CopyBlock({ title, content, downloadName }: { title: string; content: string; downloadName?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName ?? title.replace(/[^a-z0-9.-]/gi, '_');
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="border border-border-subtle rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-50 border-b border-border-subtle">
        <span className="text-xs font-mono font-semibold text-text-main truncate">{title}</span>
        <div className="flex gap-1 shrink-0">
          <button onClick={handleCopy} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-accent-400 hover:bg-accent-500 text-white transition-colors">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Gekopieerd' : 'Kopieer'}
          </button>
          {downloadName && (
            <button onClick={handleDownload} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-neutral-200 hover:bg-neutral-300 text-text-main transition-colors">
              <Download size={12} />
            </button>
          )}
        </div>
      </div>
      <pre className="p-3 text-[11px] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap text-text-main">{content}</pre>
    </div>
  );
}

// --- De wizard zelf ---

export function ThemeWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ThemeDraft>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return { ...makeEmptyDraft(), ...JSON.parse(raw) } as ThemeDraft;
    } catch { /* corrupte draft → vers beginnen */ }
    return makeEmptyDraft();
  });

  // Concept automatisch bewaren
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* vol */ }
  }, [draft]);

  const update = (patch: Partial<ThemeDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateLocation = (i: number, patch: Partial<WizardLocation>) =>
    setDraft((d) => ({
      ...d,
      locations: d.locations.map((loc, j) => (j === i ? { ...loc, ...patch } : loc)),
    }));

  const handleReset = () => {
    if (window.confirm('Heel het concept wissen en opnieuw beginnen?')) {
      localStorage.removeItem(DRAFT_KEY);
      setDraft(makeEmptyDraft());
      setStep(0);
    }
  };

  // Kaart-preview voor klik-plaatsing (stap 4)
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);
  const [placingLocationIndex, setPlacingLocationIndex] = useState<number | null>(null);
  const mapImgRef = useRef<HTMLDivElement>(null);
  const handleMapClick = (e: React.MouseEvent) => {
    if (placingLocationIndex == null || !mapImgRef.current) return;
    const rect = mapImgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    updateLocation(placingLocationIndex, { mapX: x, mapY: y });
    setPlacingLocationIndex(null);
  };

  const issues = validateDraft(draft);
  const files = issues.length === 0 ? generateThemeFiles(draft) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              i === step ? 'bg-brand-900 text-white' : 'bg-neutral-100 text-text-muted hover:bg-neutral-200'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === step ? 'bg-accent-400 text-accent-900' : 'bg-white'}`}>{i + 1}</span>
            {label}
          </button>
        ))}
        <button onClick={handleReset} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-error-600 transition-colors" title="Concept wissen">
          <RotateCcw size={13} /> Nieuw concept
        </button>
      </div>

      {/* --- Stap 1: Concept --- */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Beschrijf het thema-pakket. Het <strong>stijlprofiel</strong> gaat in élke afbeeldingsprompt mee —
            pas het aan als dit pakket een eigen accent nodig heeft.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Thema-id (slug, bv. 'herfst')" value={draft.themeId} onChange={(v) => update({ themeId: v })} mono placeholder="herfst" />
            <Field label="Seizoen/aanleiding (label)" value={draft.seasonLabel} onChange={(v) => update({ seasonLabel: v })} placeholder="Herfst / Sinterklaas" />
            <Field label="Naam (NL)" value={draft.nameNl} onChange={(v) => update({ nameNl: v })} placeholder="Herfst" />
            <Field label="Naam (EN)" value={draft.nameEn} onChange={(v) => update({ nameEn: v })} placeholder="Autumn" />
            <Field label="Korte beschrijving (NL)" value={draft.descriptionNl} onChange={(v) => update({ descriptionNl: v })} placeholder="Bos, storm en oogst" />
            <Field label="Korte beschrijving (EN)" value={draft.descriptionEn} onChange={(v) => update({ descriptionEn: v })} placeholder="Forest, storm and harvest" />
            <Field label="Zichtbaar vanaf (MM-DD, optioneel)" value={draft.activeFrom} onChange={(v) => update({ activeFrom: v })} mono placeholder="09-15" />
            <Field label="Zichtbaar t/m (MM-DD, optioneel)" value={draft.activeUntil} onChange={(v) => update({ activeUntil: v })} mono placeholder="11-30" />
          </div>
          <Area label="Stijlprofiel (gaat in elke afbeeldingsprompt mee)" value={draft.styleProfile} onChange={(v) => update({ styleProfile: v })} rows={4} />
        </div>
      )}

      {/* --- Stap 2: Locaties & geluiden --- */}
      {step === 1 && (
        <div className="space-y-6">
          <p className="text-sm text-text-muted">
            Per locatie: namen, een scène-omschrijving (basis voor de afbeeldingsprompt) en 4-6 geluiden.
            Geluid-ids worden automatisch geprefixt met de locatie (bv. <code className="font-mono">bos-wind</code>).
          </p>
          {draft.locations.map((loc, i) => (
            <div key={i} className="border border-border-subtle rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text-main">Locatie {i + 1}{loc.nameNl ? ` — ${loc.nameNl}` : ''}</h3>
                <button onClick={() => setDraft((d) => ({ ...d, locations: d.locations.filter((_, j) => j !== i) }))} className="p-1.5 text-text-muted hover:text-error-600 transition-colors" title="Locatie verwijderen">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Id (slug)" value={loc.id} onChange={(v) => updateLocation(i, { id: v })} mono />
                <Field label="Naam (NL)" value={loc.nameNl} onChange={(v) => updateLocation(i, { nameNl: v })} />
                <Field label="Naam (EN)" value={loc.nameEn} onChange={(v) => updateLocation(i, { nameEn: v })} />
                <Field label="Beschrijving (NL)" value={loc.descriptionNl} onChange={(v) => updateLocation(i, { descriptionNl: v })} />
                <Field label="Beschrijving (EN)" value={loc.descriptionEn} onChange={(v) => updateLocation(i, { descriptionEn: v })} />
              </div>
              <Area label="Scène-omschrijving voor de afbeelding" value={loc.sceneIdea} onChange={(v) => updateLocation(i, { sceneIdea: v })} rows={2}
                placeholder="Een gezellige bakkerij met een grote oven, deegmachine, kassa en een kat op de vensterbank" />
              {/* Geluiden */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-text-muted">Geluiden (id · NL · EN · geluid-idee · icoon · kleur)</span>
                {loc.samples.map((s, j) => (
                  <div key={j} className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <input type="text" value={s.id} onChange={(e) => updateLocation(i, { samples: loc.samples.map((x, k) => k === j ? { ...x, id: e.target.value } : x) })} placeholder="wind" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs font-mono" />
                    <input type="text" value={s.nameNl} onChange={(e) => updateLocation(i, { samples: loc.samples.map((x, k) => k === j ? { ...x, nameNl: e.target.value } : x) })} placeholder="Wind" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs" />
                    <input type="text" value={s.nameEn} onChange={(e) => updateLocation(i, { samples: loc.samples.map((x, k) => k === j ? { ...x, nameEn: e.target.value } : x) })} placeholder="Wind" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs" />
                    <input type="text" value={s.soundIdea} onChange={(e) => updateLocation(i, { samples: loc.samples.map((x, k) => k === j ? { ...x, soundIdea: e.target.value } : x) })} placeholder="gierende herfstwind" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs" />
                    <input type="text" value={s.icon} onChange={(e) => updateLocation(i, { samples: loc.samples.map((x, k) => k === j ? { ...x, icon: e.target.value } : x) })} placeholder="Wind" title="Lucide-iconnaam" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs font-mono" />
                    <div className="flex gap-1 items-center">
                      <input type="color" value={s.color} onChange={(e) => updateLocation(i, { samples: loc.samples.map((x, k) => k === j ? { ...x, color: e.target.value } : x) })} className="w-8 h-8 rounded border border-border-subtle cursor-pointer" />
                      <button onClick={() => updateLocation(i, { samples: loc.samples.filter((_, k) => k !== j) })} className="p-1 text-text-muted hover:text-error-600" title="Geluid verwijderen"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => updateLocation(i, { samples: [...loc.samples, makeEmptySample()] })} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-800">
                  <Plus size={13} /> Geluid toevoegen
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setDraft((d) => ({ ...d, locations: [...d.locations, makeEmptyLocation(d.locations.length)] }))} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-900 text-white text-sm font-semibold hover:bg-brand-800 transition-colors">
            <Plus size={15} /> Locatie toevoegen
          </button>

          {/* Praatplaten + storyboard */}
          <div className="border border-border-subtle rounded-2xl p-4 bg-white space-y-3">
            <h3 className="font-bold text-text-main">Praatplaten (optioneel)</h3>
            {draft.praatplaten.map((p, i) => (
              <div key={i} className="grid sm:grid-cols-4 gap-2 items-start">
                <input type="text" value={p.id} onChange={(e) => update({ praatplaten: draft.praatplaten.map((x, j) => j === i ? { ...x, id: e.target.value } : x) })} placeholder="herfstmarkt (slug)" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs font-mono" />
                <input type="text" value={p.titleNl} onChange={(e) => update({ praatplaten: draft.praatplaten.map((x, j) => j === i ? { ...x, titleNl: e.target.value } : x) })} placeholder="Herfstmarkt (NL)" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs" />
                <input type="text" value={p.titleEn} onChange={(e) => update({ praatplaten: draft.praatplaten.map((x, j) => j === i ? { ...x, titleEn: e.target.value } : x) })} placeholder="Autumn market (EN)" className="px-2 py-1.5 border border-border-subtle rounded-lg text-xs" />
                <div className="flex gap-1">
                  <input type="text" value={p.sceneIdea} onChange={(e) => update({ praatplaten: draft.praatplaten.map((x, j) => j === i ? { ...x, sceneIdea: e.target.value } : x) })} placeholder="scène-idee" className="flex-1 px-2 py-1.5 border border-border-subtle rounded-lg text-xs" />
                  <button onClick={() => update({ praatplaten: draft.praatplaten.filter((_, j) => j !== i) })} className="p-1 text-text-muted hover:text-error-600"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            <button onClick={() => update({ praatplaten: [...draft.praatplaten, { id: '', titleNl: '', titleEn: '', sceneIdea: '' }] })} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-800">
              <Plus size={13} /> Praatplaat toevoegen
            </button>
          </div>

          <div className="border border-border-subtle rounded-2xl p-4 bg-white space-y-3">
            <h3 className="font-bold text-text-main">Storyboard (optioneel)</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Titel (NL)" value={draft.storyboardTitleNl} onChange={(v) => update({ storyboardTitleNl: v })} placeholder="De verdwenen oogst" />
              <Field label="Titel (EN)" value={draft.storyboardTitleEn} onChange={(v) => update({ storyboardTitleEn: v })} placeholder="The missing harvest" />
            </div>
            {draft.storyboardFrames.map((frame, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-xs font-bold text-text-muted pt-2 w-14 shrink-0">Frame {i + 1}</span>
                <input type="text" value={frame} onChange={(e) => update({ storyboardFrames: draft.storyboardFrames.map((x, j) => j === i ? e.target.value : x) })} placeholder="scène-omschrijving van dit moment" className="flex-1 px-2 py-1.5 border border-border-subtle rounded-lg text-xs" />
                <button onClick={() => update({ storyboardFrames: draft.storyboardFrames.filter((_, j) => j !== i) })} className="p-1 text-text-muted hover:text-error-600"><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={() => update({ storyboardFrames: [...draft.storyboardFrames, ''] })} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-800">
              <Plus size={13} /> Frame toevoegen
            </button>
          </div>
        </div>
      )}

      {/* --- Stap 3: Prompts --- */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-text-muted flex items-center gap-2">
            <Wand2 size={15} className="text-accent-600 shrink-0" />
            Kant-en-klare prompts: plak de afbeeldingsprompts in Claude/een beeldgenerator en gebruik de
            zoekpakketten op freesound.org. Alles is gebaseerd op je stijlprofiel uit stap 1.
          </p>
          <CopyBlock title="Plattegrond (kaart van het hele thema)" content={buildImagePrompt(draft, `Overzichtskaart van "${draft.nameNl || draft.themeId}" met daarop: ${draft.locations.map((l) => l.nameNl || l.id).join(', ')}`, 'map')} />
          {draft.locations.map((loc, i) => (
            <div key={i} className="space-y-2">
              <h3 className="font-bold text-text-main">{loc.nameNl || loc.id || `Locatie ${i + 1}`}</h3>
              <CopyBlock title={`Afbeelding — ${loc.id || i + 1}.jpg`} content={buildImagePrompt(draft, loc.sceneIdea, 'location')} />
              <details className="border border-border-subtle rounded-xl bg-white">
                <summary className="px-3 py-2 text-sm font-semibold cursor-pointer text-text-main">Geluid-zoekpakketten ({loc.samples.filter((s) => s.id || s.nameNl).length})</summary>
                <div className="p-3 space-y-2">
                  {loc.samples.filter((s) => s.id || s.nameNl).map((s, j) => (
                    <CopyBlock key={j} title={`${loc.id}-${s.id || j + 1}`} content={buildSoundSearchPack(loc, s)} />
                  ))}
                </div>
              </details>
            </div>
          ))}
          {draft.praatplaten.map((p, i) => (
            <CopyBlock key={i} title={`Praatplaat — ${p.id || i + 1}.jpg`} content={buildImagePrompt(draft, p.sceneIdea, 'praatplaat')} />
          ))}
          {draft.storyboardFrames.map((frame, i) => (
            <CopyBlock key={i} title={`Storyboard-frame ${i + 1}`} content={buildImagePrompt(draft, `${frame} (frame ${i + 1} van ${draft.storyboardFrames.length} uit "${draft.storyboardTitleNl}")`, 'storyboard-frame')} />
          ))}
        </div>
      )}

      {/* --- Stap 4: Kaart & export --- */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Kaartposities */}
          <div className="border border-border-subtle rounded-2xl p-4 bg-white space-y-3">
            <h3 className="font-bold text-text-main flex items-center gap-2"><MapIcon size={16} /> Kaartposities</h3>
            <p className="text-xs text-text-muted">
              Laad je (concept-)plattegrond, kies een locatie en klik op de kaart om de marker te plaatsen.
              De afbeelding wordt niets opgeslagen — alleen de percentages.
            </p>
            <input type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setMapPreviewUrl(URL.createObjectURL(f));
            }} className="text-xs" />
            <div className="flex flex-wrap gap-2">
              {draft.locations.map((loc, i) => (
                <button key={i} onClick={() => setPlacingLocationIndex(placingLocationIndex === i ? null : i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${placingLocationIndex === i ? 'bg-accent-400 text-accent-900' : loc.mapX != null ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-text-muted'}`}>
                  {loc.mapX != null && <Check size={12} className="inline -mt-0.5 mr-0.5" aria-hidden="true" />}{loc.nameNl || loc.id || `locatie ${i + 1}`}
                  {loc.mapX != null && ` (${loc.mapX}, ${loc.mapY})`}
                </button>
              ))}
            </div>
            {mapPreviewUrl && (
              <div ref={mapImgRef} onClick={handleMapClick} className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 ${placingLocationIndex != null ? 'border-accent-400 cursor-crosshair' : 'border-border-subtle'}`}>
                <img src={mapPreviewUrl} alt="Plattegrond-preview" className="absolute inset-0 w-full h-full object-cover" />
                {draft.locations.map((loc, i) => loc.mapX != null && (
                  <div key={i} className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-accent-400 border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-accent-900" style={{ left: `${loc.mapX}%`, top: `${loc.mapY}%` }}>
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validatie */}
          <div className="border border-border-subtle rounded-2xl p-4 bg-white space-y-2">
            <h3 className="font-bold text-text-main">Controle</h3>
            {issues.length === 0 ? (
              <p className="text-sm text-success-700 flex items-center gap-1.5"><Check size={15} /> Alles compleet — de export staat hieronder klaar.</p>
            ) : (
              <ul className="space-y-1">
                {issues.map((issue, i) => (
                  <li key={i} className="text-sm text-warning-700 flex items-start gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Export */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-text-main">Export — geef deze bestanden + de Claude-opdracht aan Claude Code</h3>
              {files.map((f) => (
                <CopyBlock key={f.path} title={f.path} content={f.content} downloadName={f.path.split('/').pop()} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigatie */}
      <div className="flex justify-between mt-8">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold bg-neutral-100 text-text-main disabled:opacity-30 hover:bg-neutral-200 transition-colors">
          <ChevronLeft size={15} /> Vorige
        </button>
        <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold bg-brand-900 text-white disabled:opacity-30 hover:bg-brand-800 transition-colors">
          Volgende <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default ThemeWizard;
