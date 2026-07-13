/**
 * PeerReviewSettings - "Klasgenoten luisteren" instellen op een actieve opdracht
 *
 * Toggle + feedbackkaart-keuze (ingebouwd + eigen kaarten) + minimalistische
 * eigen-kaart-editor. Opslaan via set_assignment_peer_review (migratie 027).
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones, Plus, Trash2, Loader2 } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import {
  listFeedbackCards, createFeedbackCard, deleteFeedbackCard,
  setAssignmentPeerReview, type FeedbackCard,
} from '../../lib/peerFeedback';
import { logger } from '../../utils/logger';
import { cn } from '../../utils/cn';

interface PeerReviewSettingsProps {
  assignmentId: string;
}

export function PeerReviewSettings({ assignmentId }: PeerReviewSettingsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true); // false als migratie 027 nog niet draait
  const [enabled, setEnabled] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const [cards, setCards] = useState<FeedbackCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newChips, setNewChips] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  // Huidige instelling + kaarten laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getSupabase();
        const [{ data: row, error: rowError }, allCards] = await Promise.all([
          supabase
            .from('class_assignments')
            .select('peer_review_enabled, feedback_card_id')
            .eq('id', assignmentId)
            .single(),
          listFeedbackCards(),
        ]);
        if (cancelled) return;
        if (rowError) {
          // Kolommen bestaan nog niet → migratie 027 niet uitgevoerd; verberg stil
          logger.warn('PeerReviewSettings: instelling laden mislukt', rowError);
          setAvailable(false);
          return;
        }
        setEnabled(!!row?.peer_review_enabled);
        setCardId((row?.feedback_card_id as string) ?? null);
        setCards(allCards);
      } catch (err) {
        logger.warn('PeerReviewSettings: laden mislukt', err);
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentId]);

  const persist = async (nextEnabled: boolean, nextCardId: string | null) => {
    setError(null);
    const prev = { enabled, cardId };
    setEnabled(nextEnabled);
    setCardId(nextCardId);
    try {
      await setAssignmentPeerReview(assignmentId, nextEnabled, nextCardId);
      // Server valt bij aanzetten zonder kaart terug op de standaardkaart
      if (nextEnabled && !nextCardId) {
        const standard = cards.find((c) => c.builtinKey === 'standaard');
        if (standard) setCardId(standard.id);
      }
    } catch (err) {
      setEnabled(prev.enabled);
      setCardId(prev.cardId);
      setError(err instanceof Error ? err.message : t('teacher.peerReview.settingError'));
    }
  };

  const handleCreateCard = async () => {
    const chips = newChips.split('\n').map((c) => c.trim()).filter(Boolean);
    if (!newTitle.trim() || chips.length < 2 || chips.length > 8) {
      setError(t('teacher.peerReview.cardValidation'));
      return;
    }
    setSavingCard(true);
    setError(null);
    try {
      const card = await createFeedbackCard(newTitle, chips);
      setCards((prev) => [...prev, card]);
      setShowNewCard(false);
      setNewTitle('');
      setNewChips('');
      await persist(true, card.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacher.peerReview.saveCardError'));
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await deleteFeedbackCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      if (cardId === id) await persist(enabled, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacher.peerReview.deleteCardError'));
    }
  };

  if (!available) return null;
  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  const selectedCard = cards.find((c) => c.id === cardId) ?? null;

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      {/* Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Headphones className="w-4 h-4 text-accent-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-main">{t('teacher.peerReview.title')}</p>
            <p className="text-xs text-text-muted">{t('teacher.peerReview.hint')}</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => persist(!enabled, cardId)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors shrink-0',
            enabled ? 'bg-accent-400' : 'bg-neutral-300'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
            enabled ? 'left-[22px]' : 'left-0.5'
          )} />
        </button>
      </div>

      {/* Kaartkeuze */}
      {enabled && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={cardId ?? ''}
              onChange={(e) => persist(true, e.target.value || null)}
              className="px-3 py-1.5 border-2 border-border-subtle rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none"
              aria-label={t('teacher.peerReview.cardLabel')}
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}{c.builtinKey ? '' : ` (${t('teacher.peerReview.ownCard')})`}
                </option>
              ))}
            </select>
            {selectedCard && !selectedCard.builtinKey && (
              <button
                onClick={() => handleDeleteCard(selectedCard.id)}
                className="p-1.5 text-text-muted hover:text-error-600 transition-colors"
                title={t('teacher.peerReview.deleteCard')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowNewCard((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-800"
            >
              <Plus className="w-3.5 h-3.5" /> {t('teacher.peerReview.newCard')}
            </button>
          </div>

          {/* Chips-preview van de gekozen kaart */}
          {selectedCard && (
            <div className="flex flex-wrap gap-1.5">
              {selectedCard.chips.map((chip) => (
                <span key={chip} className="px-2 py-0.5 rounded-full bg-accent-50 border border-accent-200 text-accent-800 text-xs">
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* Mini-editor voor een eigen kaart */}
          {showNewCard && (
            <div className="rounded-xl border border-border-subtle bg-neutral-50 p-3 space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t('teacher.peerReview.cardTitlePlaceholder')}
                maxLength={80}
                className="w-full px-3 py-1.5 border-2 border-border-subtle rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none"
              />
              <textarea
                value={newChips}
                onChange={(e) => setNewChips(e.target.value)}
                rows={4}
                placeholder={t('teacher.peerReview.chipsPlaceholder')}
                className="w-full px-3 py-1.5 border-2 border-border-subtle rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none resize-y"
              />
              <button
                onClick={handleCreateCard}
                disabled={savingCard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-400 hover:bg-accent-500 text-white text-xs font-bold disabled:opacity-50 transition-colors"
              >
                {savingCard && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t('teacher.peerReview.saveCard')}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-error-600 text-xs mt-2">{error}</p>}
    </div>
  );
}

export default PeerReviewSettings;
