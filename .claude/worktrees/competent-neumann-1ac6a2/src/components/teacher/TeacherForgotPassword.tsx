/**
 * TeacherForgotPassword - Wachtwoord vergeten formulier voor docenten
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Mail, Lightbulb, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../../lib/auth';
import { Button } from '../ui/Button';

interface TeacherForgotPasswordProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

export function TeacherForgotPassword({ onBack, onSwitchToLogin }: TeacherForgotPasswordProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie
    if (!email.trim()) {
      setError(t('teacher.validation.emailRequired'));
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacher.validation.genericError'));
    } finally {
      setLoading(false);
    }
  };

  // Succes scherm
  if (success) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
        <div className="bg-bg-surface rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-16 h-16 text-primary-500" />
          </div>
          <h2 className="text-2xl font-bold text-text-main mb-2">
            {t('teacher.forgotPassword.successTitle')}
          </h2>
          <p className="text-text-muted mb-4">
            {t('teacher.forgotPassword.successMessage')} <strong className="text-text-main">{email}</strong>
          </p>
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
            <p className="text-primary-800 text-sm flex items-center justify-center gap-2">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span><strong>{t('teacher.forgotPassword.tipLabel')}</strong> {t('teacher.forgotPassword.successHint')}</span>
            </p>
          </div>
          <p className="text-text-muted text-sm mb-6">
            {t('teacher.forgotPassword.resetInfo')}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onSwitchToLogin}
            className="w-full"
          >
            {t('teacher.forgotPassword.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <div className="bg-bg-surface rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-primary-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
              {t('teacher.forgotPassword.title')}
            </h1>
          </div>
          <p className="text-text-muted">
            {t('teacher.forgotPassword.subtitle')}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1">
              {t('teacher.forgotPassword.emailLabel')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('teacher.forgotPassword.emailPlaceholder')}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('teacher.forgotPassword.submitLoading') : t('teacher.forgotPassword.submit')}
          </Button>
        </form>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('teacher.forgotPassword.backToLogin')}
          </button>
        </div>

        {/* Back to SoundScout */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-text-muted hover:text-text-main text-sm inline-flex items-center gap-1"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('teacher.common.backToSoundScout')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeacherForgotPassword;
