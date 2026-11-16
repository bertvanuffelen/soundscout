/**
 * SequenceKindChooser — "Wat wil je maken?" bij "+ Sequence" (designronde
 * nov 2026). Een sequence is óf een ritme óf een melodie en blijft dat; de
 * tabs Ritme | Melodie in de studio zijn daarmee weg (wisselen voelde als
 * weggooien). Wil je het andere, dan maak je een nieuwe sequence.
 */

import { useTranslation } from 'react-i18next';
import { Drum, Music } from 'lucide-react';
import { Modal } from '../ui';
import type { SequenceKind } from '../../types/sequencer';

interface SequenceKindChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onChoose: (kind: SequenceKind) => void;
}

export default function SequenceKindChooser({ isOpen, onClose, onChoose }: SequenceKindChooserProps) {
  const { t } = useTranslation();
  const options: Array<{ kind: SequenceKind; Icon: typeof Drum; title: string; text: string }> = [
    { kind: 'rhythm', Icon: Drum, title: t('melodie.tabs.rhythm'), text: t('sequencer.studio.chooseRhythmText') },
    { kind: 'melody', Icon: Music, title: t('melodie.tabs.melody'), text: t('sequencer.studio.chooseMelodyText') },
  ];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('sequencer.studio.chooseTitle')} size="md">
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map(({ kind, Icon, title, text }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onChoose(kind)}
            data-testid={`choose-${kind}`}
            className="flex flex-col items-start gap-2 rounded-2xl border-2 border-border-subtle hover:border-accent-400 focus-visible:border-accent-400 bg-bg-surface p-4 text-left min-h-[120px] transition-colors"
          >
            <span className="w-12 h-12 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </span>
            <span className="type-head text-text-main">{title}</span>
            <span className="text-sm text-text-muted">{text}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-text-muted mt-3">{t('sequencer.studio.chooseHint')}</p>
    </Modal>
  );
}
