/**
 * SubmissionPlayer — docent bekijkt en beluistert één leerling-compositie.
 *
 * Sinds fase 2 een thin wrapper om het universele PresentationSurface
 * (mode 'teacher-review'): montagelijn start uitgeklapt, metadata-regel,
 * feedbackrij-knop en fullscreen zitten dáár. Hier blijft alleen het
 * eenmalige "gezien"-stempel bij openen en de vertaling van de
 * feedback-callback (deze aanroeper kent maar één inzending).
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Submission } from '../../hooks/useSubmissions';
import type { FeedbackSticker } from '../../lib/submissions';
import { PresentationSurface } from '../presentation/PresentationSurface';

interface SubmissionPlayerProps {
  submission: Submission;
  onClose: () => void;
  /** Feedback-paneel tonen + opslaan (alleen docent-context, migratie 026) */
  onSetFeedback?: (feedback: {
    sticker: FeedbackSticker | null;
    level: number | null;
    text: string | null;
  }) => Promise<void>;
  /** "Gezien"-stempel bij openen (alleen docent-context) */
  onMarkSeen?: () => void;
  /** Raad-de-plek (migratie 047): plek pas tonen na "Toon plek" */
  hideSpot?: boolean;
}

export function SubmissionPlayer({ submission, onClose, onSetFeedback, onMarkSeen, hideSpot = false }: SubmissionPlayerProps) {
  // "Gezien"-stempel: eenmalig bij openen (guard-ref zodat een wisselende
  // callback-referentie geen tweede aanroep triggert)
  const seenStampedRef = useRef(false);
  useEffect(() => {
    if (seenStampedRef.current) return;
    seenStampedRef.current = true;
    onMarkSeen?.();
  }, [onMarkSeen]);

  const hiddenSpotIds = useMemo(
    () => (hideSpot ? new Set([submission.id]) : null),
    [hideSpot, submission.id],
  );

  return (
    <PresentationSurface
      playlist={[submission]}
      mode="teacher-review"
      onClose={onClose}
      onSetFeedback={onSetFeedback ? (_id, feedback) => onSetFeedback(feedback) : undefined}
      respectLoop
      hiddenSpotIds={hiddenSpotIds}
    />
  );
}

export default SubmissionPlayer;
