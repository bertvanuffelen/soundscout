/**
 * SaveCodeTakeHome — bewaarcode "mee naar huis" (besluit Bert 14-10)
 *
 * Vier manieren om thuis verder te werken of het aan ouders te laten horen:
 * - code kopiëren
 * - link kopiëren (soundscout.nl/#code=…, opent direct "Studio of Podium")
 * - mailen via het eigen mailprogramma (mailto zonder ontvanger: wij slaan
 *   géén e-mailadres op — AUD-11)
 * - QR-code met de link, die een ouder met de telefoon kan scannen
 *
 * Wie de link of code heeft, kan het werk ook bewerken; daarom staat er een
 * zin bij om hem alleen thuis te delen.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Link2, Mail, QrCode } from 'lucide-react';
import { Button } from '../ui/Button';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { buildSaveCodeLink } from '../../utils/saveCodeLink';
import { logger } from '../../utils/logger';

interface SaveCodeTakeHomeProps {
  code: string;
  compositionName: string;
}

export function SaveCodeTakeHome({ code, compositionName }: SaveCodeTakeHomeProps) {
  const { t } = useTranslation();
  const link = buildSaveCodeLink(code);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // QR pas maken als hij gevraagd wordt (qrcode wordt lazy geladen)
  useEffect(() => {
    if (!showQr || qrDataUrl) return;
    let cancelled = false;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(link, { width: 220, margin: 2 }))
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch((err) => logger.warn('QR-code maken mislukt', err));
    return () => { cancelled = true; };
  }, [showQr, qrDataUrl, link]);

  const handleCopy = useCallback(async (what: 'code' | 'link') => {
    if (await copyToClipboard(what === 'code' ? code : link)) {
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    }
  }, [code, link]);

  const handleMail = useCallback(() => {
    const subject = encodeURIComponent(t('takeHome.mailSubject'));
    const body = encodeURIComponent(t('takeHome.mailBody', { name: compositionName || code, link, code }));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [t, compositionName, code, link]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={copied === 'code' ? 'primary' : 'secondary'} size="sm" onClick={() => handleCopy('code')}>
          {copied === 'code'
            ? <><Check className="w-4 h-4 mr-1" />{t('share.copied')}</>
            : <><Copy className="w-4 h-4 mr-1" />{t('saveOnline.copyCode')}</>}
        </Button>
        <Button variant={copied === 'link' ? 'primary' : 'secondary'} size="sm" onClick={() => handleCopy('link')}>
          {copied === 'link'
            ? <><Check className="w-4 h-4 mr-1" />{t('share.copied')}</>
            : <><Link2 className="w-4 h-4 mr-1" />{t('takeHome.copyLink')}</>}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleMail}>
          <Mail className="w-4 h-4 mr-1" />{t('takeHome.mail')}
        </Button>
        <Button
          variant={showQr ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowQr((v) => !v)}
          aria-expanded={showQr}
        >
          <QrCode className="w-4 h-4 mr-1" />{t('takeHome.qr')}
        </Button>
      </div>

      {showQr && qrDataUrl && (
        <div className="flex flex-col items-center mt-3">
          <img src={qrDataUrl} alt={t('takeHome.qrAlt')} className="w-40 h-40" />
          <p className="text-xs text-text-muted mt-1 text-center">{t('takeHome.qrHint')}</p>
        </div>
      )}

      <p className="text-xs text-text-muted mt-3 text-center">{t('takeHome.privacyHint')}</p>
    </div>
  );
}

export default SaveCodeTakeHome;
