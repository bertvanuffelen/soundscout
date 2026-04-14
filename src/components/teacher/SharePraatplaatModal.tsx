/**
 * SharePraatplaatModal - Modal met deelbare link + QR-code voor een praatplaat (#73)
 *
 * Toont de directe URL (?pp=KLASCODE) en een QR-code die de docent
 * op het digibord kan projecteren zodat leerlingen direct scannen.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SharePraatplaatModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  praatplaatName: string;
}

export function SharePraatplaatModal({
  isOpen,
  onClose,
  classCode,
  praatplaatName,
}: SharePraatplaatModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Build shareable URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?pp=${classCode}`;

  // Generate QR code when toggled on
  useEffect(() => {
    if (!showQr || !isOpen) return;
    QRCode.toDataURL(shareUrl, { width: 280, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [showQr, shareUrl, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setShowQr(false);
      setQrDataUrl(null);
    }
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in a temporary input
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('teacher.praatplaat.shareTitle')} size="sm">
      <div className="space-y-4">
        {/* Praatplaat naam */}
        <p className="text-text-muted text-sm">
          {t('teacher.praatplaat.shareDescription', { name: praatplaatName })}
        </p>

        {/* URL + kopieer */}
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-neutral-100 px-3 py-2 rounded-lg text-sm font-mono text-text-main truncate select-all">
            {shareUrl}
          </code>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
            aria-label={t('teacher.praatplaat.copyLink')}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Klascode referentie */}
        <p className="text-text-muted text-xs">
          {t('teacher.praatplaat.shareClassCode', { code: classCode })}
        </p>

        {/* QR toggle */}
        <div className="border-t border-neutral-200 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQr(!showQr)}
            className="w-full inline-flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            {showQr ? t('teacher.praatplaat.hideQr') : t('teacher.praatplaat.showQr')}
          </Button>

          {showQr && qrDataUrl && (
            <div className="mt-3 flex flex-col items-center gap-2">
              <img
                src={qrDataUrl}
                alt={t('teacher.praatplaat.qrAlt', { name: praatplaatName })}
                className="w-56 h-56 rounded-lg"
              />
              <p className="text-text-muted text-xs text-center">
                {t('teacher.praatplaat.qrHint')}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default SharePraatplaatModal;
