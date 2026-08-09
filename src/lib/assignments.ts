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
import { findStoryboardById, getTheme, getMapBackgroundImage } from '../data/themes';
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

/** Peer-review-instelling van een opdracht (migratie 027/028) */
export interface PeerReviewConfig {
  /** Titel van de gekozen feedbackkaart */
  cardTitle: string;
  /** Criteria van de feedbackkaart (leerlingen geven 1-3 sterren per criterium) */
  chips: string[];
  /** Automatische sluittijd van de feedbackronde (null = geen timer) */
  closesAt?: string | null;
}

/** Active assignment info returned by get_active_assignment RPC */
export interface ActiveAssignment {
  type: AssignmentType;
  classId: string;
  className: string;
  /** Vorm-onafhankelijke opdrachtkaart (null → toon per-type default) */
  card: OpdrachtkaartContent | null;
  /** Peer-review ("klasgenoten luisteren") — null als uitgeschakeld */
  peerReview: PeerReviewConfig | null;
  /** Optionele tijdsduur-vermelding van de docent (migratie 033), bijv. "2 lessen" */
  durationLabel: string | null;
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
  /** Optionele tijdsduur-vermelding voor leerlingen (migratie 033) */
  durationLabel: string | null;
  /** Gekoppelde opdrachtkaart (migratie 016), null = per-type default. */
  cardId: string | null;
  /** Thema-geluidenpalet van de praatplaat (alleen bij type praatplaat). */
  praatplaatThemeId: string | null;
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
  theme_id?: string | null;
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

/** Safely extract theme_id from a Supabase FK join (typed as array, returned as object) */
function getJoinedTheme(data: JoinedName | JoinedName[] | null): string | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0]?.theme_id ?? null;
  return data.theme_id ?? null;
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

    // Nieuwe type-stabiele RPC-vorm: { assignment_type, payload, card, class_id, class_name, peer_review }
    const row = data[0] as {
      assignment_type: AssignmentType;
      payload: Record<string, unknown> | null;
      card: unknown;
      class_id: string;
      class_name: string;
      peer_review?: { enabled?: boolean; card_title?: string; chips?: unknown; closes_at?: string | null } | null;
    };
    const payload = row.payload ?? {};
    const card = parseCard(row.card);
    // Tijdsduur-vermelding (migratie 033) — ontbreekt op oudere databases
    const durationLabel = typeof payload.duration_label === 'string' && payload.duration_label.trim()
      ? payload.duration_label
      : null;
    // Peer-review (migratie 027/028) — kolom ontbreekt op oudere databases
    const peerReview: PeerReviewConfig | null =
      row.peer_review?.enabled && Array.isArray(row.peer_review.chips)
        ? {
            cardTitle: String(row.peer_review.card_title ?? ''),
            chips: (row.peer_review.chips as unknown[]).map(String).filter(Boolean),
            closesAt: row.peer_review.closes_at ?? null,
          }
        : null;

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
        peerReview,
        durationLabel,
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
        peerReview,
        durationLabel,
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
        peerReview,
        durationLabel,
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
        peerReview,
        durationLabel,
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
    throw new Error(i18n.t('errors.assignments.activate'));
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
    throw new Error(i18n.t('errors.assignments.deactivate'));
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
        duration_label,
        card_id,
        templates:template_id ( name ),
        praatplaten:praatplaat_id ( name, image_url, theme_id )
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
  duration_label?: string | null;
  card_id?: string | null;
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
    const vrijThema = row.free_theme_id ? getTheme(row.free_theme_id) : undefined;
    imageUrl = vrijThema ? getMapBackgroundImage(vrijThema.map, i18n.language) : null;
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
    durationLabel: row.duration_label ?? null,
    cardId: row.card_id ?? null,
    praatplaatThemeId: type === 'praatplaat' ? getJoinedTheme(row.praatplaten) : null,
    assignmentName,
    imageUrl,
  };
}

/**
 * Zet of wis de tijdsduur-vermelding op een opdracht (migratie 033).
 * Docent-eigendom wordt afgedwongen door de UPDATE-RLS-policy (006).
 */
export async function updateAssignmentDuration(
  assignmentId: string,
  durationLabel: string | null,
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('class_assignments')
    .update({ duration_label: durationLabel?.trim() || null })
    .eq('id', assignmentId);
  if (error) {
    logger.error('updateAssignmentDuration error:', sanitizeError(error));
    throw new Error(i18n.t('errors.assignments.duration'));
  }
}

/**
 * Koppel of ontkoppel een opdrachtkaart op een actieve opdracht (migratie 016).
 * `null` = geen kaart → de leerling ziet de per-type default. Docent-eigendom
 * wordt afgedwongen door de UPDATE-RLS-policy (006). Testronde 5 (TR5#2).
 */
export async function updateAssignmentCard(
  assignmentId: string,
  cardId: string | null,
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('class_assignments')
    .update({ card_id: cardId })
    .eq('id', assignmentId);
  if (error) {
    logger.error('updateAssignmentCard error:', sanitizeError(error));
    throw new Error(i18n.t('errors.assignments.card'));
  }
}

/**
 * Haal een afgeronde opdracht uit de historie van een klas.
 *
 * Verwijdert alléén de class_assignments-regel: het leerlingwerk blijft staan
 * (submissions hangen aan de klas, niet aan deze rij) en blijft zichtbaar bij
 * de inzendingen. Bewust niet-destructief — opruimen van je overzicht en
 * leerlingwerk weggooien horen twee verschillende dingen te zijn.
 *
 * De is_active-klem maakt het onmogelijk om via deze weg de lopende opdracht
 * te wissen; de historie toont sowieso alleen inactieve rijen.
 */
export async function deleteAssignmentFromHistory(assignmentId: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('class_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('is_active', false);
  if (error) {
    logger.error('deleteAssignmentFromHistory error:', sanitizeError(error));
    throw new Error(i18n.t('errors.assignments.delete'));
  }
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

/**
 * Hoort een inzending bij deze opdracht(-rij)? (I5/I8, testronde 4)
 *
 * Match per type op de bijbehorende koppeling die submit_composition wegschrijft:
 * template/praatplaat via UUID (assignment_id; praatplaat legacy ook praatplaat_id),
 * storyboard/free via tekst-ref (assignment_ref, migratie 015/018).
 */
export function submissionMatchesAssignment(
  submission: {
    assignment_id?: string | null;
    assignment_ref?: string | null;
    praatplaat_id?: string | null;
  },
  assignment: Pick<ClassAssignmentRow, 'type' | 'templateId' | 'praatplaatId' | 'storyboardRef' | 'freeThemeId'>
): boolean {
  switch (assignment.type) {
    case 'template':
      return !!assignment.templateId && submission.assignment_id === assignment.templateId;
    case 'praatplaat':
      return !!assignment.praatplaatId
        && (submission.praatplaat_id === assignment.praatplaatId
          || submission.assignment_id === assignment.praatplaatId);
    case 'storyboard':
      return !!assignment.storyboardRef && submission.assignment_ref === assignment.storyboardRef;
    case 'free':
      return !!assignment.freeThemeId && submission.assignment_ref === assignment.freeThemeId;
  }
}
