/**
 * SharePraatplaatModal - Modal met deelbare link + QR-code voor een praatplaat (#73)
 *
 * Toont de directe URL (?pp=KLASCODE) en een QR-code die de docent
 * op het digibord kan projecteren zodat leerlingen direct scannen.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, QrCode, Globe, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { sharePraatplaat } from '../../lib/praatplaat';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { logger } from '../../utils/logger';

interface SharePraatplaatModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  praatplaatName: string;
  praatplaatId: string;
}

export function SharePraatplaatModal({
  isOpen,
  onClose,
  classCode,
  praatplaatName,
  praatplaatId,
}: SharePraatplaatModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Luisterpagina (#73)
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string | null>(null);
  const [showShareQr, setShowShareQr] = useState(false);

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
      setShareCode(null);
      setShareLoading(false);
      setShareError(null);
      setShareCopied(false);
      setShareQrDataUrl(null);
      setShowShareQr(false);
    }
  }, [isOpen]);

  // Share link URL
  const shareUrl2 = shareCode
    ? `${window.location.origin}${window.location.pathname}?pp-share=${shareCode}`
    : null;

  // Generate share link QR when toggled
  useEffect(() => {
    if (!showShareQr || !shareUrl2) return;
    QRCode.toDataURL(shareUrl2, { width: 280, margin: 2 })
      .then(setShareQrDataUrl)
      .catch(() => setShareQrDataUrl(null));
  }, [showShareQr, shareUrl2]);

  const handleGenerateShareLink = useCallback(async () => {
    setShareLoading(true);
    setShareError(null);
    try {
      const code = await sharePraatplaat(praatplaatId);
      setShareCode(code);
    } catch (err) {
      logger.error('SharePraatplaatModal share link failed:', err);
      setShareError(err instanceof Error ? err.message : t('teacher.praatplaat.shareError'));
    } finally {
      setShareLoading(false);
    }
  }, [praatplaatId, t]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl2) return;
    try {
      await navigator.clipboard.writeText(shareUrl2);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl2;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [shareUrl2]);

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
              <Check className="w-4 h-4 text-success-600" />
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

        {/* --- Luisterpagina (#73) --- */}
        <div className="border-t border-neutral-200 pt-4">
          <h3 className="text-text-main font-semibold text-sm mb-1">
            {t('teacher.praatplaat.shareListenTitle')}
          </h3>
          <p className="text-text-muted text-xs mb-3">
            {t('teacher.praatplaat.shareListenDescription')}
          </p>

          {!shareCode ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateShareLink}
                disabled={shareLoading}
                className="w-full inline-flex items-center justify-center gap-2"
              >
                {shareLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                {t('teacher.praatplaat.generateShareLink')}
              </Button>
              {shareError && (
                <p className="text-error-600 text-xs mt-2">{shareError}</p>
              )}
            </>
          ) : (
            <>
              {/* Share URL + kopieer */}
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-neutral-100 px-3 py-2 rounded-lg text-sm font-mono text-text-main truncate select-all">
                  {shareUrl2}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyShareLink}
                  className="shrink-0"
                  aria-label={t('teacher.praatplaat.copyLink')}
                >
                  {shareCopied ? (
                    <Check className="w-4 h-4 text-success-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <p className="text-text-muted text-xs mt-2">
                {t('teacher.praatplaat.shareListenExpiry')}
              </p>

              {/* QR toggle voor luisterpagina */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareQr(!showShareQr)}
                className="w-full inline-flex items-center justify-center gap-2 mt-2"
              >
                <QrCode className="w-4 h-4" />
                {showShareQr ? t('teacher.praatplaat.hideQr') : t('teacher.praatplaat.showQr')}
              </Button>

              {showShareQr && shareQrDataUrl && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <img
                    src={shareQrDataUrl}
                    alt={t('teacher.praatplaat.qrAlt', { name: praatplaatName })}
                    className="w-56 h-56 rounded-lg"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default SharePraatplaatModal;
