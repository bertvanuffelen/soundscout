/**
 * Audio Diagnostics — Structured logging for debugging audio dropouts
 *
 * Enable in browser console:   window.__AUDIO_DIAG = true
 * Disable:                     window.__AUDIO_DIAG = false
 * Show summary:                window.__AUDIO_DIAG_SUMMARY()
 *
 * Logs are grouped and color-coded:
 * - 🟢 Green: normal operations
 * - 🟡 Yellow: warnings (late events, high latency)
 * - 🔴 Red: errors (failed starts, dropped events)
 * - 📊 Blue: periodic stats
 */

// Extend Window for diagnostic toggle
declare global {
  interface Window {
    __AUDIO_DIAG: boolean;
    __AUDIO_DIAG_SUMMARY: () => void;
    __AUDIO_DIAG_RESET: () => void;
  }
}

// --- Types ---

interface ScheduleStats {
  timestamp: number;
  durationMs: number;
  totalClips: number;
  totalEvents: number;
  effectChains: number;
  mutedClips: number;
  audioContextState: string;
  sampleRate: number;
  baseLatency: number;
}

interface PartCallbackLog {
  timestamp: number;
  scheduledTime: number;
  actualTime: number;  // AudioContext.currentTime when callback runs
  drift: number;       // scheduledTime - actualTime (negative = late)
  sampleId: string;
  effectChainIndex: number | undefined;
  success: boolean;
  error?: string;
}

interface PlaybackSnapshot {
  timestamp: number;
  transportState: string;
  transportPosition: number;
  audioContextTime: number;
  audioContextState: string;
  activeSourceCount: number;
  effectChainCount: number;
  isScheduled: boolean;
}

interface LongTaskEntry {
  timestamp: number;
  durationMs: number;
  transportPosition: number | null;  // null if transport not available
}

// --- State ---

let scheduleHistory: ScheduleStats[] = [];
let callbackLogs: PartCallbackLog[] = [];
let playbackSnapshots: PlaybackSnapshot[] = [];
let longTasks: LongTaskEntry[] = [];
let lateEventCount = 0;
let failedStartCount = 0;
let totalEventsProcessed = 0;
let snapshotIntervalId: number | null = null;
let longTaskObserver: PerformanceObserver | null = null;

// Per-run tracking: reset on each scheduleEnd
let currentRunEventCount = 0;
let currentRunExpectedEvents = 0;
let currentRunEventsByBeat: Map<string, string[]> = new Map(); // beat-bucket → sampleIds
let lastEventTimestamp = 0; // for gap detection
let gapCheckIntervalId: number | null = null;
let silenceGaps: Array<{ startTime: number; endTime: number; durationMs: number; transportPos: number }> = [];

// Reference to transport getter (set by startSnapshots)
let getTransportSeconds: (() => number) | null = null;

// --- Helpers ---

function isEnabled(): boolean {
  return typeof window !== 'undefined' && window.__AUDIO_DIAG === true;
}

function log(emoji: string, color: string, label: string, data?: Record<string, unknown>): void {
  if (!isEnabled()) return;
  const style = `color: ${color}; font-weight: bold;`;
  if (data) {
    console.log(`%c${emoji} [DIAG] ${label}`, style, data);
  } else {
    console.log(`%c${emoji} [DIAG] ${label}`, style);
  }
}

/** Round a transport time to a beat bucket (e.g. "4.0", "4.5") for grouping */
function toBeatBucket(transportTimeSeconds: number, bpm: number = 120): string {
  const beat = (transportTimeSeconds / 60) * bpm;
  return (Math.round(beat * 2) / 2).toFixed(1); // half-beat resolution
}

// --- Public API ---

export const audioDiag = {
  /**
   * Log the start of scheduleTimeline.
   */
  scheduleStart(totalClips: number, mutedClips: number): void {
    if (!isEnabled()) return;
    log('🔧', '#888', `scheduleTimeline START — ${totalClips} clips (${mutedClips} muted)`);
  },

  /**
   * Log the completion of scheduleTimeline with full stats.
   * Also resets per-run counters.
   */
  scheduleEnd(params: {
    durationMs: number;
    totalClips: number;
    totalEvents: number;
    effectChains: number;
    mutedClips: number;
    audioContext: AudioContext;
  }): void {
    // Always track (even when DIAG disabled) so summary has data
    currentRunEventCount = 0;
    currentRunExpectedEvents = params.totalEvents;
    currentRunEventsByBeat = new Map();
    lastEventTimestamp = 0;
    silenceGaps = [];

    if (!isEnabled()) return;

    const stats: ScheduleStats = {
      timestamp: Date.now(),
      durationMs: params.durationMs,
      totalClips: params.totalClips,
      totalEvents: params.totalEvents,
      effectChains: params.effectChains,
      mutedClips: params.mutedClips,
      audioContextState: params.audioContext.state,
      sampleRate: params.audioContext.sampleRate,
      baseLatency: params.audioContext.baseLatency ?? 0,
    };
    scheduleHistory.push(stats);

    const color = params.durationMs > 50 ? '#e74c3c' : params.durationMs > 20 ? '#f39c12' : '#27ae60';
    log(
      params.durationMs > 50 ? '🔴' : params.durationMs > 20 ? '🟡' : '🟢',
      color,
      `scheduleTimeline DONE in ${params.durationMs.toFixed(1)}ms`,
      {
        clips: params.totalClips,
        events: params.totalEvents,
        chains: params.effectChains,
        muted: params.mutedClips,
        ctxState: params.audioContext.state,
        sampleRate: params.audioContext.sampleRate,
        baseLatency: `${((params.audioContext.baseLatency ?? 0) * 1000).toFixed(1)}ms`,
      }
    );

    if (params.durationMs > 50) {
      log('⚠️', '#e74c3c', `scheduleTimeline took ${params.durationMs.toFixed(1)}ms — this blocks the main thread and may cause dropouts`);
    }
  },

  /**
   * Log a Part callback event — call inside the Tone.Part callback.
   * Now tracks ALL events (not just late ones) for completeness analysis.
   */
  partCallback(params: {
    scheduledTime: number;
    audioContextCurrentTime: number;
    sampleId: string;
    effectChainIndex: number | undefined;
    success: boolean;
    error?: string;
  }): void {
    totalEventsProcessed++;
    currentRunEventCount++;
    lastEventTimestamp = Date.now();

    const drift = params.scheduledTime - params.audioContextCurrentTime;
    const entry: PartCallbackLog = {
      timestamp: Date.now(),
      scheduledTime: params.scheduledTime,
      actualTime: params.audioContextCurrentTime,
      drift,
      sampleId: params.sampleId,
      effectChainIndex: params.effectChainIndex,
      success: params.success,
      error: params.error,
    };
    callbackLogs.push(entry);
    // Keep max 1000 entries (up from 500 — we need all events for analysis)
    if (callbackLogs.length > 1000) callbackLogs.shift();

    // Track events per beat bucket
    const bucket = toBeatBucket(params.scheduledTime - (callbackLogs[0]?.scheduledTime ?? params.scheduledTime));
    const existing = currentRunEventsByBeat.get(bucket) ?? [];
    existing.push(params.sampleId);
    currentRunEventsByBeat.set(bucket, existing);

    if (!params.success) {
      failedStartCount++;
      log('🔴', '#e74c3c', `Part callback FAILED — player.start() error`, {
        sampleId: params.sampleId,
        chainIdx: params.effectChainIndex,
        scheduled: params.scheduledTime.toFixed(4),
        actual: params.audioContextCurrentTime.toFixed(4),
        drift: `${(drift * 1000).toFixed(1)}ms`,
        error: params.error,
        eventNum: `${currentRunEventCount}/${currentRunExpectedEvents}`,
      });
      return;
    }

    if (!isEnabled()) return;

    // Late event: scheduled time is in the past (drift < -5ms)
    if (drift < -0.005) {
      lateEventCount++;
      log('🟡', '#f39c12', `Part callback LATE — event was ${(-drift * 1000).toFixed(1)}ms in the past`, {
        sampleId: params.sampleId,
        chainIdx: params.effectChainIndex,
        scheduled: params.scheduledTime.toFixed(4),
        actual: params.audioContextCurrentTime.toFixed(4),
        eventNum: `${currentRunEventCount}/${currentRunExpectedEvents}`,
      });
    }

    // Log progress milestones
    if (currentRunEventCount === currentRunExpectedEvents) {
      log('✅', '#27ae60', `All ${currentRunExpectedEvents} events fired for this run`);
    } else if (currentRunEventCount % 20 === 0) {
      log('📈', '#888', `Events fired: ${currentRunEventCount}/${currentRunExpectedEvents}`);
    }
  },

  /**
   * Log play() call with transport state.
   */
  play(fromBeat: number, offsetSeconds: number, transportState: string): void {
    if (!isEnabled()) return;
    log('▶️', '#27ae60', `play(beat=${fromBeat}, offset=${offsetSeconds.toFixed(3)}s)`, {
      transportState,
      expectedEvents: currentRunExpectedEvents,
    });
  },

  /**
   * Log pause() call.
   */
  pause(currentBeat: number, effectChainCount: number, hasFadeGains: number): void {
    if (!isEnabled()) return;
    log('⏸️', '#3498db', `pause() at beat ${currentBeat.toFixed(2)}`, {
      effectChains: effectChainCount,
      fadeGainsReset: hasFadeGains,
      eventsFiredSoFar: `${currentRunEventCount}/${currentRunExpectedEvents}`,
    });
  },

  /**
   * Log stop() call with run summary.
   */
  stop(): void {
    if (!isEnabled()) return;
    const missed = currentRunExpectedEvents - currentRunEventCount;
    if (missed > 0) {
      log('🔴', '#e74c3c', `stop() — ${missed} events NEVER FIRED (${currentRunEventCount}/${currentRunExpectedEvents})`);
    } else {
      log('⏹️', '#e74c3c', `stop() — all ${currentRunEventCount} events fired OK`);
    }
    if (silenceGaps.length > 0) {
      log('🔇', '#e74c3c', `${silenceGaps.length} silence gaps detected during this run`, {
        gaps: silenceGaps.map(g => `${g.durationMs.toFixed(0)}ms at transport ${g.transportPos.toFixed(1)}s`),
      });
    }
    this.stopSnapshots();
    this.stopGapDetection();
  },

  /**
   * Log resume (play after pause with existing schedule).
   */
  resumeWithExistingSchedule(currentBeat: number): void {
    if (!isEnabled()) return;
    log('🔄', '#27ae60', `RESUME with existing schedule at beat ${currentBeat.toFixed(2)} — no reschedule`);
  },

  /**
   * Log that a reschedule was triggered (from useRescheduleOnChange).
   */
  rescheduleTriggered(reason: string): void {
    if (!isEnabled()) return;
    log('🔁', '#9b59b6', `Reschedule triggered: ${reason}`);
  },

  /**
   * Start periodic playback snapshots (every 500ms while playing).
   * Also starts long task observation and silence gap detection.
   */
  startSnapshots(getSnapshot: () => PlaybackSnapshot & { getTransportSeconds: () => number }): void {
    if (!isEnabled()) return;
    this.stopSnapshots();
    this.stopGapDetection();

    // Store transport getter for long task logging
    const firstSnap = getSnapshot();
    getTransportSeconds = firstSnap.getTransportSeconds;

    // Reset per-run snapshot array for clean analysis
    playbackSnapshots = [];

    snapshotIntervalId = window.setInterval(() => {
      const snap = getSnapshot();
      playbackSnapshots.push(snap);
      // Keep max 200
      if (playbackSnapshots.length > 200) playbackSnapshots.shift();

      // Log every 2 seconds (every 4th snapshot)
      if (playbackSnapshots.length % 4 === 0) {
        log('📊', '#3498db', `Playback health`, {
          transportPos: snap.transportPosition.toFixed(2),
          ctxTime: snap.audioContextTime.toFixed(2),
          ctxState: snap.audioContextState,
          activeSources: snap.activeSourceCount,
          chains: snap.effectChainCount,
          eventsFired: `${currentRunEventCount}/${currentRunExpectedEvents}`,
        });
      }
    }, 500);

    // Start long task detection
    this.startLongTaskObserver();

    // Start silence gap detection
    this.startGapDetection();
  },

  /**
   * Stop periodic snapshots.
   */
  stopSnapshots(): void {
    if (snapshotIntervalId !== null) {
      clearInterval(snapshotIntervalId);
      snapshotIntervalId = null;
    }
    this.stopLongTaskObserver();
  },

  // --- Long Task Detection ---

  startLongTaskObserver(): void {
    this.stopLongTaskObserver();
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const transportPos = getTransportSeconds?.() ?? null;
          const task: LongTaskEntry = {
            timestamp: Date.now(),
            durationMs: entry.duration,
            transportPosition: transportPos,
          };
          longTasks.push(task);
          if (longTasks.length > 100) longTasks.shift();

          if (entry.duration > 100) {
            log('🔴', '#e74c3c', `LONG TASK: ${entry.duration.toFixed(0)}ms main thread block`, {
              transportPos: transportPos?.toFixed(2) ?? 'N/A',
              eventsFired: `${currentRunEventCount}/${currentRunExpectedEvents}`,
            });
          } else if (entry.duration > 50) {
            log('🟡', '#f39c12', `Long task: ${entry.duration.toFixed(0)}ms`, {
              transportPos: transportPos?.toFixed(2) ?? 'N/A',
            });
          }
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: false });
    } catch {
      // PerformanceObserver longtask not supported — silently skip
    }
  },

  stopLongTaskObserver(): void {
    if (longTaskObserver) {
      longTaskObserver.disconnect();
      longTaskObserver = null;
    }
  },

  // --- Silence Gap Detection ---
  // Checks if Part callbacks stop firing while transport should be running

  startGapDetection(): void {
    this.stopGapDetection();
    let gapStartTime: number | null = null;

    gapCheckIntervalId = window.setInterval(() => {
      if (lastEventTimestamp === 0) return; // no events yet
      const now = Date.now();
      const silenceMs = now - lastEventTimestamp;

      // If no event for > 1500ms during playback, flag it
      if (silenceMs > 1500) {
        if (gapStartTime === null) {
          gapStartTime = lastEventTimestamp;
          const transportPos = getTransportSeconds?.() ?? 0;
          log('🔇', '#e74c3c', `SILENCE GAP — no Part callbacks for ${silenceMs.toFixed(0)}ms`, {
            transportPos: transportPos.toFixed(2),
            eventsFired: `${currentRunEventCount}/${currentRunExpectedEvents}`,
            lastEvent: `${((now - lastEventTimestamp) / 1000).toFixed(1)}s ago`,
          });
        }
      } else if (gapStartTime !== null) {
        // Gap ended
        const gapDuration = lastEventTimestamp - gapStartTime;
        const transportPos = getTransportSeconds?.() ?? 0;
        silenceGaps.push({
          startTime: gapStartTime,
          endTime: lastEventTimestamp,
          durationMs: gapDuration,
          transportPos,
        });
        log('🔇', '#f39c12', `Silence gap ended — lasted ${gapDuration.toFixed(0)}ms`, {
          transportPos: transportPos.toFixed(2),
        });
        gapStartTime = null;
      }
    }, 500);
  },

  stopGapDetection(): void {
    if (gapCheckIntervalId !== null) {
      clearInterval(gapCheckIntervalId);
      gapCheckIntervalId = null;
    }
  },

  /**
   * Print a full diagnostic summary to the console.
   */
  printSummary(): void {
    console.group('%c📋 Audio Diagnostics Summary', 'font-size: 14px; font-weight: bold; color: #2c3e50;');

    // Schedule history
    console.group('📦 Schedule History');
    if (scheduleHistory.length === 0) {
      console.log('No schedules recorded');
    } else {
      const durations = scheduleHistory.map(s => s.durationMs);
      console.table(scheduleHistory.map(s => ({
        time: new Date(s.timestamp).toLocaleTimeString(),
        duration: `${s.durationMs.toFixed(1)}ms`,
        clips: s.totalClips,
        events: s.totalEvents,
        chains: s.effectChains,
        muted: s.mutedClips,
        ctxState: s.audioContextState,
        sampleRate: s.sampleRate,
        baseLatency: `${(s.baseLatency * 1000).toFixed(1)}ms`,
      })));
      console.log(`Avg schedule time: ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)}ms`);
      console.log(`Max schedule time: ${Math.max(...durations).toFixed(1)}ms`);
    }
    console.groupEnd();

    // Event completion
    console.group('🎯 Event Completion (current/last run)');
    console.log(`Events fired: ${currentRunEventCount} / ${currentRunExpectedEvents} expected`);
    const missed = currentRunExpectedEvents - currentRunEventCount;
    if (missed > 0) {
      console.warn(`⚠️ ${missed} events NEVER FIRED!`);
    } else if (currentRunExpectedEvents > 0) {
      console.log('✅ All events fired');
    }
    console.groupEnd();

    // Part callback analysis
    console.group('⏱️ Part Callback Timing');
    console.log(`Total events processed (all runs): ${totalEventsProcessed}`);
    console.log(`Late events (>5ms): ${lateEventCount}`);
    console.log(`Failed starts: ${failedStartCount}`);
    if (callbackLogs.length > 0) {
      const drifts = callbackLogs.map(l => l.drift * 1000); // ms
      const lateDrifts = drifts.filter(d => d < -5);
      console.log(`Avg drift: ${(drifts.reduce((a, b) => a + b, 0) / drifts.length).toFixed(2)}ms`);
      console.log(`Min drift (worst late): ${Math.min(...drifts).toFixed(2)}ms`);
      console.log(`Max drift (best ahead): ${Math.max(...drifts).toFixed(2)}ms`);
      if (lateDrifts.length > 0) {
        console.log(`Avg late drift: ${(lateDrifts.reduce((a, b) => a + b, 0) / lateDrifts.length).toFixed(2)}ms`);
      }

      // Drift histogram
      console.group('Drift distribution');
      const buckets = { 'ahead >50ms': 0, 'ahead 10-50ms': 0, 'ahead 0-10ms': 0, 'late 0-5ms': 0, 'late 5-20ms': 0, 'late 20-50ms': 0, 'late 50-100ms': 0, 'late >100ms': 0 };
      for (const d of drifts) {
        if (d > 50) buckets['ahead >50ms']++;
        else if (d > 10) buckets['ahead 10-50ms']++;
        else if (d >= 0) buckets['ahead 0-10ms']++;
        else if (d > -5) buckets['late 0-5ms']++;
        else if (d > -20) buckets['late 5-20ms']++;
        else if (d > -50) buckets['late 20-50ms']++;
        else if (d > -100) buckets['late 50-100ms']++;
        else buckets['late >100ms']++;
      }
      console.table(buckets);
      console.groupEnd();

      // Show the 10 worst late events
      const worstLate = [...callbackLogs]
        .filter(l => l.drift < -0.005)
        .sort((a, b) => a.drift - b.drift)
        .slice(0, 10);
      if (worstLate.length > 0) {
        console.group('Top 10 Latest Events');
        console.table(worstLate.map(l => ({
          time: new Date(l.timestamp).toLocaleTimeString(),
          sampleId: l.sampleId,
          chainIdx: l.effectChainIndex,
          scheduled: l.scheduledTime.toFixed(4),
          actual: l.actualTime.toFixed(4),
          late: `${(-l.drift * 1000).toFixed(1)}ms`,
          ok: l.success ? '✅' : '❌',
        })));
        console.groupEnd();
      }
    }
    console.groupEnd();

    // Long tasks
    console.group('🐌 Long Tasks (main thread blocks >50ms)');
    if (longTasks.length === 0) {
      console.log('No long tasks recorded (good!)');
    } else {
      console.log(`Total long tasks: ${longTasks.length}`);
      const durations = longTasks.map(t => t.durationMs);
      console.log(`Avg duration: ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0)}ms`);
      console.log(`Max duration: ${Math.max(...durations).toFixed(0)}ms`);
      console.log(`Tasks >100ms: ${longTasks.filter(t => t.durationMs > 100).length}`);
      console.log(`Tasks >200ms: ${longTasks.filter(t => t.durationMs > 200).length}`);
      console.table(longTasks.map(t => ({
        time: new Date(t.timestamp).toLocaleTimeString(),
        duration: `${t.durationMs.toFixed(0)}ms`,
        transportPos: t.transportPosition?.toFixed(2) ?? 'N/A',
      })));
    }
    console.groupEnd();

    // Silence gaps
    console.group('🔇 Silence Gaps (>1.5s without Part callbacks)');
    if (silenceGaps.length === 0) {
      console.log('No silence gaps detected (good!)');
    } else {
      console.warn(`⚠️ ${silenceGaps.length} silence gaps detected!`);
      console.table(silenceGaps.map(g => ({
        duration: `${g.durationMs.toFixed(0)}ms`,
        transportPos: g.transportPos.toFixed(2),
      })));
    }
    console.groupEnd();

    // Playback health
    console.group('📊 Playback Snapshots');
    if (playbackSnapshots.length === 0) {
      console.log('No snapshots recorded');
    } else {
      const activeSources = playbackSnapshots.map(s => s.activeSourceCount);
      console.log(`Snapshot count: ${playbackSnapshots.length}`);
      console.log(`Avg active sources: ${(activeSources.reduce((a, b) => a + b, 0) / activeSources.length).toFixed(1)}`);
      console.log(`Max active sources: ${Math.max(...activeSources)}`);

      // Detect context state issues
      const suspendedSnaps = playbackSnapshots.filter(s => s.audioContextState !== 'running');
      if (suspendedSnaps.length > 0) {
        console.warn(`⚠️ AudioContext was NOT running during ${suspendedSnaps.length}/${playbackSnapshots.length} snapshots!`);
      }

      // Transport speed analysis
      if (playbackSnapshots.length >= 2) {
        const speeds: number[] = [];
        for (let i = 1; i < playbackSnapshots.length; i++) {
          const dt = playbackSnapshots[i].audioContextTime - playbackSnapshots[i - 1].audioContextTime;
          const dp = playbackSnapshots[i].transportPosition - playbackSnapshots[i - 1].transportPosition;
          if (dt > 0.1) { // Avoid division by tiny deltas
            speeds.push(dp / dt);
          }
        }
        if (speeds.length > 0) {
          const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
          const minSpeed = Math.min(...speeds);
          const maxSpeed = Math.max(...speeds);
          console.log(`Transport speed: avg=${avgSpeed.toFixed(3)}x, min=${minSpeed.toFixed(3)}x, max=${maxSpeed.toFixed(3)}x`);
          if (minSpeed < 0.9) {
            console.warn(`⚠️ Transport speed dropped to ${minSpeed.toFixed(3)}x — possible audio thread stall`);
          }
        }
      }
    }
    console.groupEnd();

    console.groupEnd();
  },

  /**
   * Reset all collected diagnostics data.
   */
  reset(): void {
    scheduleHistory = [];
    callbackLogs = [];
    playbackSnapshots = [];
    longTasks = [];
    silenceGaps = [];
    lateEventCount = 0;
    failedStartCount = 0;
    totalEventsProcessed = 0;
    currentRunEventCount = 0;
    currentRunExpectedEvents = 0;
    currentRunEventsByBeat = new Map();
    lastEventTimestamp = 0;
    this.stopSnapshots();
    this.stopGapDetection();
    if (isEnabled()) {
      log('🧹', '#888', 'Diagnostics reset');
    }
  },
};

// Wire up window globals
if (typeof window !== 'undefined') {
  // Default to enabled in development
  if (window.__AUDIO_DIAG === undefined) {
    window.__AUDIO_DIAG = import.meta.env.DEV;
  }
  window.__AUDIO_DIAG_SUMMARY = () => audioDiag.printSummary();
  window.__AUDIO_DIAG_RESET = () => audioDiag.reset();
}
