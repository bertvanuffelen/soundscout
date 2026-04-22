/**
 * usePraatplaten Hook (#72)
 *
 * Hook voor het beheren van praatplaten per klas (CRUD + activate/deactivate).
 * Alleen voor ingelogde docenten — volgt useTemplates patroon.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchPraatplaten,
  createPraatplaat,
  activatePraatplaat,
  deactivatePraatplaat,
  deletePraatplaat,
} from '../lib/praatplaat';
import type { PraatplaatRow } from '../lib/praatplaat';
import { logger } from '../utils/logger';

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

export function usePraatplaten(classId?: string): UsePraatplatenReturn {
  const [praatplaten, setPraatplaten] = useState<PraatplaatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPraatplaten(classId);
      setPraatplaten(data);
    } catch (err) {
      logger.error('Fout bij ophalen praatplaten:', err);
      setError(err instanceof Error ? err.message : 'Kon praatplaten niet laden');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const create = async (params: {
    classId?: string;
    name: string;
    themeId: string;
    locationId: string;
    imageUrl: string;
  }): Promise<void> => {
    try {
      setOperationError(null);
      const id = await createPraatplaat(params);
      // Add to local state
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
      setPraatplaten((prev) => [newRow, ...prev]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon praatplaat niet aanmaken';
      setOperationError(msg);
      logger.error('createPraatplaat failed:', err);
      throw err;
    }
  };

  const activate = async (id: string): Promise<void> => {
    try {
      setOperationError(null);
      await activatePraatplaat(id);
      // Update local state: activate this one, deactivate all others
      setPraatplaten((prev) =>
        prev.map((p) => ({ ...p, is_active: p.id === id }))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon praatplaat niet activeren';
      setOperationError(msg);
      logger.error('activatePraatplaat failed:', err);
      throw err;
    }
  };

  const deactivate = async (id: string): Promise<void> => {
    try {
      setOperationError(null);
      await deactivatePraatplaat(id);
      setPraatplaten((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: false } : p))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon praatplaat niet deactiveren';
      setOperationError(msg);
      logger.error('deactivatePraatplaat failed:', err);
      throw err;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      setOperationError(null);
      await deletePraatplaat(id);
      setPraatplaten((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon praatplaat niet verwijderen';
      setOperationError(msg);
      logger.error('deletePraatplaat failed:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    praatplaten,
    loading,
    error,
    operationError,
    create,
    activate,
    deactivate,
    remove,
    refetch: fetch,
  };
}

export default usePraatplaten;
