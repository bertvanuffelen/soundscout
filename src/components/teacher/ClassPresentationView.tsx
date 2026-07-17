/**
 * ClassPresentationView - Universele presentatiemodus voor het digibord
 *
 * Eén fullscreen scherm dat álle opdrachtvormen kan presenteren:
 * - storyboard → beeldsync via StoryboardViewer (zoals SubmissionPlayer)
 * - praatplaat → de plaat met alle spots; de spelende inzending pulseert
 * - vrij/template → grote "concertkaart" met meebewegende read-only Timeline
 *
 * Met playlist-zijbalk (klik = spring), auto-advance ("doorspelen") met een
 * korte aankondigingsoverlay per wissel, toetsenbord (spatie/pijlen/Esc) en
 * een optionele docent-feedbackrij (hergebruik FeedbackPanel).
 *
 * Audio volgt het PraatplaatViewer/SubmissionPlayer-patroon: per item
 * samples laden → scheduleTimeline → play; onPlaybackEnd drijft auto-advance.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Play, Pause, SkipBack, SkipForward, ListMusic, Loader2,
  Repeat, Star, PanelRightClose, PanelRightOpen, Music,
} from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';
import type { FeedbackSticker } from '../../lib/submissions';
import { Timeline } from '../studio/Timeline';
import { StoryboardViewer } from '../ui/StoryboardViewer';
import { FeedbackPanel } from './FeedbackPanel';
import { useCompositionPlayback } from '../../hooks/useCompositionPlayback';
import { DEFAULT_BPM } from '../../constants/config';
import { resolveStoryboard } from '../../utils/resolveStoryboard';
import { cn } from '../../utils/cn';

interface ClassPresentationViewProps {
  /** Af te spelen inzendingen, in presentatievolgorde */
  playlist: Submission[];
  onClose: () => void;
  /** Docent-feedback opslaan (optioneel — toont de feedbackrij) */
  onSetFeedback?: (
    id: string,
    feedback: { sticker: FeedbackSticker | null; level: number | null; text: string | null }
  ) => Promise<void>;
}

const ANNOUNCE_MS = 2500;

export function ClassPresentationView({ playlist, onClose, onSetFeedback }: ClassPresentationViewProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFeedbackRow, setShowFeedbackRow] = useState(false);
  const [announcing, setAnnouncing] = useState(true);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Auto-play na een (auto-)wissel zodra de samples geladen zijn
  const pendingAutoPlayRef = useRef(false);

  const current = playlist[index];
  const data = current?.composition_data;
  const totalBeats = data?.totalBeats ?? 32;
  const bpm = data?.bpm ?? DEFAULT_BPM;
  const storyboard = resolveStoryboard(data);
  const praatplaatImage = data?.praatplaat?.imageUrl ?? null;

  // index/autoAdvance in refs voor callbacks (voorkomt stale closures);
  // gesynct in een effect (refs niet beschrijven tijdens render)
  const indexRef = useRef(index);
  const autoAdvanceRef = useRef(autoAdvance);
  const playlistLengthRef = useRef(playlist.length);
  useEffect(() => {
    indexRef.current = index;
    autoAdvanceRef.current = autoAdvance;
    playlistLengthRef.current = playlist.length;
  }, [index, autoAdvance, playlist.length]);

  const goTo = useCallback((nextIndex: number, autoPlay: boolean) => {
    if (nextIndex < 0 || nextIndex >= playlistLengthRef.current) return;
    pendingAutoPlayRef.current = autoPlay;
    setIndex(nextIndex);
  }, []);

  // Gedeeld afspeel-fundament (presentatiescherm fase 1): laden per item,
  // transport, beat-tracking en einde-afspelen. respectLoop=false — bij
  // doorspelen moet elke compositie één keer klinken. onEnded drijft de
  // auto-advance.
  const handleEnded = useCallback(() => {
    if (autoAdvanceRef.current && indexRef.current + 1 < playlistLengthRef.current) {
      goTo(indexRef.current + 1, true);
    }
  }, [goTo]);

  const {
    state: playbackState,
    currentBeat,
    play: playComposition,
    pause: pauseComposition,
    stop: stopComposition,
    seek: seekComposition,
  } = useCompositionPlayback(data ?? null, { respectLoop: false, onEnded: handleEnded });

  // --- Auto-play na wissel: zodra het nieuwe item geladen is ---
  useEffect(() => {
    if (playbackState !== 'ready' || !pendingAutoPlayRef.current) return;
    pendingAutoPlayRef.current = false;
    // Eén tick uitstellen (set-state-in-effect) — hoorbaar identiek
    const timer = setTimeout(() => playComposition(0), 0);
    return () => clearTimeout(timer);
  }, [playbackState, playComposition]);

  // --- Aankondigingsoverlay per wissel (state-updates via timers, buiten
  // het synchrone effect-frame) ---
  useEffect(() => {
    const showTimer = setTimeout(() => setAnnouncing(true), 0);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => setAnnouncing(false), ANNOUNCE_MS);
    return () => {
      clearTimeout(showTimer);
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    };
  }, [index]);

  const handlePlayPause = useCallback(() => {
    if (playbackState === 'playing') {
      pauseComposition();
    } else if (playbackState === 'ready' || playbackState === 'paused') {
      playComposition();
    }
  }, [playbackState, playComposition, pauseComposition]);

  const handleClose = useCallback(() => {
    stopComposition();
    onClose();
  }, [stopComposition, onClose]);

  // --- Toetsenbord: spatie = play/pauze, pijlen = wisselen, Esc = sluiten ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); handlePlayPause(); }
      if (e.key === 'ArrowRight') goTo(indexRef.current + 1, playbackState === 'playing');
      if (e.key === 'ArrowLeft') goTo(indexRef.current - 1, playbackState === 'playing');
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePlayPause, goTo, handleClose, playbackState]);

  const isPlaying = playbackState === 'playing';

  // Alle praatplaat-posities (snapshots) voor de kaart-visual
  const praatplaatSpots = useMemo(() =>
    playlist
      .map((s, i) => ({ i, pos: s.composition_data?.praatplaatPosition, id: s.id }))
      .filter((x): x is { i: number; pos: { x: number; y: number }; id: string } => !!x.pos),
  [playlist]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-brand-900 flex flex-col" role="dialog" aria-label={t('teacher.presentation.title')}>
      {/* Kopbalk */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
        <span className="text-brand-200 text-sm font-semibold inline-flex items-center gap-2">
          <ListMusic className="w-4 h-4" aria-hidden="true" />
          {t('teacher.presentation.title')} · {index + 1}/{playlist.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 text-brand-300 hover:text-white rounded-lg hover:bg-brand-800 transition-colors"
            title={t('teacher.presentation.togglePlaylist')}
          >
            {sidebarOpen ? <PanelRightClose className="w-5 h-5" aria-hidden="true" /> : <PanelRightOpen className="w-5 h-5" aria-hidden="true" />}
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-brand-300 hover:text-white rounded-lg hover:bg-brand-800 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Hoofdpodium */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Aankondigingsoverlay (concert-gevoel) */}
          {announcing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-brand-900/85 pointer-events-none">
              <div className="text-center px-6">
                <Music className="w-10 h-10 text-accent-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-brand-300 text-sm font-semibold mb-1">{t('teacher.presentation.nowPlaying')}</p>
                <p className="text-white text-3xl sm:text-4xl font-extrabold tracking-tight">{current.composition_name}</p>
                <p className="text-brand-200 text-lg mt-1">{current.student_name}</p>
              </div>
            </div>
          )}

          {/* Visual per opdrachtvorm */}
          <div className="flex-1 min-h-0 flex flex-col bg-black/30 mx-3 rounded-2xl overflow-hidden">
            {storyboard ? (
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <StoryboardViewer
                  storyboard={storyboard}
                  currentBeat={currentBeat}
                  totalBeats={totalBeats}
                  sections={data?.sections ?? []}
                  compact
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onStop={stopComposition}
                />
              </div>
            ) : praatplaatImage ? (
              <div className="flex-1 min-h-0 relative flex items-center justify-center p-3">
                <div className="relative max-h-full aspect-video">
                  <img src={praatplaatImage} alt={current.composition_name} className="max-h-full max-w-full rounded-xl object-contain" />
                  {praatplaatSpots.map(({ i, pos, id }) => (
                    <span
                      key={id}
                      className={cn(
                        'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-all',
                        i === index
                          ? 'w-6 h-6 bg-accent-400 animate-pulse scale-110'
                          : 'w-3.5 h-3.5 bg-brand-300/80'
                      )}
                      style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="text-center pt-6 pb-3">
                  <p className="text-white text-2xl font-extrabold tracking-tight">{current.composition_name}</p>
                  <p className="text-brand-300">{current.student_name}</p>
                </div>
                <div className="flex-1 min-h-0 bg-bg-surface rounded-t-2xl overflow-hidden">
                  <Timeline
                    tracks={data?.tracks ?? []}
                    bpm={bpm}
                    totalBeats={totalBeats}
                    currentBeat={currentBeat}
                    isPlaying={isPlaying}
                    onSeek={seekComposition}
                    snapPreview={null}
                    readOnly
                    samples={data?.samples ?? []}
                    sections={data?.sections ?? []}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Docent-feedbackrij (optioneel, hergebruik FeedbackPanel) */}
          {showFeedbackRow && onSetFeedback && (
            <div className="mx-3 mt-2 rounded-xl overflow-hidden">
              <FeedbackPanel
                key={current.id}
                submission={current}
                onSave={(feedback) => onSetFeedback(current.id, feedback)}
              />
            </div>
          )}

          {/* Onderbalk: transport + auto-advance */}
          <div className="flex items-center justify-center gap-3 px-4 py-3 shrink-0">
            <button
              onClick={() => goTo(index - 1, isPlaying)}
              disabled={index === 0}
              className="w-11 h-11 rounded-full bg-brand-800 hover:bg-brand-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
              aria-label={t('teacher.presentation.previous')}
            >
              <SkipBack className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={handlePlayPause}
              disabled={playbackState === 'loading' || playbackState === 'idle'}
              className="w-14 h-14 rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-60 text-white flex items-center justify-center shadow-lg shadow-accent-400/30 transition-all active:scale-95"
              aria-label={isPlaying ? t('common.pause') : t('common.play')}
            >
              {playbackState === 'loading' || playbackState === 'idle' ? (
                <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={() => goTo(index + 1, isPlaying)}
              disabled={index >= playlist.length - 1}
              className="w-11 h-11 rounded-full bg-brand-800 hover:bg-brand-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
              aria-label={t('teacher.presentation.next')}
            >
              <SkipForward className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="w-px h-8 bg-brand-700 mx-1" aria-hidden="true" />

            <button
              onClick={() => setAutoAdvance((v) => !v)}
              aria-pressed={autoAdvance}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-colors',
                autoAdvance ? 'bg-accent-400 text-accent-900' : 'bg-brand-800 text-brand-300 hover:text-white'
              )}
              title={t('teacher.presentation.autoAdvanceHint')}
            >
              <Repeat className="w-4 h-4" aria-hidden="true" />
              {t('teacher.presentation.autoAdvance')}
            </button>
            {onSetFeedback && (
              <button
                onClick={() => setShowFeedbackRow((v) => !v)}
                aria-pressed={showFeedbackRow}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-colors',
                  showFeedbackRow ? 'bg-accent-400 text-accent-900' : 'bg-brand-800 text-brand-300 hover:text-white'
                )}
              >
                <Star className="w-4 h-4" aria-hidden="true" />
                {t('teacher.presentation.feedbackRow')}
              </button>
            )}
          </div>
        </div>

        {/* Playlist-zijbalk */}
        {sidebarOpen && (
          <aside className="w-64 sm:w-72 shrink-0 bg-brand-800/60 rounded-l-2xl my-3 mr-3 overflow-y-auto">
            <ul className="p-2 space-y-1">
              {playlist.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => goTo(i, isPlaying)}
                    aria-current={i === index}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-xl transition-colors',
                      i === index ? 'bg-accent-400 text-accent-900' : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                    )}
                  >
                    <span className="block text-sm font-bold truncate">{s.composition_name}</span>
                    <span className={cn('block text-xs truncate', i === index ? 'text-accent-800' : 'text-brand-400')}>
                      {s.student_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

export default ClassPresentationView;
