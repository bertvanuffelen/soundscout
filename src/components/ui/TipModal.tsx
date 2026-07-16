/**
 * TipModal — opvallende, eenmalige tip (testronde 2, week-3-wens Bert)
 *
 * De oude inline hint-balkjes (kaart, studio) vielen niet op. Deze kleine
 * modal met lamp-icoon is op meerdere plekken inzetbaar: geef de tekst en
 * een dismiss-callback mee; de aanroeper bewaakt zelf de first-run-flag
 * (src/utils/firstRun.ts) zodat de tip maar één keer verschijnt.
 */

import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface TipModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  /** De tip-tekst (al vertaald) */
  text: string;
}

export default function TipModal({ isOpen, onDismiss, text }: TipModalProps) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onDismiss} title={t('tips.title')} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center">
          <Lightbulb className="w-7 h-7 text-accent-600" aria-hidden="true" />
        </div>
        <p className="text-text-main leading-relaxed">{text}</p>
        <Button variant="primary" onClick={onDismiss} className="w-full sm:w-auto sm:min-w-[160px]">
          {t('tips.gotIt')}
        </Button>
      </div>
    </Modal>
  );
}
