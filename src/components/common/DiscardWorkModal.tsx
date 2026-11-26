/**
 * DiscardWorkModal — "Deze gooi je weg" (designronde nov 2026, mockup B4).
 *
 * De waarschuwing vóór opnieuw beginnen, met weinig woorden: laat zien wát
 * je weggooit (de verzamelde geluiden als blokjes) in plaats van het uit te
 * leggen, en laat de knoppen zeggen wat er gebeurt. De veilige keuze
 * ("Bewaren") is de primaire knop; "Weggooien" is de gevaarknop.
 * Gedeeld door het startscherm en het podium.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLibraryStore } from '../../stores/libraryStore';
import { Button, Modal } from '../ui';

interface DiscardWorkModalProps {
  isOpen: boolean;
  /** Bewaren: sluit het venster, er gebeurt niets met het werk */
  onKeep: () => void;
  /** Weggooien: de aanroeper begint opnieuw */
  onDiscard: () => void;
}

const MAX_SHOWN = 5;

export function DiscardWorkModal({ isOpen, onKeep, onDiscard }: DiscardWorkModalProps) {
  const { t } = useTranslation();
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const preview = useMemo(
    () => ({ shown: librarySamples.slice(0, MAX_SHOWN), more: Math.max(0, librarySamples.length - MAX_SHOWN) }),
    [librarySamples],
  );

  return (
    <Modal isOpen={isOpen} onClose={onKeep} title={t('start.discard.title')} size="sm">
      {preview.shown.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-6" data-testid="discard-preview">
          {preview.shown.map((smp) => (
            <span
              key={smp.id}
              className="inline-flex items-center min-h-9 px-3 rounded-lg text-sm font-extrabold text-white"
              style={{ backgroundColor: smp.color }}
            >
              {t(smp.name)}
            </span>
          ))}
          {preview.more > 0 && (
            <span className="inline-flex items-center min-h-9 px-3 rounded-lg text-sm font-extrabold bg-neutral-100 text-text-muted">
              +{preview.more}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button variant="danger" onClick={onDiscard} className="flex-1">
          {t('start.discard.confirm')}
        </Button>
        <Button variant="primary" onClick={onKeep} className="flex-1">
          {t('start.discard.keep')}
        </Button>
      </div>
    </Modal>
  );
}
