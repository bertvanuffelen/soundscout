/**
 * Assignment Helper Functies (Opdrachten-architectuur)
 *
 * Unified systeem voor het activeren van opdrachten (templates en praatplaten)
 * per klas. Leerlingen voeren klascode in → systeem bepaalt actieve opdracht.
 *
 * - getActiveAssignment: publiek, voor leerlingen (via RPC)
 * - activateAssignment / deactivateAssignment: voor docenten (via RPC)
 * - fetchClassAssignment: voor docenten dashboard (direct table)
 */

import { getSupabase } from './supabase';
import { withTimeout } from '../utils/withTimeout';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import { parseCompositionData } from '../utils/schemas';
import type { Template, TemplateLockOptions } from '../types';
import { DEFAULT_LOCK_OPTIONS } from '../types';

// --- Types ---

/** Assignment type discriminator */
export type AssignmentType = 'template' | 'praatplaat';

/** Active assignment info returned by get_active_assignment RPC */
export interface ActiveAssignment {
  type: AssignmentType;
  classId: string;
  className: string;
  // Template fields (present when type = 'template')
  template?: Template;
  // Praatplaat fields (present when type = 'praatplaat')
  praatplaat?: {
    id: string;
    name: string;
    imageUrl: string;
    themeId: string;
    locationId: string;
  };
}

/** Class assignment row for teacher dashboard */
export interface ClassAssignmentRow {
  id: string;
  classId: string;
  teacherId: string;
  type: AssignmentType;
  templateId: string | null;
  praatplaatId: string | null;
  isActive: boolean;
  activatedAt: string;
  // Joined names
  assignmentName: string;
}

/** Shape of Supabase joined relation select `template_id ( name )` / `praatplaat_id ( name )`.
 *  Supabase types FK joins as arrays, but `.maybeSingle()` returns a single object at runtime. */
interface JoinedName {
  name: string;
}

/** Safely extract name from a Supabase FK join (typed as array, returned as object) */
function getJoinedName(data: JoinedName | JoinedName[] | null, fallback: string): string {
  if (!data) return fallback;
  if (Array.isArray(data)) return data[0]?.name || fallback;
  return data.name || fallback;
}

// --- Lock options parsing (shared with templates.ts) ---

function parseLockOptions(lockOptions: TemplateLockOptions | null | undefined): TemplateLockOptions {
  if (lockOptions && typeof lockOptions === 'object') {
    return {
      clipsLocked: lockOptions.clipsLocked ?? DEFAULT_LOCK_OPTIONS.clipsLocked,
      sectionsLocked: lockOptions.sectionsLocked ?? DEFAULT_LOCK_OPTIONS.sectionsLocked,
      libraryLocked: lockOptions.libraryLocked ?? DEFAULT_LOCK_OPTIONS.libraryLocked,
      allowNewClips: lockOptions.allowNewClips ?? DEFAULT_LOCK_OPTIONS.allowNewClips,
    };
  }
  return { ...DEFAULT_LOCK_OPTIONS };
}

// --- Public (leerling) ---

/**
 * Haal de actieve opdracht op voor een klascode.
 * Retourneert null als er geen actieve opdracht is.
 */
export async function getActiveAssignment(classCode: string): Promise<ActiveAssignment | null> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await withTimeout(
      supabase.rpc('get_active_assignment', {
        p_class_code: classCode.trim().toUpperCase(),
      }),
      15_000,
      'errors.networkTimeout'
    );

    if (error) {
      logger.error('get_active_assignment error:', sanitizeError(error));
      return null;
    }

    if (!data || data.length === 0) return null;

    const row = data[0];

    if (row.assignment_type === 'template') {
      // Parse composition data via Zod
      const compositionData = parseCompositionData(row.composition_data);
      if (!compositionData) {
        logger.warn('Invalid composition_data in assignment template');
        return null;
      }

      return {
        type: 'template',
        classId: row.class_id,
        className: row.class_name,
        template: {
          id: row.template_id,
          name: row.template_name || '',
          description: row.template_description || undefined,
          teacherName: row.template_teacher_name || '',
          compositionData,
          instructions: row.instructions || undefined,
          lockOptions: parseLockOptions(row.lock_options),
          createdAt: '',
        },
      };
    }

    if (row.assignment_type === 'praatplaat') {
      return {
        type: 'praatplaat',
        classId: row.class_id,
        className: row.class_name,
        praatplaat: {
          id: row.praatplaat_id,
          name: row.praatplaat_name || '',
          imageUrl: row.image_url || '',
          themeId: row.theme_id || '',
          locationId: row.location_id || '',
        },
      };
    }

    return null;
  } catch (err) {
    logger.error('getActiveAssignment failed:', err);
    return null;
  }
}

// --- Docent ---

/**
 * Activeer een opdracht voor een klas.
 * Deactiveert automatisch de huidige opdracht (via DB trigger).
 */
export async function activateAssignment(
  classId: string,
  templateId?: string,
  praatplaatId?: string,
): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('activate_assignment', {
      p_class_id: classId,
      p_template_id: templateId || null,
      p_praatplaat_id: praatplaatId || null,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('activate_assignment error:', sanitizeError(error));
    throw new Error('Kon opdracht niet activeren');
  }

  return data as string;
}

/**
 * Deactiveer de actieve opdracht voor een klas.
 */
export async function deactivateAssignment(classId: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.rpc('deactivate_class_assignment', {
      p_class_id: classId,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('deactivate_class_assignment error:', sanitizeError(error));
    throw new Error('Kon opdracht niet deactiveren');
  }
}

/**
 * Haal de actieve opdracht op voor een klas (docent-zijde, via direct table query).
 * Retourneert null als er geen actieve opdracht is.
 */
export async function fetchClassAssignment(classId: string): Promise<ClassAssignmentRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase
      .from('class_assignments')
      .select(`
        id,
        class_id,
        teacher_id,
        template_id,
        praatplaat_id,
        is_active,
        activated_at,
        templates:template_id ( name ),
        praatplaten:praatplaat_id ( name )
      `)
      .eq('class_id', classId)
      .eq('is_active', true)
      .maybeSingle(),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('fetchClassAssignment error:', sanitizeError(error));
    return null;
  }

  if (!data) return null;

  // Determine type and name from joined data
  const type: AssignmentType = data.template_id ? 'template' : 'praatplaat';
  const assignmentName = type === 'template'
    ? getJoinedName(data.templates as JoinedName | JoinedName[] | null, 'Template')
    : getJoinedName(data.praatplaten as JoinedName | JoinedName[] | null, 'Praatplaat');

  return {
    id: data.id,
    classId: data.class_id,
    teacherId: data.teacher_id,
    type,
    templateId: data.template_id,
    praatplaatId: data.praatplaat_id,
    isActive: data.is_active,
    activatedAt: data.activated_at,
    assignmentName,
  };
}

/**
 * Haal eerdere (gedeactiveerde) opdrachten op voor een klas.
 * Gesorteerd op activated_at (nieuwste eerst).
 */
export async function fetchPastAssignments(classId: string): Promise<ClassAssignmentRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase
      .from('class_assignments')
      .select(`
        id,
        class_id,
        teacher_id,
        template_id,
        praatplaat_id,
        is_active,
        activated_at,
        templates:template_id ( name ),
        praatplaten:praatplaat_id ( name )
      `)
      .eq('class_id', classId)
      .eq('is_active', false)
      .order('activated_at', { ascending: false }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('fetchPastAssignments error:', sanitizeError(error));
    return [];
  }

  if (!data) return [];

  return data.map((row) => {
    const type: AssignmentType = row.template_id ? 'template' : 'praatplaat';
    const assignmentName = type === 'template'
      ? getJoinedName(row.templates as JoinedName | JoinedName[] | null, 'Template')
      : getJoinedName(row.praatplaten as JoinedName | JoinedName[] | null, 'Praatplaat');

    return {
      id: row.id,
      classId: row.class_id,
      teacherId: row.teacher_id,
      type,
      templateId: row.template_id,
      praatplaatId: row.praatplaat_id,
      isActive: row.is_active,
      activatedAt: row.activated_at,
      assignmentName,
    };
  });
}
