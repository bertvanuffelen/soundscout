/**
 * FeedbackWorklist — "Feedback geven" als werklijst (ontwerp ronde 3b, variant A).
 *
 * Laptop/tablet: lijst links (Nog doen · Nieuw · Alles + opdrachtkeuze),
 * inzending rechts. Telefoon: het feedbackveld klapt open ónder de aangetikte
 * kaart (wens Bert 14-10). Boven de tijdlijn staat het beeld: de plaat met de
 * plek van de leerling, of de scènes van het storyboard (wens Bert 14-10).
 * Eén knop "Opslaan & volgende"; stickers mét tekst, sterren met betekenis
 * en voorbeeldzinnen voor de tip.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Loader2, Check, Star, ArrowRight, ArrowLeft, CircleCheck, Trash2, AlertCircle, Users } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import type { Submission } from '../../hooks/useSubmissions';
import { getReviewStatus } from '../../hooks/useSubmissions';
import { submissionMatchesAssignment, type ClassAssignmentRow } from '../../lib/assignments';
import type { FeedbackSticker } from '../../lib/submissions';
import { getSubmissionShape, submissionSortTime } from '../../lib/submissionDisplay';
import { STICKER_ICONS, STICKER_KEYS } from '../../utils/stickerMap';
import { useCompositionPlayback } from '../../hooks/useCompositionPlayback';
import { resolveStoryboard } from '../../utils/resolveStoryboard';
import { withSequenceSamples } from '../../utils/sequencer';
import { DEFAULT_BPM } from '../../constants/config';
import { Timeline } from '../studio/Timeline';
import { TeacherPageHeader } from './common';
import { useAgeLabel } from './classPage/useAgeLabel';
import { STATUS_CHIP } from './classPage/statusChip';
import { cn } from '../../utils/cn';
import { getPeerFeedbackForSubmission } from '../../lib/peerFeedback';
import { summarizePeerFeedback, type PeerFeedbackRow } from '../../lib/peerSummary';

type Filter = 'todo' | 'new' | 'all';
type FeedbackValue = { sticker: FeedbackSticker | null; level: number | null; text: string | null };

interface FeedbackWorklistProps {
  classData: TeacherClass;
  /** Ingeleverde inzendingen van de klas (nieuwste eerst) */
  submissions: Submission[];
  /** Opdrachten van de klas (actieve eerst) voor de opdrachtkeuze */
  assignments: ClassAssignmentRow[];
  activeAssignmentId: string | null;
  /** Direct deze inzending openen (vanaf een tegel) */
  initialSubmissionId?: string | null;
  onBack: () => void;
  onSetFeedback: (id: string, feedback: FeedbackValue) => Promise<void>;
  onMarkSeen: (id: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}

/** Smal scherm (telefoon): uitklappen onder de kaart i.p.v. twee kolommen */
function useIsNarrow(): boolean {
  const query = '(max-width: 767px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

export function FeedbackWorklist({
  classData, submissions, assignments, activeAssignmentId, initialSubmissionId = null,
  onBack, onSetFeedback, onMarkSeen, onDelete,
}: FeedbackWorklistProps) {
  const { t } = useTranslation();
  const ageLabel = useAgeLabel();
  const narrow = useIsNarrow();

  // Opdrachtkeuze: standaard de actieve opdracht (of die van de geopende inzending)
  const initialAssignment = useMemo(() => {
    if (initialSubmissionId) {
      const s = submissions.find((x) => x.id === initialSubmissionId);
      const row = s && assignments.find((a) => submissionMatchesAssignment(s, a));
      if (row) return row.id;
    }
    return activeAssignmentId ?? 'all';
    // alleen bij openen bepalen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [assignmentId, setAssignmentId] = useState<string>(initialAssignment);
  const [filter, setFilter] = useState<Filter>(initialSubmissionId ? 'all' : 'todo');
  const [currentId, setCurrentId] = useState<string | null>(initialSubmissionId);
  // Wat de docent in deze sessie opsloeg blijft in "Nog doen" staan tot een filterwissel
  const [doneThisSession, setDoneThisSession] = useState<Set<string>>(new Set());
  // Namen van klasgenoten die feedback gaven (alleen de docent ziet ze)
  const nameById = useMemo(() => new Map(submissions.map((s) => [s.id, s.student_name])), [submissions]);

  const inAssignment = useMemo(() => {
    if (assignmentId === 'all') return submissions;
    const row = assignments.find((a) => a.id === assignmentId);
    return row ? submissions.filter((s) => submissionMatchesAssignment(s, row)) : submissions;
  }, [assignmentId, assignments, submissions]);

  const counts = useMemo(() => ({
    todo: inAssignment.filter((s) => getReviewStatus(s) !== 'reviewed').length,
    new: inAssignment.filter((s) => getReviewStatus(s) === 'new').length,
    all: inAssignment.length,
  }), [inAssignment]);

  const list = useMemo(() => {
    if (filter === 'all') return inAssignment;
    if (filter === 'new') return inAssignment.filter((s) => getReviewStatus(s) === 'new' || doneThisSession.has(s.id));
    return inAssignment.filter((s) => getReviewStatus(s) !== 'reviewed' || doneThisSession.has(s.id));
  }, [filter, inAssignment, doneThisSession]);

  // Op laptop altijd een inzending open; op de telefoon pas na een tik
  const effectiveId = currentId && list.some((s) => s.id === currentId)
    ? currentId
    : (narrow ? null : list[0]?.id ?? null);
  const current = effectiveId ? submissions.find((s) => s.id === effectiveId) ?? null : null;

  // "Gezien"-stempel bij openen
  const stampedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!current || stampedRef.current.has(current.id)) return;
    stampedRef.current.add(current.id);
    if (getReviewStatus(current) === 'new') void onMarkSeen(current.id);
  }, [current, onMarkSeen]);

  const goNext = (fromId: string) => {
    const idx = list.findIndex((s) => s.id === fromId);
    const later = list.slice(idx + 1).find((s) => getReviewStatus(s) !== 'reviewed' && !doneThisSession.has(s.id));
    const next = later ?? list.find((s) => s.id !== fromId && getReviewStatus(s) !== 'reviewed' && !doneThisSession.has(s.id));
    setCurrentId(next?.id ?? fromId);
    if (narrow && next) {
      setTimeout(() => document.getElementById(`fb-item-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const handleSave = async (id: string, value: FeedbackValue) => {
    await onSetFeedback(id, value);
    setDoneThisSession((prev) => new Set(prev).add(id));
    goNext(id);
  };

  const activeRow = assignments.find((a) => a.id === assignmentId);

  const item = (s: Submission) => {
    const status = getReviewStatus(s);
    const open = s.id === effectiveId;
    return (
      <button
        id={`fb-item-${s.id}`}
        type="button"
        onClick={() => setCurrentId(narrow && open ? '__none' : s.id)}
        aria-expanded={narrow ? open : undefined}
        aria-current={!narrow && open ? 'true' : undefined}
        className={cn(
          'w-full text-left flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 transition-colors scroll-mt-4',
          open ? 'border-accent-400 bg-accent-50' : 'border-border-subtle bg-bg-surface hover:border-accent-300',
          narrow && open && 'rounded-b-none',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-text-main truncate">{s.student_name}</span>
          <span className="block text-xs text-text-muted truncate">{s.composition_name} · {ageLabel(submissionSortTime(s))}</span>
        </span>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold shrink-0', STATUS_CHIP[status])}>
          {status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-accent-500" aria-hidden="true" />}
          {status === 'reviewed' && <Check className="w-3 h-3" aria-hidden="true" />}
          {t(`teacher.classPage.status.${status}`)}
        </span>
      </button>
    );
  };

  const empty = (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface px-4 py-8 text-center">
      <CircleCheck className="w-8 h-8 text-success-500 mx-auto" aria-hidden="true" />
      <p className="font-extrabold text-text-main mt-2">{t('teacher.feedbackScreen.emptyTitle')}</p>
      <p className="text-sm text-text-muted">{t('teacher.feedbackScreen.emptyHint')}</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-900 hover:bg-brand-800 text-white px-5 min-h-[44px] text-sm font-extrabold"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t('teacher.feedbackScreen.back')}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-app">
      <TeacherPageHeader
        title={t('teacher.feedbackScreen.title')}
        breadcrumb={<>{classData.name}{activeRow ? <> <span className="opacity-60">›</span> {activeRow.assignmentName}</> : null}</>}
        onBack={onBack}
        backLabel={t('teacher.feedbackScreen.back')}
        actions={
          <span className="font-mono font-extrabold tracking-widest bg-accent-100 text-accent-900 rounded-lg px-3 py-1 text-base">
            {classData.code}
          </span>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-5">
        {/* Filters + opdrachtkeuze */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(['todo', 'new', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setDoneThisSession(new Set()); }}
              aria-pressed={filter === f}
              className={cn(
                'rounded-full border-2 px-4 min-h-[40px] text-sm font-extrabold transition-colors',
                filter === f ? 'bg-brand-900 border-brand-900 text-white' : 'bg-bg-surface border-border-subtle text-text-main hover:border-brand-300',
              )}
            >
              {t(`teacher.feedbackScreen.filters.${f}`)} ({counts[f]})
            </button>
          ))}
          <label className="sr-only" htmlFor="fb-assignment">{t('teacher.feedbackScreen.assignmentLabel')}</label>
          <select
            id="fb-assignment"
            value={assignmentId}
            onChange={(e) => { setAssignmentId(e.target.value); setCurrentId(null); setDoneThisSession(new Set()); }}
            className="rounded-full border-2 border-border-subtle bg-bg-surface px-3 min-h-[40px] text-sm font-bold text-text-main max-w-full"
          >
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.assignmentName}</option>)}
            <option value="all">{t('teacher.feedbackScreen.assignmentAll')}</option>
          </select>
          {/* Duidelijk zichtbaar terug, niet alleen het kleine linkje in de kop (feedback Bert 15-10) */}
          <button
            type="button"
            onClick={onBack}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border-2 border-brand-900 bg-bg-surface hover:bg-brand-900 hover:text-white text-brand-900 px-4 min-h-[40px] text-sm font-extrabold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t('teacher.feedbackScreen.doneBack')}
          </button>
        </div>

        {narrow ? (
          /* Telefoon: uitklappen onder de kaart */
          <div className="space-y-2">
            {list.length === 0 ? empty : list.map((s) => (
              <div key={s.id}>
                {item(s)}
                {s.id === effectiveId && (
                  <div className="border-2 border-t-0 border-accent-400 rounded-b-2xl bg-bg-surface p-3">
                    <FeedbackDetail
                      key={s.id}
                      submission={s}
                      assignmentName={assignments.find((a) => submissionMatchesAssignment(s, a))?.assignmentName ?? null}
                      onSave={(v) => handleSave(s.id, v)}
                      onDelete={() => onDelete(s.id)}
                      nameById={nameById}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Laptop/tablet: lijst links, inzending rechts */
          <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
            <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-1 sticky top-4">
              {list.length === 0 ? empty : list.map((s) => <div key={s.id}>{item(s)}</div>)}
            </div>
            <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
              {current ? (
                <FeedbackDetail
                  key={current.id}
                  submission={current}
                  assignmentName={assignments.find((a) => submissionMatchesAssignment(current, a))?.assignmentName ?? null}
                  onSave={(v) => handleSave(current.id, v)}
                  onDelete={() => onDelete(current.id)}
                  nameById={nameById}
                />
              ) : (
                <p className="text-text-muted text-sm py-10 text-center">{t('teacher.feedbackScreen.pick')}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eén inzending: beeld + tijdlijn + feedback
// ---------------------------------------------------------------------------

interface FeedbackDetailProps {
  submission: Submission;
  assignmentName: string | null;
  onSave: (value: FeedbackValue) => Promise<void>;
  onDelete: () => void;
  nameById: Map<string, string>;
}

function FeedbackDetail({ submission, assignmentName, onSave, onDelete, nameById }: FeedbackDetailProps) {
  const { t } = useTranslation();
  const ageLabel = useAgeLabel();
  const data = submission.composition_data ?? null;
  const shape = getSubmissionShape(submission);
  const playback = useCompositionPlayback(data, { respectLoop: true });
  const isPlaying = playback.state === 'playing';
  const isLoading = playback.state === 'loading' || playback.state === 'idle';
  const noSamples = (data?.samples?.length ?? 0) === 0;
  const totalBeats = data?.totalBeats ?? 32;

  const [sticker, setSticker] = useState<FeedbackSticker | null>(submission.feedback_sticker ?? null);
  const [level, setLevel] = useState<number | null>(submission.feedback_level ?? null);
  const [text, setText] = useState(submission.feedback_text ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'error' | 'empty'>('idle');

  // Stoppen bij weggaan
  const stopRef = useRef(playback.stop);
  useEffect(() => { stopRef.current = playback.stop; }, [playback.stop]);
  useEffect(() => () => stopRef.current(), []);

  const tips = t('teacher.feedbackScreen.tips', { returnObjects: true }) as unknown;
  const tipList = Array.isArray(tips) ? tips.map(String) : [];

  const togglePlay = () => {
    if (playback.state === 'playing') playback.pause();
    else if (playback.state === 'ready' || playback.state === 'paused') playback.play();
  };

  const save = async () => {
    if (!sticker && !level && !text.trim()) { setState('empty'); return; }
    setState('saving');
    try {
      playback.stop();
      await onSave({ sticker, level, text: text.trim() || null });
      setState('idle');
    } catch {
      setState('error');
    }
  };

  // --- Beeld boven de tijdlijn ---
  let visual: React.ReactNode = null;
  if (shape === 'praatplaat' && data?.praatplaat?.imageUrl) {
    const pos = data.praatplaatPosition;
    visual = (
      <div className="relative rounded-xl overflow-hidden">
        <img src={data.praatplaat.imageUrl} alt="" className="w-full block" />
        {pos && (
          <span
            className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-400 border-[3px] border-white shadow-[0_0_0_3px_var(--color-accent-400)]"
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
            aria-label={t('teacher.feedbackScreen.spot')}
          />
        )}
      </div>
    );
  } else if (shape === 'storyboard' || shape === 'image') {
    const sb = resolveStoryboard(data);
    if (sb && sb.images.length > 1) {
      const sceneIdx = Math.min(sb.images.length - 1, Math.floor((playback.currentBeat / totalBeats) * sb.images.length));
      visual = (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${sb.images.length}, minmax(0, 1fr))` }}>
          {sb.images.map((img, i) => (
            <div key={img.id} className="relative">
              <img
                src={img.url}
                alt=""
                className={cn('w-full aspect-video object-cover rounded-lg transition-opacity', i === sceneIdx ? 'opacity-100 ring-[3px] ring-accent-400' : 'opacity-50')}
              />
              <span className="absolute left-1.5 bottom-1 text-white text-[11px] font-extrabold [text-shadow:0_1px_3px_#000]">
                {t('teacher.feedbackScreen.scene', { n: i + 1 })}
              </span>
            </div>
          ))}
        </div>
      );
    } else if (sb?.coverImage) {
      visual = <img src={sb.coverImage} alt="" className="w-full rounded-xl" />;
    }
  }

  return (
    <div>
      {assignmentName && <p className="text-xs text-text-muted">{assignmentName}{shape === 'praatplaat' ? ` · ${t('teacher.feedbackScreen.spot')}` : ''}</p>}
      <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">{submission.composition_name}</h2>
      <p className="text-sm text-text-muted mb-3">
        {t('teacher.feedbackScreen.by', { name: submission.student_name })} · {t('teacher.feedbackScreen.submitted', { time: ageLabel(Date.parse(submission.submitted_at ?? submission.created_at)) })}
      </p>

      {visual && <div className="mb-3">{visual}</div>}

      {/* Afspelen + tijdlijn (sleepbaar, ook met touch) */}
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading || noSamples || playback.state === 'error'}
          className="w-12 h-12 rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-accent-900 flex items-center justify-center shrink-0"
          aria-label={isPlaying ? t('teacher.feedbackScreen.pause') : t('teacher.feedbackScreen.play')}
        >
          {isLoading && !noSamples ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5 ml-0.5" aria-hidden="true" />}
        </button>
        <p className="text-xs text-text-muted">
          {noSamples
            ? <span className="inline-flex items-center gap-1 text-error-600"><AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />{t('teacher.feedbackScreen.noSamples')}</span>
            : isLoading ? `${t('teacher.feedbackScreen.loading')} ${playback.loadingProgress}%` : t('teacher.feedbackScreen.listenHint')}
        </p>
      </div>
      {data && (
        <div className="rounded-xl border border-border-subtle overflow-hidden h-[210px] flex flex-col">
          <Timeline
            tracks={data.tracks ?? []}
            bpm={data.bpm ?? DEFAULT_BPM}
            totalBeats={totalBeats}
            currentBeat={playback.currentBeat}
            isPlaying={isPlaying}
            onSeek={playback.seek}
            snapPreview={null}
            readOnly
            samples={withSequenceSamples(data.samples ?? [], data.sequences ?? [])}
            sections={data.sections ?? []}
          />
        </div>
      )}

      {/* Eerst lezen wat klasgenoten vonden, dan zelf reageren (feedback Bert 15-10) */}
      <PeerFeedbackSummary submissionId={submission.id} nameById={nameById} />

      {/* 1. Compliment */}
      <h3 className="font-extrabold text-text-main mt-5 mb-2">{t('teacher.feedbackScreen.step1')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label={t('teacher.feedbackScreen.step1')}>
        {STICKER_KEYS.map((key) => {
          const Icon = STICKER_ICONS[key];
          const on = sticker === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => { setSticker(on ? null : key); setState('idle'); }}
              className={cn(
                'flex items-center gap-2 rounded-xl border-2 px-3 min-h-[48px] text-left text-sm font-bold transition-colors',
                on ? 'border-accent-400 bg-accent-100 text-text-main' : 'border-border-subtle bg-bg-surface text-text-main hover:border-accent-300',
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', on ? 'text-accent-700' : 'text-text-muted')} aria-hidden="true" />
              {t(`teacher.feedback.stickers.${key}`)}
            </button>
          );
        })}
      </div>

      {/* 2. Sterren met betekenis */}
      <h3 className="font-extrabold text-text-main mt-5 mb-1">{t('teacher.feedbackScreen.step2')}</h3>
      <div className="flex items-center gap-2" role="radiogroup" aria-label={t('teacher.feedbackScreen.step2')}>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={level === n}
            onClick={() => { setLevel(level === n ? null : n); setState('idle'); }}
            title={t(`common.starLevels.${n}`)}
            className="p-1"
          >
            <Star className={cn('w-8 h-8', level != null && n <= level ? 'text-accent-400 fill-accent-400' : 'text-neutral-300')} aria-hidden="true" />
          </button>
        ))}
        <span className="text-sm text-text-muted">{level ? t(`common.starLevels.${level}`) : t('teacher.feedbackScreen.levelNone')}</span>
      </div>

      {/* 3. Tip */}
      <h3 className="font-extrabold text-text-main mt-5 mb-2">
        {t('teacher.feedbackScreen.step3')} <span className="font-normal text-sm text-text-muted">{t('teacher.feedbackScreen.step3Hint')}</span>
      </h3>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tipList.map((tip) => (
          <button
            key={tip}
            type="button"
            onClick={() => setText((prev) => (prev.trim() ? `${prev.trim()} ${tip}` : tip).slice(0, 300))}
            className="rounded-full border border-border-subtle bg-neutral-50 hover:bg-accent-50 px-3 py-1.5 text-xs text-text-main"
          >
            {tip}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value.slice(0, 300)); setState('idle'); }}
        maxLength={300}
        rows={2}
        placeholder={t('teacher.feedback.textPlaceholder')}
        className="w-full rounded-xl border-2 border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-main focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none"
      />

      {state === 'empty' && <p role="alert" className="text-sm text-warning-700 mt-2">{t('teacher.feedbackScreen.needSomething')}</p>}
      {state === 'error' && <p role="alert" className="text-sm text-error-600 mt-2">{t('teacher.feedback.saveError')}</p>}

      <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
        <p className="text-xs text-text-muted">
          {submission.feedback_at && <span className="inline-flex items-center gap-1 text-success-700 font-bold mr-2"><Check className="w-3.5 h-3.5" aria-hidden="true" />{t('teacher.feedbackScreen.saved')}</span>}
          {t('teacher.feedbackScreen.studentSees')}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={state === 'saving'}
          className="inline-flex items-center gap-2 rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-60 text-accent-900 font-extrabold px-6 min-h-[52px]"
        >
          {state === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : null}
          {state === 'saving' ? t('teacher.feedbackScreen.saving') : t('teacher.feedbackScreen.saveNext')}
          {state !== 'saving' && <ArrowRight className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-border-subtle">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-error-600"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> {t('teacher.feedbackScreen.delete')}
        </button>
      </div>
    </div>
  );
}

export default FeedbackWorklist;

// ---------------------------------------------------------------------------
// Wat klasgenoten zeiden (peer feedback, alleen-lezen)
// ---------------------------------------------------------------------------

function PeerFeedbackSummary({ submissionId, nameById }: { submissionId: string; nameById: Map<string, string> }) {
  const { t } = useTranslation();
  const [state, setState] = useState<{ id: string; rows: PeerFeedbackRow[] | null; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPeerFeedbackForSubmission(submissionId)
      .then((rows) => { if (!cancelled) setState({ id: submissionId, rows, error: false }); })
      .catch(() => { if (!cancelled) setState({ id: submissionId, rows: null, error: true }); });
    return () => { cancelled = true; };
  }, [submissionId]);

  const current = state?.id === submissionId ? state : null;
  const summary = useMemo(() => (current?.rows ? summarizePeerFeedback(current.rows) : null), [current]);

  // Nog aan het laden, of (nog) niemand reageerde: geen blok — rust in het scherm
  if (!current) return null;
  if (current.error) {
    return (
      <p className="mt-4 text-xs text-text-muted inline-flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> {t('teacher.feedbackScreen.peer.loadError')}
      </p>
    );
  }
  if (!summary || summary.raters === 0) return null;

  const names = summary.fromIds.map((id) => nameById.get(id)).filter((n): n is string => !!n);

  return (
    <section className="mt-5 rounded-2xl border border-accent-200 bg-accent-50/60 p-3.5" aria-labelledby={`peer-${submissionId}`}>
      <h3 id={`peer-${submissionId}`} className="font-extrabold text-text-main inline-flex items-center gap-2">
        <Users className="w-4 h-4 text-accent-700" aria-hidden="true" />
        {t('teacher.feedbackScreen.peer.title')}
        <span className="text-xs font-bold text-text-muted">{t('teacher.feedbackScreen.peer.count', { count: summary.raters })}</span>
      </h3>
      <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {summary.criteria.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-text-main truncate">{c.name}</span>
            {c.avg !== null ? (
              <span className="inline-flex items-center gap-0.5 shrink-0" aria-label={t('teacher.feedbackScreen.peer.avg', { avg: c.avg })}>
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    className={cn('w-4 h-4', c.avg !== null && c.avg >= n - 0.25 ? 'fill-accent-400 text-accent-500' : 'text-neutral-300')}
                    aria-hidden="true"
                  />
                ))}
                <span className="ml-1 text-xs font-bold text-text-muted tabular-nums">{c.avg.toLocaleString()}</span>
              </span>
            ) : (
              <span className="text-xs text-text-muted shrink-0">{t('teacher.feedbackScreen.peer.chosen', { count: c.count })}</span>
            )}
          </li>
        ))}
      </ul>
      {names.length > 0 && (
        <p className="mt-2 text-xs text-text-muted">
          {t('teacher.feedbackScreen.peer.from', { names: names.join(', ') })}
        </p>
      )}
    </section>
  );
}

