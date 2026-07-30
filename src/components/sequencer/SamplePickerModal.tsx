/**
 * SamplePickerModal — kies een themasample voor een spoor, met preview.
 * Toont per geluid de duur en hoeveel vakjes het (ongetrimd) beslaat.
 */

import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { Modal } from '../ui';
import type { Sample } from '../../types';
import { SampleIcon } from '../../utils/iconMap';
import { stepSpanCells } from '../../utils/sequencer';
import { sequencerEngine } from '../../services/SequencerEngine';
import { SEQ_DEFAULT_BPM } from '../../types/sequencer';
import { cn } from '../../utils/cn';

interface SamplePickerModalProps {
  isOpen: boolean;
  samples: Sample[];
  selectedSampleId: string | null;
  onSelect: (sample: Sample) => void;
  onClose: () => void;
}

export default function SamplePickerModal({
  isOpen,
  samples,
  selectedSampleId,
  onSelect,
  onClose,
}: SamplePickerModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('sequencer.samplePicker.title')} size="lg">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60dvh] overflow-y-auto pr-1">
        {samples.map((sample) => {
          const isSelected = sample.id === selectedSampleId;
          return (
            <div
              key={sample.id}
              className={cn(
                'rounded-xl border-2 p-2 flex flex-col gap-1.5 bg-white',
                isSelected ? 'border-accent-500' : 'border-border-subtle'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: sample.color }}
                  aria-hidden
                />
                <SampleIcon
                  name={sample.icon}
                  size={16}
                  className="text-text-main shrink-0"
                />
                <span className="text-sm font-semibold text-text-main truncate">
                  {t(sample.name)}
                </span>
              </div>
              <span className="text-xs text-text-muted">
                {t('sequencer.samplePicker.duration', {
                  seconds: sample.duration.toFixed(1),
                  cells: stepSpanCells(sample.duration, SEQ_DEFAULT_BPM),
                })}
              </span>
              <div className="flex gap-1.5 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    void sequencerEngine.previewSample(sample);
                  }}
                  aria-label={t('sequencer.preview')}
                  className="w-9 h-9 rounded-lg border border-border-subtle bg-white hover:bg-neutral-50 flex items-center justify-center text-text-main"
                >
                  <Play className="w-4 h-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(sample)}
                  className="flex-1 min-h-9 rounded-lg bg-accent-400 hover:bg-accent-500 text-accent-900 text-sm font-bold"
                >
                  {t('sequencer.select')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
