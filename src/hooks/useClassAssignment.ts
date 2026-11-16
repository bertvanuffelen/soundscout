/**
 * useClassAssignment - Hook voor actieve opdracht per klas
 *
 * Beheert de actieve opdracht (template of praatplaat) voor een klas.
 * Volgt het patroon van usePraatplaten/useTemplates.
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { NO_USER, errorMessage, updateCached, useManualRefetch, useTeacherId } from '../query/cache';
import {
  fetchClassAssignment,
  fetchPastAssignments,
  activateAssignment,
  deactivateAssignment,
  deleteAssignmentFromHistory,
  updateAssignmentCard,
} from '../lib/assignments';
import type { ClassAssignmentRow } from '../lib/assignments';
import { activatePraatplaatFromCatalog } from '../lib/praatplaat';
import { logger } from '../utils/logger';
import i18n from '../i18n';

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
  /** Activeer een vrije-compositie-opdracht (thema-gebonden) voor deze klas */
  activateFree: (themeId: string, cardId?: string | null) => Promise<void>;
  /** Deactiveer de huidige opdracht */
  deactivate: () => Promise<void>;
  /** Haal een afgeronde opdracht uit de historie (leerlingwerk blijft staan) */
  removeFromHistory: (assignmentId: string) => Promise<void>;
  /** Koppel of wis de opdrachtkaart op de actieve opdracht (null = blanco) */
  updateCard: (assignmentId: string, cardId: string | null) => Promise<void>;
  /** Herlaad data */
  refetch: () => Promise<void>;
}

interface ClassAssignmentData {
  active: ClassAssignmentRow | null;
  past: ClassAssignmentRow[];
}

type ActivateAssignmentParams = Parameters<typeof activateAssignment>[1];
type CatalogEntry = { name: string; themeId: string; locationId: string; imageUrl: string };

const NO_PAST: ClassAssignmentRow[] = [];

export function useClassAssignment(classId: string): UseClassAssignmentReturn {
  const client = useQueryClient();
  const userId = useTeacherId();
  const key = queryKeys.teacher.classAssignment(userId ?? NO_USER, classId);
  const enabled = userId !== null;
  const [operationError, setOperationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<ClassAssignmentData> => {
      try {
        const [active, past] = await Promise.all([
          fetchClassAssignment(classId),
          fetchPastAssignments(classId),
        ]);
        return { active, past };
      } catch (err) {
        logger.error('useClassAssignment fetch error:', err);
        throw err;
      }
    },
  });
  // Herladen na een activatie zet `loading` aan, net als voorheen
  const { refetching, refetch } = useManualRefetch(query.refetch);

  // --- Activeren: eerst de server, dan herladen voor de volledige rij (met naam) ---

  const activateMutation = useMutation({
    mutationFn: ({ params }: { params: ActivateAssignmentParams; fallbackKey: string }) =>
      activateAssignment(classId, params),
    onMutate: () => setOperationError(null),
    onError: (err, { fallbackKey }) => setOperationError(errorMessage(err, i18n.t(fallbackKey))),
  });

  const catalogMutation = useMutation({
    mutationFn: ({ entry, cardId }: { entry: CatalogEntry; cardId?: string | null }) =>
      activatePraatplaatFromCatalog(classId, entry, cardId),
    onMutate: () => setOperationError(null),
    onError: (err) => setOperationError(errorMessage(err, i18n.t('errors.praatplaten.activate'))),
  });

  const { mutateAsync: activateAsync } = activateMutation;
  const { mutateAsync: catalogAsync } = catalogMutation;

  const activateTemplate = useCallback(async (templateId: string, cardId?: string | null) => {
    await activateAsync({ params: { templateId, cardId }, fallbackKey: 'errors.assignments.activateTemplate' });
    await refetch();
  }, [activateAsync, refetch]);

  const activatePraatplaat = useCallback(async (praatplaatId: string, cardId?: string | null) => {
    await activateAsync({ params: { praatplaatId, cardId }, fallbackKey: 'errors.praatplaten.activate' });
    await refetch();
  }, [activateAsync, refetch]);

  const activatePraatplaatCatalog = useCallback(async (entry: CatalogEntry, cardId?: string | null) => {
    await catalogAsync({ entry, cardId });
    await refetch();
  }, [catalogAsync, refetch]);

  const activateStoryboard = useCallback(async (storyboardRef: string, cardId?: string | null) => {
    await activateAsync({ params: { storyboardRef, cardId }, fallbackKey: 'errors.assignments.activateStoryboard' });
    await refetch();
  }, [activateAsync, refetch]);

  const activateFree = useCallback(async (themeId: string, cardId?: string | null) => {
    await activateAsync({ params: { freeThemeId: themeId, cardId }, fallbackKey: 'errors.assignments.activateFree' });
    await refetch();
  }, [activateAsync, refetch]);

  // --- Deactiveren: de actieve opdracht verdwijnt ná een geslaagde aanroep ---

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateAssignment(classId),
    onMutate: () => setOperationError(null),
    onSuccess: () =>
      updateCached<ClassAssignmentData>(client, key, (prev) => ({ past: prev?.past ?? [], active: null })),
    onError: (err) => setOperationError(errorMessage(err, i18n.t('errors.assignments.deactivate'))),
  });

  /** Haal een afgeronde opdracht uit de historie (leerlingwerk blijft staan). */
  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteAssignmentFromHistory(assignmentId),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, assignmentId) =>
      updateCached<ClassAssignmentData>(client, key, (prev) =>
        prev ? { ...prev, past: prev.past.filter((row) => row.id !== assignmentId) } : prev),
    onError: (err) => setOperationError(errorMessage(err, i18n.t('errors.assignments.delete'))),
  });

  /** Koppel of wis de opdrachtkaart op de actieve opdracht (TR5#2). */
  const cardMutation = useMutation({
    mutationFn: ({ assignmentId, cardId }: { assignmentId: string; cardId: string | null }) =>
      updateAssignmentCard(assignmentId, cardId),
    onMutate: () => setOperationError(null),
    onError: (err) => setOperationError(errorMessage(err, i18n.t('errors.assignments.card'))),
  });

  const { mutateAsync: deactivateAsync } = deactivateMutation;
  const { mutateAsync: removeAsync } = removeMutation;
  const { mutateAsync: cardAsync } = cardMutation;

  const deactivate = useCallback(async () => {
    await deactivateAsync();
  }, [deactivateAsync]);

  const removeFromHistory = useCallback(async (assignmentId: string) => {
    await removeAsync(assignmentId);
  }, [removeAsync]);

  const updateCard = useCallback(async (assignmentId: string, cardId: string | null) => {
    await cardAsync({ assignmentId, cardId });
    await refetch();
  }, [cardAsync, refetch]);

  return {
    activeAssignment: query.data?.active ?? null,
    pastAssignments: query.data?.past ?? NO_PAST,
    removeFromHistory,
    updateCard,
    loading: enabled && (query.isPending || refetching),
    // Altijd de vaste melding, ongeacht de onderliggende fout (zoals voorheen)
    error: query.error && !refetching ? i18n.t('errors.assignments.load') : null,
    operationError,
    activateTemplate,
    activatePraatplaat,
    activatePraatplaatFromCatalog: activatePraatplaatCatalog,
    activateStoryboard,
    activateFree,
    deactivate,
    refetch,
  };
}
