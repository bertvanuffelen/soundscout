/**
 * ShareLinkModal - Modal voor het genereren van een publieke luisterlink
 *
 * Flow:
 * 1. Bevestigingsstap (uitleg + "Link aanmaken" knop)
 * 2. Link wordt aangemaakt (loading)
 * 3. Succes → Toont link + code + kopieerknop
 * 4. Error → Foutmelding + opnieuw proberen
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Link2, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { shareComposition } from '../../lib/submissions';
import { canShare, markShare, getShareCooldownRemaining } from '../../utils/rateLimit';
import type { CompositionData } from '../../types';

interface ShareLinkModalProps {
  compositionName: string;
  compositionData: CompositionData;
  studentName?: string;
  onClose: () => void;
}

type ModalState = 'confirm' | 'generating' | 'ready' | 'error';

export function ShareLinkModal({
  compositionName,
  compositionData,
  studentName,
  onClose,
}: ShareLinkModalProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<ModalState>('confirm');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Rate limit countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.ceil(getShareCooldownRemaining() / 1000);
      setCooldownSeconds(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Generate share link — only called on user confirmation (with rate limiting)
  const generateLink = useCallback(async () => {
    // Rate limit check
    if (!canShare()) {
      const remaining = Math.ceil(getShareCooldownRemaining() / 1000);
      setCooldownSeconds(remaining);
      setError(t('submissions.cooldown', { seconds: remaining }));
      return;
    }

    setState('generating');
    setError(null);

    try {
      const code = await shareComposition({
        studentName,
        compositionName,
        compositionData,
      });
      markShare(); // Markeer succesvolle share voor rate limiting
      setShareCode(code);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('share.errorGeneric'));
      setState('error');
    }
  }, [compositionName, compositionData, studentName, t]);

  // Build the full share URL
  const shareUrl = shareCode
    ? `${window.location.origin}${window.location.pathname}?share=${shareCode}`
    : '';

  // Copy link to clipboard
  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent-500" />
            {t('share.shareLink')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Confirm state */}
        {state === 'confirm' && (
          <div>
            <p className="text-gray-600 mb-4">
              {t('share.confirmDescription')}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                {t('feedback.close')}
              </Button>
              <Button
                variant="primary"
                onClick={generateLink}
                disabled={cooldownSeconds > 0}
                className="flex-1"
              >
                <Link2 className="w-4 h-4 mr-1.5" />
                {cooldownSeconds > 0
                  ? `${t('share.generateLink')} (${cooldownSeconds}s)`
                  : t('share.generateLink')}
              </Button>
            </div>
          </div>
        )}

        {/* Generating state */}
        {state === 'generating' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-accent-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">{t('share.generating')}</p>
          </div>
        )}

        {/* Ready state */}
        {state === 'ready' && shareCode && (
          <div>
            <p className="text-gray-600 mb-4">{t('share.linkReady')}</p>

            {/* Share URL */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-neutral-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-mono truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant={copied ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {t('share.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    {t('share.copyLink')}
                  </>
                )}
              </Button>
            </div>

            {/* Share code */}
            <div className="bg-neutral-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">{t('share.code')}</p>
              <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest text-center">
                {shareCode}
              </p>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {t('share.codeDescription')}
              </p>
            </div>

            {/* Expiry notice */}
            <p className="text-xs text-gray-400 text-center mb-4">
              {t('share.expiresIn')}
            </p>

            <Button
              variant="primary"
              onClick={onClose}
              className="w-full"
            >
              {t('feedback.close')}
            </Button>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="text-center py-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                {t('feedback.close')}
              </Button>
              <Button
                variant="primary"
                onClick={generateLink}
                className="flex-1"
              >
                {t('share.shareLink')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareLinkModal;
