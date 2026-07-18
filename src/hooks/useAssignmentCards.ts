/**
 * useAssignmentCards Hook
 *
 * Beheert de opdrachtkaart-bibliotheek van de ingelogde docent (CRUD met
 * optimistische updates). Spiegelt useTemplates.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchTeacherCards,
  createCard,
  updateCard,
  deleteCard,
} from '../lib/assignmentCards';
import type { CreateCardParams } from '../lib/assignmentCards';
import type { Opdrachtkaart } from '../types';
import { logger } from '../utils/logger';
import i18n from '../i18n';

interface UseAssignmentCardsReturn {
  cards: Opdrachtkaart[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  create: (params: CreateCardParams) => Promise<Opdrachtkaart>;
  update: (id: string, params: CreateCardParams) => Promise<Opdrachtkaart>;
  remove: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAssignmentCards(): UseAssignmentCardsReturn {
  const [cards, setCards] = useState<Opdrachtkaart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeacherCards();
      setCards(data);
    } catch (err) {
      logger.error('Fout bij ophalen opdrachtkaarten:', err);
      setError(err instanceof Error ? err.message : i18n.t('errors.assignmentCards.load'));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (params: CreateCardParams): Promise<Opdrachtkaart> => {
    try {
      setOperationError(null);
      const newCard = await createCard(params);
      setCards((prev) => [newCard, ...prev]);
      return newCard;
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.assignmentCards.create');
      setOperationError(msg);
      logger.error('createCard failed:', err);
      throw err;
    }
  };

  const update = async (id: string, params: CreateCardParams): Promise<Opdrachtkaart> => {
    try {
      setOperationError(null);
      const updated = await updateCard(id, params);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.assignmentCards.update');
      setOperationError(msg);
      logger.error('updateCard failed:', err);
      throw err;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      setOperationError(null);
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.assignmentCards.delete');
      setOperationError(msg);
      logger.error('deleteCard failed:', err);
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

export default useAssignmentCards;
