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
  maxClasses: number | null; // null = onbeperkt
  canCreateClass: boolean;
  createClass: (name: string) => Promise<TeacherClass>;
  deleteClass: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook voor het beheren van klassen
 */
// Default limiet voor gratis gebruikers
const DEFAULT_MAX_CLASSES = 8;

export function useClasses(): UseClassesReturn {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxClasses, setMaxClasses] = useState<number | null>(DEFAULT_MAX_CLASSES);

  // Fetch alle klassen van de ingelogde docent + max_classes limiet
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Haal huidige user op voor teacher info
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Haal max_classes op van de teacher
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('max_classes')
        .eq('id', user.id)
        .single();

      // null = onbeperkt, undefined = gebruik default
      if (teacherData) {
        setMaxClasses(teacherData.max_classes ?? DEFAULT_MAX_CLASSES);
      }

      // Haal klassen op van DEZE docent met aantal submissions
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select(`
          *,
          submissions:submissions(count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data: voeg submission_count toe
      const classesWithCount = (data || []).map((c: { id: string; name: string; code: string; created_at: string; is_active: boolean; submissions?: { count: number }[] }) => ({
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
    // Check klassen limiet (null = onbeperkt)
    if (maxClasses !== null && classes.length >= maxClasses) {
      throw new Error(
        `Je hebt het maximum van ${maxClasses} klassen bereikt. ` +
        `Verwijder een bestaande klas om een nieuwe aan te maken.`
      );
    }

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

  // Bereken of er nog klassen aangemaakt mogen worden
  const canCreateClass = maxClasses === null || classes.length < maxClasses;

  return {
    classes,
    loading,
    error,
    maxClasses,
    canCreateClass,
    createClass,
    deleteClass,
    refetch: fetchClasses,
  };
}

export default useClasses;
