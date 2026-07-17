/**
 * PresentationSurface — hét universele presentatiescherm (fase 2).
 *
 * Eén oppervlak voor vier situaties, gestuurd door `mode`:
 * - 'teacher-present': digibord-presentatie van een klas-playlist
 *   (zijpaneel, doorspelen, aankondigingsoverlay, feedbackrij)
 * - 'teacher-review': docent bekijkt één inzending (montagelijn default
 *   uitgeklapt, metadata-regel, feedbackrij)
 * - 'public': publieke luisterlink (kaal: geen zijpaneel/feedback)
 * - 'peer': leerling beoordeelt anoniem (ratingSlot onder de kaart,
 *   geen namen)
 *
 * Mockup-besluiten (Bert, 17-7): donkere brand-900 achtergrond met lichte
 * inhoudskaart · zijpaneel volledig in/uit schuifbaar met randknop ·
 * fullscreen-knop altijd aanwezig (browser-Fullscreen API) · montagelijn-
 * toggle alleen bij beeld-vormen (bij vrij/template ís de tijdlijn de
 * visual). Audio via useCompositionPlayback (fase 1-fundament).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Play, Pause, SkipBack, SkipForward, ListMusic, Loader2,
  Repeat, Star, PanelRightClose, PanelRightOpen, Music, Rows3,
  Maximize, Minimize, Film, ImageIcon, AlertCircle,
} from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';
import { getReviewStatus } from '../../hooks/useSubmissions';
import type { FeedbackSticker } from '../../lib/submissions';
import { Timeline } from '../studio/Timeline';
import { StoryboardViewer } from '../ui/StoryboardViewer';
import { PraatplaatMarker } from '../ui/PraatplaatMarker';
import { PraatplaatSpot } from '../praatplaat/PraatplaatSpot';
import { clusterSubmissions, type SpotCluster } from '../../utils/praatplaatClustering';
import { FeedbackPanel } from '../teacher/FeedbackPanel';
import { useCompositionPlayback } from '../../hooks/useCompositionPlayback';
import { useFullscreen, isDocumentFullscreen } from '../../hooks/useFullscreen';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { DEFAULT_BPM } from '../../constants/config';
import { resolveStoryboard } from '../../utils/resolveStoryboard';
import { cn } from '../../utils/cn';

export type PresentationMode = 'teacher-present' | 'teacher-review' | 'public' | 'peer';

interface PresentationSurfaceProps {
  /** Af te spelen inzendingen (1..n); zijpaneel en pijlen alleen bij n>1 */
  playlist: Submission[];
  mode: PresentationMode;
  onClose: () => void;
  /** Docent-feedback opslaan (docent-modi — toont de feedbackrij-knop) */
  onSetFeedback?: (
    id: string,
    feedback: { sticker: FeedbackSticker | null; level: number | null; text: string | null }
  ) => Promise<void>;
  /** Totaal ontvangen peer-sterren per inzending (zijpaneel, migratie 030) */
  peerStars?: Map<string, number>;
  /** Peer-modus: sterren-rij + versturen-knop, gerenderd onder de kaart */
  ratingSlot?: ReactNode;
  /** true = loop-instelling van de compositie respecteren (review/public) */
  respectLoop?: boolean;
  /**
   * Praatplaat-bord (M5): één vaste plaat als visual met klikbare, geclusterde
   * spots voor álle playlist-items (klik = die inzending afspelen). Posities
   * komen uit composition_data.praatplaatPosition van elk item.
   */
  interactiveBoard?: { imageUrl: string; name: string } | null;
}

const ANNOUNCE_MS = 2500;

/** Spot-item op het praatplaat-bord: playlist-index + positie (M5) */
interface BoardSpotItem {
  index: number;
  id: string;
  student_name: string;
  position_x: number;
  position_y: number;
}

/** Vorm-icoontje voor een zijpaneel-rij: storyboard / afbeelding / alleen geluid */
function shapeIconFor(submission: Submission) {
  const data = submission.composition_data;
  if (data?.storyboardId) return Film;
  if (data?.praatplaat?.imageUrl || data?.praatplaatPosition) return ImageIcon;
  return Music;
}

export function PresentationSurface({
  playlist,
  mode,
  onClose,
  onSetFeedback,
  peerStars,
  ratingSlot,
  respectLoop = false,
  interactiveBoard = null,
}: PresentationSurfaceProps) {
  const { t } = useTranslation();

  // --- Modus-afgeleide features ---
  const isTeacherMode = mode === 'teacher-present' || mode === 'teacher-review';
  const hasPlaylistUi = mode === 'teacher-present' && playlist.length > 1;
  const showNames = mode !== 'peer';

  const [index, setIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFeedbackRow, setShowFeedbackRow] = useState(false);
  const [feedbackStatusOn, setFeedbackStatusOn] = useState(false);
  // Montagelijn: docent-review start uitgeklapt (opbouw zien), rest ingeklapt
  const [montageOpen, setMontageOpen] = useState(mode === 'teacher-review');
  const [announcing, setAnnouncing] = useState(mode === 'teacher-present');
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Auto-play na een (auto-)wissel zodra de samples geladen zijn
  const pendingAutoPlayRef = useRef(false);

  const current = playlist[index];
  const data = current?.composition_data;
  const totalBeats = data?.totalBeats ?? 32;
  const bpm = data?.bpm ?? DEFAULT_BPM;
  // Bord-stand overrulet de per-item visual (de plaat is voor alle items gelijk)
  const storyboard = interactiveBoard ? null : resolveStoryboard(data);
  const praatplaatImage = interactiveBoard ? null : (data?.praatplaat?.imageUrl ?? null);
  const hasVisual = Boolean(interactiveBoard || storyboard || praatplaatImage);
  // Bij vrij/template ís de tijdlijn de visual: altijd tonen, geen toggle
  const showTimeline = !hasVisual || montageOpen;

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

  // Gedeeld afspeel-fundament (fase 1): laden per item, transport,
  // beat-tracking en einde-afspelen. onEnded drijft de auto-advance.
  const handleEnded = useCallback(() => {
    if (autoAdvanceRef.current && indexRef.current + 1 < playlistLengthRef.current) {
      goTo(indexRef.current + 1, true);
    }
  }, [goTo]);

  const {
    state: playbackState,
    currentBeat,
    loadingProgress,
    errorMessage,
    play: playComposition,
    pause: pauseComposition,
    stop: stopComposition,
    seek: seekComposition,
  } = useCompositionPlayback(data ?? null, { respectLoop, onEnded: handleEnded });

  // Geen samples = niets af te spelen: eerlijke foutstaat (geen maskering)
  const noSamples = (data?.samples?.length ?? 0) === 0;
  const effectiveState = noSamples ? 'error' : playbackState;
  const isPlaying = effectiveState === 'playing';
  const isLoading = effectiveState === 'loading' || effectiveState === 'idle';

  // --- Auto-play na wissel: zodra het nieuwe item geladen is ---
  useEffect(() => {
    if (playbackState !== 'ready' || !pendingAutoPlayRef.current) return;
    pendingAutoPlayRef.current = false;
    // Eén tick uitstellen (set-state-in-effect) — hoorbaar identiek
    const timer = setTimeout(() => playComposition(0), 0);
    return () => clearTimeout(timer);
  }, [playbackState, playComposition]);

  // --- Aankondigingsoverlay per wissel (alleen digibord-presentatie) ---
  useEffect(() => {
    if (mode !== 'teacher-present') return;
    const showTimer = setTimeout(() => setAnnouncing(true), 0);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => setAnnouncing(false), ANNOUNCE_MS);
    return () => {
      clearTimeout(showTimer);
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    };
  }, [index, mode]);

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

  // Escape-guard: in fullscreen verlaat Escape éérst fullscreen
  // (browsergedrag) — dan mag het scherm niet óók dichtklappen.
  const handleEscapeClose = useCallback(() => {
    if (isDocumentFullscreen()) return;
    handleClose();
  }, [handleClose]);

  // Dialog-gedrag: Escape, focus-trap, scroll-lock (zelfde garanties als de
  // oude oppervlakken). autoFocus uit: focus niet ongevraagd verplaatsen.
  const dialogRef = useModalBehavior(handleEscapeClose, { autoFocus: false });
  const { isFullscreen, isSupported: fullscreenSupported, toggle: toggleFullscreen } = useFullscreen(dialogRef);

  // --- Toetsenbord: spatie = play/pauze, pijlen = wisselen, F = fullscreen
  // (Escape loopt via useModalBehavior met fullscreen-guard) ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); handlePlayPause(); }
      if (e.key === 'ArrowRight') goTo(indexRef.current + 1, playbackState === 'playing');
      if (e.key === 'ArrowLeft') goTo(indexRef.current - 1, playbackState === 'playing');
      if (e.key === 'f' || e.key === 'F') { void toggleFullscreen(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePlayPause, goTo, playbackState, toggleFullscreen]);

  // Alle praatplaat-posities (snapshots) voor de kaart-visual
  const praatplaatSpots = useMemo(() =>
    playlist
      .map((s, i) => ({ i, pos: s.composition_data?.praatplaatPosition, id: s.id }))
      .filter((x): x is { i: number; pos: { x: number; y: number }; id: string } => !!x.pos),
  [playlist]);

  // --- Bord-stand (M5): geclusterde klikbare spots over de hele playlist ---
  const [dropdownCluster, setDropdownCluster] = useState<SpotCluster<BoardSpotItem> | null>(null);
  const boardClusters = useMemo(() => {
    if (!interactiveBoard) return [];
    const positioned: BoardSpotItem[] = playlist
      .map((s, i) => {
        const pos = s.composition_data?.praatplaatPosition;
        return pos
          ? { index: i, id: s.id, student_name: s.student_name, position_x: pos.x, position_y: pos.y }
          : null;
      })
      .filter((p): p is BoardSpotItem => p !== null);
    return clusterSubmissions(positioned);
  }, [interactiveBoard, playlist]);

  const handleBoardItem = useCallback((item: BoardSpotItem) => {
    setDropdownCluster(null);
    if (item.index === indexRef.current) {
      handlePlayPause();
    } else {
      goTo(item.index, true);
    }
  }, [handlePlayPause, goTo]);

  const handleBoardSpot = useCallback((cluster: SpotCluster<BoardSpotItem>) => {
    if (cluster.submissions.length === 1) {
      handleBoardItem(cluster.submissions[0]);
    } else {
      setDropdownCluster(cluster);
    }
  }, [handleBoardItem]);

  // Metadata-regel (docent-review): datum + tracks/clips/samples
  const reviewMeta = useMemo(() => {
    if (mode !== 'teacher-review' || !current) return null;
    const tracks = data?.tracks ?? [];
    const formattedDate = new Date(current.created_at).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    return {
      formattedDate,
      trackCount: tracks.filter((tr) => tr.clips?.length > 0).length,
      clipCount: tracks.reduce((total, track) => total + (track.clips?.length || 0), 0),
      sampleCount: data?.samples?.length ?? 0,
    };
  }, [mode, current, data]);

  if (!current) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('teacher.presentation.title')}
      className="fixed inset-0 z-50 bg-brand-900 flex flex-col"
    >
      {/* Kopbalk */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 gap-2">
        {/* "Nu te horen"-pill */}
        <span className="inline-flex items-center gap-2 bg-brand-800/80 text-brand-100 text-sm font-semibold rounded-full px-4 py-1.5 min-w-0">
          <Music className="w-4 h-4 text-accent-400 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {t('teacher.presentation.nowPlaying')}: {showNames && current.student_name
              ? current.student_name
              : current.composition_name}
          </span>
          {hasPlaylistUi && (
            <span className="text-brand-300 shrink-0">· {index + 1}/{playlist.length}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {hasVisual && (
            <button
              onClick={() => setMontageOpen((v) => !v)}
              aria-pressed={montageOpen}
              className={cn(
                'p-2 rounded-lg transition-colors',
                montageOpen ? 'text-accent-400 bg-brand-800' : 'text-brand-300 hover:text-white hover:bg-brand-800'
              )}
              title={t('teacher.presentation.montageLine')}
            >
              <Rows3 className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          {hasPlaylistUi && (
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 text-brand-300 hover:text-white rounded-lg hover:bg-brand-800 transition-colors"
              title={t('teacher.presentation.togglePlaylist')}
            >
              {sidebarOpen ? <PanelRightClose className="w-5 h-5" aria-hidden="true" /> : <PanelRightOpen className="w-5 h-5" aria-hidden="true" />}
            </button>
          )}
          {fullscreenSupported && (
            <button
              onClick={() => void toggleFullscreen()}
              className="p-2 text-brand-300 hover:text-white rounded-lg hover:bg-brand-800 transition-colors"
              title={isFullscreen ? t('teacher.presentation.exitFullscreen') : t('teacher.presentation.fullscreen')}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" aria-hidden="true" /> : <Maximize className="w-5 h-5" aria-hidden="true" />}
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-2 text-brand-300 hover:text-white rounded-lg hover:bg-brand-800 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Hoofdpodium */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Aankondigingsoverlay (concert-gevoel, alleen presentatie) */}
          {mode === 'teacher-present' && announcing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-brand-900/85 pointer-events-none">
              <div className="text-center px-6">
                <Music className="w-10 h-10 text-accent-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-brand-300 text-sm font-semibold mb-1">{t('teacher.presentation.nowPlaying')}</p>
                <p className="text-white text-3xl sm:text-4xl font-extrabold tracking-tight">{current.composition_name}</p>
                <p className="text-brand-200 text-lg mt-1">{current.student_name}</p>
              </div>
            </div>
          )}

          {/* Lichte inhoudskaart op het donkere podium */}
          <div className="flex-1 min-h-0 flex flex-col bg-bg-surface mx-3 rounded-2xl shadow-2xl overflow-hidden">
            {/* Laden */}
            {isLoading && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-xs w-full">
                  <Music className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-pulse" aria-hidden="true" />
                  <p className="text-text-main font-medium mb-3">{t('teacher.submissionPlayer.loading')}</p>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <p className="text-text-muted text-sm mt-2">{loadingProgress}%</p>
                </div>
              </div>
            )}

            {/* Fout / geen samples */}
            {effectiveState === 'error' && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-xs">
                  <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-error-600 font-medium mb-2">
                    {noSamples ? t('teacher.submissionPlayer.noSamplesError') : errorMessage ?? t('teacher.submissionPlayer.audioLoadError')}
                  </p>
                  <p className="text-text-muted text-sm">{t('teacher.submissionPlayer.errorHint')}</p>
                </div>
              </div>
            )}

            {!isLoading && effectiveState !== 'error' && (
              <>
                {/* Praatplaat-bord (M5): vaste plaat + klikbare spots */}
                {interactiveBoard && (
                  <div className={cn('min-h-0 relative flex items-center justify-center p-3 bg-neutral-50', showTimeline ? 'flex-[2]' : 'flex-1')}>
                    <div className="relative h-full">
                      <img
                        src={interactiveBoard.imageUrl}
                        alt={interactiveBoard.name}
                        className="h-full w-auto max-w-full rounded-xl object-contain"
                        draggable={false}
                      />
                      {boardClusters.map((cluster, i) => (
                        <PraatplaatSpot
                          key={i}
                          submissions={cluster.submissions}
                          x={cluster.x}
                          y={cluster.y}
                          isPlaying={isPlaying && cluster.submissions.some((s) => s.index === index)}
                          onClick={() => handleBoardSpot(cluster)}
                        />
                      ))}
                      {/* Keuzemenu bij meerdere inzendingen op één plek */}
                      {dropdownCluster && (
                        <>
                          <div className="absolute inset-0 z-30" onClick={() => setDropdownCluster(null)} />
                          <div
                            className="absolute z-40 bg-bg-surface rounded-xl shadow-2xl py-1 min-w-[160px] max-h-[200px] overflow-y-auto -translate-x-1/2"
                            style={{
                              left: `${dropdownCluster.x * 100}%`,
                              top: `${Math.min(dropdownCluster.y * 100 + 5, 80)}%`,
                            }}
                          >
                            {dropdownCluster.submissions.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleBoardItem(item)}
                                className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-accent-50 transition-colors truncate"
                              >
                                {item.student_name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Visual per opdrachtvorm */}
                {storyboard && (
                  <div className={cn('min-h-0 bg-neutral-50', showTimeline ? 'flex-[2]' : 'flex-1')}>
                    <StoryboardViewer
                      storyboard={storyboard}
                      currentBeat={currentBeat}
                      totalBeats={totalBeats}
                      sections={data?.sections ?? []}
                      fill
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPause}
                      onStop={stopComposition}
                    />
                  </div>
                )}
                {!storyboard && praatplaatImage && (
                  <div className={cn('min-h-0 relative flex items-center justify-center p-3 bg-neutral-50', showTimeline ? 'flex-[2]' : 'flex-1')}>
                    {/* h-full op de img: schaalt óók op (digibord); de wrapper
                        krimpt om het beeld heen zodat de markers blijven kloppen */}
                    <div className="relative h-full">
                      <img
                        src={praatplaatImage}
                        alt={current.composition_name}
                        className="h-full w-auto max-w-full rounded-xl object-contain"
                      />
                      {praatplaatSpots.map(({ i, pos, id }) => (
                        <PraatplaatMarker key={id} position={pos} active={i === index} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Titelregel */}
                <div className="px-4 sm:px-6 py-3 border-t border-border-subtle shrink-0">
                  <p className="text-text-main text-lg sm:text-xl font-extrabold tracking-tight truncate">
                    {current.composition_name}
                    {showNames && current.student_name && (
                      <span className="text-text-muted font-medium"> — {t('common.by').toLowerCase()} {current.student_name}</span>
                    )}
                  </p>
                  {reviewMeta && (
                    <p className="text-text-muted text-sm mt-0.5">
                      {reviewMeta.formattedDate}
                      <span className="mx-2">·</span>
                      {reviewMeta.trackCount} {t('common.tracks').toLowerCase()}
                      <span className="mx-1.5">·</span>
                      {reviewMeta.clipCount} {t('common.clips').toLowerCase()}
                      <span className="mx-1.5">·</span>
                      {reviewMeta.sampleCount} {t('common.samples').toLowerCase()}
                    </p>
                  )}
                </div>

                {/* Montagelijn (meebewegende read-only tijdlijn) */}
                {showTimeline && (
                  <div className="flex-1 min-h-0 overflow-hidden border-t border-border-subtle">
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
                )}
              </>
            )}
          </div>

          {/* Peer: sterren-rij + versturen (aangeleverd door de modal) */}
          {ratingSlot && (
            <div className="mx-3 mt-2 rounded-xl overflow-hidden bg-bg-surface shadow-xl max-h-[40dvh] overflow-y-auto p-4">
              {ratingSlot}
            </div>
          )}

          {/* Docent-feedbackrij (hergebruik FeedbackPanel) */}
          {showFeedbackRow && onSetFeedback && (
            <div className="mx-3 mt-2 rounded-xl overflow-hidden">
              <FeedbackPanel
                key={current.id}
                submission={current}
                onSave={(feedback) => onSetFeedback(current.id, feedback)}
              />
            </div>
          )}

          {/* Onderbalk: transport + toggles */}
          <div className="flex items-center justify-center gap-3 px-4 py-3 shrink-0">
            <button
              onClick={() => (hasPlaylistUi ? goTo(index - 1, isPlaying) : stopComposition())}
              disabled={hasPlaylistUi ? index === 0 : effectiveState === 'error'}
              className="w-11 h-11 rounded-full bg-brand-800 hover:bg-brand-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
              aria-label={hasPlaylistUi ? t('teacher.presentation.previous') : t('transport.rewind')}
            >
              <SkipBack className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={handlePlayPause}
              disabled={isLoading || effectiveState === 'error'}
              className="w-14 h-14 rounded-full bg-accent-400 hover:bg-accent-500 disabled:opacity-60 text-white flex items-center justify-center shadow-lg shadow-accent-400/30 transition-all active:scale-95"
              aria-label={isPlaying ? t('common.pause') : t('common.play')}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" aria-hidden="true" />
              )}
            </button>
            {hasPlaylistUi && (
              <button
                onClick={() => goTo(index + 1, isPlaying)}
                disabled={index >= playlist.length - 1}
                className="w-11 h-11 rounded-full bg-brand-800 hover:bg-brand-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                aria-label={t('teacher.presentation.next')}
              >
                <SkipForward className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            {(hasPlaylistUi || (isTeacherMode && onSetFeedback)) && (
              <div className="w-px h-8 bg-brand-700 mx-1" aria-hidden="true" />
            )}

            {hasPlaylistUi && (
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
            )}
            {isTeacherMode && onSetFeedback && (
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

        {/* Playlist-zijpaneel (licht, mockup-stijl) */}
        {hasPlaylistUi && sidebarOpen && (
          <aside className="w-64 sm:w-72 shrink-0 bg-bg-surface rounded-2xl my-3 mr-3 shadow-2xl flex flex-col overflow-hidden">
            {/* Feedback-status-toggle (alleen docent) */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border-subtle shrink-0">
              <span className="text-text-main text-sm font-bold inline-flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-accent-500" aria-hidden="true" />
                {t('teacher.presentation.submissions', { count: playlist.length })}
              </span>
              <button
                onClick={() => setFeedbackStatusOn((v) => !v)}
                aria-pressed={feedbackStatusOn}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors"
                title={t('teacher.presentation.feedbackStatusHint')}
              >
                {t('teacher.presentation.feedbackStatus')}
                <span
                  className={cn(
                    'relative inline-block w-8 h-4 rounded-full transition-colors',
                    feedbackStatusOn ? 'bg-accent-400' : 'bg-neutral-300'
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all',
                      feedbackStatusOn ? 'left-[18px]' : 'left-0.5'
                    )}
                  />
                </span>
              </button>
            </div>

            <ul className="p-2 space-y-1 overflow-y-auto flex-1">
              {playlist.map((s, i) => {
                const ShapeIcon = shapeIconFor(s);
                const stars = peerStars?.get(s.id) ?? 0;
                const status = getReviewStatus(s);
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => goTo(i, isPlaying)}
                      aria-current={i === index}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center gap-2.5 border-2',
                        i === index
                          ? 'border-accent-400 bg-accent-50'
                          : 'border-transparent hover:bg-neutral-100'
                      )}
                    >
                      <span className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        i === index ? 'bg-accent-400 text-white' : 'bg-neutral-100 text-text-muted'
                      )}>
                        <ShapeIcon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold truncate text-text-main">{s.composition_name}</span>
                        <span className="block text-xs truncate text-text-muted">{s.student_name}</span>
                      </span>
                      {stars > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-accent-600 text-xs font-bold shrink-0"
                          title={t('teacher.presentation.starsHint', { count: stars })}
                        >
                          <Star className="w-3.5 h-3.5 fill-accent-500 text-accent-500" aria-hidden="true" />
                          {stars}
                        </span>
                      )}
                      {feedbackStatusOn && (
                        <span
                          className={cn(
                            'w-2.5 h-2.5 rounded-full shrink-0',
                            status === 'reviewed' ? 'bg-success-500' : status === 'seen' ? 'bg-warning-400' : 'bg-neutral-300'
                          )}
                          title={t(`teacher.presentation.status.${status}`)}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}

        {/* Randknop: zijpaneel ingeschoven → terughalen (met positie-badge) */}
        {hasPlaylistUi && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-bg-surface hover:bg-neutral-100 rounded-l-xl shadow-2xl px-2 py-3 flex flex-col items-center gap-1.5 transition-colors"
            title={t('teacher.presentation.openPlaylist')}
          >
            <PanelRightOpen className="w-5 h-5 text-text-muted" aria-hidden="true" />
            <span className="text-xs font-bold text-text-main">{index + 1}/{playlist.length}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default PresentationSurface;
