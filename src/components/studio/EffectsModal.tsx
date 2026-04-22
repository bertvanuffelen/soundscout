/**
 * EffectsModal - Per-clip audio effects: fade in/out, pitch, reverb (#79)
 *
 * Replaces EffectsPopover. Shows a modal with:
 * - Waveform visualization with draggable fade handles
 * - Pitch slider (-12 to +12 semitones)
 * - Reverb slider (0-100% wet)
 * - Preview playback with all effects applied
 *
 * Pattern follows TrimModal (pointer events, waveform, preview).
 */

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Play, Square, RotateCcw } from 'lucide-react';
import { Waveform } from './Waveform';
import { audioService } from '../../services/AudioService';
import { SampleIcon } from '../../utils/iconMap';
import type { Clip, Sample, ClipEffects } from '../../types';
import type { WaveformData } from '../../utils/waveform';

interface EffectsModalProps {
  clip: Clip;
  sample: Sample;
  isOpen: boolean;
  onClose: () => void;
  onApply: (effects: Partial<ClipEffects>) => void;
}

export const EffectsModal = memo(function EffectsModal({
  clip,
  sample,
  isOpen,
  onClose,
  onApply,
}: EffectsModalProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Waveform data ---
  const [waveform, setWaveform] = useState<WaveformData | null>(null);

  // --- Local effects state (apply on confirm) ---
  const [fadeIn, setFadeIn] = useState(clip.effects?.fadeIn ?? 0);
  const [fadeOut, setFadeOut] = useState(clip.effects?.fadeOut ?? 0);
  const [pitch, setPitch] = useState(clip.effects?.pitch ?? 0);
  const [reverb, setReverb] = useState(clip.effects?.reverb ?? 0);

  // --- Playback state ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState<number | undefined>(undefined);
  const playbackRef = useRef<{ animationId: number | null; startTime: number }>({
    animationId: null,
    startTime: 0,
  });

  // --- Drag state for fade handles ---
  const [dragging, setDragging] = useState<'fadeIn' | 'fadeOut' | null>(null);

  // --- Container width ---
  const [containerWidth, setContainerWidth] = useState(300);

  // --- Derived values ---
  const trimStart = clip.trimStart ?? 0;
  const trimEnd = clip.trimEnd ?? sample.duration;
  const clipDuration = trimEnd - trimStart;

  // --- Initialize state when modal opens ---
  useEffect(() => {
    if (isOpen) {
      const waveformData = audioService.getWaveform(sample.id);
      setWaveform(waveformData);
      setFadeIn(clip.effects?.fadeIn ?? 0);
      setFadeOut(clip.effects?.fadeOut ?? 0);
      setPitch(clip.effects?.pitch ?? 0);
      setReverb(clip.effects?.reverb ?? 0);
      setIsPlaying(false);
      setPlayheadPos(undefined);
    }

    return () => {
      if (playbackRef.current.animationId) {
        cancelAnimationFrame(playbackRef.current.animationId);
      }
      audioService.stopPreviewWithEffects();
    };
  }, [isOpen, sample.id, clip.effects]);

  // --- Container width tracking ---
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

  // --- Fade handle drag (pointer events) ---

  const handlePointerDown = useCallback(
    (handle: 'fadeIn' | 'fadeOut') => (e: React.PointerEvent) => {
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

      if (dragging === 'fadeIn') {
        // Fade-in handle: drag from left, value = time offset from trimStart
        const fadeDur = Math.max(0, Math.min(time - trimStart, clipDuration - fadeOut));
        setFadeIn(Math.round(fadeDur * 10) / 10); // round to 0.1s
      } else {
        // Fade-out handle: drag from right, value = time offset from trimEnd
        const fadeDur = Math.max(0, Math.min(trimEnd - time, clipDuration - fadeIn));
        setFadeOut(Math.round(fadeDur * 10) / 10);
      }
    },
    [dragging, waveform, trimStart, trimEnd, clipDuration, fadeIn, fadeOut],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // --- Preview playback ---
  const handlePreview = useCallback(() => {
    if (isPlaying) {
      audioService.stopPreviewWithEffects();
      setIsPlaying(false);
      setPlayheadPos(undefined);
      if (playbackRef.current.animationId) {
        cancelAnimationFrame(playbackRef.current.animationId);
        playbackRef.current.animationId = null;
      }
      return;
    }

    setIsPlaying(true);
    setPlayheadPos(trimStart);

    audioService.playSampleWithEffects(sample.id, trimStart, clipDuration, {
      pitch,
      reverb,
      fadeIn,
      fadeOut,
    });

    playbackRef.current.startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - playbackRef.current.startTime) / 1000;

      if (elapsed >= clipDuration) {
        setIsPlaying(false);
        setPlayheadPos(undefined);
        playbackRef.current.animationId = null;
        return;
      }

      setPlayheadPos(trimStart + elapsed);
      playbackRef.current.animationId = requestAnimationFrame(animate);
    };

    playbackRef.current.animationId = requestAnimationFrame(animate);
  }, [isPlaying, sample.id, trimStart, clipDuration, pitch, reverb, fadeIn, fadeOut]);

  // --- Slider handlers ---
  const handlePitchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPitch(Number(e.target.value));
  }, []);

  const handleReverbChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setReverb(Number(e.target.value));
  }, []);

  // --- Reset all ---
  const handleReset = useCallback(() => {
    setFadeIn(0);
    setFadeOut(0);
    setPitch(0);
    setReverb(0);
  }, []);

  // --- Apply and close ---
  const handleApply = useCallback(() => {
    audioService.stopPreviewWithEffects();
    if (playbackRef.current.animationId) {
      cancelAnimationFrame(playbackRef.current.animationId);
    }
    onApply({ fadeIn, fadeOut, pitch, reverb });
    onClose();
  }, [fadeIn, fadeOut, pitch, reverb, onApply, onClose]);

  // --- Close with cleanup ---
  const handleClose = useCallback(() => {
    audioService.stopPreviewWithEffects();
    if (playbackRef.current.animationId) {
      cancelAnimationFrame(playbackRef.current.animationId);
    }
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  // --- Fade handle positions as percentages ---
  const fadeInPercent = waveform
    ? ((trimStart + fadeIn) / waveform.duration) * 100
    : 0;
  const fadeOutPercent = waveform
    ? ((trimEnd - fadeOut) / waveform.duration) * 100
    : 100;

  const hasChanges = fadeIn !== (clip.effects?.fadeIn ?? 0) ||
    fadeOut !== (clip.effects?.fadeOut ?? 0) ||
    pitch !== (clip.effects?.pitch ?? 0) ||
    reverb !== (clip.effects?.reverb ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* --- Header --- */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: sample.color }}
            />
            <SampleIcon name={sample.icon} size={18} className="text-neutral-600" />
            <h2 className="text-base font-bold text-neutral-900">
              {t('studio.effectsModal.title')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* --- Waveform with fade handles --- */}
        <div className="p-4 pb-2">
          <div
            ref={containerRef}
            className="relative bg-neutral-100 rounded-xl touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {waveform ? (
              <>
                <div className="p-2">
                  <Waveform
                    data={waveform}
                    color={sample.color}
                    width={containerWidth - 16}
                    height={100}
                    trimRegion={[trimStart, trimEnd]}
                    fadeRegion={{ fadeIn, fadeOut }}
                    playheadPosition={playheadPos}
                  />
                </div>

                {/* Fade-in handle — always visible at left trim edge */}
                <div
                  className="absolute top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center"
                  style={{ left: `clamp(0px, calc(${fadeInPercent}% - 12px), calc(100% - 24px))` }}
                  onPointerDown={handlePointerDown('fadeIn')}
                >
                  <div className="w-1.5 h-12 bg-accent-500 rounded-full shadow-md" />
                </div>

                {/* Fade-out handle — always visible at right trim edge */}
                <div
                  className="absolute top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center"
                  style={{ left: `clamp(0px, calc(${fadeOutPercent}% - 12px), calc(100% - 24px))` }}
                  onPointerDown={handlePointerDown('fadeOut')}
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

          {/* Fade duration labels */}
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-accent-600 font-medium">
              {fadeIn > 0 ? t('studio.fadeInDuration', { duration: fadeIn.toFixed(1) }) : t('studio.fadeIn')}
            </span>
            <span className="text-accent-600 font-medium">
              {fadeOut > 0 ? t('studio.fadeOutDuration', { duration: fadeOut.toFixed(1) }) : t('studio.fadeOut')}
            </span>
          </div>
        </div>

        {/* --- Pitch + Reverb sliders --- */}
        <div className="px-4 pb-4 space-y-3">
          {/* Pitch slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-neutral-600">
                {t('studio.pitch')}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-400 tabular-nums">
                  {pitch > 0 ? `+${pitch}` : pitch}
                </span>
                {pitch !== 0 && (
                  <button
                    onClick={() => setPitch(0)}
                    aria-label={t('studio.resetEffect')}
                    className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 w-7 text-right shrink-0">
                {t('studio.pitchLow')}
              </span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={pitch}
                onChange={handlePitchChange}
                onDoubleClick={() => setPitch(0)}
                aria-label={t('studio.pitch')}
                className="
                  flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                  bg-neutral-200 accent-accent-500
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500
                  [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
                "
              />
              <span className="text-[10px] text-neutral-400 w-7 shrink-0">
                {t('studio.pitchHigh')}
              </span>
            </div>
          </div>

          {/* Reverb slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-neutral-600">
                {t('studio.reverbLabel')}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-400 tabular-nums">
                  {reverb}%
                </span>
                {reverb !== 0 && (
                  <button
                    onClick={() => setReverb(0)}
                    aria-label={t('studio.resetEffect')}
                    className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 w-7 text-right shrink-0">
                {t('studio.reverbDry')}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={reverb}
                onChange={handleReverbChange}
                onDoubleClick={() => setReverb(0)}
                aria-label={t('studio.reverbLabel')}
                className="
                  flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                  bg-neutral-200 accent-accent-500
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500
                  [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
                "
              />
              <span className="text-[10px] text-neutral-400 w-7 shrink-0">
                {t('studio.reverbWet')}
              </span>
            </div>
          </div>
        </div>

        {/* --- Actions --- */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-200">
          <div className="flex items-center gap-2">
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
                {t('studio.effectsModal.preview')}
              </span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 text-neutral-500 hover:bg-neutral-200 rounded-lg transition-colors"
              title={t('studio.effectsModal.reset')}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              {t('studio.effectsModal.cancel')}
            </button>

            <button
              onClick={handleApply}
              disabled={!hasChanges}
              className="px-4 py-1.5 text-sm font-medium text-text-main bg-accent-400 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {t('studio.effectsModal.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
