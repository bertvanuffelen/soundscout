/**
 * NewWorkChoiceModal — "Nog een soundscape maken?" voor een leerling in een
 * klas (A2, ronde 4). Gedeeld door het startscherm en het podium.
 *
 * Voorheen wiste "Nieuwe compositie" in een klas stilletjes de klas-sessie:
 * het tweede werk kwam dan niet meer bij de docent. Nu kiest de leerling:
 * - "Nog één voor deze opdracht" (bij een praatplaat: "op een andere plek")
 * - "Zelf iets nieuws" (verlaat de klas)
 */

import { useTranslation } from 'react-i18next';
import { CheckCircle2, Info, MapPin, Plus, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface NewWorkChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  isPraatplaat: boolean;
  /** Huidige soundscape is ingeleverd (en dus veilig bij de docent) */
  handedIn: boolean;
  onSameAssignment: () => void;
  onFresh: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function NewWorkChoiceModal({
  isOpen,
  onClose,
  className,
  isPraatplaat,
  handedIn,
  onSameAssignment,
  onFresh,
  isLoading = false,
  error = null,
}: NewWorkChoiceModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('newWork.title')} size="sm">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted text-center">{t('newWork.inClass', { className })}</p>

        {handedIn ? (
          <p className="flex items-start gap-2 rounded-xl bg-success-50 px-3 py-2 text-sm font-semibold text-success-600">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            {t('newWork.safe')}
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-warning-50 px-3 py-2 text-sm font-semibold text-warning-600">
            <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            {t('newWork.notSafe')}
          </p>
        )}

        <Button variant="primary" size="lg" onClick={onSameAssignment} isLoading={isLoading} className="w-full">
          {isPraatplaat
            ? <MapPin className="w-5 h-5 mr-2" aria-hidden="true" />
            : <Plus className="w-5 h-5 mr-2" aria-hidden="true" />}
          {isPraatplaat ? t('newWork.samePraatplaat') : t('newWork.same')}
        </Button>
        {isPraatplaat && <p className="-mt-1 text-xs text-text-muted text-center">{t('newWork.samePraatplaatNote')}</p>}

        <Button variant="secondary" size="lg" onClick={onFresh} disabled={isLoading} className="w-full">
          <Sparkles className="w-5 h-5 mr-2" aria-hidden="true" />
          {t('newWork.fresh')}
        </Button>
        <p className="-mt-1 text-xs text-text-muted text-center">{t('newWork.freshNote', { className })}</p>

        {error && (
          <p role="alert" className="text-sm text-error-600 text-center">{error}</p>
        )}

        <Button variant="secondary" onClick={onClose} disabled={isLoading} className="w-full !shadow-none !border-transparent text-text-muted">
          {t('common.cancel')}
        </Button>
      </div>
    </Modal>
  );
}

export default NewWorkChoiceModal;
