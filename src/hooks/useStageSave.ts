/**
 * useStageSave - opslaan, inleveren en bewaren op het podium (v4)
 *
 * Drie acties, elk één klik:
 * - `saveLocal`  — alleen in "Mijn soundscapes" (deze browser)
 * - `handIn`     — klas: lokaal opslaan + inleveren bij de klas
 * - `saveOnline` — zonder klas: lokaal opslaan + bewaarcode (nieuw of bijwerken)
 *
 * Zonder titel kiest de app er een (podium v4): inleveren wacht nooit op een
 * naam. Elke geslaagde inlevering of online bewaring legt een versie vast
 * (handInVersions), zodat het podium "Lever versie 2 in" kan tonen.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useTimelineStore } from '../stores/timelineStore';
import { buildCompositionData } from '../utils/buildCompositionData';
import { storageService } from '../services/StorageService';
import { updateSavedComposition, submitOrUpdateComposition, SubmissionForbiddenError } from '../lib/submissions';
import { TimeoutError } from '../utils/withTimeout';
import { submitPraatplaatComposition } from '../lib/praatplaat';
import { compositionFingerprint, getVersion, recordVersion, type VersionInfo } from '../utils/handInVersions';
import { randomTitle } from '../utils/randomTitles';
import { generateRandomName } from '../utils/randomNames';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import type { CompositionData } from '../types';

type Feedback = { type: 'success' | 'error'; message: string } | null;

export function useStageSave() {
  const currentCompositionId = useAppStore((s) => s.currentCompositionId);
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const activePraatplaat = useAppStore((s) => s.activePraatplaat);
  const praatplaatPosition = useAppStore((s) => s.praatplaatPosition);
  const classSession = useAppStore((s) => s.classSession);
  const submissionId = useAppStore((s) => s.submissionId);
  const librarySamples = useLibraryStore((s) => s.librarySamples);
  const getTimelineState = useTimelineStore((s) => s.getTimelineState);

  // Naam voorvullen wanneer deze compositie via een bewaarcode is geladen
  // (QA-3): initializeFromSavedComposition zet de naam in saveOnlineInfo,
  // en initializeNewComposition/activatePendingAssignment wissen die weer.
  // De titel staat in de appStore (v4): hij blijft staan als de leerling
  // naar de studio gaat en terugkomt, en gaat mee in het onthouden werk (A1)
  const compositionName = useAppStore((s) => s.compositionTitle);
  const setCompositionName = useAppStore((s) => s.setCompositionTitle);
  useEffect(() => {
    if (useAppStore.getState().compositionTitle) return;
    const fromCode = storageService.getSaveOnlineInfo()?.compositionName;
    if (fromCode) setCompositionName(fromCode);
  }, [setCompositionName]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [praatplaatSubmitted, setPraatplaatSubmitted] = useState(false);
  // Automatisch geminte bewaarcode van de klas-inzending (migratie 026).
  // Alleen herstellen als de code aantoonbaar bij de HUIDIGE inzending hoort
  // (testronde 2, bug 5b: gedeelde apparaten).
  const [classSaveCode, setClassSaveCode] = useState<string | null>(() => {
    const info = storageService.getClassFeedbackCode();
    const currentSubmissionId = useAppStore.getState().submissionId;
    return info?.submissionId && info.submissionId === currentSubmissionId ? info.saveCode : null;
  });
  // Bewaarcode zonder klas (#52): de code van déze soundscape
  const [onlineSaveCode, setOnlineSaveCode] = useState<string | null>(
    () => storageService.getSaveOnlineInfo()?.saveCode ?? null,
  );
  const [isSavingOnline, setIsSavingOnline] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitFeedback, setSubmitFeedback] = useState<Feedback>(null);
  const [syncFeedback, setSyncFeedback] = useState<Feedback>(null);

  // Versie-sleutel: in de klas de inzending, zonder klas de bewaarcode
  const versionKey = classSession ? submissionId : onlineSaveCode;
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(() => getVersion(versionKey));
  useEffect(() => { setVersionInfo(getVersion(versionKey)); }, [versionKey]);

  // Client-generated UUID for idempotent UPSERT (stable across retries)
  const clientIdRef = useRef<string | null>(null);

  // Naam laden bij een bestaande lokale compositie (als er nog geen titel is)
  useEffect(() => {
    if (!currentCompositionId || useAppStore.getState().compositionTitle) return;
    const composition = storageService.getCompositionById(currentCompositionId);
    if (composition) setCompositionName(composition.name);
  }, [currentCompositionId, setCompositionName]);

  const flash = (setter: (f: Feedback) => void, feedback: Feedback, ms: number) => {
    setter(feedback);
    setTimeout(() => setter(null), ms);
  };

  /** Titel die we gebruiken: de getypte, anders een automatische (v4) */
  const ensureTitle = useCallback((): string => {
    const typed = compositionName.trim();
    if (typed) return typed;
    const auto = randomTitle(i18n.language);
    setCompositionName(auto);
    return auto;
  }, [compositionName, setCompositionName]);

  /** Lokaal opslaan in "Mijn soundscapes". Geeft false bij een fout. */
  const storeLocally = useCallback((name: string): boolean => {
    const timelineState = getTimelineState();
    const { classSession: session, submissionId: subId } = useAppStore.getState();
    const result = currentCompositionId
      ? storageService.updateComposition(currentCompositionId, {
          name,
          timeline: timelineState,
          samples: librarySamples,
          classSession: session ?? undefined,
          submissionId: subId ?? undefined,
          storyboardId: activeStoryboard?.id,
          praatplaat: activePraatplaat ?? undefined,
          praatplaatPosition: praatplaatPosition ?? undefined,
        })
      : storageService.saveComposition(
          name,
          timelineState,
          librarySamples,
          activeStoryboard?.id,
          session ?? undefined,
          subId ?? undefined,
          activePraatplaat ?? undefined,
          praatplaatPosition ?? undefined,
        );

    if (!result) {
      setSaveError(storageService.lastSaveError === 'quota_exceeded'
        ? i18n.t('stage.saveQuotaError')
        : i18n.t('stage.saveGenericError'));
      setTimeout(() => setSaveError(null), 6000);
      return false;
    }
    // Volgende keer = deze compositie bijwerken, geen kopie (AUD-08)
    if (!currentCompositionId) useAppStore.getState().setCurrentCompositionId(result.id);
    setSaveError(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    return true;
  }, [getTimelineState, librarySamples, currentCompositionId, activeStoryboard, activePraatplaat, praatplaatPosition]);

  // --- Klas: inleveren ---

  const submitToClass = useCallback((name: string, compositionData: CompositionData) => {
    const session = useAppStore.getState().classSession;
    if (!session) return;
    const position = useAppStore.getState().praatplaatPosition;

    // Een praatplaat-inzending zonder plek is ongeldig (#72)
    if (session.assignmentType === 'praatplaat' && !position) {
      logger.warn('Praatplaat-inzending zonder positie — submit overgeslagen', { classCode: session.classCode });
      flash(setSubmitFeedback, { type: 'error', message: i18n.t('submissions.praatplaatNoPosition') }, 4000);
      return;
    }
    if (useAppStore.getState().isSubmitting) return;
    useAppStore.getState().setIsSubmitting(true);

    const { submissionId: existingId } = useAppStore.getState();
    if (!clientIdRef.current) clientIdRef.current = existingId || crypto.randomUUID();

    // Bijwerken vereist het geheim van de eerste inlevering (migratie 036)
    const submit = (clientId: string) => submitOrUpdateComposition({
      classCode: session.classCode,
      // Leerlingcode (fase 4.2): altijd dezelfde schuilnaam als afzender
      studentName: session.member?.pseudonym,
      compositionName: name,
      compositionData,
      clientId,
      saveSecret: storageService.getSubmissionSecret(clientId),
      assignmentId: session.assignmentId,
      assignmentType: session.assignmentType,
      praatplaatPositionX: session.assignmentType === 'praatplaat' ? position?.x : undefined,
      praatplaatPositionY: session.assignmentType === 'praatplaat' ? position?.y : undefined,
    });

    submit(clientIdRef.current).catch((err) => {
      // Geen geldig geheim (oude inzending of elders geclaimd): nieuwe inzending
      if (!(err instanceof SubmissionForbiddenError)) throw err;
      clientIdRef.current = crypto.randomUUID();
      return submit(clientIdRef.current);
    }).then(({ id: returnedId, saveCode, saveSecret }) => {
      if (saveSecret) storageService.setSubmissionSecret(returnedId, saveSecret);
      // Leerlingcode: inzending aan het kind koppelen (verder werken op elk apparaat)
      const secret = saveSecret ?? storageService.getSubmissionSecret(returnedId);
      if (session.member && secret) {
        void import('../lib/members').then(({ linkSubmissionToMember }) =>
          linkSubmissionToMember(returnedId, secret, session.member!.code));
      }
      useAppStore.getState().setSubmissionId(returnedId);
      useAppStore.getState().setSubmissionSynced(true);
      clientIdRef.current = returnedId;
      // Lokale kopie krijgt de inzending mee (heropenen = zelfde inzending)
      const compId = useAppStore.getState().currentCompositionId;
      if (compId) storageService.updateComposition(compId, { submissionId: returnedId, classSession: session });
      if (saveCode) {
        setClassSaveCode(saveCode);
        const existing = storageService.getClassFeedbackCode();
        storageService.setClassFeedbackCode({
          saveCode,
          compositionName: name,
          lastSeenFeedbackAt: existing?.saveCode === saveCode ? existing.lastSeenFeedbackAt : null,
          submissionId: returnedId,
        });
      }
      setVersionInfo(recordVersion(returnedId, compositionFingerprint(compositionData, name)));
      if (session.assignmentType === 'praatplaat') setPraatplaatSubmitted(true);
      flash(setSubmitFeedback, {
        type: 'success',
        message: existingId
          ? i18n.t('submissions.autoSubmitUpdated', { className: session.className })
          : i18n.t('submissions.autoSubmitSuccess', { className: session.className }),
      }, 3000);
      logger.info('Inleveren geslaagd', { classCode: session.classCode, submissionId: returnedId });
    }).catch((err) => {
      useAppStore.getState().setSubmissionSynced(false);
      setSubmitFeedback({
        type: 'error',
        message: err instanceof TimeoutError ? i18n.t('errors.networkTimeout') : i18n.t('submissions.autoSubmitFailed'),
      });
      logger.warn('Inleveren mislukt', err);
    }).finally(() => {
      useAppStore.getState().setIsSubmitting(false);
    });
  }, []);

  /** Klas: lokaal opslaan + inleveren (titel automatisch als die ontbreekt) */
  const handIn = useCallback(() => {
    const name = ensureTitle();
    storeLocally(name);
    submitToClass(name, buildCompositionData());
  }, [ensureTitle, storeLocally, submitToClass]);

  // --- Zonder klas: bewaren met een bewaarcode ---

  const saveOnline = useCallback(async () => {
    const name = ensureTitle();
    storeLocally(name);
    const compositionData = buildCompositionData();
    const fingerprint = compositionFingerprint(compositionData, name);
    const info = storageService.getSaveOnlineInfo();
    setIsSavingOnline(true);
    try {
      if (info) {
        await updateSavedComposition(info.saveCode, info.saveSecret, compositionData, name);
        storageService.setSaveOnlineInfo(info.saveCode, info.saveSecret, name);
        setVersionInfo(recordVersion(info.saveCode, fingerprint));
        flash(setSyncFeedback, { type: 'success', message: i18n.t('stage.syncSuccess') }, 3000);
      } else {
        const { saveCompositionOnline } = await import('../lib/submissions');
        // Bewaren zonder naam (v4): een schuilnaam is genoeg voor de server
        const { saveCode, saveSecret } = await saveCompositionOnline({
          studentName: generateRandomName(i18n.language),
          compositionName: name,
          compositionData,
        });
        storageService.setSaveOnlineInfo(saveCode, saveSecret, name);
        setOnlineSaveCode(saveCode);
        setVersionInfo(recordVersion(saveCode, fingerprint));
      }
    } catch (err) {
      logger.warn('Online bewaren mislukt', err);
      setSyncFeedback({
        type: 'error',
        message: err instanceof Error && err.message ? err.message : i18n.t('stage.syncFailed'),
      });
      setTimeout(() => setSyncFeedback(null), 6000);
    } finally {
      setIsSavingOnline(false);
    }
  }, [ensureTitle, storeLocally]);

  /** Alleen lokaal opslaan (docent, of "Opslaan" zonder online code) */
  const saveLocal = useCallback(() => {
    const name = ensureTitle();
    if (!storeLocally(name)) return;
    // Legacy praatplaat zonder klas-sessie (#72): stil insturen
    if (!classSession && activePraatplaat && praatplaatPosition && !praatplaatSubmitted) {
      submitPraatplaatComposition({
        classCode: activePraatplaat.classCode,
        praatplaatId: activePraatplaat.id,
        positionX: praatplaatPosition.x,
        positionY: praatplaatPosition.y,
        compositionName: name,
        compositionData: buildCompositionData(),
      }).then(() => setPraatplaatSubmitted(true))
        .catch((err) => logger.warn('Kon praatplaat compositie niet insturen', err));
    }
  }, [ensureTitle, storeLocally, classSession, activePraatplaat, praatplaatPosition, praatplaatSubmitted]);

  return {
    compositionName,
    setCompositionName,
    saveSuccess,
    saveError,
    submitFeedback,
    setSubmitFeedback,
    syncFeedback,
    praatplaatSubmitted,
    classSaveCode,
    onlineSaveCode,
    isSavingOnline,
    versionInfo,
    handIn,
    saveOnline,
    saveLocal,
  };
}
