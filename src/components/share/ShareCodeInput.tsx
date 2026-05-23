/**
 * ShareCodeInput - Universele code-invoer op het startscherm
 *
 * Accepteert template-codes (8 chars), share-codes (8 chars), bewaar-codes (6 chars)
 * en klascodes (4 digits, met unified assignment-detectie).
 * Herkenning op basis van codelengte:
 * - 4 cijfers → klascode → check actieve opdracht (template of praatplaat) → route
 * - 6 karakters → bewaarcode (#52) → laad in studio om verder te werken
 * - 8 karakters → probeer eerst als template, dan als share-code
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { getTemplateByCode } from '../../lib/templates';
import { getSharedComposition, loadSavedComposition, claimSavedComposition } from '../../lib/submissions';
import { getSharedPraatplaat } from '../../lib/praatplaat';
import { useAppStore } from '../../stores/appStore';
import { initializeFromTemplate, initializeFromSavedComposition, lookupAndRouteAssignment } from '../../utils/compositionInit';
import { logger } from '../../utils/logger';

export function ShareCodeInput() {
  const { t } = useTranslation();
  const goToShared = useAppStore((s) => s.goToShared);
  const goToSharedPraatplaat = useAppStore((s) => s.goToSharedPraatplaat);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Only allow alphanumeric characters, convert to uppercase
  const handleChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    setCode(cleaned);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (code.length < 4) {
        setError(t('share.invalidCode'));
        return;
      }

      setIsLoading(true);
      setError(null);
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      try {
        // 0. Als 4 cijfers → klascode → route naar AssignmentLandingScreen.
        //    Het landingsscherm toont de opdracht (template/praatplaat) of
        //    soft-recovery (Route C) zodat de leerling zelf op "Starten" drukt
        //    voordat we de studio/praatplaat-select in gaan (#78).
        if (code.length === 4 && /^\d{4}$/.test(code)) {
          const routed = await lookupAndRouteAssignment(code);
          if (signal.aborted) return;
          if (routed) {
            setCode('');
            return;
          }
          setError(t('share.lookupError'));
          setIsLoading(false);
          return;
        }

        // 1. Als 6 karakters → probeer als bewaarcode (#52)
        if (code.length === 6) {
          try {
            const saved = await loadSavedComposition(code);
            if (signal.aborted) return;
            if (saved) {
              // Claim de compositie (genereert nieuwe secret voor dit apparaat)
              const newSecret = await claimSavedComposition(code, saved.student_name);
              if (signal.aborted) return;
              await initializeFromSavedComposition(
                saved.composition_data,
                saved.composition_name,
                code,
                newSecret,
              );
              setCode('');
              return;
            }
          } catch {
            if (signal.aborted) return;
          }
          setError(t('share.codeNotFound'));
          return;
        }

        // 2. Probeer als template-code (8 chars)
        const template = await getTemplateByCode(code);
        if (signal.aborted) return;
        if (template) {
          await initializeFromTemplate(template);
          setCode('');
          return;
        }

        // 3. Niet gevonden als template → probeer als share-code (8 chars)
        try {
          const shared = await getSharedComposition(code);
          if (signal.aborted) return;
          if (shared) {
            goToShared(code);
            setCode('');
            return;
          }
        } catch {
          if (signal.aborted) return;
        }

        // 4. Niet gevonden als share-code → probeer als praatplaat share-code (#73)
        try {
          const sharedPP = await getSharedPraatplaat(code);
          if (signal.aborted) return;
          if (sharedPP) {
            goToSharedPraatplaat(code);
            setCode('');
            return;
          }
        } catch {
          if (signal.aborted) return;
        }

        // 5. Geen match gevonden
        setError(t('share.codeNotFound'));
      } catch (err) {
        if (signal.aborted) return;
        logger.error('Code lookup mislukt:', err);
        setError(t('share.lookupError'));
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [code, t, goToShared, goToSharedPraatplaat]
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
        <div className="relative flex-1">
          <input
            id="share-code-input"
            type="text"
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t('share.listenPlaceholder')}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white/10 md:bg-neutral-100 border border-white/20 md:border-neutral-300 rounded-lg text-center text-white md:text-text-main font-mono text-sm tracking-wider placeholder:text-white/30 md:placeholder:text-neutral-400 focus:outline-none focus:border-accent-400 transition-colors disabled:opacity-50"
          />
          {isLoading && (
            <button
              type="button"
              onClick={() => { abortRef.current?.abort(); setIsLoading(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              aria-label={t('common.cancel')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={code.length < 4 || isLoading}
          aria-label={t('share.listen')}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Headphones className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('share.listen')}</span>
            </>
          )}
        </Button>
      </form>
      <p className="text-white/40 md:text-text-muted text-[10px] sm:text-xs text-center mt-1.5">
        {t('share.codeFormatHint')}
      </p>
      {error && (
        <p role="alert" aria-live="polite" className="text-error-400 text-xs text-center mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default ShareCodeInput;
