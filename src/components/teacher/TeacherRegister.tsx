/**
 * TeacherRegister - Registratie formulier voor docenten
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, Mail, Lightbulb, ArrowLeft } from 'lucide-react';
import { signUpTeacher } from '../../lib/auth';
import { Button } from '../ui/Button';

interface TeacherRegisterProps {
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export function TeacherRegister({ onSwitchToLogin, onBack }: TeacherRegisterProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Zachte drempel (testronde 3, keuze Bert): expliciete docent-verklaring
  // bij registratie — leerlingen horen geen docentenaccount aan te maken
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie
    if (!displayName.trim()) {
      setError(t('teacher.validation.nameRequired'));
      return;
    }
    if (!email.trim()) {
      setError(t('teacher.validation.emailRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('teacher.validation.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('teacher.validation.passwordMismatch'));
      return;
    }
    if (!isEducator) {
      setError(t('teacher.validation.educatorRequired'));
      return;
    }

    try {
      setLoading(true);
      await signUpTeacher(email, password, displayName);
      setSuccess(true);
      // Niet automatisch doorsturen - gebruiker moet eerst email bevestigen
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
            <Mail className="w-16 h-16 text-accent-500" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main mb-2">
            {t('teacher.register.successTitle')}
          </h2>
          <p className="text-text-muted mb-4">
            {t('teacher.register.successMessage')} <strong className="text-text-main">{email}</strong>
          </p>
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 mb-4">
            <p className="text-accent-800 text-sm flex items-center justify-center gap-2">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span><strong>{t('teacher.register.tipLabel')}</strong> {t('teacher.register.successHint')}</span>
            </p>
          </div>
          <p className="text-text-muted text-sm mb-6">
            {t('teacher.register.activationInfo')}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onSwitchToLogin}
            className="w-full rounded-full"
          >
            {t('teacher.register.hasAccount')} {t('teacher.register.loginLink')}
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
            <Music className="w-7 h-7 sm:w-8 sm:h-8 text-accent-500" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main">
              SoundScout
            </h1>
          </div>
          <p className="text-text-muted">
            {t('teacher.register.subtitle')}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Register form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-text-main mb-1">
              {t('teacher.register.nameLabel')}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('teacher.register.namePlaceholder')}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1">
              {t('teacher.register.emailLabel')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('teacher.register.emailPlaceholder')}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-main mb-1">
              {t('teacher.register.passwordLabel')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('teacher.register.passwordPlaceholder')}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-main mb-1">
              {t('teacher.register.confirmPasswordLabel')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('teacher.register.confirmPasswordPlaceholder')}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {/* Docent-verklaring (zachte drempel tegen leerling-accounts) */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isEducator}
              onChange={(e) => setIsEducator(e.target.checked)}
              disabled={loading}
              className="mt-0.5 w-4 h-4 accent-accent-500 shrink-0"
            />
            <span className="text-sm text-text-main leading-snug">
              {t('teacher.register.educatorDeclaration')}
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full rounded-full"
            disabled={loading}
          >
            {loading ? t('teacher.register.submitLoading') : t('teacher.register.submit')}
          </Button>
        </form>

        {/* Switch to login */}
        <div className="mt-6 text-center">
          <p className="text-text-muted text-sm">
            {t('teacher.register.hasAccount')}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-accent-600 hover:text-accent-700 font-medium"
              disabled={loading}
            >
              {t('teacher.register.loginLink')}
            </button>
          </p>
        </div>

        {/* Back button */}
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

export default TeacherRegister;
