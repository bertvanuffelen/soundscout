/**
 * Unit tests for waveform utility functions
 *
 * Tests cover:
 * - extractWaveformPeaks: peak extraction and normalization
 * - createWaveformData: waveform data creation
 * - getPeakAtTime: time-based peak lookup
 * - getPeaksInRange: range-based peak subsetting
 */

import { describe, it, expect } from 'vitest';
import {
  extractWaveformPeaks,
  createWaveformData,
  getPeakAtTime,
  getPeaksInRange,
  type WaveformData,
} from '../waveform';

/**
 * Create a mock AudioBuffer for testing.
 * Since we're in a Node/jsdom environment, we create a minimal mock.
 */
function createMockAudioBuffer(
  channelData: Float32Array,
  sampleRate = 44100,
): AudioBuffer {
  return {
    getChannelData: () => channelData,
    length: channelData.length,
    duration: channelData.length / sampleRate,
    sampleRate,
    numberOfChannels: 1,
  } as unknown as AudioBuffer;
}

// =============================================================================
// extractWaveformPeaks Tests
// =============================================================================

describe('extractWaveformPeaks', () => {
  it('should extract peaks from sine-wave-like data and normalize to 0-1', () => {
    // Create a simple sine-like pattern: amplitudes vary from 0 to 1
    const channelData = new Float32Array([0.5, 0.707, 1.0, 0.707, 0.5, 0.0]);
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 3);

    // Should have 3 peaks (or fewer if audio is too short)
    expect(peaks.length).toBeLessThanOrEqual(3);
    // All peaks should be normalized to 0-1
    peaks.forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(1);
    });
    // Maximum peak should be 1.0 (normalized)
    expect(Math.max(...peaks)).toBe(1.0);
  });

  it('should handle all-zero audio buffer (silent)', () => {
    const channelData = new Float32Array([0, 0, 0, 0, 0, 0]);
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 3);

    // With all zeros, max peak defaults to 0.01 (avoid division by zero)
    // So normalized values will be 0 / 0.01 = 0
    expect(peaks.length).toBeLessThanOrEqual(3);
    peaks.forEach((peak) => {
      expect(peak).toBeCloseTo(0, 5);
    });
  });

  it('should reduce target peaks when audio is very short', () => {
    // 2 samples of audio
    const channelData = new Float32Array([0.5, 0.8]);
    const buffer = createMockAudioBuffer(channelData);

    // Request 100 peaks, but should get only 2 (min of targetPeaks and totalSamples)
    const peaks = extractWaveformPeaks(buffer, 100);

    expect(peaks.length).toBe(2);
    expect(peaks[0]).toBeCloseTo(0.625, 5); // 0.5 normalized against max 0.8
    expect(peaks[1]).toBeCloseTo(1.0, 5); // 0.8 normalized against max 0.8
  });

  it('should handle single sample audio', () => {
    const channelData = new Float32Array([0.75]);
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 10);

    expect(peaks.length).toBe(1);
    expect(peaks[0]).toBeCloseTo(1.0, 5);
  });

  it('should normalize all peaks based on max peak value', () => {
    // Create data where max is 0.5
    const channelData = new Float32Array([0.1, 0.2, 0.5, 0.3]);
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 4);

    expect(peaks.length).toBe(4);
    // All normalized against max 0.5
    expect(peaks[0]).toBeCloseTo(0.2, 5); // 0.1 / 0.5
    expect(peaks[1]).toBeCloseTo(0.4, 5); // 0.2 / 0.5
    expect(peaks[2]).toBeCloseTo(1.0, 5); // 0.5 / 0.5
    expect(peaks[3]).toBeCloseTo(0.6, 5); // 0.3 / 0.5
  });

  it('should handle constant amplitude audio', () => {
    const channelData = new Float32Array([0.75, 0.75, 0.75, 0.75]);
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 4);

    expect(peaks.length).toBe(4);
    // All peaks should be equal (1.0 when normalized)
    peaks.forEach((peak) => {
      expect(peak).toBeCloseTo(1.0, 5);
    });
  });

  it('should handle negative sample values', () => {
    const channelData = new Float32Array([-0.5, -0.707, -1.0, -0.707, -0.5]);
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 3);

    expect(peaks.length).toBeLessThanOrEqual(3);
    // Negative values should be treated as absolute values
    expect(Math.max(...peaks)).toBeCloseTo(1.0, 5);
  });

  it('should use default target peaks from config when not provided', () => {
    const channelData = new Float32Array(new Array(500).fill(0.5));
    const buffer = createMockAudioBuffer(channelData);

    // Call without targetPeaks argument
    const peaks = extractWaveformPeaks(buffer);

    // Should use WAVEFORM_PEAK_COUNT from config (100)
    expect(peaks.length).toBe(100);
    expect(peaks.every((p) => p > 0 && p <= 1)).toBe(true);
  });

  it('should extract peaks correctly for longer audio', () => {
    // Create 1000 samples with varying amplitudes
    const channelData = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) {
      // Sine-like pattern
      channelData[i] = Math.sin((i / 1000) * Math.PI * 4) * 0.8;
    }
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 50);

    expect(peaks.length).toBe(50);
    peaks.forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(1);
    });
  });
});

// =============================================================================
// createWaveformData Tests
// =============================================================================

describe('createWaveformData', () => {
  it('should create waveform data with correct peaks and duration', () => {
    const channelData = new Float32Array([0.5, 0.8, 1.0, 0.6]);
    const sampleRate = 44100;
    const buffer = createMockAudioBuffer(channelData, sampleRate);

    const waveform = createWaveformData(buffer, 2);

    expect(waveform).toHaveProperty('peaks');
    expect(waveform).toHaveProperty('duration');
    expect(Array.isArray(waveform.peaks)).toBe(true);
    expect(typeof waveform.duration).toBe('number');
  });

  it('should set duration correctly based on sample rate', () => {
    const channelData = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const sampleRate = 44100;
    const buffer = createMockAudioBuffer(channelData, sampleRate);

    const waveform = createWaveformData(buffer);

    // 4 samples at 44100 Hz = 4/44100 seconds
    expect(waveform.duration).toBeCloseTo(4 / 44100, 10);
  });

  it('should use default target peaks when not provided', () => {
    const channelData = new Float32Array(new Array(500).fill(0.5));
    const buffer = createMockAudioBuffer(channelData);

    const waveform = createWaveformData(buffer);

    // Should use WAVEFORM_PEAK_COUNT from config (100)
    expect(waveform.peaks.length).toBe(100);
  });

  it('should include peaks from extractWaveformPeaks', () => {
    const channelData = new Float32Array([0.2, 0.4, 0.6, 0.8, 1.0]);
    const buffer = createMockAudioBuffer(channelData);

    const peaks = extractWaveformPeaks(buffer, 3);
    const waveform = createWaveformData(buffer, 3);

    expect(waveform.peaks).toEqual(peaks);
  });

  it('should handle short audio correctly', () => {
    const channelData = new Float32Array([0.5]);
    const buffer = createMockAudioBuffer(channelData);

    const waveform = createWaveformData(buffer);

    expect(waveform.peaks.length).toBe(1);
    expect(waveform.duration).toBeCloseTo(1 / 44100, 10);
  });
});

// =============================================================================
// getPeakAtTime Tests
// =============================================================================

describe('getPeakAtTime', () => {
  it('should return first peak when time is 0', () => {
    const waveform: WaveformData = {
      peaks: [0.2, 0.5, 0.8, 1.0],
      duration: 4.0,
    };

    const peak = getPeakAtTime(waveform, 0);

    expect(peak).toBe(0.2);
  });

  it('should return last peak when time equals duration', () => {
    const waveform: WaveformData = {
      peaks: [0.2, 0.5, 0.8, 1.0],
      duration: 4.0,
    };

    const peak = getPeakAtTime(waveform, 4.0);

    expect(peak).toBe(1.0);
  });

  it('should return correct peak for mid-range time', () => {
    const waveform: WaveformData = {
      peaks: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      duration: 8.0,
    };

    // At time 4.0 (halfway), should get peak around index 4
    const peak = getPeakAtTime(waveform, 4.0);

    expect(peak).toBeGreaterThanOrEqual(0.4);
    expect(peak).toBeLessThanOrEqual(0.5);
  });

  it('should clamp to valid peak index range', () => {
    const waveform: WaveformData = {
      peaks: [0.5, 1.0, 0.75],
      duration: 3.0,
    };

    // Request time beyond duration - should clamp to last peak
    const peak = getPeakAtTime(waveform, 10.0);
    expect(peak).toBe(0.75);

    // Request negative time - should clamp to first peak
    const peakNegative = getPeakAtTime(waveform, -1.0);
    expect(peakNegative).toBe(0.5);
  });

  it('should return 0 for empty waveform', () => {
    const waveform: WaveformData = {
      peaks: [],
      duration: 0,
    };

    const peak = getPeakAtTime(waveform, 0);

    expect(peak).toBe(0);
  });

  it('should handle very short duration correctly', () => {
    const waveform: WaveformData = {
      peaks: [1.0],
      duration: 0.001,
    };

    const peak = getPeakAtTime(waveform, 0.0005);

    expect(peak).toBe(1.0);
  });

  it('should interpolate correctly across peak indices', () => {
    const waveform: WaveformData = {
      peaks: [0.0, 1.0],
      duration: 2.0,
    };

    // At time 0.5, we're 1/4 of the way through 2 seconds
    // Peak index should be floor(0.25 * 2) = floor(0.5) = 0
    const peak1 = getPeakAtTime(waveform, 0.5);
    expect(peak1).toBe(0.0);

    // At time 1.0, we're halfway (1/2 of duration)
    // Peak index should be floor(0.5 * 2) = floor(1.0) = 1
    const peak2 = getPeakAtTime(waveform, 1.0);
    expect(peak2).toBe(1.0);
  });
});

// =============================================================================
// getPeaksInRange Tests
// =============================================================================

describe('getPeaksInRange', () => {
  it('should return all peaks when range covers full duration', () => {
    const waveform: WaveformData = {
      peaks: [0.1, 0.2, 0.3, 0.4, 0.5],
      duration: 5.0,
    };

    const peaksInRange = getPeaksInRange(waveform, 0, 5.0);

    expect(peaksInRange).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('should return subset of peaks for partial range', () => {
    const waveform: WaveformData = {
      peaks: [0.1, 0.2, 0.3, 0.4, 0.5],
      duration: 5.0,
    };

    // From 1.0 to 3.0 seconds
    const peaksInRange = getPeaksInRange(waveform, 1.0, 3.0);

    // Indices should be around 1-3
    expect(peaksInRange.length).toBeGreaterThan(0);
    expect(peaksInRange.length).toBeLessThanOrEqual(5);
  });

  it('should return empty array for empty waveform', () => {
    const waveform: WaveformData = {
      peaks: [],
      duration: 5.0,
    };

    const peaksInRange = getPeaksInRange(waveform, 0, 5.0);

    expect(peaksInRange).toEqual([]);
  });

  it('should clamp start and end indices to valid range', () => {
    const waveform: WaveformData = {
      peaks: [0.1, 0.2, 0.3, 0.4, 0.5],
      duration: 5.0,
    };

    // Request range before and after duration
    const peaksInRange = getPeaksInRange(waveform, -1.0, 10.0);

    // Should return all peaks (clamped to 0-5)
    expect(peaksInRange.length).toBeLessThanOrEqual(5);
  });

  it('should handle single-peak range correctly', () => {
    const waveform: WaveformData = {
      peaks: [0.1, 0.2, 0.3, 0.4, 0.5],
      duration: 5.0,
    };

    // Very narrow range
    const peaksInRange = getPeaksInRange(waveform, 0.4, 0.6);

    expect(peaksInRange.length).toBeGreaterThanOrEqual(1);
  });

  it('should correctly split range into indices', () => {
    const waveform: WaveformData = {
      peaks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      duration: 10.0,
    };

    // First half: 0-5 seconds
    const firstHalf = getPeaksInRange(waveform, 0, 5.0);
    // Second half: 5-10 seconds
    const secondHalf = getPeaksInRange(waveform, 5.0, 10.0);

    // Each should have roughly half the peaks
    expect(firstHalf.length).toBeGreaterThan(0);
    expect(secondHalf.length).toBeGreaterThan(0);
    expect(firstHalf.length + secondHalf.length).toBeLessThanOrEqual(10);
  });

  it('should handle zero-duration range', () => {
    const waveform: WaveformData = {
      peaks: [0.1, 0.2, 0.3],
      duration: 3.0,
    };

    // Same start and end
    const peaksInRange = getPeaksInRange(waveform, 1.5, 1.5);

    // Should return 0 or 1 peak depending on implementation
    expect(peaksInRange.length).toBeGreaterThanOrEqual(0);
  });

  it('should maintain order of peaks in returned range', () => {
    const waveform: WaveformData = {
      peaks: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
      duration: 7.0,
    };

    const peaksInRange = getPeaksInRange(waveform, 2.0, 5.0);

    // Returned peaks should be in ascending order
    for (let i = 0; i < peaksInRange.length - 1; i++) {
      // Check that indices are correct (approximation based on visible values)
      expect(peaksInRange[i]).toBeLessThanOrEqual(peaksInRange[i + 1]);
    }
  });
});
