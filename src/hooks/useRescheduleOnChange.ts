/**
 * useRescheduleOnChange - Automatically reschedule audio when timeline changes during playback (#22)
 *
 * Monitors the `audioVersion` counter in timelineStore. When it changes
 * while playback is active, triggers a reschedule so changes (new clips,
 * moved clips, volume/effects changes, etc.) are heard immediately.
 */

import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { useAudioStore } from '../stores/audioStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAudioEngine } from './useAudioEngine';

export function useRescheduleOnChange(): void {
  const audioVersion = useTimelineStore((s) => s.audioVersion);
  const tracks = useTimelineStore((s) => s.tracks);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const { rescheduleWhilePlaying } = useAudioEngine();

  // Track previous audioVersion to skip the initial mount
  const prevVersionRef = useRef(audioVersion);

  useEffect(() => {
    // Skip initial mount (no change yet)
    if (prevVersionRef.current === audioVersion) return;
    prevVersionRef.current = audioVersion;

    // Only reschedule if currently playing
    const isPlaying = useAudioStore.getState().isPlaying;
    if (!isPlaying) return;

    // Timeline changed during playback → reschedule
    rescheduleWhilePlaying(tracks, librarySamples, isLooping, totalBeats);
  }, [audioVersion, tracks, librarySamples, isLooping, totalBeats, rescheduleWhilePlaying]);
}
