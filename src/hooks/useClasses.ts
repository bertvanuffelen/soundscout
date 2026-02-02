/**
 * useClasses Hook
 *
 * Hook voor het beheren van klassen (CRUD operaties)
 * Alleen voor ingelogde docenten
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Types
export interface TeacherClass {
  id: string;
  name: string;
  code: string;
  created_at: string;
  is_active: boolean;
  submission_count?: number;
}

interface UseClassesReturn {
  classes: TeacherClass[];
  loading: boolean;
  error: string | null;
  createClass: (name: string) => Promise<TeacherClass>;
  deleteClass: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook voor het beheren van klassen
 */
export function useClasses(): UseClassesReturn {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch alle klassen van de ingelogde docent
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Haal klassen op met aantal submissions
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select(`
          *,
          submissions:submissions(count)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data: voeg submission_count toe
      const classesWithCount = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        created_at: c.created_at,
        is_active: c.is_active,
        submission_count: c.submissions?.[0]?.count || 0,
      }));

      setClasses(classesWithCount);
    } catch (err) {
      console.error('Fout bij ophalen klassen:', err);
      setError(err instanceof Error ? err.message : 'Kon klassen niet laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Maak nieuwe klas aan
  const createClass = async (name: string): Promise<TeacherClass> => {
    // Genereer unieke code via database functie
    const { data: codeData, error: codeError } = await supabase.rpc('generate_class_code');

    if (codeError) {
      throw new Error('Kon klas-code niet genereren');
    }

    const code = codeData as string;

    // Haal huidige user op
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Je moet ingelogd zijn om een klas aan te maken');
    }

    // Maak klas aan
    const { data, error: insertError } = await supabase
      .from('classes')
      .insert({
        teacher_id: user.id,
        name: name.trim(),
        code,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Kon klas niet aanmaken: ' + insertError.message);
    }

    // Voeg toe aan lokale state
    const newClass: TeacherClass = {
      id: data.id,
      name: data.name,
      code: data.code,
      created_at: data.created_at,
      is_active: data.is_active,
      submission_count: 0,
    };

    setClasses(prev => [newClass, ...prev]);

    return newClass;
  };

  // Verwijder klas
  const deleteClass = async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error('Kon klas niet verwijderen: ' + deleteError.message);
    }

    // Verwijder uit lokale state
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  // Initial fetch
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return {
    classes,
    loading,
    error,
    createClass,
    deleteClass,
    refetch: fetchClasses,
  };
}

export default useClasses;
