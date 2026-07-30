/**
 * SequencerGrid — de sporen met stapcellen + playhead-poll en de modals
 * (sample-picker, trim, spoor-verwijderen-bevestiging).
 *
 * Playhead volgt de repo-conventie: 50 ms setInterval dat imperatief
 * engine.getCurrentStep() leest en alleen setState't bij verandering.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '../ui';
import type { Sample } from '../../types';
import { useSequencerStore } from '../../stores/sequencerStore';
import { useThemeStore } from '../../stores/themeStore';
import { sequencerEngine } from '../../services/SequencerEngine';
import SequencerTrackRow from './SequencerTrackRow';
import SamplePickerModal from './SamplePickerModal';
import SequencerTrimModal from './SequencerTrimModal';

interface SequencerGridProps {
  /**
   * Kiesbare geluiden. Lab: weggelaten → alle themasamples.
   * Studio (fase 2): de verzamelde bibliotheek van de leerling.
   */
  samples?: Sample[];
}

export default function SequencerGrid({ samples: samplesProp }: SequencerGridProps) {
  const { t } = useTranslation();
  const sequence = useSequencerStore((s) =>
    s.sequences.find((seq) => seq.id === s.activeSequenceId)
  );
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const toggleStep = useSequencerStore((s) => s.toggleStep);
  const setTrackSample = useSequencerStore((s) => s.setTrackSample);
  const setTrackMode = useSequencerStore((s) => s.setTrackMode);
  const toggleTrackMute = useSequencerStore((s) => s.toggleTrackMute);
  const setTrackVolume = useSequencerStore((s) => s.setTrackVolume);
  const removeTrack = useSequencerStore((s) => s.removeTrack);
  const themeGetSampleById = useThemeStore((s) => s.getSampleById);
  const getSamples = useThemeStore((s) => s.getSamples);
  const availableSamples = samplesProp ?? getSamples();
  const getSampleById = (id: string): Sample | undefined =>
    samplesProp
      ? samplesProp.find((sample) => sample.id === id)
      : themeGetSampleById(id);

  const [currentStep, setCurrentStep] = useState(-1);
  const [pickerTrackId, setPickerTrackId] = useState<string | null>(null);
  const [trimTrackId, setTrimTrackId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  // --- Playhead-poll (alleen tijdens afspelen) ---
  useEffect(() => {
    if (!isPlaying) {
      setCurrentStep(-1);
      return;
    }
    const id = setInterval(() => {
      const step = sequencerEngine.getCurrentStep();
      setCurrentStep((prev) => (prev === step ? prev : step));
    }, 50);
    return () => clearInterval(id);
  }, [isPlaying]);

  if (!sequence) return null;

  const pickerTrack = sequence.tracks.find((tr) => tr.id === pickerTrackId);
  const trimTrack = sequence.tracks.find((tr) => tr.id === trimTrackId);
  const trimSample = trimTrack?.sampleId
    ? getSampleById(trimTrack.sampleId)
    : undefined;

  return (
    <>
      <div className="pb-2">
        <div className="flex flex-col gap-2">
          {sequence.tracks.map((track) => (
            <SequencerTrackRow
              key={track.id}
              track={track}
              sample={track.sampleId ? getSampleById(track.sampleId) : undefined}
              lengthSteps={sequence.lengthSteps}
              bpm={sequence.bpm}
              currentStep={currentStep}
              canRemove={sequence.tracks.length > 1}
              onToggleStep={(stepIndex) => toggleStep(track.id, stepIndex)}
              onOpenPicker={() => setPickerTrackId(track.id)}
              onOpenTrim={() => setTrimTrackId(track.id)}
              onSetMode={(mode) => setTrackMode(track.id, mode)}
              onToggleMute={() => toggleTrackMute(track.id)}
              onSetVolume={(volume) => {
                setTrackVolume(track.id, volume);
                sequencerEngine.setTrackVolume(track.id, volume);
              }}
              onRemove={() => setRemoveConfirmId(track.id)}
            />
          ))}
        </div>
      </div>

      {/* --- Sample-picker --- */}
      <SamplePickerModal
        isOpen={!!pickerTrack}
        samples={availableSamples}
        selectedSampleId={pickerTrack?.sampleId ?? null}
        onSelect={(sample) => {
          if (pickerTrackId) {
            setTrackSample(pickerTrackId, sample.id);
            void sequencerEngine.ensureBuffer(sample);
          }
          setPickerTrackId(null);
        }}
        onClose={() => setPickerTrackId(null)}
      />

      {/* --- Trim --- */}
      {trimTrack && trimSample && (
        <SequencerTrimModal
          isOpen
          track={trimTrack}
          sample={trimSample}
          onClose={() => setTrimTrackId(null)}
        />
      )}

      {/* --- Spoor verwijderen (bevestiging) --- */}
      <Modal
        isOpen={!!removeConfirmId}
        onClose={() => setRemoveConfirmId(null)}
        title={t('sequencer.removeTrack')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center whitespace-pre-line">
          {t('sequencer.removeTrackConfirm')}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setRemoveConfirmId(null)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (removeConfirmId) removeTrack(removeConfirmId);
              setRemoveConfirmId(null);
            }}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
