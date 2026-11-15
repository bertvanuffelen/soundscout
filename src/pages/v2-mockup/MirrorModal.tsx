/**
 * Luisterspiegel — vormkaart + reflectievragen.
 *
 *  - MirrorContent: de inhoud zelf. Staat als vast onderdeel OP HET PODIUM
 *    (Berts besluit: geen blokkerende modal tussen studio en podium), vlak
 *    vóór het inleveren. De vragen zijn altijd over te slaan.
 *  - MirrorModal (default): dezelfde inhoud als vrijwillige blik vanuit het
 *    spiegel-icoon in de tijdlijn-werkbalk van de studio.
 *
 * 100% lokaal en op regels (besluit 4): alleen de clips worden gelezen.
 */

import { useMemo, useState } from 'react';
import { Check, FlipHorizontal2, Pencil, RefreshCw, X } from 'lucide-react';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { textOn, type MockSound } from './shared';
import {
  MIRROR_PARTS, analyseMirror, pickQuestions, type MirrorClip, type MirrorQuestion,
} from './engine';

export interface MirrorData {
  clips: MirrorClip[];
  /** Spoor per clip (zelfde volgorde als `clips`), voor de vormkaart. */
  tracks: number[];
  lookup: (soundId: string) => MockSound | undefined;
}

type Answer = 'yes' | 'change';

interface ContentProps extends MirrorData {
  questions: MirrorQuestion[];
  /** Meldt of de leerling bij een vraag "Ik pas het aan" koos. */
  onWantsChange?: (wants: boolean) => void;
  /** Donkere variant voor op het podium. */
  onDark?: boolean;
}

export function MirrorContent({ clips, tracks, lookup, questions, onWantsChange, onDark = false }: ContentProps) {
  const [roll, setRoll] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const analysis = useMemo(() => analyseMirror(clips), [clips]);
  const picked = useMemo(() => pickQuestions(questions, analysis, roll), [questions, analysis, roll]);

  const fill = (q: MirrorQuestion) =>
    q.text
      .replace('{deel}', String(((q.rule === 'silence' ? analysis.silentPart : analysis.busiestPart) ?? 0) + 1))
      .replace('{geluid}', analysis.repeatedSound ? `“${lookup(analysis.repeatedSound)?.label ?? ''}”` : 'een geluid');

  const maxDensity = Math.max(1, ...analysis.density);
  const usedTracks = [...new Set(tracks)].sort((a, b) => a - b);

  const answer = (id: string, value: Answer) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onWantsChange?.(picked.some((q) => next[q.id] === 'change'));
  };

  return (
    <div className="flex flex-col gap-4">
          {/* Vormkaart */}
          <div className="rounded-2xl bg-neutral-50 border border-border-subtle p-3 sm:p-4">
            <div className="flex flex-col gap-1">
              {usedTracks.map((track) => (
                <div key={track} className="relative h-7 rounded-md bg-white">
                  {clips.map((clip, i) => {
                    if (tracks[i] !== track) return null;
                    const sound = lookup(clip.soundId);
                    if (!sound) return null;
                    return (
                      <div
                        key={i}
                        className="absolute top-0.5 bottom-0.5 rounded px-1.5 flex items-center gap-1 text-xs font-bold overflow-hidden"
                        style={{
                          left: `${(clip.startBeat / analysis.totalBeats) * 100}%`,
                          width: `${(Math.min(clip.lengthBeats, analysis.totalBeats - clip.startBeat) / analysis.totalBeats) * 100}%`,
                          backgroundColor: sound.color,
                          color: textOn(sound.color),
                        }}
                      >
                        <SampleIcon name={sound.icon} size={12} className="shrink-0" />
                        <span className="truncate">{sound.label}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="grid gap-1 mt-3" style={{ gridTemplateColumns: `repeat(${MIRROR_PARTS}, minmax(0, 1fr))` }}>
              {analysis.density.map((d, i) => {
                const isPeak = analysis.busiestPart === i;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-full h-12 flex items-end rounded-md bg-white overflow-hidden">
                      <div
                        className={cn('w-full rounded-t-md transition-[height] duration-500', isPeak ? 'bg-accent-500' : 'bg-brand-300')}
                        style={{ height: `${(d / maxDensity) * 100}%` }}
                      />
                    </div>
                    <span className={cn('text-xs font-bold', isPeak ? 'text-accent-700' : 'text-text-muted')}>
                      Deel {i + 1}{isPeak ? ' · drukst' : d === 0 ? ' · stil' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vragen */}
          <div className="flex flex-col gap-3">
            {picked.map((q) => {
              const given = answers[q.id];
              return (
                <div key={q.id} className={cn('rounded-2xl border-2 p-4', given ? 'border-success-200 bg-success-50' : 'border-border-subtle bg-white')}>
                  <p className="text-lg font-bold text-text-main text-balance">{fill(q)}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => answer(q.id, 'yes')}
                      aria-pressed={given === 'yes'}
                      className={cn('inline-flex items-center gap-1.5 h-11 px-4 rounded-full font-bold text-sm border-2', given === 'yes' ? 'bg-brand-900 border-brand-900 text-white' : 'border-border-subtle text-text-main hover:bg-neutral-50')}
                    >
                      <Check size={16} /> Ja, zo wil ik het
                    </button>
                    <button
                      type="button"
                      onClick={() => answer(q.id, 'change')}
                      aria-pressed={given === 'change'}
                      className={cn('inline-flex items-center gap-1.5 h-11 px-4 rounded-full font-bold text-sm border-2', given === 'change' ? 'bg-accent-400 border-accent-400 text-brand-900' : 'border-border-subtle text-text-main hover:bg-neutral-50')}
                    >
                      <Pencil size={16} /> Ik pas het aan
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => { setRoll((r) => r + 1); setAnswers({}); onWantsChange?.(false); }}
              className={cn('self-start inline-flex items-center gap-1.5 h-11 px-3 rounded-full text-sm font-bold', onDark ? 'text-brand-200 hover:bg-white/10' : 'text-text-muted hover:bg-neutral-100')}
            >
              <RefreshCw size={16} /> Andere vragen
            </button>
          </div>
    </div>
  );
}

interface ModalProps extends MirrorData {
  questions: MirrorQuestion[];
  onClose: () => void;
}

export default function MirrorModal({ onClose, ...content }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-brand-900/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Luisterspiegel"
        className="relative w-full sm:max-w-3xl max-h-[calc(100dvh-1rem)] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[mock-slide-up_380ms_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        <div className="flex items-center gap-3 px-5 sm:px-7 pt-5 sm:pt-6">
          <span className="w-11 h-11 rounded-2xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
            <FlipHorizontal2 size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight text-text-main">Luisterspiegel</h2>
            <p className="text-sm text-text-muted">Zo ziet jouw soundscape eruit.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="ml-auto w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:bg-neutral-100 shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 sm:px-7 py-4">
          <MirrorContent {...content} />
        </div>
        <div className="shrink-0 px-5 sm:px-7 py-4 border-t border-border-subtle bg-neutral-50">
          <button type="button" onClick={onClose} className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full bg-brand-900 text-white font-extrabold">
            Verder componeren
          </button>
        </div>
      </div>
    </div>
  );
}
