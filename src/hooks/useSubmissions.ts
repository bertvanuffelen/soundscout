/**
 * useSubmissions Hook
 *
 * Hook voor het ophalen en beheren van inzendingen (submissions) per klas
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { queryKeys } from '../query/queryKeys';
import { NO_USER, errorMessage, updateCached, useManualRefetch, useTeacherId } from '../query/cache';
import {
  setSubmissionFeedback as setSubmissionFeedbackRpc,
  markSubmissionSeen as markSubmissionSeenRpc,
} from '../lib/submissions';
import type { FeedbackSticker } from '../lib/submissions';
import { logger } from '../utils/logger';
import type { CompositionData } from '../types';
import i18n from '../i18n';

// Types
export interface Submission {
  id: string;
  student_name: string;
  composition_name: string;
  composition_data: CompositionData;
  created_at: string;
  save_code?: string | null;
  last_updated_at?: string | null;
  assignment_id?: string | null;
  /** Tekst-ref voor storyboard/free-opdrachten (migratie 015/018) */
  assignment_ref?: string | null;
  /** Legacy praatplaat-koppeling (migratie 005); nieuwe flow zet assignment_id */
  praatplaat_id?: string | null;
  assignment_type?: 'template' | 'praatplaat' | 'storyboard' | 'free' | null;
  /** Formeel ingeleverd-stempel (migratie 026). Sinds v2 heeft élke
   *  klas-inzending een save_code, dus dít onderscheidt ingeleverd van WIP. */
  submitted_at?: string | null;
  // Docent-feedback (migratie 026)
  feedback_sticker?: FeedbackSticker | null;
  feedback_level?: number | null;
  feedback_text?: string | null;
  feedback_at?: string | null;
  teacher_seen_at?: string | null;
}

/** Review-status van een inzending, afgeleid uit de feedback-stempels */
export type SubmissionReviewStatus = 'new' | 'seen' | 'reviewed';

export function getReviewStatus(s: Submission): SubmissionReviewStatus {
  if (s.feedback_at) return 'reviewed';
  if (s.teacher_seen_at) return 'seen';
  return 'new';
}

interface UseSubmissionsReturn {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  deleteSubmission: (id: string) => Promise<void>;
  setFeedback: (
    id: string,
    feedback: { sticker: FeedbackSticker | null; level: number | null; text: string | null }
  ) => Promise<void>;
  markSeen: (id: string) => void;
  refetch: () => Promise<void>;
}

export interface UseSubmissionsOptions {
  /**
   * Ververs de inzendingen elke zoveel ms op de achtergrond (I7: 20 s tijdens
   * presenteren). Zonder waarde of `false`: geen polling. Loopt door als het
   * tabblad niet zichtbaar is, net als de oude setInterval, en zet `loading`
   * niet aan — de lijst blijft staan terwijl er ververst wordt.
   */
  pollIntervalMs?: number | false;
}

type FeedbackInput = { sticker: FeedbackSticker | null; level: number | null; text: string | null };

const NO_SUBMISSIONS: Submission[] = [];

/**
 * Hook voor het ophalen van submissions van een specifieke klas
 *
 * @param classId - ID van de klas
 */
export function useSubmissions(classId: string, options: UseSubmissionsOptions = {}): UseSubmissionsReturn {
  const client = useQueryClient();
  const userId = useTeacherId();
  const key = queryKeys.teacher.submissions(userId ?? NO_USER, classId);
  const enabled = userId !== null && !!classId;
  const [operationError, setOperationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled,
    refetchInterval: options.pollIntervalMs || false,
    refetchIntervalInBackground: true,
    queryFn: async (): Promise<Submission[]> => {
      try {
        const supabase = await getSupabase();
        const { data, error: fetchError } = await supabase
          .from('submissions')
          .select('*')
          .eq('class_id', classId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        return data || [];
      } catch (err) {
        logger.error('Fout bij ophalen composities:', err);
        throw err;
      }
    },
  });
  const { refetching, refetch } = useManualRefetch(query.refetch);

  // Verwijder submission — uit de lijst ná een geslaagde verwijdering
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const supabase = await getSupabase();
      const { error: deleteErr } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (deleteErr) {
        throw new Error(i18n.t('errors.submissions.delete') + ': ' + deleteErr.message);
      }
    },
    onMutate: () => setOperationError(null),
    onSuccess: (_void, id) =>
      updateCached<Submission[]>(client, key, (prev) => prev?.filter((s) => s.id !== id)),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.submissions.delete')));
      logger.error('deleteSubmission failed:', err);
    },
  });

  // Feedback zetten (migratie 026) — de lijst volgt ná een geslaagde opslag;
  // een fout gaat ongewijzigd naar de aanroeper (FeedbackPanel toont hem).
  const feedbackMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: FeedbackInput }) =>
      setSubmissionFeedbackRpc(id, feedback),
    onMutate: () => setOperationError(null),
    onSuccess: (_void, { id, feedback }) => {
      const isCleared = !feedback.sticker && !feedback.level && !feedback.text?.trim();
      return updateCached<Submission[]>(client, key, (prev) => prev?.map((s) => s.id === id
        ? {
            ...s,
            feedback_sticker: feedback.sticker,
            feedback_level: feedback.level,
            feedback_text: feedback.text?.trim() || null,
            feedback_at: isCleared ? null : new Date().toISOString(),
          }
        : s));
    },
  });

  // "Gezien"-stempel bij openen: meteen in de lijst (optimistisch), de server
  // volgt. markSubmissionSeen slikt zijn eigen fouten, dus terugdraaien komt
  // in de praktijk niet voor; gebeurt het toch, dan verdwijnt alleen ónze
  // stempel weer.
  const seenMutation = useMutation({
    mutationFn: (id: string) => markSubmissionSeenRpc(id),
    onMutate: async (id: string) => {
      const stamp = new Date().toISOString();
      let stamped = false;
      await updateCached<Submission[]>(client, key, (prev) => prev?.map((s) => {
        if (s.id !== id || s.teacher_seen_at) return s;
        stamped = true;
        return { ...s, teacher_seen_at: stamp };
      }));
      return { stamp: stamped ? stamp : null };
    },
    onError: (_err, id, context) => {
      if (!context?.stamp) return;
      client.setQueryData<Submission[]>(key, (prev) => prev?.map((s) =>
        s.id === id && s.teacher_seen_at === context.stamp ? { ...s, teacher_seen_at: null } : s));
    },
  });

  const { mutateAsync: deleteAsync } = deleteMutation;
  const { mutateAsync: feedbackAsync } = feedbackMutation;
  const { mutate: seenMutate } = seenMutation;
  const deleteSubmission = useCallback((id: string) => deleteAsync(id), [deleteAsync]);
  const setFeedback = useCallback(
    (id: string, feedback: FeedbackInput) => feedbackAsync({ id, feedback }),
    [feedbackAsync],
  );
  const markSeen = useCallback((id: string) => seenMutate(id), [seenMutate]);

  return {
    submissions: query.data ?? NO_SUBMISSIONS,
    loading: enabled && (query.isPending || refetching),
    error: query.error && !refetching ? errorMessage(query.error, i18n.t('errors.submissions.load')) : null,
    operationError,
    deleteSubmission,
    setFeedback,
    markSeen,
    refetch,
  };
}

export default useSubmissions;
