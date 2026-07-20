/**
 * ClassPresentationView — digibord-presentatie van een klas-playlist.
 *
 * Sinds fase 2 een thin wrapper om het universele PresentationSurface
 * (mode 'teacher-present'): playlist-zijpaneel, doorspelen, aankondigings-
 * overlay, feedbackrij en fullscreen zitten dáár. Deze wrapper haalt er
 * alleen nog de peer-sterren bij (batch-RPC, migratie 030) — fire-and-
 * forget: zonder sterren werkt de presentatie gewoon.
 */

import { useEffect, useState } from 'react';
import type { Submission } from '../../hooks/useSubmissions';
import type { FeedbackSticker } from '../../lib/submissions';
import { PresentationSurface } from '../presentation/PresentationSurface';
import { getPeerStarsForClass } from '../../lib/peerFeedback';

interface ClassPresentationViewProps {
  /** Af te spelen inzendingen, in presentatievolgorde */
  playlist: Submission[];
  onClose: () => void;
  /** Docent-feedback opslaan (optioneel — toont de feedbackrij) */
  onSetFeedback?: (
    id: string,
    feedback: { sticker: FeedbackSticker | null; level: number | null; text: string | null }
  ) => Promise<void>;
  /** Klas-id voor de peer-sterren in het zijpaneel (migratie 030) */
  classId?: string;
  /** Ververs de inzendingen (I7): kopbalk-knop; polling doet ClassDetail */
  onRefresh?: () => void;
  /**
   * Praatplaat-bord: bij een praatplaat-opdracht toont de presentatie de plaat
   * met klikbare plekken i.p.v. één visual per inzending (bevinding Bert 19-7:
   * het gedeelde album deed dit al wél, de docent-presentatie niet).
   */
  interactiveBoard?: { imageUrl: string; name: string } | null;
}

export function ClassPresentationView({ playlist, onClose, onSetFeedback, classId, onRefresh, interactiveBoard = null }: ClassPresentationViewProps) {
  const [peerStars, setPeerStars] = useState<Map<string, number> | undefined>(undefined);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    void getPeerStarsForClass(classId).then((stars) => {
      if (!cancelled) setPeerStars(stars);
    });
    return () => { cancelled = true; };
  }, [classId]);

  return (
    <PresentationSurface
      playlist={playlist}
      mode="teacher-present"
      onClose={onClose}
      onSetFeedback={onSetFeedback}
      peerStars={peerStars}
      onRefresh={onRefresh}
      interactiveBoard={interactiveBoard}
    />
  );
}

export default ClassPresentationView;
