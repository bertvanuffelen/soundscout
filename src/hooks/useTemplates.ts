/**
 * useTemplates Hook
 *
 * Hook voor het beheren van templates (CRUD operaties)
 * Alleen voor ingelogde docenten — volgt useClasses patroon
 */

import { useState, useEffect, useCallback } from 'react';
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

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<TeacherTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeacherTemplates();
      setTemplates(data);
    } catch (err) {
      logger.error('Fout bij ophalen templates:', err);
      setError(err instanceof Error ? err.message : i18n.t('errors.templates.load'));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (params: CreateTemplateParams): Promise<TeacherTemplate> => {
    try {
      setOperationError(null);
      const newTemplate = await createTemplate(params);
      setTemplates((prev) => [newTemplate, ...prev]);
      return newTemplate;
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.templates.create');
      setOperationError(msg);
      logger.error('createTemplate failed:', err);
      throw err;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      setOperationError(null);
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.templates.delete');
      setOperationError(msg);
      logger.error('deleteTemplate failed:', err);
      throw err;
    }
  };

  const toggle = async (id: string, isActive: boolean): Promise<void> => {
    try {
      setOperationError(null);
      await toggleTemplate(id, isActive);
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive } : t))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.t('errors.templates.status');
      setOperationError(msg);
      logger.error('toggleTemplate failed:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    templates,
    loading,
    error,
    operationError,
    create,
    remove,
    toggle,
    refetch: fetch,
  };
}

export default useTemplates;
