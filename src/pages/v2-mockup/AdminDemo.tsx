/**
 * AdminDemo — beheerdersdashboard (V2-voorstel §3 + besluit 6).
 *
 * Thema's beheren zonder code (status, seizoen, volgorde, versies, controles),
 * de geïntegreerde Editor (hotspots, geluiden, kaart, beelden — de huidige
 * /editor, nu binnen het dashboard) en de vragenbank van de Luisterspiegel. Alle thema-gegevens hier zijn
 * VOORBEELDDATA; de vragenbank is echt gekoppeld aan het tabblad Luisterspiegel.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown, ArrowUp, BarChart3, BookOpen, CheckCircle2, CircleAlert, Eye, Image as ImageIcon,
  LayoutGrid, MessageCircleQuestion, Palette, PencilRuler, Plus, Rocket, Trash2, Upload, Undo2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { SAMPLES } from './shared';
import { RULE_LABELS, type MirrorQuestion, type MirrorRule } from './engine';
import AdminEditor from './AdminEditor';

type Section = 'themes' | 'editor' | 'questions' | 'storyboards' | 'lessons' | 'stats';
type Status = 'published' | 'draft' | 'hidden';

interface ThemeRow {
  id: string;
  name: string;
  status: Status;
  season: string;
  version: number;
  locations: number;
  sounds: number;
  cover: string | null;
  issues: number;
}

const INITIAL_THEMES: ThemeRow[] = [
  { id: 'basis', name: 'Stad', status: 'published', season: 'Hele jaar', version: 7, locations: 5, sounds: 30, cover: '/images/themes/basis/plattegrond.jpg', issues: 0 },
  { id: 'winterspelen', name: 'Winterspelen', status: 'published', season: '15 nov – 15 mrt', version: 3, locations: 4, sounds: 24, cover: '/images/themes/winterspelen/winterdorp.jpg', issues: 0 },
  { id: 'piraten', name: 'Piraten', status: 'hidden', season: 'Hele jaar', version: 2, locations: 5, sounds: 30, cover: null, issues: 0 },
  { id: 'sinterklaas', name: 'Sinterklaas', status: 'draft', season: '10 nov – 6 dec', version: 0, locations: 4, sounds: 18, cover: null, issues: 3 },
  { id: 'kerst', name: 'Kerst', status: 'draft', season: '1 dec – 6 jan', version: 0, locations: 2, sounds: 9, cover: null, issues: 5 },
  { id: 'griezel', name: 'Griezelen', status: 'draft', season: '1 okt – 5 nov', version: 0, locations: 0, sounds: 0, cover: null, issues: 0 },
];

const STATUS_STYLE: Record<Status, [string, string]> = {
  published: ['Gepubliceerd', 'bg-success-100 text-success-700'],
  draft: ['Concept', 'bg-warning-100 text-warning-800'],
  hidden: ['Verborgen', 'bg-neutral-200 text-neutral-700'],
};

const NAV: Array<[Section, string, typeof Palette]> = [
  ['themes', "Thema's", Palette],
  ['editor', 'Editor', PencilRuler],
  ['storyboards', 'Storyboards & platen', ImageIcon],
  ['lessons', 'Leskaarten', BookOpen],
  ['questions', 'Reflectievragen', MessageCircleQuestion],
  ['stats', 'Statistieken', BarChart3],
];

interface Props {
  questions: MirrorQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<MirrorQuestion[]>>;
}

export default function AdminDemo({ questions, setQuestions }: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('themes');
  const [themes, setThemes] = useState(INITIAL_THEMES);
  const [selectedId, setSelectedId] = useState('sinterklaas');
  const selected = themes.find((th) => th.id === selectedId) ?? themes[0];

  const move = (index: number, dir: -1 | 1) => {
    setThemes((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const setStatus = (id: string, status: Status) => {
    setThemes((prev) => prev.map((th) => (th.id === id
      ? { ...th, status, version: status === 'published' && th.status === 'draft' ? th.version + 1 : th.version }
      : th)));
  };

  // --- Thema's ---

  const themesView = (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main mr-auto">Thema's</h2>
          <button type="button" className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border-2 border-border-subtle font-bold text-sm">
            <Upload size={16} /> Themapakket importeren
          </button>
          <button type="button" className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-accent-400 text-brand-900 font-extrabold text-sm">
            <Plus size={16} /> Nieuw thema
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-border-subtle divide-y divide-border-subtle overflow-hidden">
          {themes.map((th, i) => {
            const [label, style] = STATUS_STYLE[th.status];
            return (
              <div
                key={th.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(th.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(th.id); }}
                className={cn('flex items-center gap-3 p-3 cursor-pointer hover:bg-neutral-50', th.id === selected.id && 'bg-accent-50 hover:bg-accent-50')}
              >
                <div className="flex flex-col">
                  <button type="button" aria-label="Omhoog" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, -1); }} className="w-8 h-6 flex items-center justify-center rounded text-text-muted hover:bg-neutral-200 disabled:opacity-25"><ArrowUp size={14} /></button>
                  <button type="button" aria-label="Omlaag" disabled={i === themes.length - 1} onClick={(e) => { e.stopPropagation(); move(i, 1); }} className="w-8 h-6 flex items-center justify-center rounded text-text-muted hover:bg-neutral-200 disabled:opacity-25"><ArrowDown size={14} /></button>
                </div>
                <div className="w-20 aspect-video rounded-lg bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center text-neutral-400">
                  {th.cover ? <img src={th.cover} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-text-main truncate">{th.name}</p>
                  <p className="text-sm text-text-muted truncate">{th.season} · {th.locations} plekken · {th.sounds} geluiden</p>
                </div>
                {th.issues > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-error-600"><CircleAlert size={16} /> {th.issues}</span>
                )}
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap', style)}>{label}</span>
                <span className="hidden md:inline text-sm text-text-muted tabular-nums w-8 text-right">v{th.version}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-text-muted">Voorbeelddata. Volgorde = volgorde in de thema-kiezer van leerlingen.</p>
      </div>

      {/* Detail */}
      <div className="rounded-2xl bg-white border border-border-subtle p-4 sm:p-5 flex flex-col gap-4 self-start">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-extrabold tracking-tight text-text-main">{selected.name}</h3>
            <p className="text-sm text-text-muted">Versie {selected.version} · {STATUS_STYLE[selected.status][0]}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={() => setSection('editor')} className="inline-flex items-center gap-1.5 h-11 px-3 rounded-full bg-brand-900 text-white text-sm font-bold">
              <PencilRuler size={16} /> Open in editor
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 h-11 px-3 rounded-full border-2 border-border-subtle text-sm font-bold">
              <Eye size={16} /> Bekijk als leerling
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold text-text-muted">
            Zichtbaar van
            <input type="text" defaultValue={selected.season.split(' – ')[0]} key={selected.id + 'a'} className="h-11 px-3 rounded-lg border-2 border-border-subtle text-text-main font-semibold" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold text-text-muted">
            tot en met
            <input type="text" defaultValue={selected.season.split(' – ')[1] ?? ''} key={selected.id + 'b'} placeholder="—" className="h-11 px-3 rounded-lg border-2 border-border-subtle text-text-main font-semibold" />
          </label>
        </div>

        <div>
          <p className="text-sm font-bold text-text-muted mb-2">Automatische controles</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {[
              ['Alle beelden exact 16:9, in AVIF + WebP', selected.issues < 5],
              ['Geluidssterkte gelijkgetrokken', selected.issues < 3],
              ['Loops precies 8,0 s', true],
              ['Bron + licentie bij elk geluid', selected.issues === 0],
              ['Hotspots binnen de veilige zone, niet over elkaar', selected.issues < 2],
              ['Teksten compleet in NL en EN', selected.issues === 0],
            ].map(([label, ok]) => (
              <li key={String(label)} className="flex items-center gap-2">
                {ok ? <CheckCircle2 size={18} className="text-success-600 shrink-0" /> : <CircleAlert size={18} className="text-error-600 shrink-0" />}
                <span className={ok ? 'text-text-main' : 'text-error-700 font-semibold'}>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold text-text-muted mb-2">Geluiden (uittreksel)</p>
          <div className="rounded-xl border border-border-subtle overflow-hidden text-sm">
            {SAMPLES.slice(0, 4).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 border-b border-border-subtle last:border-b-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-semibold text-text-main truncate flex-1">{t(s.name)}</span>
                <span className="text-text-muted tabular-nums">{s.duration.toFixed(1)} s</span>
                <span className="text-text-muted tabular-nums hidden sm:inline">−{16 + i} LUFS</span>
                <span className="text-text-muted hidden sm:inline">CC0</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {selected.status === 'published' ? (
            <button type="button" onClick={() => setStatus(selected.id, 'hidden')} className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full border-2 border-border-subtle font-bold">
              Verbergen
            </button>
          ) : (
            <button
              type="button"
              disabled={selected.issues > 0}
              onClick={() => setStatus(selected.id, 'published')}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-success-600 text-white font-extrabold disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              <Rocket size={18} /> {selected.issues > 0 ? `Los eerst ${selected.issues} punten op` : 'Publiceren'}
            </button>
          )}
          <button type="button" className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full border-2 border-border-subtle font-bold text-sm">
            <Undo2 size={16} /> Vorige versie
          </button>
        </div>
      </div>
    </div>
  );

  // --- Reflectievragen ---

  const update = (id: string, patch: Partial<MirrorQuestion>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const questionsView = (
    <div className="flex flex-col gap-3 max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main">Reflectievragen</h2>
          <p className="text-sm text-text-muted">De Luisterspiegel kiest per soundscape passende vragen. Meer vragen per regel = meer afwisseling.</p>
        </div>
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, { id: `q${Date.now()}`, rule: 'always', text: 'Nieuwe vraag', active: true }])}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-accent-400 text-brand-900 font-extrabold text-sm"
        >
          <Plus size={16} /> Nieuwe vraag
        </button>
      </div>
      <p className="text-sm text-text-muted rounded-xl bg-accent-50 border border-accent-100 px-3 py-2">
        Plaatshouders: <code className="font-mono font-bold">{'{deel}'}</code> = nummer van het deel · <code className="font-mono font-bold">{'{geluid}'}</code> = naam van het geluid.
        Wijzigingen zie je direct in het tabblad Luisterspiegel.
      </p>
      <div className="rounded-2xl bg-white border border-border-subtle divide-y divide-border-subtle">
        {questions.map((q) => (
          <div key={q.id} className={cn('flex flex-col lg:flex-row lg:items-center gap-2 p-3', !q.active && 'opacity-55')}>
            <select
              value={q.rule}
              onChange={(e) => update(q.id, { rule: e.target.value as MirrorRule })}
              aria-label="Wanneer past deze vraag"
              className="h-11 px-2 rounded-lg border-2 border-border-subtle bg-white text-sm font-semibold text-text-main lg:w-60 shrink-0"
            >
              {(Object.keys(RULE_LABELS) as MirrorRule[]).map((r) => <option key={r} value={r}>{RULE_LABELS[r]}</option>)}
            </select>
            <input
              type="text"
              value={q.text}
              onChange={(e) => update(q.id, { text: e.target.value })}
              aria-label="Vraagtekst"
              className="h-11 px-3 rounded-lg border-2 border-border-subtle flex-1 min-w-0 text-text-main"
            />
            <div className="flex items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-2 h-11 px-2 text-sm font-bold text-text-muted cursor-pointer">
                <input type="checkbox" checked={q.active} onChange={(e) => update(q.id, { active: e.target.checked })} className="w-5 h-5 accent-[var(--color-success-600)]" />
                Actief
              </label>
              <button type="button" aria-label="Vraag verwijderen" onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))} className="w-11 h-11 flex items-center justify-center rounded-full text-error-600 hover:bg-error-50">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const placeholder = (title: string, body: string) => (
    <div className="rounded-2xl border-2 border-dashed border-neutral-300 p-10 text-center max-w-2xl">
      <LayoutGrid size={32} className="mx-auto text-neutral-400 mb-3" />
      <h2 className="text-xl font-extrabold text-text-main">{title}</h2>
      <p className="text-text-muted mt-1">{body}</p>
    </div>
  );

  return (
    <div className="bg-bg-app flex flex-col md:flex-row min-h-dvh">
      <nav className="md:w-60 shrink-0 bg-brand-900 text-white p-3 flex md:flex-col gap-1 overflow-x-auto">
        <p className="hidden md:block px-3 pt-2 pb-3 font-extrabold tracking-tight">SoundScout · Beheer</p>
        {NAV.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn('inline-flex items-center gap-2.5 h-11 px-3 rounded-xl text-sm font-bold whitespace-nowrap', section === id ? 'bg-accent-400 text-brand-900' : 'text-brand-200 hover:bg-white/10')}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-w-0 p-4 sm:p-6">
        {section === 'themes' && themesView}
        {section === 'editor' && <AdminEditor />}
        {section === 'questions' && questionsView}
        {section === 'storyboards' && placeholder('Storyboards & platen', 'Zelfde opzet als thema’s: concept → controles → publiceren. Nog niet uitgewerkt in deze mockup.')}
        {section === 'lessons' && placeholder('Leskaarten', 'Ingebouwde leskaarten beheren. Nog niet uitgewerkt in deze mockup.')}
        {section === 'stats' && placeholder('Statistieken', 'Het bestaande statistiekenpaneel verhuist hierheen.')}
      </div>
    </div>
  );
}
