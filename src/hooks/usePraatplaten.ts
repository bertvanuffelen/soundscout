/**
 * usePraatplaten Hook (#72)
 *
 * Hook voor het beheren van praatplaten per klas (CRUD + activate/deactivate).
 * Alleen voor ingelogde docenten — volgt useTemplates patroon.
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { NO_USER, errorMessage, updateCached, useManualRefetch, useTeacherId } from '../query/cache';
import {
  fetchPraatplaten,
  createPraatplaat,
  activatePraatplaat,
  deactivatePraatplaat,
  deletePraatplaat,
} from '../lib/praatplaat';
import type { PraatplaatRow } from '../lib/praatplaat';
import { logger } from '../utils/logger';
import i18n from '../i18n';

interface UsePraatplatenReturn {
  praatplaten: PraatplaatRow[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  create: (params: {
    classId?: string;
    name: string;
    themeId: string;
    locationId: string;
    imageUrl: string;
  }) => Promise<void>;
  activate: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

interface CreatePraatplaatInput {
  classId?: string;
  name: string;
  themeId: string;
  locationId: string;
  imageUrl: string;
}

const NO_PRAATPLATEN: PraatplaatRow[] = [];

export function usePraatplaten(classId?: string): UsePraatplatenReturn {
  const client = useQueryClient();
  const userId = useTeacherId();
  const key = queryKeys.teacher.praatplaten(userId ?? NO_USER, classId);
  const [operationError, setOperationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled: userId !== null,
    queryFn: async () => {
      try {
        return await fetchPraatplaten(classId);
      } catch (err) {
        logger.error('Fout bij ophalen praatplaten:', err);
        throw err;
      }
    },
  });
  const { refetching, refetch } = useManualRefetch(query.refetch);

  // Alle vier: de lijst volgt ná een geslaagde schrijfactie (niet vooruitlopend)
  const createMutation = useMutation({
    mutationFn: (params: CreatePraatplaatInput) => createPraatplaat(params),
    onMutate: () => setOperationError(null),
    onSuccess: (id, params) => {
      const newRow: PraatplaatRow = {
        id,
        class_id: params.classId || '',
        teacher_id: '', // Filled by server, not critical for display
        name: params.name,
        theme_id: params.themeId,
        location_id: params.locationId,
        image_url: params.imageUrl,
        is_active: false,
        created_at: new Date().toISOString(),
      };
      return updateCached<PraatplaatRow[]>(client, key, (prev) => [newRow, ...(prev ?? [])]);
    },
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.praatplaten.create')));
      logger.error('createPraatplaat failed:', err);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activatePraatplaat(id),
    onMutate: () => setOperationError(null),
    // Activate this one, deactivate all others
    onSuccess: (_void, id) =>
      updateCached<PraatplaatRow[]>(client, key, (prev) =>
        prev?.map((p) => ({ ...p, is_active: p.id === id }))),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.praatplaten.activate')));
      logger.error('activatePraatplaat failed:', err);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivatePraatplaat(id),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, id) =>
      updateCached<PraatplaatRow[]>(client, key, (prev) =>
        prev?.map((p) => (p.id === id ? { ...p, is_active: false } : p))),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.praatplaten.deactivate')));
      logger.error('deactivatePraatplaat failed:', err);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deletePraatplaat(id),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, id) =>
      updateCached<PraatplaatRow[]>(client, key, (prev) => prev?.filter((p) => p.id !== id)),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.praatplaten.delete')));
      logger.error('deletePraatplaat failed:', err);
    },
  });

  const { mutateAsync: createAsync } = createMutation;
  const { mutateAsync: activateAsync } = activateMutation;
  const { mutateAsync: deactivateAsync } = deactivateMutation;
  const { mutateAsync: removeAsync } = removeMutation;
  const create = useCallback(async (params: CreatePraatplaatInput) => {
    await createAsync(params);
  }, [createAsync]);
  const activate = useCallback(async (id: string) => { await activateAsync(id); }, [activateAsync]);
  const deactivate = useCallback(async (id: string) => { await deactivateAsync(id); }, [deactivateAsync]);
  const remove = useCallback(async (id: string) => { await removeAsync(id); }, [removeAsync]);

  return {
    praatplaten: query.data ?? NO_PRAATPLATEN,
    loading: userId !== null && (query.isPending || refetching),
    error: query.error && !refetching ? errorMessage(query.error, i18n.t('errors.praatplaten.load')) : null,
    operationError,
    create,
    activate,
    deactivate,
    remove,
    refetch,
  };
}

export default usePraatplaten;
