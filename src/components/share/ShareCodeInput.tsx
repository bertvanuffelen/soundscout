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
import { initializeFromTemplate, initializeFromSavedComposition, lookupAndRouteAssignment, classSessionFromAssignment } from '../../utils/compositionInit';
import { getActiveAssignment } from '../../lib/assignments';
import { storageService } from '../../services/StorageService';
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
          // Laden en claimen hebben elk hun eigen foutafhandeling: alleen een
          // écht lege lookup is "code niet gevonden". Elke andere fout (parse,
          // rate limit, netwerk) toont zijn eigen — al vertaalde — melding,
          // zodat de gebruiker niet misleid wordt (testronde-1 bug 2c).
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

          try {
            // Claim de compositie (genereert nieuwe secret voor dit apparaat)
            const newSecret = await claimSavedComposition(code, saved.student_name);
            if (signal.aborted) return;
            await initializeFromSavedComposition(
              saved.composition_data,
              saved.composition_name,
              code,
              newSecret,
            );
          } catch (err) {
            if (signal.aborted) return;
            logger.error('Bewaarde compositie claimen/openen mislukt:', err);
            setError(err instanceof Error && err.message ? err.message : t('share.loadFailed'));
            return;
          }

          // Klas-sessie herstellen (migratie 028): de bewaarcode is de
          // universele terugkeerroute — ook peer-feedback werkt dan weer
          // op elk apparaat. Faalt geruisloos (sessie is nice-to-have).
          if (saved.class_code) {
            try {
              const assignment = await getActiveAssignment(saved.class_code);
              const session = assignment ? classSessionFromAssignment(saved.class_code, assignment) : null;
              if (session) {
                // Volgorde: setClassSession reset submissionId/synced,
                // dus die twee erná zetten.
                useAppStore.getState().setClassSession(session);
                useAppStore.getState().setSubmissionId(saved.id);
                useAppStore.getState().setSubmissionSynced(true);
              }
            } catch (err) {
              logger.warn('Klas-sessie herstellen via bewaarcode mislukt', err);
            }
          }

          // Docent-feedback (migratie 026) + klasgenoot-complimenten
          // (migratie 027) meenemen naar de studio: banner met de reactie.
          // Eigen try: we zijn hier al genavigeerd — een fout in dit
          // nice-to-have mag nooit een foutmelding op het startscherm zetten.
          try {
            const { getPeerCompliments } = await import('../../lib/peerFeedback');
            const compliments = await getPeerCompliments(code);
            if (saved.feedback_at || compliments.length > 0) {
              useAppStore.getState().setReceivedFeedback({
                sticker: saved.feedback_sticker ?? null,
                level: saved.feedback_level ?? null,
                text: saved.feedback_text ?? null,
                at: saved.feedback_at ?? null,
                compliments,
              });
              // Dedup voor de "je hebt een reactie"-melding op het startscherm
              const info = storageService.getClassFeedbackCode();
              if (info?.saveCode === code && saved.feedback_at) {
                storageService.setClassFeedbackCode({
                  ...info,
                  lastSeenFeedbackAt: saved.feedback_at,
                });
              }
            }
          } catch (err) {
            logger.warn('Feedback/complimenten laden via bewaarcode mislukt', err);
          }
          setCode('');
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
