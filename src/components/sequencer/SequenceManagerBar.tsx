/**
 * SequenceManagerBar — meerdere benoemde sequences beheren:
 * kiezen, nieuw, hernoemen, dupliceren, verwijderen (met bevestiging).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Modal } from '../ui';
import { useSequencerStore } from '../../stores/sequencerStore';
import { sequencerEngine } from '../../services/SequencerEngine';

export default function SequenceManagerBar() {
  const { t } = useTranslation();
  const sequences = useSequencerStore((s) => s.sequences);
  const activeSequenceId = useSequencerStore((s) => s.activeSequenceId);
  const setActiveSequence = useSequencerStore((s) => s.setActiveSequence);
  const createSequence = useSequencerStore((s) => s.createSequence);
  const renameSequence = useSequencerStore((s) => s.renameSequence);
  const duplicateSequence = useSequencerStore((s) => s.duplicateSequence);
  const deleteSequence = useSequencerStore((s) => s.deleteSequence);
  const setIsPlaying = useSequencerStore((s) => s.setIsPlaying);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const active = sequences.find((seq) => seq.id === activeSequenceId);

  // Wisselen/verwijderen tijdens afspelen: eerst netjes stoppen
  const stopPlayback = () => {
    sequencerEngine.stop();
    setIsPlaying(false);
  };

  const handleSwitch = (id: string) => {
    stopPlayback();
    setActiveSequence(id);
  };

  const handleNew = () => {
    stopPlayback();
    createSequence(
      t('sequencer.sequences.untitled', { number: sequences.length + 1 })
    );
  };

  const handleRenameOpen = () => {
    if (!active) return;
    setRenameValue(active.name);
    setRenameOpen(true);
  };

  const handleRenameSave = () => {
    if (active) renameSequence(active.id, renameValue);
    setRenameOpen(false);
  };

  const handleDuplicate = () => {
    if (!active) return;
    stopPlayback();
    duplicateSequence(active.id, t('sequencer.sequences.copySuffix'));
  };

  const handleDeleteConfirm = () => {
    if (active) {
      stopPlayback();
      deleteSequence(
        active.id,
        t('sequencer.sequences.untitled', { number: 1 })
      );
    }
    setDeleteOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-xs font-semibold text-text-muted whitespace-nowrap">
        {t('sequencer.sequences.title')}
      </label>
      <select
        value={activeSequenceId ?? ''}
        onChange={(e) => handleSwitch(e.target.value)}
        className="min-h-10 px-2 rounded-lg border border-border-subtle bg-white text-sm font-semibold text-text-main max-w-48"
        aria-label={t('sequencer.sequences.title')}
      >
        {sequences.map((seq) => (
          <option key={seq.id} value={seq.id}>
            {seq.name}
          </option>
        ))}
      </select>

      <Button variant="secondary" size="sm" onClick={handleNew}>
        <Plus className="w-4 h-4 mr-1" aria-hidden />
        {t('sequencer.sequences.new')}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRenameOpen}
        aria-label={t('sequencer.sequences.rename')}
      >
        <Pencil className="w-4 h-4" aria-hidden />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDuplicate}
        aria-label={t('sequencer.sequences.duplicate')}
      >
        <Copy className="w-4 h-4" aria-hidden />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        aria-label={t('sequencer.sequences.delete')}
        className="!text-error-500"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
      </Button>

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
            if (e.key === 'Enter') handleRenameSave();
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
          <Button variant="primary" onClick={handleRenameSave} className="flex-1">
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
          {t('sequencer.sequences.deleteConfirm', { name: active?.name ?? '' })}
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
