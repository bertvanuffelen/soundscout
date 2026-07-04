/**
 * Leskaart Helper Functies (lesson_cards)
 *
 * Een leskaart is een herbruikbaar "pakket": opdracht-type + resource
 * (template/praatplaat/storyboard/vrij-thema) + optionele opdrachtkaart +
 * presentatie-metadata. Bij activeren delegeert de `activate_lesson_card`-RPC
 * naar de bestaande activatie-RPC's (dunne preset — zie migratie 019).
 *
 * Docent-CRUD loopt via directe tabel-access onder RLS (zoals templates).
 * Ingebouwde leskaarten (teacher_id NULL) zijn read-only en worden meegeleverd.
 */

import { getSupabase } from './supabase';
import { withTimeout } from '../utils/withTimeout';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import type { AssignmentType } from './assignments';
import type { OpdrachtkaartContent } from '../types';

/** Eén fase van het creatief proces op een leskaart. */
export interface LessonPhase {
  name: string;
  text: string;
}

/** Een leskaart zoals de client die gebruikt (genormaliseerd uit de DB-rij). */
export interface LessonCard {
  id: string;
  /** true = ingebouwd (teacher_id NULL), read-only. */
  isBuiltin: boolean;
  builtinKey: string | null;
  assignmentType: AssignmentType;
  // Resource (precies één set gevuld, passend bij het type)
  templateId: string | null;
  praatplaatRef: string | null;
  ppThemeId: string | null;
  ppLocationId: string | null;
  ppImageUrl: string | null;
  storyboardRef: string | null;
  freeThemeId: string | null;
  // Opdrachtkaart (verwijzing OF inline)
  cardId: string | null;
  cardInline: OpdrachtkaartContent | null;
  // Presentatie-metadata (letterlijke tekst)
  title: string;
  level: string | null;
  lessonGoal: string | null;
  phases: LessonPhase[];
  coverImage: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

/** Invoer voor het aanmaken/bijwerken van een docent-eigen leskaart. */
export interface LessonCardInput {
  assignmentType: AssignmentType;
  templateId?: string | null;
  praatplaatRef?: string | null;
  ppThemeId?: string | null;
  ppLocationId?: string | null;
  ppImageUrl?: string | null;
  storyboardRef?: string | null;
  freeThemeId?: string | null;
  cardId?: string | null;
  cardInline?: OpdrachtkaartContent | null;
  title: string;
  level?: string | null;
  lessonGoal?: string | null;
  phases?: LessonPhase[];
  coverImage?: string | null;
  pdfUrl?: string | null;
}

const SELECT_COLS =
  'id, teacher_id, builtin_key, assignment_type, template_id, praatplaat_ref, pp_theme_id, pp_location_id, pp_image_url, storyboard_ref, free_theme_id, card_id, card_inline, title, level, lesson_goal, phases, cover_image, pdf_url, created_at';

interface RawLessonCard {
  id: string;
  teacher_id: string | null;
  builtin_key: string | null;
  assignment_type: AssignmentType;
  template_id: string | null;
  praatplaat_ref: string | null;
  pp_theme_id: string | null;
  pp_location_id: string | null;
  pp_image_url: string | null;
  storyboard_ref: string | null;
  free_theme_id: string | null;
  card_id: string | null;
  card_inline: unknown;
  title: string;
  level: string | null;
  lesson_goal: string | null;
  phases: unknown;
  cover_image: string | null;
  pdf_url: string | null;
  created_at: string;
}

/** Valideer een JSONB opdrachtkaart-inline. */
function parseCardInline(raw: unknown): OpdrachtkaartContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { title?: unknown; bullets?: unknown };
  const title = typeof obj.title === 'string' ? obj.title : '';
  const bullets = Array.isArray(obj.bullets)
    ? obj.bullets.filter((b): b is string => typeof b === 'string').slice(0, 10)
    : [];
  if (!title && bullets.length === 0) return null;
  return { title, bullets };
}

/** Valideer een JSONB fasen-array. */
function parsePhases(raw: unknown): LessonPhase[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is { name?: unknown; text?: unknown } => !!p && typeof p === 'object')
    .map((p) => ({
      name: typeof p.name === 'string' ? p.name : '',
      text: typeof p.text === 'string' ? p.text : '',
    }))
    .filter((p) => p.name || p.text)
    .slice(0, 12);
}

function mapRow(row: RawLessonCard): LessonCard {
  return {
    id: row.id,
    isBuiltin: row.teacher_id === null,
    builtinKey: row.builtin_key,
    assignmentType: row.assignment_type,
    templateId: row.template_id,
    praatplaatRef: row.praatplaat_ref,
    ppThemeId: row.pp_theme_id,
    ppLocationId: row.pp_location_id,
    ppImageUrl: row.pp_image_url,
    storyboardRef: row.storyboard_ref,
    freeThemeId: row.free_theme_id,
    cardId: row.card_id,
    cardInline: parseCardInline(row.card_inline),
    title: row.title,
    level: row.level,
    lessonGoal: row.lesson_goal,
    phases: parsePhases(row.phases),
    coverImage: row.cover_image,
    pdfUrl: row.pdf_url,
    createdAt: row.created_at,
  };
}

/** Snake-case payload voor insert/update (alleen relevante resource-velden). */
function toRow(input: LessonCardInput): Record<string, unknown> {
  return {
    assignment_type: input.assignmentType,
    template_id: input.templateId ?? null,
    praatplaat_ref: input.praatplaatRef ?? null,
    pp_theme_id: input.ppThemeId ?? null,
    pp_location_id: input.ppLocationId ?? null,
    pp_image_url: input.ppImageUrl ?? null,
    storyboard_ref: input.storyboardRef ?? null,
    free_theme_id: input.freeThemeId ?? null,
    card_id: input.cardId ?? null,
    card_inline: input.cardInline ?? null,
    title: input.title.trim(),
    level: input.level?.trim() || null,
    lesson_goal: input.lessonGoal?.trim() || null,
    phases: input.phases ?? [],
    cover_image: input.coverImage ?? null,
    pdf_url: input.pdfUrl?.trim() || null,
  };
}

/**
 * Haal alle leskaarten op die de docent mag zien: eigen + ingebouwd (RLS).
 * Sortering: ingebouwde eerst, daarna eigen (nieuwste eerst).
 */
export async function fetchLessonCards(): Promise<LessonCard[]> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase
      .from('lesson_cards')
      .select(SELECT_COLS)
      .order('created_at', { ascending: false }),
    15_000,
    'errors.networkTimeout',
  );

  if (error) {
    logger.error('Fout bij ophalen leskaarten:', sanitizeError(error));
    throw new Error('Kon leskaarten niet laden');
  }

  const cards = (data as RawLessonCard[] | null ?? []).map(mapRow);
  // Ingebouwde bovenaan, daarna eigen (behoud created_at-volgorde per groep)
  return cards.sort((a, b) => Number(b.isBuiltin) - Number(a.isBuiltin));
}

/** Maak een nieuwe docent-eigen leskaart aan. */
export async function createLessonCard(input: LessonCardInput): Promise<LessonCard> {
  const supabase = await getSupabase();
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    15_000,
    'errors.networkTimeout',
  );
  if (!user) throw new Error('Je moet ingelogd zijn');

  const { data, error } = await withTimeout(
    supabase
      .from('lesson_cards')
      .insert({ teacher_id: user.id, ...toRow(input) })
      .select(SELECT_COLS)
      .single(),
    20_000,
    'errors.networkTimeout',
  );

  if (error) {
    logger.error('Leskaart aanmaken mislukt:', sanitizeError(error));
    throw new Error('Kon leskaart niet aanmaken');
  }

  return mapRow(data as RawLessonCard);
}

/** Werk een bestaande docent-eigen leskaart bij. */
export async function updateLessonCard(id: string, input: LessonCardInput): Promise<LessonCard> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase
      .from('lesson_cards')
      .update(toRow(input))
      .eq('id', id)
      .select(SELECT_COLS)
      .single(),
    20_000,
    'errors.networkTimeout',
  );

  if (error) {
    logger.error('Leskaart bijwerken mislukt:', sanitizeError(error));
    throw new Error('Kon leskaart niet bijwerken');
  }

  return mapRow(data as RawLessonCard);
}

/** Verwijder een docent-eigen leskaart. */
export async function deleteLessonCard(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.from('lesson_cards').delete().eq('id', id),
    20_000,
    'errors.networkTimeout',
  );

  if (error) {
    logger.error('Leskaart verwijderen mislukt:', sanitizeError(error));
    throw new Error('Kon leskaart niet verwijderen');
  }
}

/**
 * Activeer een leskaart voor een klas. Delegeert server-side naar de juiste
 * activatie-RPC (template/praatplaat/storyboard/vrij) + opdrachtkaart.
 * @returns het class_assignments-id van de geactiveerde opdracht.
 */
export async function activateLessonCard(lessonCardId: string, classId: string): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('activate_lesson_card', {
      p_lesson_card_id: lessonCardId,
      p_class_id: classId,
    }),
    20_000,
    'errors.networkTimeout',
  );

  if (error) {
    logger.error('activate_lesson_card error:', sanitizeError(error));
    throw new Error('Kon leskaart niet activeren');
  }

  return data as string;
}
