/**
 * SequenceKindTabs — de tabs Ritme | Melodie in de werkbalk van de
 * sequencer (V2 Fase 4).
 *
 * Een sequence is óf een ritme óf een melodie (`kind`). Wisselregel:
 * - de sequence is nog leeg → de tab zet het soort meteen om (zelfde
 *   sequence, zelfde naam en kleur; clips op de montagelijn blijven geldig);
 * - er staat al een patroon in → niets gaat verloren: een bevestiging biedt
 *   een NIEUWE sequence van het andere soort aan; het bestaande patroon
 *   blijft ongewijzigd in de bibliotheek staan.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drum, Music } from 'lucide-react';
import { Button, Modal } from '../ui';
import { cn } from '../../utils/cn';
import { useSequencerStore } from '../../stores/sequencerStore';
import type { SequenceKind, SequencerSequence } from '../../types/sequencer';

interface SequenceKindTabsProps {
  sequence: SequencerSequence;
  /** Na het aanmaken van een nieuwe sequence (studio: open die in de tab) */
  onCreated?: (sequenceId: string) => void;
}

const TABS: Array<{ kind: SequenceKind; Icon: typeof Drum }> = [
  { kind: 'rhythm', Icon: Drum },
  { kind: 'melody', Icon: Music },
];

export default function SequenceKindTabs({ sequence, onCreated }: SequenceKindTabsProps) {
  const { t } = useTranslation();
  const setSequenceKind = useSequencerStore((s) => s.setSequenceKind);
  const [pendingKind, setPendingKind] = useState<SequenceKind | null>(null);
  const currentKind: SequenceKind = sequence.kind ?? 'rhythm';

  const handleSelect = (kind: SequenceKind) => {
    if (kind === currentKind) return;
    // Leeg → direct omzetten; anders een nieuwe sequence aanbieden
    if (!setSequenceKind(kind)) setPendingKind(kind);
  };

  const handleCreateNew = () => {
    if (!pendingKind) return;
    const store = useSequencerStore.getState();
    store.createSequence(
      t('sequencer.sequences.untitled', { number: store.sequences.length + 1 }),
      pendingKind
    );
    const newId = useSequencerStore.getState().activeSequenceId;
    setPendingKind(null);
    if (newId) onCreated?.(newId);
  };

  return (
    <>
      <div
        role="tablist"
        aria-label={t('melodie.tabs.label')}
        className="flex rounded-lg p-0.5 bg-neutral-100 shrink-0"
      >
        {TABS.map(({ kind, Icon }) => {
          const label = t(`melodie.tabs.${kind}`);
          const selected = kind === currentKind;
          return (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={label}
              onClick={() => handleSelect(kind)}
              className={cn(
                // Hitvlak naar 44px zonder de werkbalk hoger te maken
                'relative inline-flex items-center gap-1.5 h-7 px-2 sm:px-3 rounded-md text-xs font-extrabold transition-colors',
                'before:absolute before:-inset-y-2 before:inset-x-0 before:content-[""]',
                selected
                  ? 'bg-white text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              )}
            >
              <Icon size={14} aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <Modal
        isOpen={pendingKind !== null}
        onClose={() => setPendingKind(null)}
        title={pendingKind ? t(`melodie.switch.title.${pendingKind}`) : ''}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center whitespace-pre-line">
          {pendingKind && t(`melodie.switch.body.${pendingKind}`, { name: sequence.name })}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setPendingKind(null)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleCreateNew} className="flex-1">
            {pendingKind && t(`melodie.switch.confirm.${pendingKind}`)}
          </Button>
        </div>
      </Modal>
    </>
  );
}
