/**
 * Waveform - Canvas-based audio waveform visualization
 *
 * Displays waveform peaks with optional trim region highlighting
 * and playhead position indicator.
 */

import { memo, useEffect, useRef } from 'react';
import type { WaveformData } from '../../utils/waveform';
import { WAVEFORM_BAR_WIDTH_PX, WAVEFORM_GAP_PX } from '../../constants/config';

interface WaveformProps {
  /** Waveform data with peaks and duration */
  data: WaveformData;
  /** Color for the waveform bars */
  color: string;
  /** Width of the canvas in pixels */
  width: number;
  /** Height of the canvas in pixels */
  height: number;
  /** Optional trim region [startSeconds, endSeconds] */
  trimRegion?: [number, number];
  /** Optional current playhead position in seconds */
  playheadPosition?: number;
}

export const Waveform = memo(function Waveform({
  data,
  color,
  width,
  height,
  trimRegion,
  playheadPosition,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (handle high DPI displays)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const barWidth = WAVEFORM_BAR_WIDTH_PX;
    const gap = WAVEFORM_GAP_PX;
    const barCount = data.peaks.length;

    // Calculate bar positions
    const totalBarWidth = barWidth + gap;
    const actualBarCount = Math.min(barCount, Math.floor(width / totalBarWidth));

    // Trim region boundaries
    const trimStart = trimRegion?.[0] ?? 0;
    const trimEnd = trimRegion?.[1] ?? data.duration;

    // Convert trim to pixel positions
    const trimStartPx = (trimStart / data.duration) * width;
    const trimEndPx = (trimEnd / data.duration) * width;

    // Draw dimmed areas outside trim region
    if (trimRegion) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, trimStartPx, height);
      ctx.fillRect(trimEndPx, 0, width - trimEndPx, height);
    }

    // Draw waveform bars
    const centerY = height / 2;
    const maxBarHeight = height - 8; // Leave some padding

    for (let i = 0; i < actualBarCount; i++) {
      const peakIndex = Math.floor((i / actualBarCount) * barCount);
      const peak = data.peaks[peakIndex] ?? 0;
      const barHeight = Math.max(2, peak * maxBarHeight);

      const x = (i / actualBarCount) * width;

      // Check if bar is in trim region
      const peakTime = (i / actualBarCount) * data.duration;
      const inTrimRegion = peakTime >= trimStart && peakTime <= trimEnd;

      // Set color based on whether bar is in trim region
      ctx.fillStyle = inTrimRegion ? color : `${color}40`;

      // Draw centered bar
      ctx.fillRect(
        x,
        centerY - barHeight / 2,
        Math.max(barWidth, width / actualBarCount - gap),
        barHeight,
      );
    }

    // Draw playhead if provided
    if (playheadPosition !== undefined && playheadPosition >= 0) {
      const playheadX = (playheadPosition / data.duration) * width;
      ctx.fillStyle = '#EF4444'; // error-500 red
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }
  }, [data, color, width, height, trimRegion, playheadPosition]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
});
