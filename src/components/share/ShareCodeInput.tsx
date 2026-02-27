/**
 * ShareCodeInput - Invoerveld voor share codes op het startscherm
 *
 * Leerlingen kunnen hier een 8-karakter code invoeren
 * om een gedeelde compositie te beluisteren.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones } from 'lucide-react';
import { Button } from '../ui/Button';

interface ShareCodeInputProps {
  onSubmit: (code: string) => void;
}

export function ShareCodeInput({ onSubmit }: ShareCodeInputProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Only allow alphanumeric characters, convert to uppercase
  const handleChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    setCode(cleaned);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (code.length < 4) {
        setError(t('share.invalidCode'));
        return;
      }

      onSubmit(code);
    },
    [code, onSubmit, t]
  );

  return (
    <div className="w-full max-w-sm mx-auto">
      <p className="text-sm text-brand-300 md:text-text-muted text-center mb-2">
        {t('share.listenTitle')}
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="share-code-input" className="sr-only">
          {t('share.listenPlaceholder')}
        </label>
        <input
          id="share-code-input"
          type="text"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('share.listenPlaceholder')}
          className="flex-1 px-3 py-2 bg-white/10 md:bg-neutral-100 border border-white/20 md:border-neutral-300 rounded-lg text-center text-white md:text-text-main font-mono text-sm tracking-wider placeholder:text-white/30 md:placeholder:text-neutral-400 focus:outline-none focus:border-accent-400 transition-colors"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={code.length < 4}
          aria-label={t('share.listen')}
          className="shrink-0"
        >
          <Headphones className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">{t('share.listen')}</span>
        </Button>
      </form>
      {error && (
        <p role="alert" aria-live="polite" className="text-red-400 text-xs text-center mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default ShareCodeInput;
