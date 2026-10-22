/**
 * MusicCardModal — de muziekkaart (fase 2.7, v4)
 *
 * Eén herkenbare kaart met titel, bewaarcode en QR-code, zodat een leerling
 * er een foto van kan maken of de code kan opschrijven. Daaronder de
 * bestaande "mee naar huis"-knoppen (kopiëren, link, mail, QR groot).
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SaveCodeTakeHome } from '../share/SaveCodeTakeHome';
import { buildSaveCodeLink } from '../../utils/saveCodeLink';
import { logger } from '../../utils/logger';

interface MusicCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  title: string;
}

export function MusicCardModal({ isOpen, onClose, code, title }: MusicCardModalProps) {
  const { t } = useTranslation();
  const [qr, setQr] = useState<{ code: string; url: string } | null>(null);

  useEffect(() => {
    if (!isOpen || qr?.code === code) return;
    let cancelled = false;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(buildSaveCodeLink(code), { width: 200, margin: 1 }))
      .then((url) => { if (!cancelled) setQr({ code, url }); })
      .catch((err) => logger.warn('QR-code maken mislukt', err));
    return () => { cancelled = true; };
  }, [isOpen, code, qr]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('podium.card.title')} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-accent-300 bg-accent-50 p-3">
          {qr?.code === code
            ? <img src={qr.url} alt="" className="w-24 h-24 shrink-0 rounded-lg bg-white" />
            : <div className="w-24 h-24 shrink-0 rounded-lg bg-white" />}
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-accent-700">{t('podium.card.label')}</span>
            <b className="text-text-main truncate">{title}</b>
            <span className="font-mono text-xl font-extrabold tracking-widest text-text-main">{code}</span>
            <small className="text-xs text-text-muted">{t('podium.card.hint')}</small>
          </div>
        </div>
        <p className="text-sm text-text-muted">{t('podium.card.text')}</p>
        <SaveCodeTakeHome code={code} compositionName={title} />
        <Button variant="primary" onClick={onClose} className="w-full">{t('common.close')}</Button>
      </div>
    </Modal>
  );
}

export default MusicCardModal;
