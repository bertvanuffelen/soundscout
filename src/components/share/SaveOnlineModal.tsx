/**
 * SaveOnlineModal - Modal voor het online bewaren van een compositie (#52)
 *
 * Flow:
 * 1. Invoer: naam (verplicht), e-mail (optioneel), klascode (optioneel)
 * 2. Bezig met bewaren (loading)
 * 3. Succes → Toont 6-karakter bewaarcode + kopieerknop + mail-optie
 * 4. Error → Foutmelding + opnieuw proberen
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Copy, Check, Loader2, AlertCircle, Mail, QrCode } from 'lucide-react';
import { Button } from '../ui/Button';
import { saveCompositionOnline } from '../../lib/submissions';
import type { CompositionData } from '../../types';
import QRCode from 'qrcode';

interface SaveOnlineModalProps {
  compositionName: string;
  compositionData: CompositionData;
  studentName?: string;
  onClose: () => void;
  onSaved?: (saveCode: string, saveSecret: string) => void;
}

type ModalState = 'form' | 'saving' | 'success' | 'error';

export function SaveOnlineModal({
  compositionName,
  compositionData,
  studentName: initialStudentName,
  onClose,
  onSaved,
}: SaveOnlineModalProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<ModalState>('form');
  const [name, setName] = useState(initialStudentName || '');
  const [email, setEmail] = useState('');
  const [classCode, setClassCode] = useState('');
  const [saveCode, setSaveCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Generate QR code when save code is available
  useEffect(() => {
    if (!saveCode) return;
    QRCode.toDataURL(saveCode, { width: 200, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [saveCode]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setState('saving');
    setError(null);

    try {
      const result = await saveCompositionOnline({
        studentName: name.trim(),
        compositionName,
        compositionData,
        classCode: classCode.trim() || undefined,
        email: email.trim() || undefined,
      });

      setSaveCode(result.saveCode);
      setState('success');

      // Notify parent to store saveCode + saveSecret in localStorage
      onSaved?.(result.saveCode, result.saveSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveOnline.saveError'));
      setState('error');
    }
  }, [name, compositionName, compositionData, classCode, email, t, onSaved]);

  const handleCopy = useCallback(async () => {
    if (!saveCode) return;
    try {
      await navigator.clipboard.writeText(saveCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = saveCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [saveCode]);

  const handleSendEmail = useCallback(async () => {
    if (!email.trim() || !saveCode) return;
    // Use EmailJS (same as feedback system) or mailto fallback
    const subject = encodeURIComponent('SoundScout — ' + t('saveOnline.emailSubject'));
    const body = encodeURIComponent(
      t('saveOnline.emailBody', { code: saveCode, name: compositionName })
    );
    window.open(`mailto:${email.trim()}?subject=${subject}&body=${body}`, '_self');
    setMailSent(true);
    setTimeout(() => setMailSent(false), 3000);
  }, [email, saveCode, compositionName, t]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Save className="w-5 h-5 text-accent-500" />
            {t('saveOnline.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-text-muted p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form state */}
        {state === 'form' && (
          <div>
            <p className="text-text-muted text-sm mb-4">
              {t('saveOnline.description')}
            </p>

            {/* Name (required) */}
            <label className="block text-sm font-medium text-text-muted mb-1">
              {t('saveOnline.nameLabel')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('saveOnline.namePlaceholder')}
              maxLength={50}
              className="w-full px-3 py-2 bg-neutral-50 border border-border-subtle rounded-lg text-sm text-text-muted mb-3 focus:outline-none focus:border-accent-400"
            />

            {/* Email (optional) */}
            <label className="block text-sm font-medium text-text-muted mb-1">
              {t('saveOnline.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('saveOnline.emailPlaceholder')}
              className="w-full px-3 py-2 bg-neutral-50 border border-border-subtle rounded-lg text-sm text-text-muted mb-3 focus:outline-none focus:border-accent-400"
            />

            {/* Class code (optional) */}
            <label className="block text-sm font-medium text-text-muted mb-1">
              {t('saveOnline.classCodeLabel')}
            </label>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={t('saveOnline.classCodePlaceholder')}
              maxLength={4}
              className="w-full px-3 py-2 bg-neutral-50 border border-border-subtle rounded-lg text-sm text-text-muted font-mono text-center tracking-widest mb-4 focus:outline-none focus:border-accent-400"
            />

            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {t('saveOnline.saveButton')}
              </Button>
            </div>
          </div>
        )}

        {/* Saving state */}
        {state === 'saving' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-accent-500 mx-auto mb-4 animate-spin" />
            <p className="text-text-muted">{t('saveOnline.saving')}</p>
          </div>
        )}

        {/* Success state */}
        {state === 'success' && saveCode && (
          <div>
            <p className="text-text-muted mb-4">{t('saveOnline.successDescription')}</p>

            {/* Save code display */}
            <div className="bg-accent-50 border-2 border-accent-200 rounded-xl p-5 mb-4">
              <p className="text-xs text-accent-600 font-medium mb-1 text-center">
                {t('saveOnline.yourCode')}
              </p>
              <p className="text-3xl font-mono font-bold text-text-main tracking-[0.3em] text-center">
                {saveCode}
              </p>
              <p className="text-xs text-accent-600 mt-2 text-center">
                {t('saveOnline.rememberCode')}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <Button
                variant={copied ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-1" />{t('share.copied')}</>
                ) : (
                  <><Copy className="w-4 h-4 mr-1" />{t('saveOnline.copyCode')}</>
                )}
              </Button>
              {email.trim() && (
                <Button
                  variant={mailSent ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={handleSendEmail}
                  className="flex-1"
                >
                  {mailSent ? (
                    <><Check className="w-4 h-4 mr-1" />{t('saveOnline.mailSent')}</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-1" />{t('saveOnline.sendToMail')}</>
                  )}
                </Button>
              )}
              <Button
                variant={showQr ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowQr((v) => !v)}
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </div>

            {/* QR code (toggle) */}
            {showQr && qrDataUrl && (
              <div className="flex flex-col items-center mb-3">
                <img src={qrDataUrl} alt={t('saveOnline.qrAlt')} className="w-40 h-40" />
                <p className="text-xs text-neutral-500 mt-1">{t('saveOnline.qrHint')}</p>
              </div>
            )}

            {/* Expiry note */}
            <p className="text-xs text-neutral-400 text-center mb-4">
              {t('saveOnline.expiryNote')}
            </p>

            <Button variant="primary" onClick={onClose} className="w-full">
              {t('feedback.close')}
            </Button>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="text-center py-4">
            <AlertCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
            <p className="text-error-600 mb-4">{error}</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                {t('feedback.close')}
              </Button>
              <Button variant="primary" onClick={handleSave} className="flex-1">
                {t('common.retry')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SaveOnlineModal;
