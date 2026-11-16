/**
 * MelodyVoiceModal — kies de klank van een melodie (V2 Fase 4):
 * één van de drie ingebouwde synthklanken, of een geluid uit de eigen
 * bibliotheek (zelfde regel als Ritme: alleen bibliotheekgeluiden). Het
 * bibliotheekgeluid kies je in de bestaande SamplePickerModal.
 */

import { useTranslation } from 'react-i18next';
import { FolderOpen, Play } from 'lucide-react';
import { Modal } from '../ui';
import { cn } from '../../utils/cn';
import { SYNTH_PRESETS, type MelodyVoice, type SynthPreset } from '../../types/sequencer';

interface MelodyVoiceModalProps {
  isOpen: boolean;
  voice: MelodyVoice;
  /** Heeft de leerling geluiden in de bibliotheek? */
  hasLibrarySounds: boolean;
  onSelectSynth: (preset: SynthPreset) => void;
  onPreviewSynth: (preset: SynthPreset) => void;
  /** Open de bibliotheekkiezer */
  onChooseLibrary: () => void;
  onClose: () => void;
}

export default function MelodyVoiceModal({
  isOpen,
  voice,
  hasLibrarySounds,
  onSelectSynth,
  onPreviewSynth,
  onChooseLibrary,
  onClose,
}: MelodyVoiceModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('melodie.voice.title')} size="md">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SYNTH_PRESETS.map((preset) => {
            const selected = voice.type === 'synth' && voice.preset === preset;
            const label = t(`melodie.voice.presets.${preset}`);
            return (
              <div
                key={preset}
                className={cn(
                  'rounded-xl border-2 p-2 flex items-center gap-2 bg-white',
                  selected ? 'border-accent-500' : 'border-border-subtle'
                )}
              >
                <button
                  type="button"
                  onClick={() => onPreviewSynth(preset)}
                  aria-label={t('melodie.voice.previewPreset', { name: label })}
                  className="w-11 h-11 shrink-0 rounded-lg border border-border-subtle bg-white hover:bg-neutral-50 text-text-main flex items-center justify-center"
                >
                  <Play className="w-4 h-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSynth(preset)}
                  aria-pressed={selected}
                  className="flex-1 min-h-11 rounded-lg bg-accent-400 hover:bg-accent-500 text-accent-900 text-sm font-bold px-2"
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onChooseLibrary}
          disabled={!hasLibrarySounds}
          aria-pressed={voice.type === 'sample'}
          className={cn(
            'min-h-11 rounded-xl border-2 border-dashed px-3 flex items-center justify-center gap-2 text-sm font-bold',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            voice.type === 'sample'
              ? 'border-accent-500 text-text-main'
              : 'border-border-subtle text-text-main hover:bg-neutral-50'
          )}
        >
          <FolderOpen className="w-4 h-4" aria-hidden />
          {t('melodie.voice.fromLibrary')}
        </button>
        {!hasLibrarySounds && (
          <p className="text-xs text-text-muted text-center">{t('melodie.voice.libraryEmpty')}</p>
        )}
      </div>
    </Modal>
  );
}
