/**
 * useClasses Hook
 *
 * Hook voor het beheren van klassen (CRUD operaties)
 * Alleen voor ingelogde docenten
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import { queryKeys } from '../query/queryKeys';
import { NO_USER, errorMessage, updateCached, useManualRefetch, useTeacherId } from '../query/cache';

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
  operationError: string | null;
  maxClasses: number | null; // null = onbeperkt
  canCreateClass: boolean;
  createClass: (name: string) => Promise<TeacherClass>;
  deleteClass: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/** Row shape returned from Supabase classes query with submission count */
interface ClassRow {
  id: string;
  name: string;
  code: string;
  created_at: string;
  is_active: boolean;
  submissions?: { count: number }[];
}

/**
 * Hook voor het beheren van klassen
 */
// Default limiet voor gratis gebruikers
const DEFAULT_MAX_CLASSES = 8;

interface ClassesData {
  classes: TeacherClass[];
  maxClasses: number | null;
}

/** Klassen van de ingelogde docent + de max_classes-limiet (één laadbeurt). */
async function fetchClasses(previousMax: number | null): Promise<ClassesData> {
  const supabase = await getSupabase();

  // Haal huidige user op voor teacher info
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { classes: [], maxClasses: previousMax };

  // Haal max_classes op van de teacher
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('max_classes')
    .eq('id', user.id)
    .single();

  // Geen teacher-rij: de vorige waarde blijft staan (zoals voorheen)
  const maxClasses = teacherData ? (teacherData.max_classes ?? DEFAULT_MAX_CLASSES) : previousMax;

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
  const classes = (data || []).map((c: ClassRow) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    created_at: c.created_at,
    is_active: c.is_active,
    submission_count: c.submissions?.[0]?.count || 0,
  }));

  return { classes, maxClasses };
}

const NO_CLASSES: TeacherClass[] = [];

export function useClasses(): UseClassesReturn {
  const client = useQueryClient();
  const userId = useTeacherId();
  const key = queryKeys.teacher.classes(userId ?? NO_USER);
  const [operationError, setOperationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    enabled: userId !== null,
    queryFn: async () => {
      try {
        const previous = client.getQueryData<ClassesData>(key);
        return await fetchClasses(previous ? previous.maxClasses : DEFAULT_MAX_CLASSES);
      } catch (err) {
        logger.error('Fout bij ophalen klassen:', err);
        throw err;
      }
    },
  });
  const { refetching, refetch } = useManualRefetch(query.refetch);

  const classes = query.data?.classes ?? NO_CLASSES;
  const maxClasses = query.data ? query.data.maxClasses : DEFAULT_MAX_CLASSES;

  // Maak nieuwe klas aan
  const createMutation = useMutation({
    mutationFn: async (name: string): Promise<TeacherClass> => {
      const supabase = await getSupabase();

      // Check klassen limiet (null = onbeperkt) — tegen de stand van nu
      const current = client.getQueryData<ClassesData>(key);
      const limit = current ? current.maxClasses : DEFAULT_MAX_CLASSES;
      const count = current?.classes.length ?? 0;
      if (limit !== null && count >= limit) {
        throw new Error(i18n.t('errors.classes.limitReached', { count: limit }));
      }

      // Genereer unieke code via database functie
      const { data: codeData, error: codeError } = await supabase.rpc('generate_class_code');

      if (codeError) {
        throw new Error(i18n.t('errors.classes.code'));
      }

      if (typeof codeData !== 'string' || !codeData) {
        throw new Error(i18n.t('errors.classes.codeInvalid'));
      }

      const code = codeData;

      // Haal huidige user op
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(i18n.t('errors.classes.notLoggedIn'));
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
        throw new Error(i18n.t('errors.classes.create') + ': ' + insertError.message);
      }

      return {
        id: data.id,
        name: data.name,
        code: data.code,
        created_at: data.created_at,
        is_active: data.is_active,
        submission_count: 0,
      };
    },
    onMutate: () => setOperationError(null),
    // Pas ná een geslaagde aanmaak in de lijst (bovenaan) — niet vooruitlopend
    onSuccess: (newClass) =>
      updateCached<ClassesData>(client, key, (prev) => ({
        maxClasses: prev ? prev.maxClasses : DEFAULT_MAX_CLASSES,
        classes: [newClass, ...(prev?.classes ?? [])],
      })),
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.classes.create')));
      logger.error('createClass failed:', err);
    },
  });

  // Verwijder klas
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const supabase = await getSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(i18n.t('errors.notLoggedIn'));

      const { error: deleteErr } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id);

      if (deleteErr) {
        throw new Error(i18n.t('errors.classes.delete') + ': ' + deleteErr.message);
      }
    },
    onMutate: () => setOperationError(null),
    onSuccess: async (_void, id) => {
      await updateCached<ClassesData>(client, key, (prev) =>
        prev ? { ...prev, classes: prev.classes.filter((c) => c.id !== id) } : prev);
      // De inzendingen en opdracht van deze klas hoeven niet in het geheugen te blijven
      if (userId) client.removeQueries({ queryKey: queryKeys.teacher.class(userId, id) });
    },
    onError: (err) => {
      setOperationError(errorMessage(err, i18n.t('errors.classes.delete')));
      logger.error('deleteClass failed:', err);
    },
  });

  const { mutateAsync: createAsync } = createMutation;
  const { mutateAsync: deleteAsync } = deleteMutation;
  const createClass = useCallback((name: string) => createAsync(name), [createAsync]);
  const deleteClass = useCallback((id: string) => deleteAsync(id), [deleteAsync]);

  // Bereken of er nog klassen aangemaakt mogen worden
  const canCreateClass = maxClasses === null || classes.length < maxClasses;

  return {
    classes,
    loading: userId !== null && (query.isPending || refetching),
    error: query.error && !refetching ? errorMessage(query.error, i18n.t('errors.classes.load')) : null,
    operationError,
    maxClasses,
    canCreateClass,
    createClass,
    deleteClass,
    refetch,
  };
}

export default useClasses;
