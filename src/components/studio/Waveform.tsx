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
  /** Optional fade durations in seconds { fadeIn, fadeOut } */
  fadeRegion?: { fadeIn: number; fadeOut: number };
  /** Optional current playhead position in seconds */
  playheadPosition?: number;
}

/** Fade-in curve (0→1): x² — gradual build from silence */
function fadeInCurve(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return p * p;
}

/** Fade-out curve (1→0): (1-x)² — smooth descent to silence */
function fadeOutCurve(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return (1 - p) * (1 - p);
}

export const Waveform = memo(function Waveform({
  data,
  color,
  width,
  height,
  trimRegion,
  fadeRegion,
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

    // Fade color: neutral-400 (#9ca3af) for the fading portion
    const FADE_COLOR = '#9ca3af';

    for (let i = 0; i < actualBarCount; i++) {
      const peakIndex = Math.floor((i / actualBarCount) * barCount);
      const peak = data.peaks[peakIndex] ?? 0;

      const x = (i / actualBarCount) * width;

      // Check if bar is in trim region
      const peakTime = (i / actualBarCount) * data.duration;
      const inTrimRegion = peakTime >= trimStart && peakTime <= trimEnd;

      // Calculate fade factor (#79) — affects both height and opacity
      let fadeFactor = 1;
      if (fadeRegion && inTrimRegion) {
        const fadeInEnd = trimStart + fadeRegion.fadeIn;
        const fadeOutStart = trimEnd - fadeRegion.fadeOut;
        if (fadeRegion.fadeIn > 0 && peakTime < fadeInEnd) {
          // Fade-in: logarithmic (fast rise)
          fadeFactor = fadeInCurve((peakTime - trimStart) / fadeRegion.fadeIn);
        } else if (fadeRegion.fadeOut > 0 && peakTime > fadeOutStart) {
          // Fade-out: exponential (even descent)
          const progress = (peakTime - fadeOutStart) / fadeRegion.fadeOut;
          fadeFactor = fadeOutCurve(progress);
        }
        fadeFactor = Math.max(0.06, fadeFactor);
      }

      // Bar height scales with fade factor — visually shows the volume decrease
      const barHeight = Math.max(2, peak * maxBarHeight * fadeFactor);

      // Set color based on trim region + fade
      if (!inTrimRegion) {
        ctx.fillStyle = `${color}40`;
      } else if (fadeFactor < 1) {
        // Blend toward neutral (fade color) as fade progresses
        // At fadeFactor=1 → full sample color, at fadeFactor=0 → fade color
        const alphaHex = Math.round(fadeFactor * 255).toString(16).padStart(2, '0');
        // Draw fade-color base layer
        const fadeAlpha = Math.round((1 - fadeFactor) * 180).toString(16).padStart(2, '0');
        ctx.fillStyle = `${FADE_COLOR}${fadeAlpha}`;
        ctx.fillRect(
          x,
          centerY - barHeight / 2,
          Math.max(barWidth, width / actualBarCount - gap),
          barHeight,
        );
        // Draw sample color on top, fading out
        ctx.fillStyle = `${color}${alphaHex}`;
      } else {
        ctx.fillStyle = color;
      }

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
  }, [data, color, width, height, trimRegion, fadeRegion, playheadPosition]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
});
