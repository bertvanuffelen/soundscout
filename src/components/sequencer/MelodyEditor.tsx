/**
 * MelodyEditor — de Melodie-tab van de sequencer (V2 Fase 4).
 *
 * Bediening (één rij boven het raster):
 * - Klank: synthklank of geluid uit de eigen bibliotheek;
 * - Octaven: 1..3 (rijen = toonladder × octaven, hoogste noot bovenaan);
 * - Swing: schuif 0..SEQ_MAX_SWING (de achtertellen schuiven op);
 * - Sterkte-kwast (hard / middel / zacht): nieuwe noten krijgen de gekozen
 *   sterkte. Tik op een noot met een ándere sterkte → die sterkte wordt de
 *   kwast; tik op een noot met dezelfde sterkte → de noot gaat weg. Met de
 *   standaardkwast (hard) is het dus gewoon aan/uit, en de sterkte is zichtbaar
 *   als vulkracht van het vakje. Werkt met muis, touch en toetsenbord — geen
 *   lang-indrukken nodig.
 *
 * Een noot klinkt meteen bij het aanzetten (als er niet wordt afgespeeld).
 * De afspeellijn tekent via de gedeelde frame-lus direct in de DOM — geen
 * React-state per frame.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioWaveform, Minus, Plus } from 'lucide-react';
import type { Sample } from '../../types';
import { useSequencerStore } from '../../stores/sequencerStore';
import { sequencerEngine } from '../../services/SequencerEngine';
import { subscribeFrame } from '../../services/frameLoop';
import { melodyRowToMidi } from '../../services/sequencerEvents';
import {
  MELODY_MAX_OCTAVES,
  SEQ_MAX_SWING,
  SEQUENCE_COLOR,
  type SequencerSequence,
} from '../../types/sequencer';
import {
  VELOCITY_LEVEL_ORDER,
  VELOCITY_LEVELS,
  melodyRowCount,
  midiToNoteName,
  velocityLevelOf,
  type VelocityLevel,
} from '../../utils/sequencer';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { logger } from '../../utils/logger';
import MelodyVoiceModal from './MelodyVoiceModal';
import SamplePickerModal from './SamplePickerModal';

interface MelodyEditorProps {
  /** Kiesbare bibliotheekgeluiden (studio: de verzamelde bibliotheek) */
  samples: Sample[];
}

/** Vulkracht (alfa als hex) per sterkte-stand */
const LEVEL_ALPHA: Record<VelocityLevel, string> = { loud: 'ff', medium: 'b3', soft: '59' };

export default function MelodyEditor({ samples }: MelodyEditorProps) {
  const { t } = useTranslation();
  const sequence = useSequencerStore((s) =>
    s.sequences.find((seq) => seq.id === s.activeSequenceId)
  );
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const toggleMelodyNote = useSequencerStore((s) => s.toggleMelodyNote);
  const setMelodyVoice = useSequencerStore((s) => s.setMelodyVoice);
  const setMelodyOctaves = useSequencerStore((s) => s.setMelodyOctaves);
  const setSwing = useSequencerStore((s) => s.setSwing);

  const [brush, setBrush] = useState<VelocityLevel>('loud');
  const [voiceModal, setVoiceModal] = useState<'closed' | 'voice' | 'library'>('closed');
  const gridRef = useRef<HTMLDivElement>(null);

  // --- Afspeellijn: gedeelde frame-lus, direct in de DOM ---
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let last = -2;
    const paint = (step: number) => {
      if (step === last) return;
      grid.querySelectorAll('[data-current="true"]').forEach((el) => el.removeAttribute('data-current'));
      if (step >= 0) {
        grid.querySelectorAll(`[data-step="${step}"]`).forEach((el) => el.setAttribute('data-current', 'true'));
      }
      last = step;
    };
    if (!isPlaying) {
      paint(-1);
      return;
    }
    const unsubscribe = subscribeFrame(() => {
      paint(sequencerEngine.isPlaying ? sequencerEngine.getCurrentStep() : -1);
    });
    return () => {
      unsubscribe();
      paint(-1);
    };
  }, [isPlaying, sequence?.lengthSteps, sequence?.melody?.octaves]);

  // --- Bakes vooraf: stembuffer laden + melodienoten voorbakken ---
  const melody = sequence?.melody;
  const prepareKey = melody
    ? JSON.stringify([sequence?.id, melody.voice, melody.notes, melody.octaves, sequence?.lengthSteps])
    : '';
  useEffect(() => {
    if (!prepareKey) return;
    const timer = setTimeout(() => {
      const state = useSequencerStore.getState();
      const seq = state.sequences.find((s) => s.id === state.activeSequenceId);
      if (!seq?.melody) return;
      const voice = seq.melody.voice;
      const load = voice.type === 'sample'
        ? (() => {
            const sample = samples.find((s) => s.id === voice.sampleId);
            return sample ? sequencerEngine.ensureBuffer(sample) : Promise.resolve();
          })()
        : Promise.resolve();
      void load
        .then(() => sequencerEngine.prepare(seq))
        .catch((err: unknown) => logger.warn('[MelodyEditor] voorbakken mislukt', err));
    }, 250);
    return () => clearTimeout(timer);
  }, [prepareKey, samples]);

  const noteMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of melody?.notes ?? []) map.set(`${note.step}:${note.row}`, note.velocity ?? 1);
    return map;
  }, [melody?.notes]);

  if (!sequence || !melody) return null;

  const rows = melodyRowCount(melody);
  const color = sequence.color ?? SEQUENCE_COLOR;
  const swing = sequence.swing ?? 0;
  const voiceSample =
    melody.voice.type === 'sample'
      ? samples.find((s) => s.id === (melody.voice as { sampleId: string | null }).sampleId)
      : undefined;
  const voiceLabel =
    melody.voice.type === 'synth'
      ? t(`melodie.voice.presets.${melody.voice.preset}`)
      : voiceSample
        ? t(voiceSample.name)
        : t('melodie.voice.missing');

  const handleCell = (step: number, row: number) => {
    const result = toggleMelodyNote(step, row, VELOCITY_LEVELS[brush]);
    if ((result === 'added' || result === 'changed') && !useSequencerStore.getState().isPlaying) {
      const fresh = useSequencerStore.getState().activeSequence();
      if (fresh) void sequencerEngine.previewNote(fresh, row, VELOCITY_LEVELS[brush]);
    }
  };

  const previewSeq = (): SequencerSequence | null => useSequencerStore.getState().activeSequence();

  return (
    <div className="flex flex-col gap-2 pb-2">
      {/* --- Bediening --- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => setVoiceModal('voice')}
          aria-label={t('melodie.voice.button', { name: voiceLabel })}
          className="min-h-11 px-3 rounded-lg border-2 bg-white flex items-center gap-2 text-sm font-semibold text-text-main hover:bg-neutral-50 max-w-56"
          style={{ borderColor: color }}
        >
          {voiceSample ? (
            <SampleIcon name={voiceSample.icon} size={16} className="shrink-0" />
          ) : (
            <AudioWaveform size={16} className="shrink-0" aria-hidden />
          )}
          <span className="truncate">{voiceLabel}</span>
        </button>

        <div className="flex items-center gap-1" role="group" aria-label={t('melodie.octaves.label')}>
          <button
            type="button"
            onClick={() => setMelodyOctaves(melody.octaves - 1)}
            disabled={melody.octaves <= 1}
            aria-label={t('melodie.octaves.remove')}
            className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-neutral-100 text-text-main disabled:opacity-40"
          >
            <Minus size={16} aria-hidden />
          </button>
          <span className="text-xs font-semibold text-text-muted tabular-nums whitespace-nowrap">
            {t('melodie.octaves.count', { count: melody.octaves })}
          </span>
          <button
            type="button"
            onClick={() => setMelodyOctaves(melody.octaves + 1)}
            disabled={melody.octaves >= MELODY_MAX_OCTAVES}
            aria-label={t('melodie.octaves.add')}
            className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-neutral-100 text-text-main disabled:opacity-40"
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>

        <label className="flex items-center gap-2 min-h-11 text-xs font-semibold text-text-muted">
          {t('melodie.swing.label')}
          <input
            type="range"
            min={0}
            max={SEQ_MAX_SWING}
            step={0.05}
            value={swing}
            onChange={(e) => setSwing(Number(e.target.value))}
            aria-valuetext={
              swing === 0
                ? t('melodie.swing.straight')
                : t('melodie.swing.amount', { percent: Math.round((swing / SEQ_MAX_SWING) * 100) })
            }
            className="w-24 sm:w-32 accent-accent-500"
          />
        </label>

        <div className="flex items-center gap-1" role="group" aria-label={t('melodie.velocity.label')}>
          <span className="text-xs font-semibold text-text-muted mr-1" aria-hidden>
            {t('melodie.velocity.label')}
          </span>
          {VELOCITY_LEVEL_ORDER.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setBrush(level)}
              aria-pressed={brush === level}
              aria-label={t(`melodie.velocity.${level}`)}
              title={t(`melodie.velocity.${level}`)}
              className={cn(
                'w-11 h-11 rounded-lg border-2 flex items-center justify-center',
                brush === level ? 'border-text-main bg-white' : 'border-transparent hover:bg-neutral-100'
              )}
            >
              <span
                aria-hidden
                className="w-5 h-5 rounded-full border-2"
                style={{ backgroundColor: `${color}${LEVEL_ALPHA[level]}`, borderColor: color }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* --- Notenraster: hoogste noot bovenaan --- */}
      <div ref={gridRef} className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, index) => {
          const row = rows - 1 - index;
          const { name, octave } = midiToNoteName(melodyRowToMidi(row, melody));
          const isRoot = row % melody.scale.length === 0;
          return (
            <div key={row} className="flex items-center gap-2">
              <span
                className={cn(
                  'w-10 shrink-0 text-right text-sm font-bold tabular-nums',
                  isRoot ? 'text-text-main' : 'text-text-muted'
                )}
                aria-hidden
              >
                {name}
                <span className="text-xs font-semibold">{octave}</span>
              </span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {Array.from({ length: sequence.lengthSteps }, (_, step) => {
                  const velocity = noteMap.get(`${step}:${row}`);
                  const isActive = velocity !== undefined;
                  const level = isActive ? velocityLevelOf(velocity) : null;
                  return (
                    <button
                      key={step}
                      type="button"
                      data-step={step}
                      onClick={() => handleCell(step, row)}
                      aria-pressed={isActive}
                      aria-label={
                        isActive
                          ? t('melodie.cellActive', {
                              note: `${name}${octave}`,
                              step: step + 1,
                              level: t(`melodie.velocity.${level}`),
                            })
                          : t('melodie.cell', { note: `${name}${octave}`, step: step + 1 })
                      }
                      className={cn(
                        'relative flex-1 min-w-0 max-w-11 h-11 rounded-lg border-2 transition-colors',
                        'data-[current=true]:ring-2 data-[current=true]:ring-accent-600 data-[current=true]:ring-offset-1',
                        step % 4 === 0 && step > 0 && 'ml-2',
                        !isActive &&
                          (isRoot
                            ? 'bg-neutral-100 border-border-subtle hover:border-neutral-400'
                            : 'bg-white border-border-subtle hover:border-neutral-400')
                      )}
                      style={
                        isActive && level
                          ? { backgroundColor: `${color}${LEVEL_ALPHA[level]}`, borderColor: color }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Klank kiezen --- */}
      <MelodyVoiceModal
        isOpen={voiceModal === 'voice'}
        voice={melody.voice}
        hasLibrarySounds={samples.length > 0}
        onSelectSynth={(preset) => {
          setMelodyVoice({ type: 'synth', preset });
          setVoiceModal('closed');
        }}
        onPreviewSynth={(preset) => {
          const seq = previewSeq();
          if (seq) void sequencerEngine.previewVoice(seq, { type: 'synth', preset });
        }}
        onChooseLibrary={() => setVoiceModal('library')}
        onClose={() => setVoiceModal('closed')}
      />
      <SamplePickerModal
        isOpen={voiceModal === 'library'}
        samples={samples}
        selectedSampleId={melody.voice.type === 'sample' ? melody.voice.sampleId : null}
        onSelect={(sample) => {
          setMelodyVoice({ type: 'sample', sampleId: sample.id });
          void sequencerEngine.ensureBuffer(sample);
          setVoiceModal('closed');
        }}
        onClose={() => setVoiceModal('closed')}
      />
    </div>
  );
}
