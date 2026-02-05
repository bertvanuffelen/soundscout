/**
 * FeedbackModal - Modal for sending feedback or error reports
 *
 * Two modes:
 * - 'error': Shows error details and allows user to add context
 * - 'feedback': Category selection + description for general feedback
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, HelpCircle, MessageSquare, ChevronDown, ChevronUp, Send, Check, X } from 'lucide-react';
import { Modal, Button } from '../ui';
import {
  sendFeedback,
  validateFeedback,
  checkRateLimit,
  type FeedbackCategory,
  type ErrorData,
  type FeedbackInput,
} from './FeedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'error' | 'feedback';
  errorData?: ErrorData;
}

const CATEGORIES: { id: FeedbackCategory; icon: typeof Bug }[] = [
  { id: 'bug', icon: Bug },
  { id: 'confusion', icon: HelpCircle },
  { id: 'other', icon: MessageSquare },
];

export function FeedbackModal({ isOpen, onClose, mode, errorData }: FeedbackModalProps) {
  const { t } = useTranslation();

  // Form state
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCategory(null);
      setMessage('');
      setEmail('');
      setShowErrorDetails(false);
      setIsSubmitting(false);
      setSubmitStatus('idle');
      setErrorMessage('');

      // Check rate limit on open
      const seconds = checkRateLimit();
      setRateLimitSeconds(seconds);
    }
  }, [isOpen]);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitSeconds > 0) {
      const timer = setInterval(() => {
        setRateLimitSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitSeconds]);

  const handleSubmit = async () => {
    // Check rate limit first
    const seconds = checkRateLimit();
    if (seconds > 0) {
      setRateLimitSeconds(seconds);
      return;
    }

    const input: FeedbackInput = {
      mode,
      category: mode === 'feedback' ? (category ?? undefined) : undefined,
      message: message.trim(),
      userEmail: email.trim() || undefined,
      errorData: mode === 'error' ? errorData : undefined,
    };

    // Validate
    const validation = validateFeedback(input);
    if (!validation.valid) {
      setErrorMessage(t(`feedback.validation.${validation.errors[0]}`));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const result = await sendFeedback(input);

    setIsSubmitting(false);

    if (result.success) {
      setSubmitStatus('success');
    } else {
      if (result.error?.startsWith('rateLimited:')) {
        const seconds = parseInt(result.error.split(':')[1], 10);
        setRateLimitSeconds(seconds);
      } else {
        setSubmitStatus('error');
        setErrorMessage(t(`feedback.error.${result.error || 'sendFailed'}`));
      }
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Success state
  if (submitStatus === 'success') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="sm">
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-text-main mb-2">
            {t('feedback.successTitle')}
          </h3>
          <p className="text-text-muted mb-6">
            {t('feedback.successMessage')}
          </p>
          <Button onClick={handleClose} className="w-full">
            {t('feedback.close')}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'error' ? t('feedback.titleError') : t('feedback.titleFeedback')}
      size="md"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="space-y-4">
        {/* Header with app name */}
        <div className="flex items-center gap-2 text-sm text-text-muted border-b border-neutral-200 pb-3 -mt-2">
          <img
            src="/images/overige/logo-soundscout.svg"
            alt="SoundScout"
            className="w-5 h-5"
          />
          <span className="font-medium">SoundScout</span>
        </div>

        {/* Error mode: show error details */}
        {mode === 'error' && errorData && (
          <div className="bg-red-50 rounded-lg border border-red-200">
            <button
              type="button"
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm text-red-700 hover:bg-red-100 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                {t('feedback.errorCodeLabel')}
              </span>
              {showErrorDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showErrorDetails && (
              <div className="px-3 pb-3">
                <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                  {errorData.message}
                  {errorData.stack && `\n\n${errorData.stack.slice(0, 500)}...`}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Intro text */}
        <p className="text-text-muted text-sm">
          {mode === 'error' ? t('feedback.errorIntro') : t('feedback.feedbackIntro')}
        </p>

        {/* Category selection (feedback mode only) */}
        {mode === 'feedback' && (
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={`
                  p-3 rounded-xl border-2 transition-all text-center
                  ${category === id
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-neutral-200 hover:border-neutral-300 text-text-muted hover:text-text-main'
                  }
                `}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs font-medium block">
                  {t(`feedback.categories.${id}.label`)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Message textarea */}
        <div>
          <label className="block text-sm font-medium text-text-main mb-1">
            {mode === 'error' ? t('feedback.whatHappened') : t('feedback.descriptionLabel')}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={mode === 'error' ? t('feedback.whatHappenedPlaceholder') : t('feedback.descriptionPlaceholder')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none text-sm"
            rows={3}
            maxLength={500}
            disabled={isSubmitting}
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>{t('feedback.descriptionHint')}</span>
            <span>{message.length}/500</span>
          </div>
        </div>

        {/* Email input (optional) */}
        <div>
          <label className="block text-sm font-medium text-text-main mb-1">
            {t('feedback.emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('feedback.emailPlaceholder')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
            disabled={isSubmitting}
          />
        </div>

        {/* Rate limit message */}
        {rateLimitSeconds > 0 && (
          <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            {t('feedback.rateLimitMessage', { seconds: rateLimitSeconds })}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
            <X className="w-4 h-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={isSubmitting || rateLimitSeconds > 0}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting
            ? t('feedback.submitting')
            : mode === 'error'
              ? t('feedback.submitError')
              : t('feedback.submitFeedback')
          }
        </Button>
      </div>
    </Modal>
  );
}
