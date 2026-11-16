/**
 * EffectsModal — "Vervormen" (V2 Fase 4; was "Effecten", #33/#79).
 *
 * Opent alleen vanaf een clip op de tijdlijn — en een clip is altijd een
 * geluid uit de eigen bibliotheek. Er is dus geen weg naar geluiden die de
 * leerling niet zelf verzameld heeft.
 *
 * Opbouw (goedgekeurde mockup, v2-mockup/FxModal):
 * - Kop: kleurstip · icoon · "Vervormen" · naam · lengte zoals gehoord
 * - Golfvorm met fade-handvatten — achterstevoren getekend als dat aan staat
 * - Links "Klank": toonhoogte, galm, fade in/uit (bestaand)
 * - Rechts "Vervormen · nieuw": snelheid (5 knoppen), achterstevoren, echo, filter
 * - Voet: Voorbeeld / alles terugzetten / Annuleren / Toepassen
 *
 * Tijd: de golfvorm-as staat in BRON-seconden (net als trim). Fades zijn
 * seconden zoals GEHOORD; bij snelheid ≠ 1 (of een uitgerekte loop) worden
 * de handvatten daarom omgerekend met de lengtefactor.
 */

import { memo, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Play, Square, RotateCcw, Rewind } from 'lucide-react';
import { Waveform } from './Waveform';
import { audioService } from '../../services/AudioService';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { CLIP_SPEEDS, type Clip, type Sample, type ClipEffects, type ClipSpeed } from '../../types';
import type { WaveformData } from '../../utils/waveform';
import { getClipLengthFactor } from '../../utils/audio';
import { resolveSampleKind } from '../../utils/sampleKinds';
import {
  NEUTRAL_VERVORMEN,
  changedVervormenFields,
  clampFades,
  toVervormenValues,
  type VervormenValues,
} from '../../utils/clipEffectsUi';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { usePreviewPlayhead } from '../../hooks/usePreviewPlayhead';

interface EffectsModalProps {
  clip: Clip;
  sample: Sample;
  /** Tempo van de compositie — voorbeeld en lengte kloppen dan met de export */
  bpm: number;
  isOpen: boolean;
  onClose: () => void;
  /** Alleen de gewijzigde velden */
  onApply: (effects: Partial<ClipEffects>) => void;
}

/** Neutrale verplichte ClipEffects-velden, alleen om de lengtefactor te berekenen */
const DEFAULTS_FOR_FACTOR = { volume: 0, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0 } as const;

const SPEED_LABELS: Record<ClipSpeed, string> = {
  0.5: '½×',
  0.75: '¾×',
  1: '1×',
  1.5: '1½×',
  2: '2×',
};

const RANGE_CLASS = `
  w-full h-1.5 rounded-full appearance-none cursor-pointer
  bg-neutral-200 accent-accent-500
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500
  [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
`;

/** Formatteer seconden met één decimaal, met komma in het Nederlands */
function formatSeconds(seconds: number, language: string): string {
  return seconds.toLocaleString(language.startsWith('nl') ? 'nl-NL' : 'en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

interface SliderRowProps {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  left: string;
  right: string;
  neutral?: number;
  /** Toon een streepje op de neutrale stand (filter: midden = uit) */
  showNeutralMark?: boolean;
  resetLabel: string;
  onChange: (value: number) => void;
}

function SliderRow({
  label, value, display, min, max, step, left, right,
  neutral = 0, showNeutralMark = false, resetLabel, onChange,
}: SliderRowProps) {
  const neutralPercent = ((neutral - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1 min-h-6">
        <span className="text-xs font-semibold text-text-main">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted tabular-nums">{display}</span>
          {value !== neutral && (
            <button
              type="button"
              onClick={() => onChange(neutral)}
              aria-label={`${resetLabel}: ${label}`}
              title={resetLabel}
              className="icon-btn !min-w-6 !min-h-6 rounded text-text-muted hover:text-text-main hover:bg-neutral-100 transition-colors"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted w-12 text-right shrink-0">{left}</span>
        <div className="relative flex-1 flex items-center h-8">
          {showNeutralMark && (
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 w-0.5 -translate-x-1/2 rounded bg-neutral-400 pointer-events-none"
              style={{ left: `${neutralPercent}%` }}
            />
          )}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onDoubleClick={() => onChange(neutral)}
            aria-label={label}
            aria-valuetext={display}
            className={cn(RANGE_CLASS, 'relative')}
          />
        </div>
        <span className="text-xs text-text-muted w-12 shrink-0">{right}</span>
      </div>
    </div>
  );
}

function ColumnTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">{children}</p>
  );
}

export const EffectsModal = memo(function EffectsModal({
  clip,
  sample,
  bpm,
  isOpen,
  onClose,
  onApply,
}: EffectsModalProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Waveform data ---
  const [waveform, setWaveform] = useState<WaveformData | null>(null);

  // --- Lokale waarden (pas bij Toepassen naar de store) ---
  const [initial, setInitial] = useState<VervormenValues>(() => toVervormenValues(clip.effects));
  const [values, setValues] = useState<VervormenValues>(initial);

  // --- Playback state ---
  const [isPlaying, setIsPlaying] = useState(false);
  const handlePreviewFinished = useCallback(() => setIsPlaying(false), []);
  const {
    lineRef: playheadLineRef,
    start: startPlayhead,
    stop: stopPlayhead,
  } = usePreviewPlayhead(handlePreviewFinished);

  // --- Drag state for fade handles ---
  const [dragging, setDragging] = useState<'fadeIn' | 'fadeOut' | null>(null);

  // --- Container width ---
  const [containerWidth, setContainerWidth] = useState(300);

  // --- Afgeleide waarden ---
  const trimStart = clip.trimStart ?? 0;
  const trimEnd = clip.trimEnd ?? sample.duration;
  /** Getrimde lengte in bron-seconden */
  const sourceDuration = trimEnd - trimStart;
  /** Hoe veel langer/korter het klinkt (snelheid + tempo-uitrekking van loops) */
  const lengthFactor = getClipLengthFactor({ effects: { ...DEFAULTS_FOR_FACTOR, speed: values.speed } }, sample, bpm);
  /** Lengte zoals de leerling hem hoort — ook de grens voor fades */
  const heardDuration = sourceDuration * lengthFactor;

  // --- Initialiseer bij openen ---
  useEffect(() => {
    if (isOpen) {
      setWaveform(audioService.getWaveform(sample.id));
      const start = toVervormenValues(clip.effects);
      setInitial(start);
      setValues(start);
      setIsPlaying(false);
      stopPlayhead();
    }

    return () => {
      stopPlayhead();
      audioService.stopPreviewWithEffects();
    };
  }, [isOpen, sample.id, clip.effects, stopPlayhead]);

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

  const update = useCallback((patch: Partial<VervormenValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  }, []);

  // Snelheid verandert de lengte: fades die niet meer passen krimpen mee
  const handleSpeedChange = useCallback(
    (speed: ClipSpeed) => {
      setValues((prev) => {
        const factor = getClipLengthFactor({ effects: { ...DEFAULTS_FOR_FACTOR, speed } }, sample, bpm);
        return { ...prev, speed, ...clampFades(prev.fadeIn, prev.fadeOut, sourceDuration * factor) };
      });
    },
    [sample, bpm, sourceDuration],
  );

  // --- Fade handle drag (pointer events) ---
  const handlePointerDown = useCallback(
    (handle: 'fadeIn' | 'fadeOut') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current || !waveform) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const time = (x / rect.width) * waveform.duration; // bron-seconden

      setValues((prev) => {
        if (dragging === 'fadeIn') {
          const heard = (time - trimStart) * lengthFactor;
          const fadeIn = Math.max(0, Math.min(heard, heardDuration - prev.fadeOut));
          return { ...prev, fadeIn: Math.floor(fadeIn * 10) / 10 };
        }
        const heard = (trimEnd - time) * lengthFactor;
        const fadeOut = Math.max(0, Math.min(heard, heardDuration - prev.fadeIn));
        return { ...prev, fadeOut: Math.floor(fadeOut * 10) / 10 };
      });
    },
    [dragging, waveform, trimStart, trimEnd, lengthFactor, heardDuration],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // --- Voorbeeld: exact wat de export maakt (zelfde bake + keten) ---
  const handlePreview = useCallback(() => {
    if (isPlaying) {
      audioService.stopPreviewWithEffects();
      setIsPlaying(false);
      stopPlayhead();
      return;
    }

    setIsPlaying(true);

    void audioService.playSampleWithEffects(
      sample.id,
      trimStart,
      sourceDuration,
      {
        pitch: values.pitch,
        reverb: values.reverb,
        fadeIn: values.fadeIn,
        fadeOut: values.fadeOut,
        speed: values.speed,
        reverse: values.reverse,
        echo: values.echo,
        filter: values.filter,
      },
      { bpm, kind: resolveSampleKind(sample) },
    );

    // De lijn loopt in gehoorde seconden; de golfvorm-as is in bron-seconden.
    // Alles met de lengtefactor vermenigvuldigen houdt de verhouding gelijk.
    const total = (waveform?.duration ?? sample.duration) * lengthFactor;
    startPlayhead(trimStart * lengthFactor, heardDuration, total);
  }, [isPlaying, sample, trimStart, sourceDuration, values, bpm, waveform, lengthFactor, heardDuration, startPlayhead, stopPlayhead]);

  // --- Reset all ---
  const handleReset = useCallback(() => {
    setValues(NEUTRAL_VERVORMEN);
  }, []);

  const patch = changedVervormenFields(initial, values);
  const hasChanges = Object.keys(patch).length > 0;

  // --- Apply and close ---
  const handleApply = useCallback(() => {
    if (!hasChanges) return;
    audioService.stopPreviewWithEffects();
    stopPlayhead();
    onApply(patch);
    onClose();
  }, [hasChanges, patch, onApply, onClose, stopPlayhead]);

  // --- Close with cleanup ---
  const handleClose = useCallback(() => {
    audioService.stopPreviewWithEffects();
    stopPlayhead();
    onClose();
  }, [onClose, stopPlayhead]);

  // Gedeeld dialog-gedrag: Escape sluit (annuleert), focus trap, scroll-lock
  const modalRef = useModalBehavior(handleClose, { isOpen });

  if (!isOpen) return null;

  const language = i18n.language ?? 'nl';
  const resetLabel = t('vervormen.resetOne');

  // --- Fade-handvatten (bron-seconden op de as) ---
  const fadeInSource = values.fadeIn / lengthFactor;
  const fadeOutSource = values.fadeOut / lengthFactor;
  const fadeInPercent = waveform ? ((trimStart + fadeInSource) / waveform.duration) * 100 : 0;
  const fadeOutPercent = waveform ? ((trimEnd - fadeOutSource) / waveform.duration) * 100 : 100;

  const filterDisplay = values.filter === 0
    ? t('vervormen.filterOff')
    : values.filter < 0
      ? t('vervormen.filterDullValue', { value: Math.abs(values.filter) })
      : t('vervormen.filterSharpValue', { value: values.filter });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vervormen-title"
        className="bg-bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col"
      >
        {/* --- Kop --- */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle bg-neutral-50 shrink-0">
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: sample.color }} />
          <SampleIcon name={sample.icon} size={18} className="text-text-main shrink-0" />
          <h2 id="vervormen-title" className="text-base font-bold text-text-main shrink-0">
            {t('vervormen.title')}
          </h2>
          <span className="text-sm text-text-muted truncate min-w-0" data-testid="vervormen-duration">
            · {t(sample.name)} · {t('vervormen.seconds', { value: formatSeconds(heardDuration, language) })}
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('vervormen.close')}
            title={t('vervormen.close')}
            className="ml-auto w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-text-muted hover:bg-neutral-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto min-h-0">
          {/* --- Golfvorm met fade-handvatten --- */}
          <div className="px-4 pt-4">
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
                    <div className="relative">
                      <Waveform
                        data={waveform}
                        color={sample.color}
                        width={Math.max(0, containerWidth - 16)}
                        height={100}
                        trimRegion={[trimStart, trimEnd]}
                        fadeRegion={{ fadeIn: fadeInSource, fadeOut: fadeOutSource }}
                        reversed={values.reverse}
                      />
                      {/* Afspeellijn van het voorbeeld: per frame verplaatst (usePreviewPlayhead) */}
                      <div
                        ref={playheadLineRef}
                        className="hidden absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-error-500 pointer-events-none"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Fade-in-handvat */}
                  <div
                    className="absolute top-0 bottom-0 w-11 cursor-ew-resize flex items-center justify-center"
                    style={{ left: `clamp(0px, calc(${fadeInPercent}% - 22px), calc(100% - 44px))` }}
                    onPointerDown={handlePointerDown('fadeIn')}
                    aria-hidden="true"
                  >
                    <div className="w-1.5 h-12 bg-accent-500 rounded-full shadow-md" />
                  </div>

                  {/* Fade-out-handvat */}
                  <div
                    className="absolute top-0 bottom-0 w-11 cursor-ew-resize flex items-center justify-center"
                    style={{ left: `clamp(0px, calc(${fadeOutPercent}% - 22px), calc(100% - 44px))` }}
                    onPointerDown={handlePointerDown('fadeOut')}
                    aria-hidden="true"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 p-4">
            {/* --- Klank (bestaand) --- */}
            <div className="space-y-3">
              <ColumnTitle>{t('vervormen.columnSound')}</ColumnTitle>
              <SliderRow
                label={t('studio.pitch')}
                value={values.pitch}
                display={values.pitch > 0 ? `+${values.pitch}` : String(values.pitch)}
                min={-12}
                max={12}
                step={1}
                left={t('studio.pitchLow')}
                right={t('studio.pitchHigh')}
                resetLabel={resetLabel}
                onChange={(pitch) => update({ pitch })}
              />
              <SliderRow
                label={t('studio.reverbLabel')}
                value={values.reverb}
                display={`${values.reverb}%`}
                min={0}
                max={100}
                step={5}
                left={t('studio.reverbDry')}
                right={t('studio.reverbWet')}
                resetLabel={resetLabel}
                onChange={(reverb) => update({ reverb })}
              />
              <SliderRow
                label={t('studio.fadeIn')}
                value={values.fadeIn}
                display={t('vervormen.seconds', { value: formatSeconds(values.fadeIn, language) })}
                min={0}
                max={Math.max(0, Math.floor((heardDuration - values.fadeOut) * 10) / 10)}
                step={0.1}
                left={t('vervormen.fadeNone')}
                right={t('vervormen.fadeLong')}
                resetLabel={resetLabel}
                onChange={(fadeIn) => update({ fadeIn: Math.round(fadeIn * 10) / 10 })}
              />
              <SliderRow
                label={t('studio.fadeOut')}
                value={values.fadeOut}
                display={t('vervormen.seconds', { value: formatSeconds(values.fadeOut, language) })}
                min={0}
                max={Math.max(0, Math.floor((heardDuration - values.fadeIn) * 10) / 10)}
                step={0.1}
                left={t('vervormen.fadeNone')}
                right={t('vervormen.fadeLong')}
                resetLabel={resetLabel}
                onChange={(fadeOut) => update({ fadeOut: Math.round(fadeOut * 10) / 10 })}
              />
            </div>

            {/* --- Vervormen (nieuw) --- */}
            <div className="space-y-3">
              <ColumnTitle>
                {t('vervormen.columnShape')}
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-accent-100 text-accent-800 normal-case tracking-normal font-semibold">
                  {t('vervormen.newBadge')}
                </span>
              </ColumnTitle>

              <div role="group" aria-labelledby="vervormen-speed-label">
                <span id="vervormen-speed-label" className="text-xs font-semibold text-text-main">
                  {t('vervormen.speed')}
                </span>
                <div className="flex gap-1.5 mt-1">
                  {CLIP_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      aria-pressed={values.speed === speed}
                      aria-label={t('vervormen.speedOption', { label: SPEED_LABELS[speed] })}
                      className={cn(
                        'flex-1 h-11 rounded-lg text-sm font-bold border transition-colors',
                        values.speed === speed
                          ? 'bg-accent-400 border-accent-400 text-accent-900'
                          : 'bg-bg-surface border-neutral-300 text-text-muted hover:bg-neutral-50',
                      )}
                    >
                      {SPEED_LABELS[speed]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-muted mt-1">{t('vervormen.speedHint')}</p>
              </div>

              <button
                type="button"
                onClick={() => update({ reverse: !values.reverse })}
                aria-pressed={values.reverse}
                className={cn(
                  'w-full h-11 rounded-lg text-sm font-bold border inline-flex items-center justify-center gap-2 transition-colors',
                  values.reverse
                    ? 'bg-accent-400 border-accent-400 text-accent-900'
                    : 'bg-bg-surface border-neutral-300 text-text-muted hover:bg-neutral-50',
                )}
              >
                <Rewind size={16} aria-hidden="true" />
                {t('vervormen.reverse')}
              </button>

              <SliderRow
                label={t('vervormen.echo')}
                value={values.echo}
                display={values.echo === 0 ? t('vervormen.off') : `${values.echo}%`}
                min={0}
                max={100}
                step={5}
                left={t('vervormen.off')}
                right={t('vervormen.echoMuch')}
                resetLabel={resetLabel}
                onChange={(echo) => update({ echo })}
              />
              <SliderRow
                label={t('vervormen.filter')}
                value={values.filter}
                display={filterDisplay}
                min={-100}
                max={100}
                step={10}
                left={t('vervormen.filterDull')}
                right={t('vervormen.filterSharp')}
                showNeutralMark
                resetLabel={resetLabel}
                onChange={(filter) => update({ filter })}
              />
            </div>
          </div>
        </div>

        {/* --- Voet --- */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2 bg-neutral-50 border-t border-border-subtle shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePreview}
              aria-pressed={isPlaying}
              className={cn(
                'flex items-center gap-1.5 px-3 h-11 rounded-lg transition-colors',
                isPlaying
                  ? 'bg-error-100 text-error-600 hover:bg-error-200'
                  : 'bg-bg-surface border border-neutral-300 hover:bg-neutral-50 text-text-main',
              )}
            >
              {isPlaying ? <Square size={16} /> : <Play size={16} />}
              <span className="text-sm font-medium">{t('studio.effectsModal.preview')}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              aria-label={t('vervormen.resetAll')}
              title={t('vervormen.resetAll')}
              className="w-11 h-11 flex items-center justify-center text-text-muted hover:bg-neutral-200 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 h-11 text-sm text-text-muted hover:bg-neutral-200 rounded-lg transition-colors"
            >
              {t('studio.effectsModal.cancel')}
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!hasChanges}
              className="px-4 h-11 text-sm font-medium text-text-main bg-accent-400 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {t('studio.effectsModal.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
