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
import { useAudioEngine } from './useAudioEngine';

export function useStudioPlayback() {
  const tracks = useTimelineStore((s) => s.tracks);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const setLooping = useTimelineStore((s) => s.setLooping);
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);

  const librarySamples = useLibraryStore((s) => s.librarySamples);

  const {
    loadSamples,
    playSample,
    scheduleTimeline,
    playTimeline,
    pauseTimeline,
    stopTimeline,
    setTransportLoop,
  } = useAudioEngine();

  // Load library samples when they change
  useEffect(() => {
    if (librarySamples.length > 0) {
      loadSamples(librarySamples);
    }
  }, [librarySamples, loadSamples]);

  // Play the timeline
  const handlePlay = useCallback(() => {
    scheduleTimeline(tracks, librarySamples);
    setTransportLoop(isLooping, totalBeats);
    playTimeline();
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

  return {
    // State
    librarySamples,
    tracks,
    isLooping,

    // Handlers
    handlePlay,
    handlePause,
    handleStop,
    handleToggleLoop,
    handlePreview,
    handleClearAll,
  };
}
