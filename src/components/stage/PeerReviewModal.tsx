/**
 * PeerReviewModal - "Luister naar klasgenoten" (peer-feedback, migratie 027)
 *
 * Na het inleveren beluistert de leerling 3 willekeurige, anonieme
 * klasgenoot-composities en kiest per stuk 1-3 complimenten-chips van de
 * feedbackkaart die de docent instelde. Geen vrije tekst (moderatie).
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Loader2, Music, PartyPopper, Send, Star, DoorClosed } from 'lucide-react';
import { Modal, Button } from '../ui';
import { StoryboardViewer } from '../ui/StoryboardViewer';
import { PraatplaatMarker } from '../ui/PraatplaatMarker';
import { useCompositionPlayback } from '../../hooks/useCompositionPlayback';
import { getPeerReviewBatch, submitPeerFeedback, PeerFeedbackError, type PeerReviewItem } from '../../lib/peerFeedback';
import { resolveStoryboard } from '../../utils/resolveStoryboard';
import { logger } from '../../utils/logger';
import { cn } from '../../utils/cn';

interface PeerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  ownSubmissionId: string;
  chips: string[];
}

type Phase = 'loading' | 'empty' | 'reviewing' | 'done' | 'error' | 'blocked';

export function PeerReviewModal({ isOpen, onClose, classCode, ownSubmissionId, chips }: PeerReviewModalProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('loading');
  const [items, setItems] = useState<PeerReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  // Peer-feedback 2.0: 1-3 sterren per criterium van de feedbackkaart
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isSending, setIsSending] = useState(false);
  // Eerlijke foutafhandeling (testronde 2): tijdelijke fout → inline melding
  // met retry; definitieve weigering (ronde gesloten / max bereikt) → eigen
  // 'blocked'-scherm. Nooit meer nep-succes met confetti.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const current: PeerReviewItem | undefined = items[index];

  // Beeld bij het geluid (testronde 2, 5b): een storyboard-compositie toont
  // de meebewegende beelden, een praatplaat-compositie de plaat met de
  // gekozen plek — zoals de presentatiemodus dat ook doet.
  const currentData = current?.compositionData;
  const storyboard = resolveStoryboard(currentData);
  const praatplaatImage = currentData?.praatplaat?.imageUrl ?? null;
  const praatplaatPosition = currentData?.praatplaatPosition ?? null;
  const totalBeats = currentData?.totalBeats ?? 32;

  // Gedeeld afspeel-fundament (presentatiescherm fase 1): laden, transport,
  // beat-tracking en einde-afspelen in één hook. respectLoop=false — een
  // klasgenoot-compositie speelt één keer, niet in een loop.
  // Gedestructureerd: play/stop zijn stabiele callbacks (fijne deps).
  const {
    state: playbackState,
    currentBeat,
    play: playComposition,
    stop: stopComposition,
  } = useCompositionPlayback(isOpen ? currentData ?? null : null, { respectLoop: false });

  // Batch laden bij openen
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setPhase('loading');
      setIndex(0);
      setRatings({});
      try {
        const batch = await getPeerReviewBatch(classCode, ownSubmissionId);
        if (cancelled) return;
        setItems(batch);
        setPhase(batch.length === 0 ? 'empty' : 'reviewing');
      } catch (err) {
        logger.warn('Peer-review batch laden mislukt', err);
        if (!cancelled) setPhase('error');
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, classCode, ownSubmissionId]);

  const handlePlayStop = useCallback(() => {
    if (!current) return;
    if (playbackState === 'playing') {
      stopComposition();
    } else {
      playComposition(0);
    }
  }, [current, playbackState, playComposition, stopComposition]);

  // Sterren zetten: nogmaals dezelfde ster klikken = criterium wissen
  const setStars = (chip: string, stars: number) => {
    setRatings((prev) => {
      if (prev[chip] === stars) {
        const next = { ...prev };
        delete next[chip];
        return next;
      }
      return { ...prev, [chip]: stars };
    });
  };

  const ratedCount = Object.keys(ratings).length;

  const handleSendAndNext = useCallback(async () => {
    if (!current || ratedCount === 0) return;
    setIsSending(true);
    setSubmitError(null);
    stopComposition();
    try {
      await submitPeerFeedback(ownSubmissionId, current.submissionId, ratings);
    } catch (err) {
      logger.warn('Peer-beoordeling versturen mislukt', err);
      setIsSending(false);
      // Definitieve serverweigering: verder proberen is zinloos — toon een
      // eerlijk "geblokkeerd"-scherm i.p.v. nep-succes (testronde 2, bug 6d)
      if (err instanceof PeerFeedbackError && (err.reason === 'windowClosed' || err.reason === 'capReached')) {
        setBlockedMessage(err.message);
        setPhase('blocked');
        return;
      }
      // Tijdelijke fout: sterren blijven staan, leerling kan het opnieuw proberen
      setSubmitError(err instanceof Error && err.message ? err.message : t('peerReview.submitError'));
      return;
    }
    setIsSending(false);
    setRatings({});
    if (index + 1 < items.length) {
      setIndex(index + 1);
    } else {
      setPhase('done');
    }
  }, [current, ratings, ratedCount, ownSubmissionId, index, items.length, stopComposition, t]);

  const handleClose = useCallback(() => {
    stopComposition();
    onClose();
  }, [stopComposition, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('peerReview.title')} size="md">
      {phase === 'loading' && (
        <div className="py-10 text-center">
          <Loader2 className="w-10 h-10 text-accent-500 mx-auto animate-spin mb-3" />
          <p className="text-text-muted text-sm">{t('peerReview.loading')}</p>
        </div>
      )}

      {phase === 'empty' && (
        <div className="py-8 text-center">
          <Music className="w-12 h-12 text-accent-400 mx-auto mb-3" />
          <p className="text-text-main font-semibold mb-1">{t('peerReview.emptyTitle')}</p>
          <p className="text-text-muted text-sm mb-5">{t('peerReview.emptyHint')}</p>
          <Button variant="secondary" onClick={handleClose}>{t('common.close')}</Button>
        </div>
      )}

      {phase === 'error' && (
        <div className="py-8 text-center">
          <p className="text-error-600 font-medium mb-4">{t('peerReview.loadError')}</p>
          <Button variant="secondary" onClick={handleClose}>{t('common.close')}</Button>
        </div>
      )}

      {phase === 'reviewing' && current && (
        <div>
          <p className="text-text-muted text-sm mb-4">
            {t('peerReview.progress', { current: index + 1, total: items.length })}
          </p>

          {/* Beeld bij de opdrachtvorm: storyboard beweegt mee met de muziek,
              praatplaat toont de plaat + gekozen plek (testronde 2, 5b) */}
          {storyboard && (
            <div className="rounded-2xl border border-border-subtle bg-neutral-50 mb-4 overflow-hidden">
              <StoryboardViewer
                storyboard={storyboard}
                currentBeat={currentBeat}
                totalBeats={totalBeats}
                sections={currentData?.sections ?? []}
                compact
              />
            </div>
          )}
          {!storyboard && praatplaatImage && (
            <div className="relative rounded-2xl border border-border-subtle bg-neutral-50 mb-4 overflow-hidden">
              <img
                src={praatplaatImage}
                alt={t('peerReview.anonymous')}
                className="w-full aspect-video object-contain bg-black/5"
              />
              {praatplaatPosition && (
                <PraatplaatMarker position={praatplaatPosition} active={playbackState === 'playing'} />
              )}
            </div>
          )}

          {/* Anonieme compositie + afspelen */}
          <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-neutral-50 p-4 mb-5">
            <button
              onClick={handlePlayStop}
              disabled={playbackState === 'loading'}
              className="w-14 h-14 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 disabled:opacity-50 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95 shrink-0"
              aria-label={playbackState === 'playing' ? t('common.pause') : t('common.play')}
            >
              {playbackState === 'loading' ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : playbackState === 'playing' ? (
                <Square className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>
            <div className="min-w-0">
              <p className="font-bold text-text-main truncate">{current.compositionName || t('peerReview.anonymous')}</p>
              <p className="text-text-muted text-xs">{t('peerReview.anonymousHint')}</p>
            </div>
          </div>

          {/* Sterren per criterium (peer-feedback 2.0) */}
          <p className="text-sm font-semibold text-text-main mb-1">{t('peerReview.starsLabel')}</p>
          <p className="text-xs text-text-muted mb-3">{t('peerReview.starsHint')}</p>
          <div className="flex flex-col gap-2 mb-6">
            {chips.map((chip) => {
              const value = ratings[chip] ?? 0;
              return (
                <div
                  key={chip}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 transition-colors',
                    value > 0 ? 'border-accent-300 bg-accent-50' : 'border-border-subtle bg-white'
                  )}
                >
                  <span className={cn('text-sm font-semibold', value > 0 ? 'text-accent-800' : 'text-text-muted')}>
                    {chip}
                  </span>
                  <div className="flex items-center gap-0.5" role="radiogroup" aria-label={chip}>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        onClick={() => setStars(chip, n)}
                        title={t('peerReview.starTitle', { stars: n })}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            'w-6 h-6 transition-colors',
                            n <= value ? 'text-accent-500 fill-accent-500' : 'text-neutral-300'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {submitError && (
            <p role="alert" className="text-error-600 text-sm text-center mb-3">
              {submitError}
            </p>
          )}

          <Button
            variant="primary"
            onClick={handleSendAndNext}
            disabled={ratedCount === 0 || isSending}
            isLoading={isSending}
            className="w-full"
          >
            <Send size={16} className="mr-2" />
            {submitError
              ? t('peerReview.retry')
              : index + 1 < items.length ? t('peerReview.sendAndNext') : t('peerReview.sendAndFinish')}
          </Button>
        </div>
      )}

      {phase === 'blocked' && (
        <div className="py-8 text-center">
          <DoorClosed className="w-12 h-12 text-warning-500 mx-auto mb-3" />
          <p className="text-text-main font-semibold mb-1">{t('peerReview.blockedTitle')}</p>
          <p className="text-text-muted text-sm mb-5">{blockedMessage}</p>
          <Button variant="secondary" onClick={handleClose}>{t('common.close')}</Button>
        </div>
      )}

      {phase === 'done' && (
        <div className="py-8 text-center">
          <PartyPopper className="w-12 h-12 text-accent-500 mx-auto mb-3" />
          <p className="text-text-main font-bold text-lg mb-1">{t('peerReview.doneTitle')}</p>
          <p className="text-text-muted text-sm mb-5">{t('peerReview.doneHint')}</p>
          <Button variant="primary" onClick={handleClose} className="w-full sm:w-auto sm:min-w-[200px]">
            {t('common.close')}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export default PeerReviewModal;
