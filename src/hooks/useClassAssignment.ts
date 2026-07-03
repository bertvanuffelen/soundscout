/**
 * useClassAssignment - Hook voor actieve opdracht per klas
 *
 * Beheert de actieve opdracht (template of praatplaat) voor een klas.
 * Volgt het patroon van usePraatplaten/useTemplates.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  fetchClassAssignment,
  fetchPastAssignments,
  activateAssignment,
  deactivateAssignment,
} from '../lib/assignments';
import type { ClassAssignmentRow } from '../lib/assignments';
import { activatePraatplaatFromCatalog } from '../lib/praatplaat';
import { logger } from '../utils/logger';

interface UseClassAssignmentReturn {
  /** Huidige actieve opdracht (null = geen actieve opdracht) */
  activeAssignment: ClassAssignmentRow | null;
  /** Eerdere (gedeactiveerde) opdrachten, nieuwste eerst */
  pastAssignments: ClassAssignmentRow[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  /** Activeer een template voor deze klas (optioneel met opdrachtkaart) */
  activateTemplate: (templateId: string, cardId?: string | null) => Promise<void>;
  /** Heractiveer een bestaande praatplaat-instance voor deze klas (optioneel met opdrachtkaart) */
  activatePraatplaat: (praatplaatId: string, cardId?: string | null) => Promise<void>;
  /** Activeer een praatplaat uit de catalogus (find-or-create instance) */
  activatePraatplaatFromCatalog: (
    entry: { name: string; themeId: string; locationId: string; imageUrl: string },
    cardId?: string | null,
  ) => Promise<void>;
  /** Activeer een storyboard voor deze klas (optioneel met opdrachtkaart) */
  activateStoryboard: (storyboardRef: string, cardId?: string | null) => Promise<void>;
  /** Deactiveer de huidige opdracht */
  deactivate: () => Promise<void>;
  /** Herlaad data */
  refetch: () => Promise<void>;
}

export function useClassAssignment(classId: string): UseClassAssignmentReturn {
  const [activeAssignment, setActiveAssignment] = useState<ClassAssignmentRow | null>(null);
  const [pastAssignments, setPastAssignments] = useState<ClassAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, past] = await Promise.all([
        fetchClassAssignment(classId),
        fetchPastAssignments(classId),
      ]);
      setActiveAssignment(active);
      setPastAssignments(past);
    } catch (err) {
      logger.error('useClassAssignment fetch error:', err);
      setError('Kon actieve opdracht niet laden');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const activateTemplate = useCallback(async (templateId: string, cardId?: string | null) => {
    setOperationError(null);
    try {
      await activateAssignment(classId, { templateId, cardId });
      // Refetch to get the full assignment with joined name
      await fetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon template niet activeren';
      setOperationError(msg);
      throw err;
    }
  }, [classId, fetch]);

  const activatePraatplaat = useCallback(async (praatplaatId: string, cardId?: string | null) => {
    setOperationError(null);
    try {
      await activateAssignment(classId, { praatplaatId, cardId });
      await fetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon praatplaat niet activeren';
      setOperationError(msg);
      throw err;
    }
  }, [classId, fetch]);

  const activatePraatplaatCatalog = useCallback(async (
    entry: { name: string; themeId: string; locationId: string; imageUrl: string },
    cardId?: string | null,
  ) => {
    setOperationError(null);
    try {
      await activatePraatplaatFromCatalog(classId, entry, cardId);
      await fetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon praatplaat niet activeren';
      setOperationError(msg);
      throw err;
    }
  }, [classId, fetch]);

  const activateStoryboard = useCallback(async (storyboardRef: string, cardId?: string | null) => {
    setOperationError(null);
    try {
      await activateAssignment(classId, { storyboardRef, cardId });
      await fetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon storyboard niet activeren';
      setOperationError(msg);
      throw err;
    }
  }, [classId, fetch]);

  const deactivate = useCallback(async () => {
    setOperationError(null);
    try {
      await deactivateAssignment(classId);
      setActiveAssignment(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kon opdracht niet deactiveren';
      setOperationError(msg);
      throw err;
    }
  }, [classId]);

  return {
    activeAssignment,
    pastAssignments,
    loading,
    error,
    operationError,
    activateTemplate,
    activatePraatplaat,
    activatePraatplaatFromCatalog: activatePraatplaatCatalog,
    activateStoryboard,
    deactivate,
    refetch: fetch,
  };
}
