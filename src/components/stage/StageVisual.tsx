/**
 * StageVisual — het beeldvlak van het podium v4 (fase 2.1/2.5)
 *
 * Per situatie:
 * - praatplaat: de plaat met je pin, optioneel ingezoomd op je plek
 * - storyboard / afbeelding: het beeld dat bij de muziek hoort, plus een
 *   strip met miniaturen waarmee je in de muziek springt
 * - vrij / template: de tijdlijn zelf is het beeld
 *
 * Eronder de afspeelbalk: spelen/stoppen, opnieuw, voortgang (klik = spring)
 * en tijd. Het podium speelt altijd de volledige mix, zonder loop (B22/B23).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAudioStore } from '../../stores/audioStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { Timeline } from '../studio/Timeline';
import { StoryboardViewer } from '../ui/StoryboardViewer';
import { PraatplaatMarker } from '../ui/PraatplaatMarker';
import FittedImage from '../presentation/FittedImage';
import { withSequenceSamples } from '../../utils/sequencer';
import { beatsToSeconds, getEffectiveClipEndBeat } from '../../utils/audio';
import { getActiveImageIndex } from '../../utils/storytelling';
import { cn } from '../../utils/cn';
import type { Section } from '../../types';

interface StageVisualProps {
  /** Praatplaat: ingezoomd op de eigen plek (gestuurd door de stap "Je plek") */
  zoomed: boolean;
  /** Wordt aangeroepen zodra er afgespeeld wordt (stap "Luister") */
  onPlayed?: () => void;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Startbeat van beeld i: omgekeerde van getActiveImageIndex */
function imageStartBeat(index: number, totalBeats: number, imageCount: number, sections: Section[]): number {
  if (index <= 0) return 0;
  if (sections.length === imageCount || sections.length === imageCount - 1) {
    return sections[index - 1]?.endBeat ?? 0;
  }
  return (totalBeats / imageCount) * index;
}

export function StageVisual({ zoomed, onPlayed }: StageVisualProps) {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const activePraatplaat = useAppStore((s) => s.activePraatplaat);
  const praatplaatPosition = useAppStore((s) => s.praatplaatPosition);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const tracks = useTimelineStore((s) => s.tracks);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const bpm = useTimelineStore((s) => s.bpm);
  const sections = useTimelineStore((s) => s.sections);
  const sequences = useTimelineStore((s) => s.sequences);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const { initAudio, loadSamples, scheduleTimeline, playTimeline, stopTimeline, setTransportLoop } = useAudioEngine();

  const samples = useMemo(() => withSequenceSamples(librarySamples, sequences), [librarySamples, sequences]);

  // Samples laden bij openen (afbreekbaar, Tone.js-valkuil 4)
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (librarySamples.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadSamples(librarySamples, undefined, controller.signal);
    return () => controller.abort();
  }, [librarySamples, loadSamples]);

  // Einde van de inhoud (niet de lege tijdlijn erachter)
  const endBeat = useMemo(() => {
    let end = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const sample = samples.find((s) => s.id === clip.sampleId);
        if (sample) end = Math.max(end, getEffectiveClipEndBeat(clip, sample, bpm));
      }
    }
    return end > 0 ? end : totalBeats;
  }, [tracks, samples, bpm, totalBeats]);

  const playFrom = useCallback((beat: number) => {
    // Direct op het podium binnengekomen (Verder, bewaarcode): de audio-
    // context start pas bij een klik — Tone.start() hoort in dit gebaar
    void initAudio().catch(() => undefined);
    stopTimeline();
    scheduleTimeline(tracks, librarySamples);
    setTransportLoop(false, totalBeats);
    playTimeline(Math.max(0, beat));
    onPlayed?.();
  }, [initAudio, stopTimeline, scheduleTimeline, setTransportLoop, playTimeline, tracks, librarySamples, totalBeats, onPlayed]);

  const handlePlayStop = () => {
    if (isPlaying) stopTimeline();
    else playFrom(0);
  };

  // --- Beeld per situatie ---
  const isPraatplaat = !!activePraatplaat && !!praatplaatPosition;
  const storyboard = !isPraatplaat ? activeStoryboard : null;

  let visual: React.ReactNode;
  if (isPraatplaat && activePraatplaat && praatplaatPosition) {
    visual = (
      <div className="relative h-full w-full overflow-hidden flex items-center justify-center p-3">
        <div
          className="h-full w-full transition-transform duration-500 ease-out"
          style={{
            transform: zoomed ? 'scale(2.2)' : 'scale(1)',
            transformOrigin: `${praatplaatPosition.x * 100}% ${praatplaatPosition.y * 100}%`,
          }}
        >
          <FittedImage src={activePraatplaat.imageUrl} alt={activePraatplaat.name} imageClassName="rounded-xl">
            <PraatplaatMarker position={praatplaatPosition} active />
          </FittedImage>
        </div>
      </div>
    );
  } else if (storyboard) {
    visual = <StoryboardVisual playFrom={playFrom} />;
  } else {
    visual = (
      <div className="h-full w-full overflow-hidden bg-bg-surface">
        <Timeline
          tracks={tracks}
          bpm={bpm}
          totalBeats={totalBeats}
          isPlaying={isPlaying}
          onSeek={playFrom}
          snapPreview={null}
          readOnly
          samples={samples}
          sections={sections}
        />
      </div>
    );
  }

  return (
    <section className="flex-1 min-h-0 min-w-0 flex flex-col bg-brand-900">
      <div className="flex-1 min-h-[220px] min-w-0">{visual}</div>

      {/* Afspeelbalk */}
      <div className="shrink-0 flex items-center gap-3 px-3 sm:px-5 py-3 bg-brand-800">
        <button
          type="button"
          onClick={handlePlayStop}
          aria-label={isPlaying ? t('transport.stop') : t('transport.play')}
          className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center rounded-full bg-accent-500 hover:bg-accent-600 text-white shadow-lg transition-colors"
        >
          {isPlaying ? <Square className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => playFrom(0)}
          aria-label={t('podium.controls.restart')}
          title={t('podium.controls.restart')}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <StageProgress endBeat={endBeat} bpm={bpm} onSeek={playFrom} />
      </div>
    </section>
  );
}

/** Voortgang + tijd: eigen component, zodat alleen dit 20×/s rendert */
function StageProgress({ endBeat, bpm, onSeek }: { endBeat: number; bpm: number; onSeek: (beat: number) => void }) {
  const { t } = useTranslation();
  const currentBeat = useAudioStore((s) => s.currentBeat);
  const fraction = endBeat > 0 ? Math.min(1, currentBeat / endBeat) : 0;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - rect.left) / rect.width) * endBeat);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={t('podium.controls.seek')}
        className="flex-1 min-w-0 h-8 flex items-center cursor-pointer"
      >
        <span className="block w-full h-2 rounded-full bg-white/15 overflow-hidden">
          <span className="block h-full bg-accent-400 rounded-full" style={{ width: `${fraction * 100}%` }} />
        </span>
      </button>
      <span className="shrink-0 text-xs sm:text-sm font-semibold tabular-nums text-white/80">
        {formatTime(beatsToSeconds(Math.min(currentBeat, endBeat), bpm))} / {formatTime(beatsToSeconds(endBeat, bpm))}
      </span>
    </>
  );
}

/** Storyboard/afbeelding: beeld bij de muziek + miniaturen om te springen */
function StoryboardVisual({ playFrom }: { playFrom: (beat: number) => void }) {
  const { t } = useTranslation();
  const storyboard = useAppStore((s) => s.activeStoryboard);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const sections = useTimelineStore((s) => s.sections);
  const currentBeat = useAudioStore((s) => s.currentBeat);
  if (!storyboard) return null;

  const count = storyboard.images.length;
  const activeIndex = getActiveImageIndex(currentBeat, totalBeats, count, sections);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <StoryboardViewer storyboard={storyboard} currentBeat={currentBeat} totalBeats={totalBeats} sections={sections} fill />
      </div>
      {count > 1 && (
        <div className="shrink-0 flex gap-2 px-3 pb-3 overflow-x-auto">
          {storyboard.images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => playFrom(imageStartBeat(i, totalBeats, count, sections))}
              aria-label={t('podium.controls.image', { n: i + 1 })}
              aria-current={i === activeIndex}
              className={cn(
                'shrink-0 w-20 sm:w-24 aspect-video rounded-lg overflow-hidden border-2 transition-all',
                i === activeIndex ? 'border-accent-400 opacity-100' : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img src={image.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default StageVisual;
