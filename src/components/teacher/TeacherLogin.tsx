/**
 * TeacherLogin - Login formulier voor docenten
 */

import { useState } from 'react';
import { Music, ArrowLeft } from 'lucide-react';
import { signInTeacher } from '../../lib/auth';
import { Button } from '../ui/Button';

interface TeacherLoginProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onBack: () => void;
}

export function TeacherLogin({ onSuccess, onSwitchToRegister, onForgotPassword, onBack }: TeacherLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie
    if (!email.trim()) {
      setError('Voer je e-mailadres in');
      return;
    }
    if (!password) {
      setError('Voer je wachtwoord in');
      return;
    }

    try {
      setLoading(true);
      await signInTeacher(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <div className="bg-bg-surface rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Music className="w-7 h-7 sm:w-8 sm:h-8 text-primary-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
              SoundScout
            </h1>
          </div>
          <p className="text-text-muted">
            Docenten Login
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docent@school.nl"
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-text-main">
                Wachtwoord
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-primary-600 hover:text-primary-700"
                disabled={loading}
              >
                Wachtwoord vergeten?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-all text-text-main bg-neutral-50"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Inloggen...' : 'Inloggen'}
          </Button>
        </form>

        {/* Switch to register */}
        <div className="mt-6 text-center">
          <p className="text-text-muted text-sm">
            Nog geen account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary-600 hover:text-primary-700 font-medium"
              disabled={loading}
            >
              Registreer hier
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
            Terug naar SoundScout
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeacherLogin;
