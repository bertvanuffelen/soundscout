/**
 * StagePlayback - Playback controls + audience voor StageView
 *
 * Bevat:
 * - Play/Stop button
 * - Play Again button
 * - Now playing indicator
 * - Audience animatie
 */

import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Square,
  RotateCcw,
  User,
  UserRound,
  Baby,
  PersonStanding,
  Dog,
  Cat,
  type LucideIcon,
} from 'lucide-react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioStore } from '../../stores/audioStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { cn } from '../../utils/cn';

interface AudienceMember {
  icon: LucideIcon;
  className: string;
}

// Decorative audience colors — intentionally diverse for the playful "concert" stage effect.
// DELIBERATE exception to the design-token rule (like the per-screen gradients and the map
// fallback): these raw hues give the podium its varied, festive audience and are not semantic.
const AUDIENCE: AudienceMember[] = [
  { icon: Baby, className: 'text-pink-400' },
  { icon: User, className: 'text-blue-400' },
  { icon: PersonStanding, className: 'text-amber-400' },
  { icon: UserRound, className: 'text-purple-400' },
  { icon: User, className: 'text-cyan-400' },
  { icon: PersonStanding, className: 'text-green-400' },
  { icon: UserRound, className: 'text-orange-400' },
  { icon: User, className: 'text-red-400' },
  { icon: Dog, className: 'text-yellow-400' },
  { icon: Cat, className: 'text-emerald-400' },
];

export function StagePlayback() {
  const { t } = useTranslation();
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const tracks = useTimelineStore((s) => s.tracks);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  const {
    loadSamples,
    scheduleTimeline,
    playTimeline,
    stopTimeline,
  } = useAudioEngine();

  // AbortController to cancel pending sample loads on cleanup
  const abortRef = useRef<AbortController | null>(null);

  // Load samples on mount
  useEffect(() => {
    if (librarySamples.length > 0) {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      loadSamples(librarySamples, undefined, controller.signal);
    }
    return () => { abortRef.current?.abort(); };
  }, [librarySamples, loadSamples]);

  const handlePlay = useCallback(() => {
    scheduleTimeline(tracks, librarySamples);
    playTimeline();
  }, [scheduleTimeline, playTimeline, librarySamples, tracks]);

  const handleStop = useCallback(() => {
    stopTimeline();
  }, [stopTimeline]);

  const handlePlayAgain = useCallback(() => {
    // Stop first (disposes chains + cancels transport), then immediately
    // reschedule and play from beat 0. No setTimeout needed — stop() is
    // synchronous and fully clears the audio state.
    stopTimeline();
    scheduleTimeline(tracks, librarySamples);
    playTimeline();
  }, [stopTimeline, scheduleTimeline, playTimeline, librarySamples, tracks]);

  return (
    <>
      {/* Playback controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={isPlaying ? handleStop : handlePlay}
          className={cn(
            'w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full transition-all cursor-pointer',
            'bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white',
            'shadow-[0_6px_0_0_rgba(180,83,9,0.5)] hover:shadow-[0_6px_0_0_rgba(146,64,14,0.5)]',
            'active:shadow-[0_2px_0_0_rgba(180,83,9,0.5)] active:translate-y-[4px]'
          )}
        >
          {isPlaying ? <Square className="w-6 h-6 sm:w-8 sm:h-8" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-1" />}
        </button>
        <button
          onClick={handlePlayAgain}
          className={cn(
            'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition-all cursor-pointer',
            'bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 text-neutral-700',
            'shadow-[0_4px_0_0_rgba(100,100,100,0.3)]',
            'active:shadow-[0_1px_0_0_rgba(100,100,100,0.3)] active:translate-y-[3px]'
          )}
          title={t('stage.playAgain')}
        >
          <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Now playing indicator */}
      {isPlaying && (
        <p className="text-accent-600 text-sm font-semibold animate-pulse">
          {t('stage.nowPlaying')}
        </p>
      )}
    </>
  );
}

export function StageAudience() {
  const isPlaying = useAudioStore((s) => s.isPlaying);

  return (
    <div className="relative z-10 bg-bg-surface border-t border-border-subtle px-4 py-3 sm:py-4">
      <div className={`flex justify-center gap-2 sm:gap-3 ${isPlaying ? 'animate-audience-bounce' : ''}`}>
        {AUDIENCE.map((member, i) => {
          const Icon = member.icon;
          return (
            <span
              key={i}
              className={cn('select-none transition-transform', member.className)}
              style={isPlaying ? { animationDelay: `${i * 0.12}s` } : undefined}
            >
              <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default StagePlayback;
