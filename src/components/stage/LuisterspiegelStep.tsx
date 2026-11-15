/**
 * LuisterspiegelStep — inhoud van de podiumstap "Luisterspiegel".
 *
 * Een kleine vormkaart (clips per spoor + druk/stil per deel) en één of twee
 * reflectievragen. Alles wordt lokaal en op regels bepaald
 * (`utils/luisterspiegel`); antwoorden worden nergens bewaard of verstuurd.
 * De stap is altijd over te slaan.
 */

import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import {
  LUISTERSPIEGEL_QUESTIONS, MAX_MIRROR_QUESTIONS, MIRROR_PARTS,
  analyseMirror, fittingQuestions, pickQuestions, questionPart,
  type MirrorAnalysis, type MirrorQuestion,
} from '../../utils/luisterspiegel';
import type { Sample, Track } from '../../types';

export type MirrorAnswer = 'yes' | 'change';
export type MirrorResult = 'answered' | 'skipped';

export interface LuisterspiegelStepProps {
  tracks: Track[];
  /** Sample-lijst inclusief de virtuele sequence-samples (`withSequenceSamples`) */
  samples: Sample[];
  /** Hoe vaak er op "Andere vragen" is geklikt */
  roll: number;
  answers: Record<string, MirrorAnswer>;
  onAnswer: (questionId: string, answer: MirrorAnswer) => void;
  onReroll: () => void;
  onBackToStudio: () => void;
  /** Verder naar de volgende stap; `skipped` als er niets is beantwoord */
  onContinue: (result: MirrorResult) => void;
  disabled?: boolean;
}

export function LuisterspiegelStep({
  tracks, samples, roll, answers, onAnswer, onReroll, onBackToStudio, onContinue, disabled = false,
}: LuisterspiegelStepProps) {
  const { t } = useTranslation();
  const analysis = useMemo(() => analyseMirror(tracks, samples), [tracks, samples]);
  const isEmpty = analysis.blocks.length === 0;
  const picked = useMemo(
    () => (isEmpty ? [] : pickQuestions(LUISTERSPIEGEL_QUESTIONS, analysis, roll)),
    [analysis, roll, isEmpty],
  );
  const canReroll = fittingQuestions(LUISTERSPIEGEL_QUESTIONS, analysis).length > MAX_MIRROR_QUESTIONS;

  const answered = picked.filter((q) => answers[q.id]).length;
  const wantsChange = picked.some((q) => answers[q.id] === 'change');

  const textOf = (question: MirrorQuestion): string => {
    const sample = samples.find((s) => s.id === analysis.repeatedSampleId);
    return t(question.textKey, {
      part: questionPart(question, analysis),
      sound: sample ? `“${t(sample.name)}”` : t('luisterspiegel.aSound'),
    });
  };

  if (isEmpty) {
    return (
      <>
        <p className="text-sm text-text-muted">{t('luisterspiegel.empty')}</p>
        <Button variant="primary" onClick={onBackToStudio} disabled={disabled} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          {t('luisterspiegel.backToStudio')}
        </Button>
        <Button variant="secondary" onClick={() => onContinue('skipped')} className="w-full">
          {t('luisterspiegel.skip')}
          <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-text-muted">{t('luisterspiegel.text')}</p>
      <FormMap analysis={analysis} />

      {picked.map((question) => {
        const given = answers[question.id];
        return (
          <div
            key={question.id}
            role="group"
            aria-label={textOf(question)}
            className={cn('rounded-xl border-2 p-3', given ? 'border-success-200 bg-success-50' : 'border-border-subtle bg-white')}
          >
            <p className="text-sm font-bold text-text-main text-balance">{textOf(question)}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <AnswerButton pressed={given === 'yes'} onClick={() => onAnswer(question.id, 'yes')} tone="yes">
                {t('luisterspiegel.answerYes')}
              </AnswerButton>
              <AnswerButton pressed={given === 'change'} onClick={() => onAnswer(question.id, 'change')} tone="change">
                {t('luisterspiegel.answerChange')}
              </AnswerButton>
            </div>
          </div>
        );
      })}

      {canReroll && (
        <button
          type="button"
          onClick={onReroll}
          className="self-start inline-flex items-center gap-1.5 min-h-11 rounded-full px-3 text-sm font-semibold text-text-muted hover:bg-neutral-100 hover:text-text-main"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {t('luisterspiegel.otherQuestions')}
        </button>
      )}

      {wantsChange && (
        <Button variant="primary" onClick={onBackToStudio} disabled={disabled} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          {t('luisterspiegel.backToStudio')}
        </Button>
      )}
      <Button
        variant={wantsChange || answered === 0 ? 'secondary' : 'primary'}
        onClick={() => onContinue(answered > 0 ? 'answered' : 'skipped')}
        className="w-full"
      >
        {answered > 0 ? t('luisterspiegel.next') : t('luisterspiegel.skip')}
        <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
      </Button>
    </>
  );
}

// --- Vormkaart ---

function FormMap({ analysis }: { analysis: MirrorAnalysis }) {
  const { t } = useTranslation();
  const maxDensity = Math.max(1, ...analysis.density);
  const label = [
    t('luisterspiegel.mapLabel', { count: analysis.blocks.length }),
    analysis.busiestPart !== null ? t('luisterspiegel.mapLabelBusiest', { part: analysis.busiestPart + 1 }) : null,
    ...analysis.density.map((d, i) => (d === 0 ? t('luisterspiegel.mapLabelSilent', { part: i + 1 }) : null)),
  ].filter(Boolean).join(' ');

  return (
    <div role="img" aria-label={label} className="rounded-xl border border-border-subtle bg-neutral-50 p-2.5">
      {/* Clips per spoor, met de drie deelgrenzen eroverheen */}
      <div className="relative flex flex-col gap-0.5">
        {analysis.trackIndexes.map((trackIndex) => (
          <div key={trackIndex} className="relative h-3 rounded-sm bg-white">
            {analysis.blocks.filter((b) => b.trackIndex === trackIndex).map((block) => (
              <span
                key={block.clipId}
                className="absolute inset-y-0 rounded-sm"
                style={{
                  left: `${(block.startBeat / analysis.totalBeats) * 100}%`,
                  width: `max(3px, ${(block.lengthBeats / analysis.totalBeats) * 100}%)`,
                  backgroundColor: block.color,
                }}
              />
            ))}
          </div>
        ))}
        {Array.from({ length: MIRROR_PARTS - 1 }, (_, i) => (
          <span
            key={i}
            className="pointer-events-none absolute inset-y-0 border-l border-dashed border-neutral-400"
            style={{ left: `${((i + 1) / MIRROR_PARTS) * 100}%` }}
          />
        ))}
      </div>

      {/* Druk/stil per deel */}
      <div className="mt-2 grid grid-cols-4 gap-1">
        {analysis.density.map((d, i) => {
          const isPeak = analysis.busiestPart === i;
          const isSilent = d === 0;
          return (
            <div key={i} className="flex flex-col items-center">
              <div className="flex h-8 w-full items-end overflow-hidden rounded-md bg-white">
                <div
                  className={cn('w-full rounded-t-md', isPeak ? 'bg-accent-500' : 'bg-brand-300')}
                  style={{ height: `${(d / maxDensity) * 100}%` }}
                />
              </div>
              <span className={cn('mt-1 text-xs font-bold leading-tight', isPeak ? 'text-accent-800' : 'text-text-muted')}>
                {t('luisterspiegel.part', { n: i + 1 })}
              </span>
              <span
                className={cn(
                  'mt-0.5 min-h-5 rounded-full px-1.5 text-xs font-bold leading-5',
                  isPeak && 'bg-accent-100 text-accent-800',
                  !isPeak && isSilent && 'bg-neutral-200 text-text-main',
                )}
              >
                {isPeak ? t('luisterspiegel.busiest') : isSilent ? t('luisterspiegel.silent') : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Antwoordknop ---

function AnswerButton({ pressed, onClick, tone, children }: {
  pressed: boolean;
  onClick: () => void;
  tone: 'yes' | 'change';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1 min-h-11 rounded-full border-2 px-2 text-sm font-bold whitespace-nowrap transition-colors',
        pressed
          ? tone === 'yes' ? 'border-brand-900 bg-brand-900 text-text-inverse' : 'border-accent-500 bg-accent-400 text-brand-900'
          : 'border-border-subtle bg-white text-text-main hover:bg-neutral-50',
      )}
    >
      {pressed && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default LuisterspiegelStep;
