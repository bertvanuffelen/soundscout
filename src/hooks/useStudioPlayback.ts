/**
 * useStudioPlayback - Hook for audio playback controls in the Studio
 *
 * Handles:
 * - Play/pause/stop controls
 * - Loop toggle
 * - Sample preview
 * - Clear all
 */

import { useCallback, useEffect } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAudioStore } from '../stores/audioStore';
import { useAudioEngine } from './useAudioEngine';

export function useStudioPlayback() {
  const tracks = useTimelineStore((s) => s.tracks);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const setLooping = useTimelineStore((s) => s.setLooping);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);

  const librarySamples = useLibraryStore((s) => s.librarySamples);

  // NOTE: We don't subscribe to currentBeat here to avoid recreating
  // handlePlay ~20 times/sec. Instead, we read it at call time with getState().

  const {
    loadSamples,
    playSample,
    scheduleTimeline,
    playTimeline,
    pauseTimeline,
    stopTimeline,
    setTransportLoop,
    seekTo,
  } = useAudioEngine();

  // Load library samples when they change
  useEffect(() => {
    if (librarySamples.length > 0) {
      loadSamples(librarySamples);
    }
  }, [librarySamples, loadSamples]);

  // Play the timeline from current seek position
  const handlePlay = useCallback(() => {
    scheduleTimeline(tracks, librarySamples);
    setTransportLoop(isLooping, totalBeats);
    // Read currentBeat at call time to avoid recreating this callback ~20x/sec
    const currentBeat = useAudioStore.getState().currentBeat;
    playTimeline(currentBeat);
  }, [
    scheduleTimeline,
    playTimeline,
    setTransportLoop,
    librarySamples,
    tracks,
    isLooping,
    totalBeats,
  ]);

  // Pause the timeline
  const handlePause = useCallback(() => {
    pauseTimeline();
  }, [pauseTimeline]);

  // Stop the timeline
  const handleStop = useCallback(() => {
    stopTimeline();
  }, [stopTimeline]);

  // Rewind to beginning (same as stop - goes to beat 0)
  const handleRewind = useCallback(() => {
    stopTimeline();
  }, [stopTimeline]);

  // Toggle loop
  const handleToggleLoop = useCallback(() => {
    const newLooping = !isLooping;
    setLooping(newLooping);
    setTransportLoop(newLooping, totalBeats);
  }, [setLooping, isLooping, setTransportLoop, totalBeats]);

  // Preview a sample
  const handlePreview = useCallback(
    (sampleId: string) => {
      playSample(sampleId);
    },
    [playSample]
  );

  // Clear all tracks
  const handleClearAll = useCallback(() => {
    stopTimeline();
    clearAllTracks();
  }, [stopTimeline, clearAllTracks]);

  // Seek to a specific beat (for playhead scrubbing)
  const handleSeek = useCallback(
    (beat: number) => {
      seekTo(beat);
    },
    [seekTo]
  );

  return {
    // State
    librarySamples,
    tracks,
    isLooping,

    // Handlers
    handlePlay,
    handlePause,
    handleStop,
    handleRewind,
    handleToggleLoop,
    handlePreview,
    handleClearAll,
    handleSeek,
  };
}
