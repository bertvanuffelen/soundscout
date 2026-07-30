/**
 * SequencerTrimModal — trim per spoor (één trim voor alle stappen).
 *
 * Hergebruikt de Waveform-component en waveform-utils; de audio komt uit
 * de eigen engine-buffers (niet uit AudioService). Preview speelt de
 * getrimde regio via de engine.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, RotateCcw, Square } from 'lucide-react';
import { Button, Modal } from '../ui';
import { Waveform } from '../studio/Waveform';
import type { Sample } from '../../types';
import type { SequencerTrack } from '../../types/sequencer';
import type { WaveformData } from '../../utils/waveform';
import { createWaveformData } from '../../utils/waveform';
import { MIN_TRIM_DURATION_SECONDS } from '../../constants/config';
import { useSequencerStore } from '../../stores/sequencerStore';
import { sequencerEngine } from '../../services/SequencerEngine';
import { stepSpanCells } from '../../utils/sequencer';

interface SequencerTrimModalProps {
  isOpen: boolean;
  track: SequencerTrack;
  sample: Sample;
  onClose: () => void;
}

export default function SequencerTrimModal({
  isOpen,
  track,
  sample,
  onClose,
}: SequencerTrimModalProps) {
  const { t } = useTranslation();
  const setTrackTrim = useSequencerStore((s) => s.setTrackTrim);
  const bpm = useSequencerStore(
    (s) => s.sequences.find((seq) => seq.id === s.activeSequenceId)?.bpm ?? 120
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [trimStart, setTrimStart] = useState(track.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(track.trimEnd ?? sample.duration);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Golfvorm laden (buffer zo nodig eerst binnenhalen via de engine)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    setTrimStart(track.trimStart ?? 0);
    setTrimEnd(track.trimEnd ?? sample.duration);

    const buildWaveform = () => {
      const audioBuffer = sequencerEngine.getAudioBuffer(sample.id);
      if (audioBuffer && !cancelled) {
        setWaveform(createWaveformData(audioBuffer));
        return true;
      }
      return false;
    };

    if (!buildWaveform()) {
      void sequencerEngine.ensureBuffer(sample).then(() => {
        if (!cancelled) buildWaveform();
      });
    }

    return () => {
      cancelled = true;
      sequencerEngine.stopPreview();
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [isOpen, sample, track.trimStart, track.trimEnd]);

  // Containerbreedte volgen
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isOpen, waveform]);

  const handleTrimChange = useCallback(
    (newStart: number, newEnd: number) => {
      if (newEnd - newStart < MIN_TRIM_DURATION_SECONDS) return;
      setTrimStart(
        Math.max(0, Math.min(newStart, sample.duration - MIN_TRIM_DURATION_SECONDS))
      );
      setTrimEnd(
        Math.max(MIN_TRIM_DURATION_SECONDS, Math.min(newEnd, sample.duration))
      );
    },
    [sample.duration]
  );

  // --- Handvat-drag (pointer events) ---

  const handlePointerDown = useCallback(
    (handle: 'start' | 'end') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
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
    [dragging, waveform, trimStart, trimEnd, handleTrimChange]
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  // --- Preview van de getrimde regio ---

  const handlePreview = useCallback(() => {
    if (isPreviewing) {
      sequencerEngine.stopPreview();
      setIsPreviewing(false);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      return;
    }
    const duration = trimEnd - trimStart;
    void sequencerEngine.previewSample(sample, trimStart, duration);
    setIsPreviewing(true);
    previewTimer.current = setTimeout(
      () => setIsPreviewing(false),
      (duration + 0.1) * 1000
    );
  }, [isPreviewing, sample, trimStart, trimEnd]);

  const handleApply = useCallback(() => {
    sequencerEngine.stopPreview();
    setTrackTrim(track.id, trimStart, trimEnd);
    onClose();
  }, [setTrackTrim, track.id, trimStart, trimEnd, onClose]);

  const handleClose = useCallback(() => {
    sequencerEngine.stopPreview();
    onClose();
  }, [onClose]);

  const trimDuration = trimEnd - trimStart;
  const startPercent = waveform ? (trimStart / waveform.duration) * 100 : 0;
  const endPercent = waveform ? (trimEnd / waveform.duration) * 100 : 100;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('sequencer.trim.title')} size="lg">
      <p className="text-xs text-text-muted mb-3">{t('sequencer.trim.hint')}</p>

      {/* Golfvorm met handvatten */}
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
                width={Math.max(50, containerWidth - 16)}
                height={100}
                trimRegion={[trimStart, trimEnd]}
              />
            </div>
            <div
              className="absolute top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center"
              style={{
                left: `clamp(0px, calc(${startPercent}% - 12px), calc(100% - 24px))`,
              }}
              onPointerDown={handlePointerDown('start')}
            >
              <div className="w-1.5 h-12 bg-accent-500 rounded-full shadow-md" />
            </div>
            <div
              className="absolute top-0 bottom-0 w-6 cursor-ew-resize flex items-center justify-center"
              style={{
                left: `clamp(0px, calc(${endPercent}% - 12px), calc(100% - 24px))`,
              }}
              onPointerDown={handlePointerDown('end')}
            >
              <div className="w-1.5 h-12 bg-accent-500 rounded-full shadow-md" />
            </div>
          </>
        ) : (
          <div className="h-[116px] flex items-center justify-center">
            <span className="text-sm text-text-muted">{t('common.loading')}</span>
          </div>
        )}
      </div>

      {/* Tijd + vakjes-indicatie */}
      <div className="flex justify-between items-center mt-3 mb-5 text-xs">
        <span className="text-text-muted font-mono">{trimStart.toFixed(2)}s</span>
        <span className="font-medium text-text-main bg-neutral-100 px-2 py-0.5 rounded">
          {trimDuration.toFixed(2)}s ·{' '}
          {t('sequencer.trim.cells', { cells: stepSpanCells(trimDuration, bpm) })}
        </span>
        <span className="text-text-muted font-mono">{trimEnd.toFixed(2)}s</span>
      </div>

      {/* Acties */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handlePreview}>
          {isPreviewing ? (
            <Square className="w-4 h-4 mr-1.5" aria-hidden />
          ) : (
            <Play className="w-4 h-4 mr-1.5" aria-hidden />
          )}
          {t('sequencer.preview')}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setTrimStart(0);
            setTrimEnd(sample.duration);
          }}
          className="!text-text-muted hover:!bg-neutral-100"
          aria-label={t('common.retry')}
        >
          <RotateCcw className="w-4 h-4" aria-hidden />
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={handleClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleApply}>
          {t('sequencer.trim.save')}
        </Button>
      </div>
    </Modal>
  );
}
