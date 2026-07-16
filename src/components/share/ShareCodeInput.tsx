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
import { Headphones, Loader2, X, SlidersHorizontal, Theater } from 'lucide-react';
import { Button } from '../ui/Button';
import { getTemplateByCode } from '../../lib/templates';
import { getSharedComposition, loadSavedComposition } from '../../lib/submissions';
import { getSharedPraatplaat } from '../../lib/praatplaat';
import { useAppStore } from '../../stores/appStore';
import { initializeFromTemplate, openSavedComposition, lookupAndRouteAssignment } from '../../utils/compositionInit';
import { logger } from '../../utils/logger';

type PendingSaved = {
  saved: NonNullable<Awaited<ReturnType<typeof loadSavedComposition>>>;
  code: string;
};

export function ShareCodeInput() {
  const { t } = useTranslation();
  const goToShared = useAppStore((s) => s.goToShared);
  const goToSharedPraatplaat = useAppStore((s) => s.goToSharedPraatplaat);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Keuzescherm na een gevonden bewaarcode (testronde 2): Studio of Podium
  const [pendingSaved, setPendingSaved] = useState<PendingSaved | null>(null);
  const [destLoading, setDestLoading] = useState<'studio' | 'stage' | null>(null);
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
          // Laden heeft eigen foutafhandeling: alleen een écht lege lookup is
          // "code niet gevonden". Elke andere fout (parse, rate limit, netwerk)
          // toont zijn eigen — al vertaalde — melding (testronde-1 bug 2c).
          let saved: Awaited<ReturnType<typeof loadSavedComposition>>;
          try {
            saved = await loadSavedComposition(code);
          } catch (err) {
            if (signal.aborted) return;
            logger.error('Bewaarcode laden mislukt:', err);
            setError(err instanceof Error && err.message ? err.message : t('share.loadFailed'));
            return;
          }
          if (signal.aborted) return;
          if (!saved) {
            setError(t('share.codeNotFound'));
            return;
          }

          // Gevonden → keuzescherm "Studio of Podium" (testronde 2): claimen
          // en navigeren gebeurt pas ná de keuze, in handleDestination.
          setPendingSaved({ saved, code });
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

  // Keuze gemaakt (Studio of Podium): claim, laad en navigeer via de
  // gedeelde helper (ook gebruikt door de reactie-melding op start).
  const handleDestination = useCallback(async (destination: 'studio' | 'stage') => {
    if (!pendingSaved || destLoading) return;
    const { saved, code: savedCode } = pendingSaved;
    setDestLoading(destination);
    setError(null);

    try {
      await openSavedComposition(saved, savedCode, destination);
    } catch (err) {
      logger.error('Bewaarde compositie claimen/openen mislukt:', err);
      setError(err instanceof Error && err.message ? err.message : t('share.loadFailed'));
      setDestLoading(null);
      return;
    }

    setDestLoading(null);
    setPendingSaved(null);
    setCode('');
  }, [pendingSaved, destLoading, t]);

  // --- Keuzescherm: Studio of Podium (testronde 2, wens Bert) ---
  if (pendingSaved) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <p className="text-sm font-semibold text-text-main text-center mb-1">
          {t('share.destinationTitle')}
        </p>
        <p className="text-xs text-text-muted text-center mb-3 truncate">
          {pendingSaved.saved.composition_name}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDestination('studio')}
            disabled={destLoading !== null}
            className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border-subtle bg-bg-surface hover:border-accent-400 hover:shadow-md active:scale-[0.98] transition-all p-4 disabled:opacity-60"
          >
            {destLoading === 'studio'
              ? <Loader2 className="w-7 h-7 text-accent-500 animate-spin" />
              : <SlidersHorizontal className="w-7 h-7 text-accent-600" />}
            <span className="font-bold text-text-main">{t('share.destStudio')}</span>
            <span className="text-xs text-text-muted text-center leading-snug">{t('share.destStudioHint')}</span>
          </button>
          <button
            onClick={() => handleDestination('stage')}
            disabled={destLoading !== null}
            className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border-subtle bg-bg-surface hover:border-accent-400 hover:shadow-md active:scale-[0.98] transition-all p-4 disabled:opacity-60"
          >
            {destLoading === 'stage'
              ? <Loader2 className="w-7 h-7 text-accent-500 animate-spin" />
              : <Theater className="w-7 h-7 text-accent-600" />}
            <span className="font-bold text-text-main">{t('share.destStage')}</span>
            <span className="text-xs text-text-muted text-center leading-snug">{t('share.destStageHint')}</span>
          </button>
        </div>
        <button
          onClick={() => { setPendingSaved(null); setError(null); }}
          disabled={destLoading !== null}
          className="block mx-auto mt-3 text-xs text-text-muted hover:text-text-main underline underline-offset-2 transition-colors"
        >
          {t('common.back')}
        </button>
        {error && (
          <p role="alert" aria-live="polite" className="text-error-400 text-xs text-center mt-2">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <p className="text-sm text-text-muted text-center mb-2">
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
            className="w-full px-3 py-3 min-h-11 bg-bg-app border-2 border-neutral-300 rounded-lg text-center text-text-main font-mono text-base tracking-wider placeholder:text-text-muted focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-200 transition-colors disabled:opacity-50"
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
      <p className="text-text-muted text-[10px] sm:text-xs text-center mt-1.5">
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
