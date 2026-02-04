/**
 * Waveform Utilities
 *
 * Functions for extracting and processing audio waveform data
 * for visualization in the trim modal.
 */

import { WAVEFORM_PEAK_COUNT } from '../constants/config';

// =============================================================================
// TYPES
// =============================================================================

export interface WaveformData {
  /** Normalized peak values (0-1) */
  peaks: number[];
  /** Duration of the audio in seconds */
  duration: number;
}

// =============================================================================
// WAVEFORM EXTRACTION
// =============================================================================

/**
 * Extract peak data from an AudioBuffer for waveform visualization.
 *
 * Divides the audio into segments and finds the maximum amplitude
 * in each segment to create a simplified waveform representation.
 *
 * @param audioBuffer - The decoded audio buffer from Tone.js
 * @param targetPeaks - Target number of peaks (default from config)
 * @returns Normalized peak values (0-1)
 */
export function extractWaveformPeaks(
  audioBuffer: AudioBuffer,
  targetPeaks: number = WAVEFORM_PEAK_COUNT,
): number[] {
  // Use the first channel (mono or left channel of stereo)
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;

  // If audio is very short, reduce target peaks
  const actualPeaks = Math.min(targetPeaks, totalSamples);
  const actualSamplesPerPeak = Math.max(1, Math.floor(totalSamples / actualPeaks));

  const peaks: number[] = [];

  for (let i = 0; i < actualPeaks; i++) {
    const start = i * actualSamplesPerPeak;
    const end = Math.min(start + actualSamplesPerPeak, totalSamples);

    // Find maximum absolute value in this segment
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }

    peaks.push(max);
  }

  // Normalize to 0-1 range based on the maximum peak
  const maxPeak = Math.max(...peaks, 0.01); // Avoid division by zero
  return peaks.map((p) => p / maxPeak);
}

/**
 * Create waveform data from an AudioBuffer.
 *
 * @param audioBuffer - The decoded audio buffer
 * @param targetPeaks - Target number of peaks
 * @returns WaveformData with peaks and duration
 */
export function createWaveformData(
  audioBuffer: AudioBuffer,
  targetPeaks: number = WAVEFORM_PEAK_COUNT,
): WaveformData {
  return {
    peaks: extractWaveformPeaks(audioBuffer, targetPeaks),
    duration: audioBuffer.duration,
  };
}

// =============================================================================
// WAVEFORM HELPERS
// =============================================================================

/**
 * Get the peak value at a specific time position.
 *
 * @param waveform - The waveform data
 * @param timeSeconds - Time position in seconds
 * @returns Peak value (0-1) at that position
 */
export function getPeakAtTime(waveform: WaveformData, timeSeconds: number): number {
  if (waveform.peaks.length === 0) return 0;

  const normalizedPosition = timeSeconds / waveform.duration;
  const peakIndex = Math.floor(normalizedPosition * waveform.peaks.length);
  const clampedIndex = Math.max(0, Math.min(waveform.peaks.length - 1, peakIndex));

  return waveform.peaks[clampedIndex];
}

/**
 * Get a subset of peaks for a time range.
 *
 * @param waveform - The waveform data
 * @param startSeconds - Start time in seconds
 * @param endSeconds - End time in seconds
 * @returns Array of peak values in the range
 */
export function getPeaksInRange(
  waveform: WaveformData,
  startSeconds: number,
  endSeconds: number,
): number[] {
  if (waveform.peaks.length === 0) return [];

  const startIndex = Math.floor((startSeconds / waveform.duration) * waveform.peaks.length);
  const endIndex = Math.ceil((endSeconds / waveform.duration) * waveform.peaks.length);

  const clampedStart = Math.max(0, startIndex);
  const clampedEnd = Math.min(waveform.peaks.length, endIndex);

  return waveform.peaks.slice(clampedStart, clampedEnd);
}
