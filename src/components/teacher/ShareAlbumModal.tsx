/**
 * ShareAlbumModal - Klas-album delen (R4, migratie 031)
 *
 * Genereert (of verlengt) de album-deelcode voor één klas-opdracht en
 * toont de luisterlink + QR. Wie de link opent ziet alle ingeleverde
 * composities van de opdracht in het presentatiescherm.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, QrCode, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { shareClassAlbum } from '../../lib/albums';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { logger } from '../../utils/logger';
import { copyToClipboard } from '../../utils/copyToClipboard';

interface ShareAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  assignmentName: string;
}

export function ShareAlbumModal({ isOpen, onClose, assignmentId, assignmentName }: ShareAlbumModalProps) {
  const { t } = useTranslation();
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Code genereren/verlengen bij openen. State-updates één tick uitstellen
  // (react-hooks/set-state-in-effect), zelfde patroon als elders.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (!isOpen) {
        setShareCode(null);
        setError(null);
        setCopied(false);
        setShowQr(false);
        setQrDataUrl(null);
        return;
      }
      setLoading(true);
      shareClassAlbum(assignmentId)
        .then((code) => { if (!cancelled) setShareCode(code); })
        .catch((err) => {
          logger.error('Album delen mislukt:', err);
          if (!cancelled) setError(err instanceof Error ? err.message : t('album.shareError'));
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, assignmentId, t]);

  const shareUrl = shareCode
    ? `${window.location.origin}/?album=${shareCode}`
    : null;

  useEffect(() => {
    if (!showQr || !shareUrl) return;
    QRCode.toDataURL(shareUrl, { width: 280, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [showQr, shareUrl]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    if (await copyToClipboard(shareUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('album.shareTitle')} size="sm">
      <p className="text-text-muted text-sm mb-4 leading-relaxed">
        {t('album.shareDescription', { name: assignmentName })}
      </p>

      {loading && (
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto" />
        </div>
      )}

      {error && (
        <p role="alert" className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </p>
      )}

      {shareUrl && shareCode && (
        <>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between gap-2 bg-accent-50 border border-accent-200 rounded-xl px-3 py-2.5 mb-2 hover:bg-accent-100 transition-colors"
            title={t('album.copyLink')}
          >
            <span className="font-mono text-sm text-accent-800 truncate">{shareUrl}</span>
            {copied ? <Check className="w-4 h-4 text-success-600 shrink-0" /> : <Copy className="w-4 h-4 text-accent-600 shrink-0" />}
          </button>
          <p className="text-text-muted text-xs mb-4 text-center">
            {t('album.codeHint', { code: shareCode })} · {t('album.validity')}
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowQr((v) => !v)}
            className="w-full inline-flex items-center justify-center gap-1.5 mb-2"
          >
            <QrCode className="w-4 h-4" />
            {showQr ? t('album.hideQr') : t('album.showQr')}
          </Button>
          {showQr && qrDataUrl && (
            <div className="flex justify-center mb-2">
              <img src={qrDataUrl} alt={t('album.qrAlt')} className="rounded-xl border border-border-subtle" />
            </div>
          )}
        </>
      )}

      <Button variant="primary" onClick={onClose} className="w-full mt-2">
        {t('common.close')}
      </Button>
    </Modal>
  );
}

export default ShareAlbumModal;
