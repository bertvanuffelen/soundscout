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
import { findStoryboardById, getTheme } from '../data/themes';
import i18n from '../i18n';
import type { Template, TemplateLockOptions, OpdrachtkaartContent } from '../types';
import { DEFAULT_LOCK_OPTIONS } from '../types';

// --- Types ---

/** Assignment type discriminator */
export type AssignmentType = 'template' | 'praatplaat' | 'storyboard' | 'free';

/** Storyboard-opdracht info (registry-content, opgelost uit storyboard_ref) */
export interface AssignmentStoryboard {
  /** Registry-id van het storyboard */
  ref: string;
  /** i18n-key voor de naam (component vertaalt) */
  nameKey: string;
  /** Cover-afbeelding voor preview */
  coverImage: string;
  /** Aantal scènes/afbeeldingen */
  imageCount: number;
  /** Thema dat impliciet volgt uit het storyboard */
  themeId: string;
}

/** Active assignment info returned by get_active_assignment RPC */
export interface ActiveAssignment {
  type: AssignmentType;
  classId: string;
  className: string;
  /** Vorm-onafhankelijke opdrachtkaart (null → toon per-type default) */
  card: OpdrachtkaartContent | null;
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
  // Storyboard fields (present when type = 'storyboard')
  storyboard?: AssignmentStoryboard;
  // Free-composition fields (present when type = 'free')
  free?: {
    /** Theme-registry-id waarin de leerling vrij componeert */
    themeId: string;
    /** Leesbare themanaam (vertaald) */
    themeName: string;
  };
}

/** Los een thema-registry-id op naar een leesbare naam (via i18n-key). */
function themeDisplayName(themeId: string | null | undefined): string {
  if (!themeId) return 'Vrije compositie';
  const theme = getTheme(themeId);
  return theme ? i18n.t(theme.name) : themeId;
}

/** Class assignment row for teacher dashboard */
export interface ClassAssignmentRow {
  id: string;
  classId: string;
  teacherId: string;
  type: AssignmentType;
  templateId: string | null;
  praatplaatId: string | null;
  storyboardRef: string | null;
  freeThemeId: string | null;
  isActive: boolean;
  activatedAt: string;
  // Joined / resolved names
  assignmentName: string;
  /** Preview-afbeelding: praatplaat-image (join), storyboard-cover of thema-map (registry); null bij template. */
  imageUrl: string | null;
}

/**
 * Los een storyboard-registry-ref op naar de velden die de opdracht-UI nodig heeft.
 * Retourneert null als de ref onbekend is (bv. storyboard verwijderd uit de registry).
 */
function resolveStoryboardRef(ref: string | null | undefined): AssignmentStoryboard | null {
  if (!ref) return null;
  const found = findStoryboardById(ref);
  if (!found) {
    logger.warn('Onbekende storyboard-ref in opdracht:', ref);
    return null;
  }
  return {
    ref,
    nameKey: found.storyboard.name,
    coverImage: found.storyboard.coverImage,
    imageCount: found.storyboard.images.length,
    themeId: found.themeId,
  };
}

/** Vertaal een storyboard-ref naar een leesbare naam (docent-dashboard). */
function storyboardDisplayName(ref: string | null | undefined): string {
  const resolved = resolveStoryboardRef(ref);
  return resolved ? i18n.t(resolved.nameKey) : 'Storyboard';
}

/** Valideer en normaliseer de opdrachtkaart uit een RPC-payload. */
function parseCard(raw: unknown): OpdrachtkaartContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { title?: unknown; bullets?: unknown };
  const title = typeof obj.title === 'string' ? obj.title : '';
  const bullets = Array.isArray(obj.bullets)
    ? obj.bullets.filter((b): b is string => typeof b === 'string').slice(0, 10)
    : [];
  if (!title && bullets.length === 0) return null;
  return { title, bullets };
}

/** Shape of Supabase joined relation select `template_id ( name )` / `praatplaat_id ( name, image_url )`.
 *  Supabase types FK joins as arrays, but `.maybeSingle()` returns a single object at runtime. */
interface JoinedName {
  name: string;
  image_url?: string | null;
}

/** Safely extract name from a Supabase FK join (typed as array, returned as object) */
function getJoinedName(data: JoinedName | JoinedName[] | null, fallback: string): string {
  if (!data) return fallback;
  if (Array.isArray(data)) return data[0]?.name || fallback;
  return data.name || fallback;
}

/** Safely extract image_url from a Supabase FK join (typed as array, returned as object) */
function getJoinedImage(data: JoinedName | JoinedName[] | null): string | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0]?.image_url ?? null;
  return data.image_url ?? null;
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

    // Nieuwe type-stabiele RPC-vorm: { assignment_type, payload, card, class_id, class_name }
    const row = data[0] as {
      assignment_type: AssignmentType;
      payload: Record<string, unknown> | null;
      card: unknown;
      class_id: string;
      class_name: string;
    };
    const payload = row.payload ?? {};
    const card = parseCard(row.card);

    if (row.assignment_type === 'template') {
      // Behoud runtime Zod-validatie op de template-compositie (sharpening #1)
      const compositionData = parseCompositionData(payload.composition_data);
      if (!compositionData) {
        logger.warn('Invalid composition_data in assignment template');
        return null;
      }

      return {
        type: 'template',
        classId: row.class_id,
        className: row.class_name,
        card,
        template: {
          id: String(payload.template_id ?? ''),
          name: (payload.name as string) || '',
          description: (payload.description as string) || undefined,
          teacherName: (payload.teacher_name as string) || '',
          compositionData,
          instructions: (payload.instructions as string) || undefined,
          lockOptions: parseLockOptions(payload.lock_options as TemplateLockOptions | null),
          createdAt: '',
        },
      };
    }

    if (row.assignment_type === 'praatplaat') {
      return {
        type: 'praatplaat',
        classId: row.class_id,
        className: row.class_name,
        card,
        praatplaat: {
          id: String(payload.praatplaat_id ?? ''),
          name: (payload.name as string) || '',
          imageUrl: (payload.image_url as string) || '',
          themeId: (payload.theme_id as string) || '',
          locationId: (payload.location_id as string) || '',
        },
      };
    }

    if (row.assignment_type === 'storyboard') {
      const storyboard = resolveStoryboardRef(payload.storyboard_ref as string);
      if (!storyboard) return null;
      return {
        type: 'storyboard',
        classId: row.class_id,
        className: row.class_name,
        card,
        storyboard,
      };
    }

    if (row.assignment_type === 'free') {
      const themeId = String(payload.free_theme_id ?? '');
      if (!themeId) return null;
      return {
        type: 'free',
        classId: row.class_id,
        className: row.class_name,
        card,
        free: { themeId, themeName: themeDisplayName(themeId) },
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
  opts: { templateId?: string; praatplaatId?: string; storyboardRef?: string; freeThemeId?: string; cardId?: string | null },
): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('activate_assignment', {
      p_class_id: classId,
      p_template_id: opts.templateId || null,
      p_praatplaat_id: opts.praatplaatId || null,
      p_storyboard_ref: opts.storyboardRef || null,
      p_card_id: opts.cardId || null,
      p_free_theme_id: opts.freeThemeId || null,
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
        assignment_type,
        template_id,
        praatplaat_id,
        storyboard_ref,
        free_theme_id,
        is_active,
        activated_at,
        templates:template_id ( name ),
        praatplaten:praatplaat_id ( name, image_url )
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

  return mapAssignmentRow(data as RawAssignmentRow);
}

/** Raw shape of a class_assignments select (met FK-joins). */
interface RawAssignmentRow {
  id: string;
  class_id: string;
  teacher_id: string;
  assignment_type: AssignmentType;
  template_id: string | null;
  praatplaat_id: string | null;
  storyboard_ref: string | null;
  free_theme_id: string | null;
  is_active: boolean;
  activated_at: string;
  templates: JoinedName | JoinedName[] | null;
  praatplaten: JoinedName | JoinedName[] | null;
}

/** Map een class_assignments-rij naar ClassAssignmentRow (type-geleide naam-resolutie). */
function mapAssignmentRow(row: RawAssignmentRow): ClassAssignmentRow {
  const type = row.assignment_type;
  let assignmentName: string;
  let imageUrl: string | null = null;
  if (type === 'template') {
    assignmentName = getJoinedName(row.templates, 'Template');
    // Template-preview vergt composition_data (niet in deze metadata-fetch) → geen image.
  } else if (type === 'praatplaat') {
    assignmentName = getJoinedName(row.praatplaten, 'Praatplaat');
    imageUrl = getJoinedImage(row.praatplaten);
  } else if (type === 'storyboard') {
    assignmentName = storyboardDisplayName(row.storyboard_ref);
    imageUrl = resolveStoryboardRef(row.storyboard_ref)?.coverImage ?? null;
  } else {
    // free: naam + preview volgen uit het thema (app-content)
    assignmentName = themeDisplayName(row.free_theme_id);
    imageUrl = (row.free_theme_id ? getTheme(row.free_theme_id)?.map.backgroundImage : null) ?? null;
  }

  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    type,
    templateId: row.template_id,
    praatplaatId: row.praatplaat_id,
    storyboardRef: row.storyboard_ref,
    freeThemeId: row.free_theme_id,
    isActive: row.is_active,
    activatedAt: row.activated_at,
    assignmentName,
    imageUrl,
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
        assignment_type,
        template_id,
        praatplaat_id,
        storyboard_ref,
        free_theme_id,
        is_active,
        activated_at,
        templates:template_id ( name ),
        praatplaten:praatplaat_id ( name, image_url )
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

  return (data as RawAssignmentRow[]).map(mapAssignmentRow);
}
