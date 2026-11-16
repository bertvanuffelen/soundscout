/**
 * useLessonCards Hook
 *
 * Beheert de leskaart-bibliotheek van de ingelogde docent: eigen kaarten (CRUD
 * met optimistische updates) + ingebouwde kaarten (read-only). Spiegelt
 * useAssignmentCards / useTemplates.
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { NO_USER, errorMessage, updateCached, useManualRefetch, useTeacherId } from '../query/cache';
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

const NO_CARDS: LessonCard[] = [];

export function useLessonCards(): UseLessonCardsReturn {
  const client = useQueryClient();
  const userId = useTeacherId();
  const key = queryKeys.teacher.lessonCards(userId ?? NO_USER);
  const [operationError, setOperationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled: userId !== null,
    queryFn: async () => {
      try {
        return await fetchLessonCards();
      } catch (err) {
        logger.error('Fout bij ophalen leskaarten:', err);
        throw err;
      }
    },
  });
  const { refetching, refetch } = useManualRefetch(query.refetch);

  // Alle drie: de lijst volgt ná een geslaagde schrijfactie (niet vooruitlopend)
  const createMutation = useMutation({
    mutationFn: (input: LessonCardInput) => createLessonCard(input),
    onMutate: () => setOperationError(null),
    // Eigen kaart onder de ingebouwde plaatsen (die staan vooraan)
    onSuccess: (created) =>
      updateCached<LessonCard[]>(client, key, (prev = []) => {
        const builtins = prev.filter((c) => c.isBuiltin);
        const own = prev.filter((c) => !c.isBuiltin);
        return [...builtins, created, ...own];
      }),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.lessonCards.create')));
      logger.error('createLessonCard failed:', err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: LessonCardInput }) => updateLessonCard(id, input),
    onMutate: () => setOperationError(null),
    onSuccess: (updated, { id }) =>
      updateCached<LessonCard[]>(client, key, (prev) =>
        prev?.map((c) => (c.id === id ? updated : c))),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.lessonCards.update')));
      logger.error('updateLessonCard failed:', err);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteLessonCard(id),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, id) =>
      updateCached<LessonCard[]>(client, key, (prev) => prev?.filter((c) => c.id !== id)),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.lessonCards.delete')));
      logger.error('deleteLessonCard failed:', err);
    },
  });

  const { mutateAsync: createAsync } = createMutation;
  const { mutateAsync: updateAsync } = updateMutation;
  const { mutateAsync: removeAsync } = removeMutation;
  const create = useCallback((input: LessonCardInput) => createAsync(input), [createAsync]);
  const update = useCallback(
    (id: string, input: LessonCardInput) => updateAsync({ id, input }),
    [updateAsync],
  );
  const remove = useCallback((id: string) => removeAsync(id), [removeAsync]);

  return {
    cards: query.data ?? NO_CARDS,
    loading: userId !== null && (query.isPending || refetching),
    error: query.error && !refetching ? errorMessage(query.error, i18n.t('errors.lessonCards.load')) : null,
    operationError,
    create,
    update,
    remove,
    refetch,
  };
}

export default useLessonCards;
