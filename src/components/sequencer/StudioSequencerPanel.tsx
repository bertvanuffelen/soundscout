/**
 * StudioSequencerPanel — de sequencer in de studio (fase 2, achter dev-vlag).
 *
 * Vervangt de volledige tijdlijnzone (incl. werkbalk) wanneer een sequence
 * geopend is — "rustig tenzij": zonder open sequence bestaat dit panel niet.
 * De werkbalk is de modus-bewuste variant van de tijdlijn-werkbalk:
 * links tabs (Montagelijn | sequence-naam ✕), rechts sequence-acties
 * (hernoem/dupliceer/verwijder + lengte ±). Zelfde hoogteklasse als de
 * Timeline zodat er niets verspringt.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Grid3x3, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button, Modal } from '../ui';
import TipModal from '../ui/TipModal';
import { hasSeenFirstRun, markFirstRunSeen } from '../../utils/firstRun';
import type { Sample } from '../../types';
import { useSequencerStore } from '../../stores/sequencerStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { sequencerEngine } from '../../services/SequencerEngine';
import { sequenceSampleId } from '../../utils/sequencer';
import { SEQUENCE_COLOR } from '../../types/sequencer';
import SequencerGrid from './SequencerGrid';
import {
  SEQ_MAX_STEPS,
  SEQ_MIN_STEPS,
  SEQ_STEP_INCREMENT,
} from '../../types/sequencer';

interface StudioSequencerPanelProps {
  /** De verzamelde bibliotheek van de leerling (kiesbare geluiden) */
  samples: Sample[];
  /** Vrije modus = ruimere hoogte (zelfde regel als de Timeline) */
  isFreeMode: boolean;
}

export default function StudioSequencerPanel({
  samples,
  isFreeMode,
}: StudioSequencerPanelProps) {
  const { t } = useTranslation();
  const setOpenSequenceId = useSequencerStore((s) => s.setOpenSequenceId);
  const sequence = useSequencerStore((s) =>
    s.sequences.find((seq) => seq.id === s.openSequenceId)
  );
  const renameSequence = useSequencerStore((s) => s.renameSequence);
  const duplicateSequence = useSequencerStore((s) => s.duplicateSequence);
  const deleteSequence = useSequencerStore((s) => s.deleteSequence);
  const setLength = useSequencerStore((s) => s.setLength);
  const setIsPlaying = useSequencerStore((s) => s.setIsPlaying);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Eenmalige uitleg bij de allereerste keer dat de sequencer opengaat —
  // dit is de enige uitleg die een leerling vanzelf krijgt.
  const [showFirstRunHint, setShowFirstRunHint] = useState(
    () => !hasSeenFirstRun('sequencer-hint')
  );
  const dismissFirstRunHint = () => {
    markFirstRunSeen('sequencer-hint');
    setShowFirstRunHint(false);
  };

  // Engine voeden met de bibliotheek + buffers van toegewezen samples laden
  useEffect(() => {
    sequencerEngine.setSamples(samples);
  }, [samples]);
  const assignedIds = (sequence?.tracks ?? [])
    .map((track) => track.sampleId)
    .filter(Boolean)
    .join(',');
  useEffect(() => {
    if (!assignedIds) return;
    for (const id of assignedIds.split(',')) {
      const sample = samples.find((item) => item.id === id);
      if (sample) void sequencerEngine.ensureBuffer(sample);
    }
  }, [assignedIds, samples]);

  // Panel sluiten of unmounten → sequencer-afspelen netjes stoppen
  useEffect(() => {
    return () => {
      sequencerEngine.stop();
      useSequencerStore.getState().setIsPlaying(false);
    };
  }, []);

  if (!sequence) return null;

  const closeTab = () => {
    sequencerEngine.stop();
    setIsPlaying(false);
    setOpenSequenceId(null);
  };

  const handleDuplicate = () => {
    sequencerEngine.stop();
    setIsPlaying(false);
    duplicateSequence(sequence.id, t('sequencer.sequences.copySuffix'));
    // duplicateSequence activeert de kopie — open die ook in de tab
    const newId = useSequencerStore.getState().activeSequenceId;
    if (newId) setOpenSequenceId(newId);
  };

  // Staat deze sequence nog als clip op de montagelijn?
  const clipCount = useTimelineStore
    .getState()
    .tracks.reduce(
      (sum, track) =>
        sum +
        track.clips.filter(
          (clip) => clip.sampleId === sequenceSampleId(sequence.id)
        ).length,
      0
    );

  const handleDeleteConfirm = () => {
    sequencerEngine.stop();
    setIsPlaying(false);
    // Clips van deze sequence van de montagelijn halen
    const timeline = useTimelineStore.getState();
    const sampleId = sequenceSampleId(sequence.id);
    timeline.tracks.forEach((track, trackIndex) => {
      for (const clip of track.clips) {
        if (clip.sampleId === sampleId) {
          timeline.removeClip(trackIndex, clip.id);
        }
      }
    });
    deleteSequence(sequence.id, t('sequencer.sequences.untitled', { number: 1 }));
    setDeleteOpen(false);
    setOpenSequenceId(null);
  };

  return (
    <div
      className={`flex flex-col shrink-0 ${isFreeMode ? 'max-h-[50dvh]' : 'max-h-[40dvh]'}`}
      role="region"
      aria-label={t('sequencer.title')}
    >
      {/* --- Modus-bewuste werkbalk: tabs links, sequence-acties rechts --- */}
      <div className="flex items-center px-2 sm:px-4 py-1 sm:py-1.5 bg-white/60 md:bg-bg-surface border-b border-border-subtle border-t gap-1">
        {/* Tabs */}
        <button
          type="button"
          onClick={closeTab}
          className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wide px-2 py-1 rounded-md hover:bg-neutral-100 shrink-0"
        >
          {t('studio.timeline')}
        </button>
        <span
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold shrink-0 max-w-40 text-text-main"
          style={{ backgroundColor: `${sequence.color ?? SEQUENCE_COLOR}33` }}
        >
          <Grid3x3 size={12} aria-hidden style={{ color: sequence.color ?? SEQUENCE_COLOR }} />
          <span className="truncate">{sequence.name}</span>
          <button
            type="button"
            onClick={closeTab}
            aria-label={t('sequencer.studio.closeTab')}
            className="ml-0.5 hover:opacity-70"
          >
            <X size={11} aria-hidden />
          </button>
        </span>

        <div className="flex-1" />

        {/* Sequence-acties */}
        <button
          type="button"
          onClick={() => {
            setRenameValue(sequence.name);
            setRenameOpen(true);
          }}
          aria-label={t('sequencer.sequences.rename')}
          title={t('sequencer.sequences.rename')}
          className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-600"
        >
          <Pencil size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleDuplicate}
          aria-label={t('sequencer.sequences.duplicate')}
          title={t('sequencer.sequences.duplicate')}
          className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-600"
        >
          <Copy size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          aria-label={t('sequencer.sequences.delete')}
          title={t('sequencer.sequences.delete')}
          className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-error-50 rounded-lg text-error-500"
        >
          <Trash2 size={14} aria-hidden />
        </button>

        <span className="w-px h-4 bg-border-subtle mx-1" aria-hidden />

        {/* Lengte ± */}
        <button
          type="button"
          onClick={() => setLength(-SEQ_STEP_INCREMENT)}
          disabled={sequence.lengthSteps <= SEQ_MIN_STEPS}
          aria-label={t('sequencer.length.remove')}
          className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-600 disabled:opacity-40"
        >
          <Minus size={14} aria-hidden />
        </button>
        <span className="text-[10px] sm:text-xs font-semibold text-text-muted tabular-nums whitespace-nowrap">
          {t('sequencer.length.bars', {
            beats: sequence.lengthSteps,
            bars: sequence.lengthSteps / 4,
          })}
        </span>
        <button
          type="button"
          onClick={() => setLength(SEQ_STEP_INCREMENT)}
          disabled={sequence.lengthSteps >= SEQ_MAX_STEPS}
          aria-label={t('sequencer.length.add')}
          className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-600 disabled:opacity-40"
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>

      {/* --- Grid (zelfde plek als de tijdlijnsporen) --- */}
      <div
        className="overflow-y-auto min-h-0 flex-1 px-2 sm:px-4 py-2"
        style={{ backgroundColor: `${sequence.color ?? SEQUENCE_COLOR}0d` }}
      >
        <SequencerGrid samples={samples} />
        <div className="mt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => useSequencerStore.getState().addTrack()}
            disabled={sequence.tracks.length >= 8}
          >
            <Plus className="w-4 h-4 mr-1.5" aria-hidden />
            {t('sequencer.addTrack')}
          </Button>
        </div>
      </div>

      {/* --- Eenmalige uitleg (leerling) --- */}
      <TipModal
        isOpen={showFirstRunHint}
        onDismiss={dismissFirstRunHint}
        text={t('sequencer.studio.firstRunHint')}
      />

      {/* --- Hernoemen --- */}
      <Modal
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={t('sequencer.sequences.rename')}
        size="sm"
      >
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              renameSequence(sequence.id, renameValue);
              setRenameOpen(false);
            }
          }}
          placeholder={t('sequencer.sequences.namePlaceholder')}
          maxLength={60}
          autoFocus
          className="w-full min-h-11 px-3 mb-6 rounded-lg border border-border-subtle bg-white text-sm text-text-main"
        />
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setRenameOpen(false)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              renameSequence(sequence.id, renameValue);
              setRenameOpen(false);
            }}
            className="flex-1"
          >
            {t('common.save')}
          </Button>
        </div>
      </Modal>

      {/* --- Verwijderen (bevestiging) --- */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('sequencer.sequences.delete')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center whitespace-pre-line">
          {t('sequencer.sequences.deleteConfirm', { name: sequence.name })}
          {clipCount > 0 && `\n${t('sequencer.studio.deleteWithClips')}`}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
