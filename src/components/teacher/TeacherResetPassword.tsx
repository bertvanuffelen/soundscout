/**
 * TeacherResetPassword - Nieuw wachtwoord instellen na de reset-link
 *
 * De recovery-link uit de e-mail logt de docent tijdelijk in (Supabase
 * recovery-sessie). Dit scherm zet daarna het nieuwe wachtwoord.
 * Zonder geldige sessie (verlopen/ongeldige link) toont het een
 * "vraag een nieuwe link aan"-stap.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { updatePassword } from '../../lib/auth';
import { useAuth } from '../../contexts/useAuth';
import { Button } from '../ui/Button';

interface TeacherResetPasswordProps {
  /** Klaar: wachtwoord gewijzigd, door naar het dashboard */
  onDone: () => void;
  /** Link verlopen/ongeldig: naar het wachtwoord-vergeten-formulier */
  onRequestNew: () => void;
}

export function TeacherResetPassword({ onDone, onRequestNew }: TeacherResetPasswordProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('teacher.resetPassword.mismatch'));
      return;
    }

    try {
      setLoading(true);
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacher.validation.genericError'));
    } finally {
      setLoading(false);
    }
  };

  // Geen recovery-sessie: link is verlopen of ongeldig
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
        <div className="bg-bg-surface rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-16 h-16 text-warning-500" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main mb-2">
            {t('teacher.resetPassword.expiredTitle')}
          </h2>
          <p className="text-text-muted mb-6">
            {t('teacher.resetPassword.expiredMessage')}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onRequestNew}
            className="w-full rounded-full"
          >
            {t('teacher.resetPassword.requestNew')}
          </Button>
        </div>
      </div>
    );
  }

  // Succes scherm
  if (success) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
        <div className="bg-bg-surface rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-success-500" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main mb-2">
            {t('teacher.resetPassword.successTitle')}
          </h2>
          <p className="text-text-muted mb-6">
            {t('teacher.resetPassword.successMessage')}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onDone}
            className="w-full rounded-full"
          >
            {t('teacher.resetPassword.toDashboard')}
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
            <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-accent-500" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main">
              {t('teacher.resetPassword.title')}
            </h1>
          </div>
          <p className="text-text-muted">
            {t('teacher.resetPassword.subtitle')}
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
            <label htmlFor="new-password" className="block text-sm font-medium text-text-main mb-1">
              {t('teacher.resetPassword.newPasswordLabel')}
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('teacher.register.passwordPlaceholder')}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-text-main mb-1">
              {t('teacher.resetPassword.confirmPasswordLabel')}
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('teacher.register.confirmPasswordPlaceholder')}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full rounded-full"
            disabled={loading}
          >
            {loading ? t('teacher.resetPassword.submitLoading') : t('teacher.resetPassword.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default TeacherResetPassword;
