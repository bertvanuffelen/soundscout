/**
 * useTemplates Hook
 *
 * Hook voor het beheren van templates (CRUD operaties)
 * Alleen voor ingelogde docenten — volgt useClasses patroon
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { NO_USER, errorMessage, updateCached, useManualRefetch, useTeacherId } from '../query/cache';
import {
  fetchTeacherTemplates,
  createTemplate,
  deleteTemplate,
  toggleTemplate,
} from '../lib/templates';
import type { TeacherTemplate, CreateTemplateParams } from '../lib/templates';
import { logger } from '../utils/logger';
import i18n from '../i18n';

interface UseTemplatesReturn {
  templates: TeacherTemplate[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  create: (params: CreateTemplateParams) => Promise<TeacherTemplate>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string, isActive: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

const NO_TEMPLATES: TeacherTemplate[] = [];

export function useTemplates(): UseTemplatesReturn {
  const client = useQueryClient();
  const userId = useTeacherId();
  const key = queryKeys.teacher.templates(userId ?? NO_USER);
  const [operationError, setOperationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled: userId !== null,
    queryFn: async () => {
      try {
        return await fetchTeacherTemplates();
      } catch (err) {
        logger.error('Fout bij ophalen templates:', err);
        throw err;
      }
    },
  });
  const { refetching, refetch } = useManualRefetch(query.refetch);

  // Alle drie: de lijst volgt ná een geslaagde schrijfactie (niet vooruitlopend)
  const createMutation = useMutation({
    mutationFn: (params: CreateTemplateParams) => createTemplate(params),
    onMutate: () => setOperationError(null),
    onSuccess: (created) =>
      updateCached<TeacherTemplate[]>(client, key, (prev) => [created, ...(prev ?? [])]),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.templates.create')));
      logger.error('createTemplate failed:', err);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, id) =>
      updateCached<TeacherTemplate[]>(client, key, (prev) => prev?.filter((t) => t.id !== id)),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.templates.delete')));
      logger.error('deleteTemplate failed:', err);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleTemplate(id, isActive),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, { id, isActive }) =>
      updateCached<TeacherTemplate[]>(client, key, (prev) =>
        prev?.map((t) => (t.id === id ? { ...t, isActive } : t))),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.templates.status')));
      logger.error('toggleTemplate failed:', err);
    },
  });

  const { mutateAsync: createAsync } = createMutation;
  const { mutateAsync: removeAsync } = removeMutation;
  const { mutateAsync: toggleAsync } = toggleMutation;
  const create = useCallback((params: CreateTemplateParams) => createAsync(params), [createAsync]);
  const remove = useCallback((id: string) => removeAsync(id), [removeAsync]);
  const toggle = useCallback(
    (id: string, isActive: boolean) => toggleAsync({ id, isActive }),
    [toggleAsync],
  );

  return {
    templates: query.data ?? NO_TEMPLATES,
    loading: userId !== null && (query.isPending || refetching),
    error: query.error && !refetching ? errorMessage(query.error, i18n.t('errors.templates.load')) : null,
    operationError,
    create,
    remove,
    toggle,
    refetch,
  };
}

export default useTemplates;
