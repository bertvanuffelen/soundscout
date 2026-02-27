/**
 * useSubmissions Hook
 *
 * Hook voor het ophalen en beheren van inzendingen (submissions) per klas
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { CompositionData } from '../types';

// Types
export interface Submission {
  id: string;
  student_name: string;
  composition_name: string;
  composition_data: CompositionData;
  created_at: string;
}

interface UseSubmissionsReturn {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  operationError: string | null;
  deleteSubmission: (id: string) => Promise<void>;
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

      const { data, error: fetchError } = await supabase
        .from('submissions')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSubmissions(data || []);
    } catch (err) {
      logger.error('Fout bij ophalen composities:', err);
      setError(err instanceof Error ? err.message : 'Kon composities niet laden');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  // Verwijder submission
  const deleteSubmission = async (id: string): Promise<void> => {
    try {
      setOperationError(null);

      const { error: deleteErr } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (deleteErr) {
        throw new Error('Kon compositie niet verwijderen: ' + deleteErr.message);
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
    refetch: fetchSubmissions,
  };
}

export default useSubmissions;
