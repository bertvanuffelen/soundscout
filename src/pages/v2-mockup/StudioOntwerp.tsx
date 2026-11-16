/**
 * StudioOntwerp — klikbare mockup van de studio-designronde (november 2026),
 * op /v2-mockup?view=studio-ontwerp. Geen productiecode: eigen lichte
 * audiomotor (liteAudio), geen stores, niets wordt opgeslagen.
 *
 * Vijf punten uit Berts lijst:
 *  1. Sequencer-flow: eerst kiezen (Ritme of Melodie, daarna vast), een lege
 *     sequence komt nooit in de bibliotheek, en een duidelijke knop "Klaar".
 *  2. "+ Geluidseffect": kies een geluid uit je bibliotheek → Vervormen →
 *     "Klaar" → een nieuw, herbruikbaar effectgeluid in de bibliotheek.
 *  3. Vaste maakbalk vooraan in de bibliotheek: Verzamel meer geluiden ·
 *     + Sequence · + Geluidseffect.
 *  4. Eén letterschaal: 4 maten (12 · 14 · 16 · 20 px), 2 diktes.
 *  5. Donker kader (kop + afspeelbalk in brand-900), licht werkvlak.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, Check, Drum, Grid3x3, Map as MapIcon, Music, Pause, Play, Plus,
  Repeat, SkipBack, Type, Wand2, X,
} from 'lucide-react';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { SAMPLES, sampleToSound, textOn, toLite, type MockSound } from './shared';
import { BEAT_SEC, getCtx, getMaster, playBuffer, resolveBuffer, unlockAudio, previewSound, stopPreview } from './liteAudio';
import { NOTES, NOTE_COLORS, SEQ_STEPS, scheduleNote, type Fx } from './engine';
import FxModal from './FxModal';

// --- 4. Letterschaal: de enige vier stijlen in deze mockup -------------------
// label 12 · tekst 14 · kop 16 · titel 20 — gewichten 600 (semibold) en 800 (extrabold)
const TYPE = {
  label: 'text-xs font-extrabold uppercase tracking-wide',
  body: 'text-sm font-semibold',
  head: 'text-base font-extrabold',
  title: 'text-xl font-extrabold',
} as const;

const KEYFRAMES = `
@keyframes so-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
@keyframes so-toast { 0% { transform: translate(-50%, 12px); opacity: 0; } 12% { transform: translate(-50%, 0); opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .so-anim { animation: none !important; } }
`;

const TOTAL_BEATS = 32;
const TRACKS = 4;
const SEQ_COLORS = ['#F59E0B', '#D97706', '#FBBF24', '#B45309'];

type SeqKind = 'rhythm' | 'melody';
interface SeqDraft {
  id: string;
  name: string;
  kind: SeqKind;
  color: string;
  rows: Array<{ soundId: string | null; steps: boolean[] }>;
  melody: boolean[][];
}
interface FxSound extends MockSound {
  sourceId: string;
  fx: Fx;
}
interface TimelineClip {
  id: string;
  soundId: string;
  track: number;
  beat: number;
  beats: number;
}

let idCounter = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
const emptySteps = () => Array.from({ length: SEQ_STEPS }, () => false);

function isEmptySeq(s: SeqDraft): boolean {
  return s.kind === 'melody'
    ? s.melody.every((r) => r.every((x) => !x))
    : s.rows.every((r) => r.steps.every((x) => !x));
}

export default function StudioOntwerp() {
  const { t } = useTranslation();

  // --- Bibliotheek: vijf geluiden uit de basiswereld ---
  const baseSounds = useMemo<MockSound[]>(() => {
    const picked = SAMPLES.filter((s) => s.audioUrl).slice(0, 5);
    return picked.map((s) => sampleToSound(s, t(s.name)));
  }, [t]);
  const [fxSounds, setFxSounds] = useState<FxSound[]>([]);
  const [sequences, setSequences] = useState<SeqDraft[]>([]);
  const allSounds = useMemo(() => [...baseSounds, ...fxSounds], [baseSounds, fxSounds]);
  const soundById = useCallback((id: string) => allSounds.find((s) => s.id === id), [allSounds]);

  const [clips] = useState<TimelineClip[]>(() => [
    { id: 'c1', soundId: baseSounds[0]?.id ?? '', track: 0, beat: 0, beats: 4 },
    { id: 'c2', soundId: baseSounds[1]?.id ?? '', track: 1, beat: 3, beats: 3 },
    { id: 'c3', soundId: baseSounds[2]?.id ?? '', track: 2, beat: 6, beats: 5 },
  ]);

  // --- Ontwerpschakelaars (alleen voor de vergelijking) ---
  const [darkFrame, setDarkFrame] = useState(true);
  const [showScale, setShowScale] = useState(false);

  // --- Flows ---
  const [kindPickerOpen, setKindPickerOpen] = useState(false);
  const [editing, setEditing] = useState<SeqDraft | null>(null);
  const [isNewDraft, setIsNewDraft] = useState(false);
  const [fxPickerOpen, setFxPickerOpen] = useState(false);
  const [fxSource, setFxSource] = useState<MockSound | null>(null);
  const [popId, setPopId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const say = (text: string) => setToast({ id: Date.now(), text });
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  // --- Tijdlijn afspelen (eenvoudig: buffers op hun tel) ---
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const sources = useRef<AudioBufferSourceNode[]>([]);
  const startRef = useRef(0);
  const stopAll = () => {
    for (const s of sources.current) { try { s.stop(); } catch { /* al gestopt */ } }
    sources.current = [];
  };
  const togglePlay = async () => {
    if (playing) { stopAll(); setPlaying(false); return; }
    await unlockAudio();
    const ctx = getCtx();
    const when0 = ctx.currentTime + 0.08;
    startRef.current = when0;
    for (const c of clips) {
      const snd = soundById(c.soundId);
      if (!snd) continue;
      const buf = await resolveBuffer(toLite(snd));
      if (buf) sources.current.push(playBuffer(buf, { when: when0 + c.beat * BEAT_SEC, gain: 0.85 }));
    }
    setPlaying(true);
  };
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const b = (getCtx().currentTime - startRef.current) / BEAT_SEC;
      if (b >= 14) { stopAll(); setPlaying(false); setBeat(0); return; }
      setBeat(Math.max(0, b));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // --- 1. Sequencer-flow ---
  const startSequence = (kind: SeqKind) => {
    setKindPickerOpen(false);
    stopAll(); setPlaying(false);
    const n = sequences.length + 1;
    setEditing({
      id: newId('seq'),
      name: kind === 'rhythm' ? `Ritme ${n}` : `Melodie ${n}`,
      kind,
      color: SEQ_COLORS[sequences.length % SEQ_COLORS.length],
      rows: [0, 1, 2].map((i) => ({ soundId: allSounds[i]?.id ?? null, steps: emptySteps() })),
      melody: NOTES.map(() => emptySteps()),
    });
    setIsNewDraft(true);
  };
  const finishSequence = (draft: SeqDraft) => {
    setEditing(null);
    if (isEmptySeq(draft)) {
      if (isNewDraft) say('Er stond nog niets in, dus er is niets bewaard.');
      else {
        setSequences((prev) => prev.filter((s) => s.id !== draft.id));
        say('Lege sequence weggehaald uit je bibliotheek.');
      }
      return;
    }
    setSequences((prev) => (prev.some((s) => s.id === draft.id)
      ? prev.map((s) => (s.id === draft.id ? draft : s))
      : [...prev, draft]));
    setPopId(draft.id);
    say(`${draft.name} staat in je bibliotheek.`);
  };

  // --- 2. Geluidseffect-flow ---
  const applyFx = (fx: Fx, buffer: AudioBuffer | null) => {
    const src = fxSource;
    setFxSource(null);
    if (!src) return;
    if (!buffer) { say('Je hebt niets veranderd, dus er is geen nieuw geluid gemaakt.'); return; }
    const count = fxSounds.filter((f) => f.sourceId === src.id).length + 1;
    const made: FxSound = {
      ...src,
      id: newId('fx'),
      label: count > 1 ? `${src.label} effect ${count}` : `${src.label} effect`,
      buffer,
      url: undefined,
      duration: buffer.duration,
      sourceId: src.id,
      fx,
    };
    setFxSounds((prev) => [...prev, made]);
    setPopId(made.id);
    say(`${made.label} staat in je bibliotheek.`);
  };

  const frame = darkFrame ? 'bg-brand-900 text-white' : 'bg-bg-surface text-text-main border-border-subtle';

  return (
    <div className="h-dvh flex flex-col bg-bg-app overflow-hidden">
      <style>{KEYFRAMES}</style>

      {/* 5. Kop: donker kader */}
      <header className={cn('shrink-0 flex items-center gap-3 px-3 sm:px-5 h-14 sm:h-16', frame, !darkFrame && 'border-b')}>
        <img
          src={darkFrame ? '/images/overige/logo-soundscout-white.svg' : '/images/overige/logo-soundscout.svg'}
          alt=""
          className="h-7 sm:h-8 w-auto"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <h1 className={TYPE.title}>Studio</h1>
        <span className={cn(TYPE.body, 'hidden sm:inline', darkFrame ? 'text-brand-300' : 'text-text-muted')}>De Stad</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => say('Hier ga je naar het podium.')}
          className={cn(TYPE.body, 'inline-flex items-center gap-1.5 rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 px-4 min-h-[44px] font-extrabold')}
        >
          Naar Podium <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      {/* Bibliotheek met 3. vaste maakbalk */}
      <section className="shrink-0 px-3 sm:px-5 pt-3 pb-3 bg-bg-surface border-b border-border-subtle">
        <h2 className={cn(TYPE.label, 'text-text-muted mb-2')}>Bibliotheek</h2>
        <div className="flex flex-col lg:flex-row lg:items-start gap-3">
          {/* Maakbalk: altijd dezelfde plek, vóór de geluiden */}
          <div className="grid grid-cols-3 lg:flex gap-2 shrink-0" role="group" aria-label="Maken">
            <MakeButton icon={MapIcon} long="Verzamel meer geluiden" short="Verzamelen" onClick={() => say('Hier ga je terug naar de kaart.')} />
            <MakeButton icon={Grid3x3} long="Sequence" short="Sequence" plus onClick={() => setKindPickerOpen(true)} />
            <MakeButton icon={Wand2} long="Geluidseffect" short="Effect" plus onClick={() => setFxPickerOpen(true)} />
          </div>
          <div className="hidden lg:block w-px self-stretch bg-border-subtle" aria-hidden="true" />
          {/* Geluiden, sequences en effectgeluiden */}
          <div className="flex gap-2 overflow-x-auto lg:flex-wrap pb-1 min-w-0">
            {baseSounds.map((s) => <LibraryChip key={s.id} sound={s} />)}
            {fxSounds.map((s) => <LibraryChip key={s.id} sound={s} badge="fx" pop={popId === s.id} />)}
            {sequences.map((q) => (
              <SequenceChip key={q.id} seq={q} pop={popId === q.id} onOpen={() => { setIsNewDraft(false); setEditing(q); }} />
            ))}
          </div>
        </div>
      </section>

      {/* Werkvlak: tijdlijn óf de sequencer (vervangt de tijdlijnzone, zoals nu) */}
      <main className="flex-1 min-h-0 flex flex-col">
        {editing ? (
          <SequenceEditor
            key={editing.id}
            draft={editing}
            library={allSounds}
            onDone={finishSequence}
          />
        ) : (
          <TimelineMock clips={clips} soundById={soundById} beat={beat} />
        )}
      </main>

      {/* 5. Afspeelbalk: donker kader */}
      {!editing && (
        <footer className={cn('shrink-0 flex items-center justify-center gap-3 h-16 sm:h-[72px]', frame, !darkFrame && 'border-t')}>
          <RoundButton label="Naar het begin" onClick={() => { stopAll(); setPlaying(false); setBeat(0); }} dark={darkFrame}><SkipBack className="w-5 h-5" /></RoundButton>
          <button
            type="button"
            onClick={() => void togglePlay()}
            aria-label={playing ? 'Pauze' : 'Afspelen'}
            className="w-14 h-14 rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 flex items-center justify-center shadow-lg"
          >
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <RoundButton label="Herhalen" onClick={() => say('Herhalen: hele soundscape of deze sectie.')} dark={darkFrame}><Repeat className="w-5 h-5" /></RoundButton>
        </footer>
      )}

      {/* Keuze: Ritme of Melodie */}
      {kindPickerOpen && (
        <Overlay title="Wat wil je maken?" onClose={() => setKindPickerOpen(false)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <KindCard icon={Drum} title="Ritme" text="Een beat met geluiden uit je bibliotheek." onClick={() => startSequence('rhythm')} />
            <KindCard icon={Music} title="Melodie" text="Een melodie met tonen die altijd mooi klinken." onClick={() => startSequence('melody')} />
          </div>
          <p className={cn(TYPE.body, 'text-text-muted mt-3 font-normal')}>Je kiest één keer. Wil je daarna het andere? Maak dan een nieuwe sequence.</p>
        </Overlay>
      )}

      {/* Geluidseffect stap 1: kies een geluid */}
      {fxPickerOpen && (
        <Overlay title="Van welk geluid maak je een effect?" onClose={() => setFxPickerOpen(false)}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allSounds.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setFxPickerOpen(false); setFxSource(s); }}
                className="flex items-center gap-2 rounded-xl border-2 border-border-subtle hover:border-accent-400 bg-bg-surface px-3 min-h-[52px] text-left"
              >
                <span className="w-2 self-stretch my-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                <SampleIcon name={s.icon} size={18} className="text-text-main shrink-0" />
                <span className={cn(TYPE.body, 'truncate')}>{s.label}</span>
              </button>
            ))}
          </div>
          <p className={cn(TYPE.body, 'text-text-muted mt-3 font-normal')}>Het oude geluid blijft gewoon staan. Je effect wordt een nieuw geluid.</p>
        </Overlay>
      )}

      {/* Geluidseffect stap 2: Vervormen (bestaand venster, knop "Klaar") */}
      {fxSource && (
        <FxModal sound={fxSource} onClose={() => setFxSource(null)} onApply={applyFx} applyLabel="Klaar" />
      )}

      {/* Melding */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className={cn(TYPE.body, 'so-anim fixed left-1/2 bottom-24 z-50 rounded-full bg-brand-900 text-white px-5 py-3 shadow-xl inline-flex items-center gap-2 max-w-[90vw]')}
          style={{ animation: 'so-toast 2.6s ease forwards' }}
        >
          <Check className="w-4 h-4 text-accent-400 shrink-0" aria-hidden="true" /> {toast.text}
        </div>
      )}

      {/* Ontwerppaneel (alleen mockup) */}
      <div className="fixed left-3 bottom-20 sm:bottom-24 z-40 flex flex-col-reverse gap-2 items-start">
        <label className={cn(TYPE.body, 'inline-flex items-center gap-2 rounded-full bg-bg-surface shadow-lg border border-border-subtle px-3 min-h-[40px] cursor-pointer')}>
          <input type="checkbox" checked={darkFrame} onChange={(e) => setDarkFrame(e.target.checked)} className="accent-accent-500" />
          Donker kader
        </label>
        <button
          type="button"
          onClick={() => setShowScale((v) => !v)}
          className={cn(TYPE.body, 'inline-flex items-center gap-2 rounded-full bg-bg-surface shadow-lg border border-border-subtle px-3 min-h-[40px]')}
        >
          <Type className="w-4 h-4" aria-hidden="true" /> Letterschaal
        </button>
        {showScale && (
          <div className="rounded-2xl bg-bg-surface shadow-xl border border-border-subtle p-4 w-64">
            <p className={cn(TYPE.label, 'text-text-muted mb-2')}>Label · 12 px</p>
            <p className={cn(TYPE.body, 'mb-2')}>Tekst · 14 px</p>
            <p className={cn(TYPE.head, 'mb-2')}>Kop · 16 px</p>
            <p className={TYPE.title}>Titel · 20 px</p>
            <p className="text-xs text-text-muted mt-3">Twee diktes: 600 en 800. Niets kleiner dan 12 px. Hoofdletters alleen voor labels.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Onderdelen ------------------------------------------------------------

function MakeButton({ icon: Icon, long, short, plus = false, onClick }: {
  icon: typeof MapIcon; long: string; short: string; plus?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        TYPE.body,
        'inline-flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 rounded-xl border-2 border-dashed border-accent-400 bg-accent-50 hover:bg-accent-100 text-accent-900 px-3 min-h-[56px] lg:min-h-[48px] font-extrabold',
      )}
    >
      <span className="inline-flex items-center gap-1">
        {plus && <Plus className="w-4 h-4" aria-hidden="true" />}
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <span className="lg:hidden text-xs">{short}</span>
      <span className="hidden lg:inline">{long}</span>
    </button>
  );
}

function LibraryChip({ sound, badge, pop = false }: { sound: MockSound; badge?: 'fx'; pop?: boolean }) {
  const [playingPreview, setPlayingPreview] = useState(false);
  const toggle = async () => {
    if (playingPreview) { stopPreview(); setPlayingPreview(false); return; }
    await unlockAudio();
    setPlayingPreview(true);
    if (sound.buffer) {
      const src = playBuffer(sound.buffer, { gain: 0.9 });
      src.onended = () => setPlayingPreview(false);
    } else {
      await previewSound(toLite(sound));
      setTimeout(() => setPlayingPreview(false), Math.min(4000, sound.duration * 1000));
    }
  };
  return (
    <div
      className={cn(
        'so-anim shrink-0 flex items-center gap-2 rounded-xl border-2 bg-bg-surface pl-2 pr-1 min-h-[48px]',
        badge === 'fx' ? 'border-dashed' : 'border-brand-900',
      )}
      style={{ borderColor: badge === 'fx' ? sound.color : undefined, animation: pop ? 'so-pop 0.5s ease' : undefined }}
    >
      <span className="w-1.5 h-7 rounded-full" style={{ backgroundColor: sound.color }} aria-hidden="true" />
      {badge === 'fx'
        ? <Wand2 className="w-4 h-4 text-text-main" aria-label="Effectgeluid" />
        : <SampleIcon name={sound.icon} size={18} className="text-text-main" />}
      <span className={cn(TYPE.body, 'whitespace-nowrap')}>{sound.label}</span>
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={playingPreview ? `Stop ${sound.label}` : `Luister naar ${sound.label}`}
        className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
      >
        {playingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
    </div>
  );
}

function SequenceChip({ seq, pop, onOpen }: { seq: SeqDraft; pop: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="so-anim shrink-0 flex items-center gap-2 rounded-xl border-2 border-dashed px-3 min-h-[48px]"
      style={{ borderColor: seq.color, backgroundColor: `${seq.color}22`, animation: pop ? 'so-pop 0.5s ease' : undefined }}
      title="Klik om te bewerken, sleep om te plaatsen"
    >
      {seq.kind === 'rhythm' ? <Drum className="w-4 h-4" aria-hidden="true" /> : <Music className="w-4 h-4" aria-hidden="true" />}
      <span className={cn(TYPE.body, 'whitespace-nowrap')}>{seq.name}</span>
      <Grid3x3 className="w-4 h-4 text-text-muted" aria-hidden="true" />
    </button>
  );
}

function TimelineMock({ clips, soundById, beat }: {
  clips: TimelineClip[]; soundById: (id: string) => MockSound | undefined; beat: number;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
      <div className="flex items-center gap-2 px-3 sm:px-5 h-11 border-b border-border-subtle">
        <h2 className={cn(TYPE.label, 'text-text-muted')}>Tijdlijn</h2>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="relative min-w-[720px]">
          {/* liniaal */}
          <div className="flex h-6 border-b border-border-subtle bg-neutral-50 pl-8">
            {Array.from({ length: TOTAL_BEATS / 2 }, (_, i) => (
              <span key={i} className="flex-1 text-xs text-text-muted border-l border-border-subtle pl-1 leading-6">{i * 2 + 1}</span>
            ))}
          </div>
          {Array.from({ length: TRACKS }, (_, track) => (
            <div key={track} className="relative flex h-14 border-b border-border-subtle">
              <span className="w-8 shrink-0 text-xs font-semibold text-text-muted flex items-center justify-center bg-neutral-50">{track + 1}</span>
              <div className="relative flex-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_calc(100%/16-1px),var(--color-neutral-200)_calc(100%/16-1px),var(--color-neutral-200)_calc(100%/16))]">
                {clips.filter((c) => c.track === track).map((c) => {
                  const snd = soundById(c.soundId);
                  if (!snd) return null;
                  return (
                    <div
                      key={c.id}
                      className="absolute top-1.5 bottom-1.5 rounded-lg px-2 flex items-center gap-1.5 shadow-sm"
                      style={{
                        left: `${(c.beat / TOTAL_BEATS) * 100}%`,
                        width: `${(c.beats / TOTAL_BEATS) * 100}%`,
                        backgroundColor: snd.color,
                        color: textOn(snd.color),
                      }}
                    >
                      <SampleIcon name={snd.icon} size={14} />
                      <span className="text-xs font-extrabold truncate">{snd.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* afspeellijn */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-error-500 pointer-events-none"
            style={{ left: `calc(2rem + (100% - 2rem) * ${beat / TOTAL_BEATS})` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

function SequenceEditor({ draft, library, onDone }: {
  draft: SeqDraft; library: MockSound[]; onDone: (d: SeqDraft) => void;
}) {
  const [seq, setSeq] = useState<SeqDraft>(draft);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(-1);
  const live = useRef(seq);
  useEffect(() => { live.current = seq; }, [seq]);
  const buffers = useRef(new Map<string, AudioBuffer>());

  useEffect(() => {
    for (const r of seq.rows) {
      const id = r.soundId;
      const snd = id ? library.find((s) => s.id === id) : undefined;
      if (id && snd && !buffers.current.has(id)) {
        void resolveBuffer(toLite(snd)).then((b) => { if (b) buffers.current.set(id, b); });
      }
    }
  }, [seq.rows, library]);

  useEffect(() => {
    if (!playing) return;
    const ctx = getCtx();
    // Zoals de echte sequencer: ritme 1 vakje = 1 tel, melodie 1 vakje = halve tel
    const stepSec = seq.kind === 'rhythm' ? BEAT_SEC : BEAT_SEC / 2;
    const start = ctx.currentTime + 0.06;
    let next = 0;
    let raf = 0;
    const tick = () => {
      while (start + next * stepSec < ctx.currentTime + 0.12) {
        const step = next % SEQ_STEPS;
        const when = start + next * stepSec;
        const cur = live.current;
        if (cur.kind === 'rhythm') {
          for (const row of cur.rows) {
            const b = row.soundId ? buffers.current.get(row.soundId) : undefined;
            if (b && row.steps[step]) playBuffer(b, { when, gain: 0.85 });
          }
        } else {
          cur.melody.forEach((row, r) => { if (row[step]) scheduleNote(ctx, getMaster(), NOTES[r][1], when); });
        }
        next += 1;
      }
      setPos(Math.floor((ctx.currentTime - start) / stepSec) % SEQ_STEPS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); setPos(-1); };
  }, [playing, seq.kind]);

  const toggleRhythm = (r: number, s: number) => setSeq((p) => ({
    ...p, rows: p.rows.map((row, i) => (i === r ? { ...row, steps: row.steps.map((x, j) => (j === s ? !x : x)) } : row)),
  }));
  const toggleNote = (r: number, s: number) => {
    setSeq((p) => ({ ...p, melody: p.melody.map((row, i) => (i === r ? row.map((x, j) => (j === s ? !x : x)) : row)) }));
    void unlockAudio().then(() => scheduleNote(getCtx(), getMaster(), NOTES[r][1], getCtx().currentTime + 0.01));
  };
  const finish = () => { setPlaying(false); onDone(seq); };
  const empty = isEmptySeq(seq);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ backgroundColor: `${seq.color}14` }}>
      {/* Werkbalk: naam + soort (vast, geen tabs) · afspelen · Klaar */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 sm:px-5 py-2 bg-bg-surface border-b border-border-subtle">
        <span className="inline-flex items-center gap-2 rounded-full px-3 min-h-[40px] border-2 border-dashed" style={{ borderColor: seq.color }}>
          {seq.kind === 'rhythm' ? <Drum className="w-4 h-4" aria-hidden="true" /> : <Music className="w-4 h-4" aria-hidden="true" />}
          <span className={TYPE.head}>{seq.name}</span>
        </span>
        <span className={cn(TYPE.label, 'text-text-muted')}>{seq.kind === 'rhythm' ? 'Ritme' : 'Melodie'}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={async () => { await unlockAudio(); setPlaying((v) => !v); }}
          className={cn(TYPE.body, 'inline-flex items-center gap-1.5 rounded-full border-2 border-border-subtle bg-bg-surface hover:bg-neutral-50 px-4 min-h-[44px] font-extrabold')}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {playing ? 'Stop' : 'Luister'}
        </button>
        <button
          type="button"
          onClick={finish}
          className={cn(TYPE.body, 'inline-flex items-center gap-1.5 rounded-full bg-accent-400 hover:bg-accent-500 text-accent-900 px-5 min-h-[44px] font-extrabold')}
        >
          <Check className="w-4 h-4" aria-hidden="true" /> Klaar
        </button>
        <button type="button" onClick={finish} aria-label="Sluiten" className="w-11 h-11 rounded-full hover:bg-neutral-100 flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className={cn(TYPE.body, 'px-3 sm:px-5 pt-2 font-normal text-text-muted')}>
        {empty
          ? 'Klik in de vakjes. Een lege sequence wordt niet bewaard.'
          : 'Alles wordt meteen bewaard. Klik op Klaar om terug te gaan naar de tijdlijn.'}
      </p>

      <div className="flex-1 min-h-0 overflow-auto px-3 sm:px-5 py-3">
        <div className="min-w-[640px] flex flex-col gap-1.5">
          {seq.kind === 'rhythm'
            ? seq.rows.map((row, r) => (
              <div key={r} className="flex items-center gap-2">
                <select
                  value={row.soundId ?? ''}
                  onChange={(e) => setSeq((p) => ({ ...p, rows: p.rows.map((x, i) => (i === r ? { ...x, soundId: e.target.value || null } : x)) }))}
                  className={cn(TYPE.body, 'w-40 shrink-0 rounded-xl border-2 border-border-subtle bg-bg-surface px-2 min-h-[44px]')}
                  aria-label={`Geluid voor rij ${r + 1}`}
                >
                  <option value="">Kies een geluid</option>
                  {library.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${SEQ_STEPS}, minmax(0, 1fr))` }}>
                  {row.steps.map((on, s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleRhythm(r, s)}
                      aria-pressed={on}
                      aria-label={`Rij ${r + 1}, tel ${s + 1}`}
                      className={cn('h-11 rounded-lg border-2 transition-colors', s % 4 === 0 ? 'border-neutral-300' : 'border-neutral-200', pos === s && 'ring-2 ring-error-500')}
                      style={{ backgroundColor: on ? (library.find((x) => x.id === row.soundId)?.color ?? seq.color) : '#fff' }}
                    />
                  ))}
                </div>
              </div>
            ))
            : seq.melody.map((row, r) => (
              <div key={r} className="flex items-center gap-2">
                <span className={cn(TYPE.head, 'w-10 shrink-0 text-center')} style={{ color: NOTE_COLORS[r] }}>{NOTES[r][0]}</span>
                <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${SEQ_STEPS}, minmax(0, 1fr))` }}>
                  {row.map((on, s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleNote(r, s)}
                      aria-pressed={on}
                      aria-label={`Toon ${NOTES[r][0]}, vakje ${s + 1}`}
                      className={cn('h-10 rounded-lg border-2 transition-colors', s % 4 === 0 ? 'border-neutral-300' : 'border-neutral-200', pos === s && 'ring-2 ring-error-500')}
                      style={{ backgroundColor: on ? NOTE_COLORS[r] : '#fff' }}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function KindCard({ icon: Icon, title, text, onClick }: { icon: typeof Drum; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl border-2 border-border-subtle hover:border-accent-400 bg-bg-surface p-4 text-left min-h-[120px]"
    >
      <span className="w-12 h-12 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center"><Icon className="w-6 h-6" aria-hidden="true" /></span>
      <span className={TYPE.head}>{title}</span>
      <span className={cn(TYPE.body, 'font-normal text-text-muted')}>{text}</span>
    </button>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-brand-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-bg-surface w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <h2 className={cn(TYPE.title, 'flex-1')}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="w-11 h-11 rounded-full hover:bg-neutral-100 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RoundButton({ label, onClick, dark, children }: { label: string; onClick: () => void; dark: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('w-12 h-12 rounded-full flex items-center justify-center', dark ? 'bg-brand-800 text-white hover:bg-brand-700' : 'bg-neutral-100 text-text-main hover:bg-neutral-200')}
    >
      {children}
    </button>
  );
}
