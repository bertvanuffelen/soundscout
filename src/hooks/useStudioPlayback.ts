/**
 * useStudioPlayback - Hook for audio playback controls in the Studio
 *
 * Handles:
 * - Play/pause/stop controls
 * - Loop toggle
 * - Sample preview
 * - Clear all
 */

import { useCallback, useEffect, useRef } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAudioStore } from '../stores/audioStore';
import { useAudioEngine } from './useAudioEngine';
import { sectionAt } from '../utils/audio';

// Read audioVersion for staleness detection (not reactive — read at call time)
const getAudioVersion = () => useTimelineStore.getState().audioVersion;

export function useStudioPlayback() {
  const tracks = useTimelineStore((s) => s.tracks);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const isLooping = useTimelineStore((s) => s.isLooping);
  const setLooping = useTimelineStore((s) => s.setLooping);
  const loopRegion = useTimelineStore((s) => s.loopRegion);
  const setLoopRegion = useTimelineStore((s) => s.setLoopRegion);
  const sections = useTimelineStore((s) => s.sections);
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
    hasActiveSchedule,
    setScheduledVersion,
  } = useAudioEngine();

  // AbortController to cancel pending sample loads on cleanup / re-trigger
  const abortRef = useRef<AbortController | null>(null);

  // Load library samples when they change
  useEffect(() => {
    if (librarySamples.length > 0) {
      // Cancel any in-progress load
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      loadSamples(librarySamples, undefined, controller.signal);
    }
    return () => { abortRef.current?.abort(); };
  }, [librarySamples, loadSamples]);

  // Play the timeline from current seek position.
  // If a valid schedule exists AND the timeline data hasn't changed since it
  // was built (same audioVersion), skip the costly reschedule. This handles
  // the common "quick pause/resume" case. If the user edited clips while
  // paused, audioVersion will have bumped → version mismatch → full reschedule.
  const handlePlay = useCallback(() => {
    const currentVersion = getAudioVersion();
    if (!hasActiveSchedule(currentVersion)) {
      scheduleTimeline(tracks, librarySamples);
      setScheduledVersion(currentVersion);
    }
    setTransportLoop(isLooping, totalBeats, loopRegion);
    // Read currentBeat at call time to avoid recreating this callback ~20x/sec
    const currentBeat = useAudioStore.getState().currentBeat;
    playTimeline(currentBeat);
  }, [
    scheduleTimeline,
    playTimeline,
    setTransportLoop,
    hasActiveSchedule,
    setScheduledVersion,
    librarySamples,
    tracks,
    isLooping,
    loopRegion,
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

  // Loop-modus (testronde 6): de knop maakt onderscheid tussen hele-compositie-
  // loop en sectie-loop. 'off' = niet loopen · 'whole' = hele compositie ·
  // 'section' = een sectie-bereik (loopRegion gezet).
  const loopMode: 'off' | 'whole' | 'section' = !isLooping
    ? 'off'
    : loopRegion
      ? 'section'
      : 'whole';
  // "Deze sectie" is alleen zinvol als er secties bestaan.
  const canLoopSection = sections.length > 0;

  // Loop de hele compositie.
  const handleLoopWhole = useCallback(() => {
    setLoopRegion(null); // wis een eventuele sectie-regio
    setLooping(true);
    setTransportLoop(true, totalBeats, null);
  }, [setLoopRegion, setLooping, setTransportLoop, totalBeats]);

  // Loop de sectie waar de afspeellijn op dat moment staat.
  const handleLoopSection = useCallback(() => {
    const beat = useAudioStore.getState().currentBeat;
    const region = sectionAt(beat, sections, totalBeats);
    if (!region) return; // geen secties → niets te loopen
    setLoopRegion(region); // zet ook isLooping aan
    setTransportLoop(true, totalBeats, region);
  }, [sections, totalBeats, setLoopRegion, setTransportLoop]);

  // Zet loopen uit (beide vormen).
  const handleLoopOff = useCallback(() => {
    setLoopRegion(null);
    setLooping(false);
    setTransportLoop(false, totalBeats, null);
  }, [setLoopRegion, setLooping, setTransportLoop, totalBeats]);

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
    loopMode,
    canLoopSection,

    // Handlers
    handlePlay,
    handlePause,
    handleStop,
    handleRewind,
    handleLoopWhole,
    handleLoopSection,
    handleLoopOff,
    handlePreview,
    handleClearAll,
    handleSeek,
  };
}
