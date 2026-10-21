/**
 * UnsavedWorkGuard — vraag vóór iets anders openen over onbewaard werk
 * (fase 5.4, eindtest E5/H4).
 *
 * Gebruik: `const { guard, modal } = useUnsavedWorkGuard();` en dan
 * `guard(() => openIetsAnders())`. Zonder onbewaard werk loopt de actie
 * meteen door. Met onbewaard werk kiest de leerling: eerst bewaren (in Mijn
 * soundscapes), niet bewaren, of annuleren.
 */

import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { hasUnsavedWork, saveWorkLocally } from '../../utils/unsavedWork';

type Action = () => void | Promise<void>;

export function useUnsavedWorkGuard(): { guard: (action: Action) => void; modal: ReactNode } {
  const { t } = useTranslation();
  const [pending, setPending] = useState<Action | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // Stabiel (useCallback): mag in afhankelijkheden van andere callbacks
  const guard = useCallback((action: Action) => {
    if (hasUnsavedWork()) {
      setSaveFailed(false);
      setPending(() => action);
    } else {
      void action();
    }
  }, []);

  const run = () => {
    const action = pending;
    setPending(null);
    if (action) void action();
  };

  const handleSaveFirst = () => {
    if (!saveWorkLocally()) {
      setSaveFailed(true);
      return;
    }
    run();
  };

  const modal = (
    <Modal isOpen={!!pending} onClose={() => setPending(null)} title={t('unsavedWork.title')} size="sm">
      <p className="text-text-muted text-sm mb-5 leading-relaxed text-center">{t('unsavedWork.text')}</p>
      {saveFailed && <p role="alert" className="text-error-600 text-sm text-center mb-3">{t('stage.saveGenericError')}</p>}
      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={handleSaveFirst} className="w-full">
          <Save className="w-4 h-4 mr-2" aria-hidden="true" />
          {t('unsavedWork.saveFirst')}
        </Button>
        <Button variant="secondary" onClick={run} className="w-full">{t('unsavedWork.discard')}</Button>
        <Button variant="ghost" onClick={() => setPending(null)} className="w-full text-text-main hover:bg-neutral-100">{t('common.cancel')}</Button>
      </div>
    </Modal>
  );

  return { guard, modal };
}
