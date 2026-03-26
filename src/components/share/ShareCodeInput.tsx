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

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { getTemplateByCode } from '../../lib/templates';
import { getSharedComposition, loadSavedComposition, claimSavedComposition } from '../../lib/submissions';
import { getActiveAssignment } from '../../lib/assignments';
import { useAppStore } from '../../stores/appStore';
import { initializeFromTemplate, initializeFromSavedComposition } from '../../utils/compositionInit';
import { logger } from '../../utils/logger';

export function ShareCodeInput() {
  const { t } = useTranslation();
  const goToShared = useAppStore((s) => s.goToShared);
  const setPraatplaat = useAppStore((s) => s.setPraatplaat);
  const goToPraatplaatSelect = useAppStore((s) => s.goToPraatplaatSelect);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

      try {
        // 0. Als 4 cijfers → klascode → check actieve opdracht (template of praatplaat)
        if (code.length === 4 && /^\d{4}$/.test(code)) {
          try {
            const assignment = await getActiveAssignment(code);
            if (assignment) {
              if (assignment.type === 'praatplaat' && assignment.praatplaat) {
                // Actieve praatplaat → praatplaat-select flow
                setPraatplaat({
                  id: assignment.praatplaat.id,
                  name: assignment.praatplaat.name,
                  imageUrl: assignment.praatplaat.imageUrl,
                  classId: assignment.classId,
                  classCode: code,
                  themeId: assignment.praatplaat.themeId,
                  locationId: assignment.praatplaat.locationId,
                });
                goToPraatplaatSelect();
                setCode('');
                return;
              }
              if (assignment.type === 'template' && assignment.template) {
                // Actieve template → initialiseer en ga naar studio
                await initializeFromTemplate(assignment.template);
                setCode('');
                return;
              }
            }
          } catch {
            // Fout bij ophalen → val door naar "geen actieve opdracht"
          }
          setError(t('share.noActiveAssignment'));
          setIsLoading(false);
          return;
        }

        // 1. Als 6 karakters → probeer als bewaarcode (#52)
        if (code.length === 6) {
          try {
            const saved = await loadSavedComposition(code);
            if (saved) {
              // Claim de compositie (genereert nieuwe secret voor dit apparaat)
              const newSecret = await claimSavedComposition(code, saved.student_name);
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
            // Fall through to "not found"
          }
          setError(t('share.codeNotFound'));
          return;
        }

        // 2. Probeer als template-code (8 chars)
        const template = await getTemplateByCode(code);
        if (template) {
          await initializeFromTemplate(template);
          setCode('');
          return;
        }

        // 3. Niet gevonden als template → probeer als share-code (8 chars)
        try {
          const shared = await getSharedComposition(code);
          if (shared) {
            goToShared(code);
            setCode('');
            return;
          }
        } catch {
          // getSharedComposition throws on error, fall through to "not found"
        }

        // 4. Geen match gevonden
        setError(t('share.codeNotFound'));
      } catch (err) {
        logger.error('Code lookup mislukt:', err);
        setError(t('share.lookupError'));
      } finally {
        setIsLoading(false);
      }
    },
    [code, t, goToShared, setPraatplaat, goToPraatplaatSelect]
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
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-white/10 md:bg-neutral-100 border border-white/20 md:border-neutral-300 rounded-lg text-center text-white md:text-text-main font-mono text-sm tracking-wider placeholder:text-white/30 md:placeholder:text-neutral-400 focus:outline-none focus:border-accent-400 transition-colors disabled:opacity-50"
        />
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
      {error && (
        <p role="alert" aria-live="polite" className="text-red-400 text-xs text-center mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default ShareCodeInput;
