/**
 * PeerReviewModal - "Luister naar klasgenoten" (peer-feedback, migratie 027)
 *
 * Na het inleveren beluistert de leerling 3 willekeurige, anonieme
 * klasgenoot-composities en kiest per stuk 1-3 complimenten-chips van de
 * feedbackkaart die de docent instelde. Geen vrije tekst (moderatie).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Loader2, Music, PartyPopper, Send } from 'lucide-react';
import { Modal, Button } from '../ui';
import { audioService } from '../../services/AudioService';
import { getPeerReviewBatch, submitPeerFeedback, type PeerReviewItem } from '../../lib/peerFeedback';
import { logger } from '../../utils/logger';
import { cn } from '../../utils/cn';

interface PeerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  ownSubmissionId: string;
  chips: string[];
}

type Phase = 'loading' | 'empty' | 'reviewing' | 'done' | 'error';
type AudioPhase = 'loading' | 'ready' | 'playing';

export function PeerReviewModal({ isOpen, onClose, classCode, ownSubmissionId, chips }: PeerReviewModalProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('loading');
  const [items, setItems] = useState<PeerReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [audioPhase, setAudioPhase] = useState<AudioPhase>('loading');
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const current: PeerReviewItem | undefined = items[index];

  // Batch laden bij openen
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setPhase('loading');
      setIndex(0);
      setSelectedChips([]);
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

    return () => {
      cancelled = true;
      audioService.stop();
    };
  }, [isOpen, classCode, ownSubmissionId]);

  // Samples van het huidige item laden
  useEffect(() => {
    if (!isOpen || !current) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    (async () => {
      setAudioPhase('loading');
      audioService.stop();
      try {
        await audioService.initialize();
        await audioService.loadSamples(current.compositionData.samples ?? []);
        if (controller.signal.aborted) return;
        setAudioPhase('ready');
      } catch (err) {
        logger.warn('Peer-review samples laden mislukt', err);
        if (!controller.signal.aborted) setAudioPhase('ready'); // afspelen probeert alsnog
      }
    })();

    return () => controller.abort();
  }, [isOpen, current]);

  // Einde-afspelen terug naar 'ready'
  useEffect(() => {
    const unsubscribe = audioService.onPlaybackEnd(() => setAudioPhase((p) => (p === 'playing' ? 'ready' : p)));
    return unsubscribe;
  }, []);

  const handlePlayStop = useCallback(() => {
    if (!current) return;
    if (audioPhase === 'playing') {
      audioService.stop();
      setAudioPhase('ready');
    } else {
      audioService.scheduleTimeline(current.compositionData.tracks ?? [], current.compositionData.samples ?? []);
      audioService.setLoop(false, current.compositionData.totalBeats ?? 32);
      audioService.play(0);
      setAudioPhase('playing');
    }
  }, [current, audioPhase]);

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip)
        ? prev.filter((c) => c !== chip)
        : prev.length >= 3 ? prev : [...prev, chip]
    );
  };

  const handleSendAndNext = useCallback(async () => {
    if (!current || selectedChips.length === 0) return;
    setIsSending(true);
    audioService.stop();
    try {
      await submitPeerFeedback(ownSubmissionId, current.submissionId, selectedChips);
    } catch (err) {
      // Niet blokkeren: compliment is nice-to-have; door naar de volgende
      logger.warn('Peer-compliment versturen mislukt', err);
    }
    setIsSending(false);
    setSelectedChips([]);
    if (index + 1 < items.length) {
      setIndex(index + 1);
    } else {
      setPhase('done');
    }
  }, [current, selectedChips, ownSubmissionId, index, items.length]);

  const handleClose = useCallback(() => {
    audioService.stop();
    onClose();
  }, [onClose]);

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

          {/* Anonieme compositie + afspelen */}
          <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-neutral-50 p-4 mb-5">
            <button
              onClick={handlePlayStop}
              disabled={audioPhase === 'loading'}
              className="w-14 h-14 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 disabled:opacity-50 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95 shrink-0"
              aria-label={audioPhase === 'playing' ? t('common.pause') : t('common.play')}
            >
              {audioPhase === 'loading' ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : audioPhase === 'playing' ? (
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

          {/* Complimenten-chips */}
          <p className="text-sm font-semibold text-text-main mb-2">{t('peerReview.chipsLabel')}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                aria-pressed={selectedChips.includes(chip)}
                className={cn(
                  'px-3 py-2 rounded-full text-sm font-semibold border-2 transition-all',
                  selectedChips.includes(chip)
                    ? 'bg-accent-100 border-accent-400 text-accent-800 scale-105'
                    : 'bg-white border-border-subtle text-text-muted hover:border-accent-300'
                )}
              >
                {chip}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            onClick={handleSendAndNext}
            disabled={selectedChips.length === 0 || isSending}
            isLoading={isSending}
            className="w-full"
          >
            <Send size={16} className="mr-2" />
            {index + 1 < items.length ? t('peerReview.sendAndNext') : t('peerReview.sendAndFinish')}
          </Button>
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
