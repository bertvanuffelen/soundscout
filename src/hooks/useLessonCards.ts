/**
 * useLessonCards Hook
 *
 * Beheert de leskaart-bibliotheek van de ingelogde docent: eigen kaarten (CRUD
 * met optimistische updates) + ingebouwde kaarten (read-only). Spiegelt
 * useAssignmentCards / useTemplates.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchLessonCards,
  createLessonCard,
  updateLessonCard,
  deleteLessonCard,
} from '../lib/lessonCards';
import type { LessonCard, LessonCardInput } from '../lib/lessonCards';
import { logger } from '../utils/logger';
import i18n from '../i18n';

interface UseLessonCardsReturn {
  cards: LessonCard[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  create: (input: LessonCardInput) => Promise<LessonCard>;
  update: (id: string, input: LessonCardInput) => Promise<LessonCard>;
  remove: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useLessonCards(): UseLessonCardsReturn {
  const [cards, setCards] = useState<LessonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLessonCards();
      setCards(data);
    } catch (err) {
      logger.error('Fout bij ophalen leskaarten:', err);
      setError(err instanceof Error ? err.message : i18n.t('errors.lessonCards.load'));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (input: LessonCardInput): Promise<LessonCard> => {
    try {
      setOperationError(null);
      const created = await createLessonCard(input);
      // Eigen kaart onder de ingebouwde plaatsen (die staan vooraan)
      setCards((prev) => {
        const builtins = prev.filter((c) => c.isBuiltin);
        const own = prev.filter((c) => !c.isBuiltin);
        return [...builtins, created, ...own];
      });
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.lessonCards.create');
      setOperationError(msg);
      logger.error('createLessonCard failed:', err);
      throw err;
    }
  };

  const update = async (id: string, input: LessonCardInput): Promise<LessonCard> => {
    try {
      setOperationError(null);
      const updated = await updateLessonCard(id, input);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.lessonCards.update');
      setOperationError(msg);
      logger.error('updateLessonCard failed:', err);
      throw err;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      setOperationError(null);
      await deleteLessonCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.lessonCards.delete');
      setOperationError(msg);
      logger.error('deleteLessonCard failed:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    cards,
    loading,
    error,
    operationError,
    create,
    update,
    remove,
    refetch: fetch,
  };
}

export default useLessonCards;
