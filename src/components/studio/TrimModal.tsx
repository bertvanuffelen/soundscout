/**
 * TrimModal - Modal for trimming audio clips
 *
 * Features:
 * - Waveform visualization with trim handles
 * - Drag handles to adjust trim start/end
 * - Preview playback of trimmed region
 * - Apply/Cancel/Reset actions
 */

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Play, Square, RotateCcw } from 'lucide-react';
import { Waveform } from './Waveform';
import { audioService } from '../../services/AudioService';
import type { Clip, Sample } from '../../types';
import type { WaveformData } from '../../utils/waveform';
import { MIN_TRIM_DURATION_SECONDS } from '../../constants/config';
import { SampleIcon } from '../../utils/iconMap';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { usePreviewPlayhead } from '../../hooks/usePreviewPlayhead';

interface TrimModalProps {
  clip: Clip;
  sample: Sample;
  isOpen: boolean;
  onClose: () => void;
  onApply: (trimStart: number, trimEnd: number) => void;
}

export const TrimModal = memo(function TrimModal({
  clip,
  sample,
  isOpen,
  onClose,
  onApply,
}: TrimModalProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Waveform data
  const [waveform, setWaveform] = useState<WaveformData | null>(null);

  // Trim state
  const [trimStart, setTrimStart] = useState(clip.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(clip.trimEnd ?? sample.duration);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  // V2 Fase 1: de afspeellijn loopt via de gedeelde frame-lus, direct in de DOM.
  const handlePreviewFinished = useCallback(() => setIsPlaying(false), []);
  const {
    lineRef: playheadLineRef,
    start: startPlayhead,
    stop: stopPlayhead,
  } = usePreviewPlayhead(handlePreviewFinished);

  // Drag state
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  // Container width for waveform
  const [containerWidth, setContainerWidth] = useState(300);

  // Load waveform and reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const waveformData = audioService.getWaveform(sample.id);
      setWaveform(waveformData);
      setTrimStart(clip.trimStart ?? 0);
      setTrimEnd(clip.trimEnd ?? sample.duration);
      setIsPlaying(false);
      stopPlayhead();
    }

    return () => {
      // Cleanup on close
      stopPlayhead();
      audioService.stopSample(sample.id);
    };
  }, [isOpen, sample.id, clip.trimStart, clip.trimEnd, sample.duration, stopPlayhead]);

  // Update container width on resize
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isOpen]);

  // Handle trim value changes
  const handleTrimChange = useCallback(
    (newStart: number, newEnd: number) => {
      // Enforce minimum duration
      if (newEnd - newStart < MIN_TRIM_DURATION_SECONDS) return;

      // Clamp to valid range
      const clampedStart = Math.max(0, Math.min(newStart, sample.duration - MIN_TRIM_DURATION_SECONDS));
      const clampedEnd = Math.max(MIN_TRIM_DURATION_SECONDS, Math.min(newEnd, sample.duration));

      setTrimStart(clampedStart);
      setTrimEnd(clampedEnd);
    },
    [sample.duration],
  );

  // Preview playback
  const handlePreview = useCallback(() => {
    if (isPlaying) {
      // Stop playback
      audioService.stopSample(sample.id);
      setIsPlaying(false);
      stopPlayhead();
      return;
    }

    // Start playback
    setIsPlaying(true);

    const duration = trimEnd - trimStart;
    audioService.playSampleRegion(sample.id, trimStart, duration);
    startPlayhead(trimStart, duration, waveform?.duration ?? sample.duration);
  }, [isPlaying, sample.id, sample.duration, trimStart, trimEnd, waveform, startPlayhead, stopPlayhead]);

  // Reset to original
  const handleReset = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(sample.duration);
  }, [sample.duration]);

  // Apply and close
  const handleApply = useCallback(() => {
    // Stop any playback
    audioService.stopSample(sample.id);
    stopPlayhead();

    onApply(trimStart, trimEnd);
    onClose();
  }, [trimStart, trimEnd, onApply, onClose, sample.id, stopPlayhead]);

  // Handle pointer events for drag handles
  const handlePointerDown = useCallback(
    (handle: 'start' | 'end') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current || !waveform) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const time = (x / rect.width) * waveform.duration;

      if (dragging === 'start') {
        handleTrimChange(time, trimEnd);
      } else {
        handleTrimChange(trimStart, time);
      }
    },
    [dragging, waveform, trimStart, trimEnd, handleTrimChange],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    audioService.stopSample(sample.id);
    stopPlayhead();
    onClose();
  }, [onClose, sample.id, stopPlayhead]);

  // Gedeeld dialog-gedrag: Escape sluit (annuleert), focus trap, scroll-lock
  const modalRef = useModalBehavior(handleClose, { isOpen });

  if (!isOpen) return null;

  const trimDuration = trimEnd - trimStart;
  const startPercent = waveform ? (trimStart / waveform.duration) * 100 : 0;
  const endPercent = waveform ? (trimEnd / waveform.duration) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: sample.color }}
            />
            <SampleIcon name={sample.icon} size={18} className="text-neutral-600" />
            <h2 className="text-base font-bold text-neutral-900">
              {t('studio.trimModal.title')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Waveform with trim handles */}
        <div className="p-4">
          <div
            ref={containerRef}
            className="relative bg-neutral-100 rounded-xl touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {waveform ? (
              <>
                {/* Waveform visualization */}
                <div className="p-2">
                  <div className="relative">
                    <Waveform
                      data={waveform}
                      color={sample.color}
                      width={containerWidth - 16}
                      height={100}
                      trimRegion={[trimStart, trimEnd]}
                    />
                    {/* Afspeellijn van het voorbeeld: per frame verplaatst (usePreviewPlayhead) */}
                    <div
                      ref={playheadLineRef}
                      className="hidden absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-error-500 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Left trim handle */}
                <div
                  className="absolute top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center"
                  style={{ left: `clamp(0px, calc(${startPercent}% - 12px), calc(100% - 24px))` }}
                  onPointerDown={handlePointerDown('start')}
                >
                  <div className="w-1.5 h-12 bg-accent-500 rounded-full shadow-md" />
                </div>

                {/* Right trim handle */}
                <div
                  className="absolute top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center"
                  style={{ left: `clamp(0px, calc(${endPercent}% - 12px), calc(100% - 24px))` }}
                  onPointerDown={handlePointerDown('end')}
                >
                  <div className="w-1.5 h-12 bg-accent-500 rounded-full shadow-md" />
                </div>
              </>
            ) : (
              <div className="h-[116px] flex items-center justify-center">
                <span className="text-sm text-neutral-400">{t('common.loading')}</span>
              </div>
            )}
          </div>

          {/* Time display */}
          <div className="flex justify-between mt-3 text-xs">
            <span className="text-neutral-500 font-mono">
              {trimStart.toFixed(2)}s
            </span>
            <span className="font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
              {trimDuration.toFixed(2)}s
            </span>
            <span className="text-neutral-500 font-mono">
              {trimEnd.toFixed(2)}s
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            {/* Preview button */}
            <button
              onClick={handlePreview}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                isPlaying
                  ? 'bg-error-100 text-error-600 hover:bg-error-200'
                  : 'bg-white border border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              {isPlaying ? <Square size={16} /> : <Play size={16} />}
              <span className="text-sm font-medium">
                {t('studio.trimModal.preview')}
              </span>
            </button>

            {/* Reset button */}
            <button
              onClick={handleReset}
              className="p-2 text-neutral-500 hover:bg-neutral-200 rounded-lg transition-colors"
              title={t('studio.trimModal.reset')}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Cancel button */}
            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              {t('studio.trimModal.cancel')}
            </button>

            {/* Apply button */}
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors"
            >
              {t('studio.trimModal.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
