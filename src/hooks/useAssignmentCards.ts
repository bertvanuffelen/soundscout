/**
 * useAssignmentCards Hook
 *
 * Beheert de opdrachtkaart-bibliotheek van de ingelogde docent (CRUD met
 * optimistische updates). Spiegelt useTemplates.
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { NO_USER, errorMessage, updateCached, useManualRefetch, useTeacherId } from '../query/cache';
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

const NO_CARDS: Opdrachtkaart[] = [];

export function useAssignmentCards(): UseAssignmentCardsReturn {
  const client = useQueryClient();
  const userId = useTeacherId();
  const key = queryKeys.teacher.assignmentCards(userId ?? NO_USER);
  const [operationError, setOperationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled: userId !== null,
    queryFn: async () => {
      try {
        return await fetchTeacherCards();
      } catch (err) {
        logger.error('Fout bij ophalen opdrachtkaarten:', err);
        throw err;
      }
    },
  });
  const { refetching, refetch } = useManualRefetch(query.refetch);

  // Alle drie: de lijst volgt ná een geslaagde schrijfactie (niet vooruitlopend)
  const createMutation = useMutation({
    mutationFn: (params: CreateCardParams) => createCard(params),
    onMutate: () => setOperationError(null),
    onSuccess: (created) =>
      updateCached<Opdrachtkaart[]>(client, key, (prev) => [created, ...(prev ?? [])]),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.assignmentCards.create')));
      logger.error('createCard failed:', err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: CreateCardParams }) => updateCard(id, params),
    onMutate: () => setOperationError(null),
    onSuccess: (updated, { id }) =>
      updateCached<Opdrachtkaart[]>(client, key, (prev) =>
        prev?.map((c) => (c.id === id ? updated : c))),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.assignmentCards.update')));
      logger.error('updateCard failed:', err);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, id) =>
      updateCached<Opdrachtkaart[]>(client, key, (prev) => prev?.filter((c) => c.id !== id)),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.assignmentCards.delete')));
      logger.error('deleteCard failed:', err);
    },
  });

  const { mutateAsync: createAsync } = createMutation;
  const { mutateAsync: updateAsync } = updateMutation;
  const { mutateAsync: removeAsync } = removeMutation;
  const create = useCallback((params: CreateCardParams) => createAsync(params), [createAsync]);
  const update = useCallback(
    (id: string, params: CreateCardParams) => updateAsync({ id, params }),
    [updateAsync],
  );
  const remove = useCallback((id: string) => removeAsync(id), [removeAsync]);

  return {
    cards: query.data ?? NO_CARDS,
    loading: userId !== null && (query.isPending || refetching),
    error: query.error && !refetching ? errorMessage(query.error, i18n.t('errors.assignmentCards.load')) : null,
    operationError,
    create,
    update,
    remove,
    refetch,
  };
}

export default useAssignmentCards;
