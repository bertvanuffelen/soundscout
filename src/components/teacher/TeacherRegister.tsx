/**
 * TeacherRegister - Registratie formulier voor docenten
 */

import { useState } from 'react';
import { Music, Mail, Lightbulb, ArrowLeft } from 'lucide-react';
import { signUpTeacher } from '../../lib/auth';
import { Button } from '../ui/Button';

interface TeacherRegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export function TeacherRegister({ onSuccess: _onSuccess, onSwitchToLogin, onBack }: TeacherRegisterProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie
    if (!displayName.trim()) {
      setError('Voer je naam in');
      return;
    }
    if (!email.trim()) {
      setError('Voer je e-mailadres in');
      return;
    }
    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    try {
      setLoading(true);
      await signUpTeacher(email, password, displayName);
      setSuccess(true);
      // Niet automatisch doorsturen - gebruiker moet eerst email bevestigen
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
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
            Bijna klaar!
          </h2>
          <p className="text-text-muted mb-4">
            We hebben een bevestigingsmail gestuurd naar <strong className="text-text-main">{email}</strong>
          </p>
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4">
            <p className="text-primary-800 text-sm flex items-center justify-center gap-2">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span><strong>Tip:</strong> Controleer ook je spam/ongewenste mail folder als je de mail niet ziet.</span>
            </p>
          </div>
          <p className="text-text-muted text-sm mb-6">
            Klik op de link in de mail om je account te activeren.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onSwitchToLogin}
            className="w-full"
          >
            Ga naar inloggen
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
            <Music className="w-7 h-7 sm:w-8 sm:h-8 text-primary-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
              SoundScout
            </h1>
          </div>
          <p className="text-text-muted">
            Docent Account Aanmaken
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
              Naam
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Juf Marieke"
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="name"
            />
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-text-main mb-1">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimaal 6 tekens"
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-main mb-1">
              Bevestig wachtwoord
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Herhaal je wachtwoord"
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-all text-text-main placeholder:text-text-muted/50 bg-neutral-50"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Account aanmaken...' : 'Account aanmaken'}
          </Button>
        </form>

        {/* Switch to login */}
        <div className="mt-6 text-center">
          <p className="text-text-muted text-sm">
            Al een account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary-600 hover:text-primary-700 font-medium"
              disabled={loading}
            >
              Log hier in
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

export default TeacherRegister;
