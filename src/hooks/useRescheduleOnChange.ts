/**
 * useRescheduleOnChange - Automatically reschedule audio when timeline changes during playback (#22)
 *
 * Monitors the `audioVersion` counter in timelineStore. When it changes
 * while playback is active, triggers a reschedule so changes (new clips,
 * moved clips, volume/effects changes, etc.) are heard immediately.
 *
 * Uses a 120ms debounce to batch rapid audioVersion bumps (e.g. volume
 * slider dragging can push 20+ bumps/sec) into a single reschedule.
 */

import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { useAudioStore } from '../stores/audioStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAudioEngine } from './useAudioEngine';
import { audioDiag } from '../utils/audioDiagnostics';

/** Debounce window in ms — batches rapid changes into one reschedule */
const RESCHEDULE_DEBOUNCE_MS = 120;

export function useRescheduleOnChange(): void {
  const audioVersion = useTimelineStore((s) => s.audioVersion);
  const tracks = useTimelineStore((s) => s.tracks);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const { rescheduleWhilePlaying, setScheduledVersion } = useAudioEngine();

  // Track previous audioVersion to skip the initial mount
  const prevVersionRef = useRef(audioVersion);
  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip initial mount (no change yet)
    if (prevVersionRef.current === audioVersion) return;
    prevVersionRef.current = audioVersion;

    // Only reschedule if currently playing
    const isPlaying = useAudioStore.getState().isPlaying;
    if (!isPlaying) return;

    // Clear any pending debounced reschedule
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    // Debounce: wait for rapid changes to settle before rescheduling
    audioDiag.rescheduleTriggered(`audioVersion changed (debouncing ${RESCHEDULE_DEBOUNCE_MS}ms)`);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      // Re-check isPlaying — user may have stopped during the debounce window
      if (!useAudioStore.getState().isPlaying) return;
      // Read latest state at execution time (not capture time)
      const latestTracks = useTimelineStore.getState().tracks;
      const latestSamples = useLibraryStore.getState().librarySamples;
      const latestLooping = useTimelineStore.getState().isLooping;
      const latestTotalBeats = useTimelineStore.getState().totalBeats;
      const latestVersion = useTimelineStore.getState().audioVersion;

      rescheduleWhilePlaying(latestTracks, latestSamples, latestLooping, latestTotalBeats);
      // Keep scheduledVersion in sync so studio resume detects staleness correctly
      setScheduledVersion(latestVersion);
    }, RESCHEDULE_DEBOUNCE_MS);
  }, [audioVersion, tracks, librarySamples, isLooping, totalBeats, rescheduleWhilePlaying, setScheduledVersion]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
}
