/**
 * useSubmissions Hook
 *
 * Hook voor het ophalen en beheren van inzendingen (submissions) per klas
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
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

/**
 * Hook voor het ophalen van submissions van een specifieke klas
 *
 * @param classId - ID van de klas
 */
export function useSubmissions(classId: string): UseSubmissionsReturn {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    if (!classId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = await getSupabase();
      const { data, error: fetchError } = await supabase
        .from('submissions')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSubmissions(data || []);
    } catch (err) {
      logger.error('Fout bij ophalen composities:', err);
      setError(err instanceof Error ? err.message : i18n.t('errors.submissions.load'));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  // Verwijder submission
  const deleteSubmission = async (id: string): Promise<void> => {
    try {
      setOperationError(null);

      const supabase = await getSupabase();
      const { error: deleteErr } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (deleteErr) {
        throw new Error(i18n.t('errors.submissions.delete') + ': ' + deleteErr.message);
      }

      // Verwijder uit lokale state
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout bij verwijderen';
      setOperationError(msg);
      logger.error('deleteSubmission failed:', err);
      throw err;
    }
  };

  // Feedback zetten (migratie 026) — optimistic update van de lijst
  const setFeedback = async (
    id: string,
    feedback: { sticker: FeedbackSticker | null; level: number | null; text: string | null }
  ): Promise<void> => {
    setOperationError(null);
    await setSubmissionFeedbackRpc(id, feedback);
    const isCleared = !feedback.sticker && !feedback.level && !feedback.text?.trim();
    setSubmissions(prev => prev.map(s => s.id === id
      ? {
          ...s,
          feedback_sticker: feedback.sticker,
          feedback_level: feedback.level,
          feedback_text: feedback.text?.trim() || null,
          feedback_at: isCleared ? null : new Date().toISOString(),
        }
      : s));
  };

  // "Gezien"-stempel bij openen (fire-and-forget + optimistic)
  const markSeen = (id: string): void => {
    setSubmissions(prev => prev.map(s => s.id === id && !s.teacher_seen_at
      ? { ...s, teacher_seen_at: new Date().toISOString() }
      : s));
    void markSubmissionSeenRpc(id);
  };

  // Initial fetch
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return {
    submissions,
    loading,
    error,
    operationError,
    deleteSubmission,
    setFeedback,
    markSeen,
    refetch: fetchSubmissions,
  };
}

export default useSubmissions;
