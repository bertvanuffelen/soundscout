/**
 * SequencerPanel — de sequencer als VAST PANEEL dat de tijdlijnzone vervangt,
 * precies zoals in productie (Berts besluit: geen modal — een instrument hoort
 * verankerd onderin). Nieuw in V2: twee tabs in het paneel.
 *  - Ritme:   de bestaande stap-sequencer (1 vakje = 1 tel, 16 vakjes), met
 *             ALLEEN geluiden uit de eigen bibliotheek;
 *  - Melodie: de melodiemaker (pentatonisch, synth-klank), 1 vakje = halve tel.
 *
 * Afspelen loopt via de gewone transportknop van de studio (modus-bewust, zoals
 * productie). Sluiten van de tab bewaart het patroon in de sequence-chip.
 */

import { useEffect, useRef, useState } from 'react';
import { Drum, Grid3x3, Music, Trash2, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { MockSound } from './shared';
import { getCtx, getMaster, playBuffer, unlockAudio } from './liteAudio';
import {
  MELODY_STEP_SEC, NOTES, NOTE_COLORS, RHYTHM_STEP_SEC, SEQ_STEPS,
  renderSequence, scheduleNote, type MockSequence, type RhythmRow, type SequenceKind,
} from './engine';

interface Props {
  library: MockSound[];
  sequence: MockSequence;
  /** Gestuurd door de transportknop van de studio. */
  playing: boolean;
  dark: boolean;
  getBuffer: (soundId: string) => Promise<AudioBuffer | null>;
  /** Tab sluiten: het bijgewerkte patroon (incl. gerenderde buffer) terug. */
  onClose: (sequence: MockSequence) => void;
  onDelete: (id: string) => void;
}

export default function SequencerPanel({ library, sequence, playing, dark, getBuffer, onClose, onDelete }: Props) {
  const [kind, setKind] = useState<SequenceKind>(sequence.kind);
  const [name, setName] = useState(sequence.name);
  const [rows, setRows] = useState<RhythmRow[]>(() =>
    sequence.rows.map((r, i) => ({ ...r, soundId: r.soundId ?? library[i]?.id ?? null })),
  );
  const [melody, setMelody] = useState<boolean[][]>(sequence.melody);
  const [pos, setPos] = useState(-1);
  const [closing, setClosing] = useState(false);

  const live = useRef({ rows, melody, kind });
  const buffers = useRef(new Map<string, AudioBuffer>());

  useEffect(() => {
    live.current = { rows, melody, kind };
  }, [rows, melody, kind]);

  // Buffers van de gekozen rijgeluiden klaarzetten
  useEffect(() => {
    for (const row of rows) {
      if (row.soundId && !buffers.current.has(row.soundId)) {
        const id = row.soundId;
        void getBuffer(id).then((b) => { if (b) buffers.current.set(id, b); });
      }
    }
  }, [rows, getBuffer]);

  // Rondlopend afspelen: eigen kleine lookahead-planner op de audioklok
  useEffect(() => {
    if (!playing) return;
    const ctx = getCtx();
    const start = ctx.currentTime + 0.06;
    let next = 0;
    const stepSec = () => (live.current.kind === 'rhythm' ? RHYTHM_STEP_SEC : MELODY_STEP_SEC);
    const tick = () => {
      while (start + next * stepSec() < ctx.currentTime + 0.12) {
        const step = next % SEQ_STEPS;
        const when = start + next * stepSec();
        if (live.current.kind === 'rhythm') {
          for (const row of live.current.rows) {
            const buffer = row.soundId ? buffers.current.get(row.soundId) : undefined;
            if (buffer && row.steps[step]) playBuffer(buffer, { when, gain: 0.85 });
          }
        } else {
          live.current.melody.forEach((row, r) => {
            if (row[step]) scheduleNote(ctx, getMaster(), NOTES[r][1], when);
          });
        }
        next += 1;
      }
      setPos(Math.floor(Math.max(0, ctx.currentTime - start) / stepSec()) % SEQ_STEPS);
    };
    tick();
    const timer = window.setInterval(tick, 30);
    return () => {
      window.clearInterval(timer);
      setPos(-1);
    };
  }, [playing, kind]);

  const toggleRhythm = (r: number, s: number) => {
    const row = rows[r];
    if (!row.soundId) return;
    if (!row.steps[s]) {
      const buffer = buffers.current.get(row.soundId);
      if (buffer && !playing) void unlockAudio().then(() => playBuffer(buffer, { maxDuration: 1.2 }));
    }
    setRows((prev) => prev.map((x, i) => (i === r ? { ...x, steps: x.steps.map((v, j) => (j === s ? !v : v)) } : x)));
  };

  const toggleMelody = (r: number, s: number) => {
    if (!melody[r][s] && !playing) void unlockAudio().then(() => scheduleNote(getCtx(), getMaster(), NOTES[r][1], getCtx().currentTime));
    setMelody((prev) => prev.map((row, i) => (i === r ? row.map((v, j) => (j === s ? !v : v)) : row)));
  };

  const close = async () => {
    if (closing) return;
    setClosing(true);
    const base = { kind, rows, melody };
    const buffer = await renderSequence(base, getBuffer);
    onClose({ ...sequence, ...base, name: name.trim() || sequence.name, buffer });
  };

  const TABS: Array<[SequenceKind, string, typeof Drum]> = [['rhythm', 'Ritme', Drum], ['melody', 'Melodie', Music]];
  const bar = dark ? 'bg-brand-800 border-brand-700' : 'bg-bg-surface border-border-subtle';
  const muted = dark ? 'text-brand-300' : 'text-text-muted';

  return (
    <div className="flex flex-col shrink-0 max-h-[50dvh]" role="region" aria-label="Sequencer">
      {/* Werkbalk: "Tijdlijn | naam ✕" links (zoals productie) + de nieuwe tabs */}
      <div className={cn('flex flex-wrap items-center gap-2 px-2 sm:px-4 py-1 border-b', bar)}>
        <button type="button" onClick={() => void close()} className={cn('text-xs font-bold uppercase tracking-wide shrink-0 hover:underline', muted)}>
          Tijdlijn
        </button>
        <span
          className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md text-xs font-bold"
          style={{ backgroundColor: `${sequence.color}33`, color: dark ? '#fff' : undefined }}
        >
          <Grid3x3 size={12} style={{ color: sequence.color }} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Naam van de sequence"
            className="w-24 bg-transparent outline-none font-bold"
          />
          <button type="button" onClick={() => void close()} aria-label="Sequencer sluiten" className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10">
            <X size={12} />
          </button>
        </span>

        <div className={cn('flex rounded-lg p-0.5 ml-2', dark ? 'bg-brand-700' : 'bg-neutral-100')} role="tablist">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => setKind(id)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-bold transition-colors',
                kind === id ? 'bg-white text-text-main shadow' : cn(muted, 'hover:opacity-80'),
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <button type="button" onClick={() => onDelete(sequence.id)} title="Sequence verwijderen" className="w-8 h-8 flex items-center justify-center rounded-lg text-error-500 hover:bg-error-50">
          <Trash2 size={16} />
        </button>
        <span className={cn('text-xs tabular-nums', muted)}>
          {kind === 'rhythm' ? '16 tellen · 4 maten' : '16 vakjes · 2 maten'}
        </span>
      </div>

      {/* Raster — vult de tijdlijnzone */}
      <div className={cn('overflow-auto min-h-0 flex-1 p-2 sm:p-3', dark ? 'bg-brand-900' : 'bg-neutral-100')}>
        {kind === 'rhythm' ? (
          library.length === 0 ? (
            <p className={cn('py-8 text-center text-sm', muted)}>
              Je bibliotheek is leeg. Verzamel eerst geluiden; daarmee bouw je een ritme.
            </p>
          ) : (
            <div className="flex flex-col gap-2 min-w-[720px]">
              {rows.map((row, r) => {
                const sound = library.find((s) => s.id === row.soundId);
                return (
                  <div key={r} className="flex items-center gap-3">
                    <select
                      value={row.soundId ?? ''}
                      onChange={(e) => setRows((prev) => prev.map((x, i) => (i === r ? { ...x, soundId: e.target.value || null } : x)))}
                      aria-label={`Geluid voor spoor ${r + 1}`}
                      className="w-40 shrink-0 h-11 px-2 rounded-lg border-2 bg-white text-sm font-semibold text-text-main"
                      style={{ borderColor: sound?.color ?? 'var(--color-border-subtle)' }}
                    >
                      <option value="">Kies een geluid</option>
                      {library.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${SEQ_STEPS}, minmax(0, 1fr))` }}>
                      {row.steps.map((on, s) => (
                        <button
                          key={s}
                          type="button"
                          aria-label={`Spoor ${r + 1}, tel ${s + 1}`}
                          aria-pressed={on}
                          disabled={!row.soundId}
                          onClick={() => toggleRhythm(r, s)}
                          className={cn(
                            'h-11 rounded-lg border-2 transition-transform active:scale-90 disabled:opacity-40',
                            !on && 'bg-white border-neutral-200',
                            s % 4 === 0 && s > 0 && 'ml-1.5',
                            pos === s && 'ring-2 ring-brand-900',
                          )}
                          style={on ? { backgroundColor: sound?.color, borderColor: sound?.color } : undefined}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="rounded-xl bg-brand-900 p-2 min-w-[720px]">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `2rem repeat(${SEQ_STEPS}, minmax(0, 1fr))` }}>
              {NOTES.map(([note], r) => (
                <div key={note} className="contents">
                  <span className="flex items-center justify-center text-sm font-bold text-brand-300">{note}</span>
                  {melody[r].map((on, s) => (
                    <button
                      key={s}
                      type="button"
                      aria-label={`${note}, vakje ${s + 1}`}
                      aria-pressed={on}
                      onClick={() => toggleMelody(r, s)}
                      className={cn(
                        'h-9 rounded-lg transition-transform active:scale-90',
                        !on && (s % 4 === 0 ? 'bg-white/20' : 'bg-white/10'),
                        pos === s && 'ring-2 ring-accent-400',
                      )}
                      style={on ? { backgroundColor: NOTE_COLORS[r] } : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
