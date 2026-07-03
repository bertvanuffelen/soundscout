/**
 * Opdrachtkaart Helper Functies (assignment_cards)
 *
 * Vorm-onafhankelijke instructiekaarten (titel + max ~10 bullets) die de docent
 * samenstelt, bewaart in een herbruikbare bibliotheek en aan een opdracht koppelt.
 *
 * Docent-CRUD loopt via directe tabel-access onder RLS (zoals templates); er is
 * geen publieke RPC — de kaart bereikt de leerling via get_active_assignment.
 */

import { getSupabase } from './supabase';
import { withTimeout } from '../utils/withTimeout';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import type { Opdrachtkaart } from '../types';

/** Max aantal bullets per kaart (spiegelt de DB-CHECK in migratie 016). */
export const MAX_CARD_BULLETS = 10;

export interface CreateCardParams {
  title: string;
  bullets: string[];
}

/** Normaliseer een ruwe DB-rij naar een Opdrachtkaart. */
function mapRow(row: {
  id: string;
  title: string;
  bullets: unknown;
  is_active: boolean | null;
  created_at: string;
}): Opdrachtkaart {
  const bullets = Array.isArray(row.bullets)
    ? row.bullets.filter((b): b is string => typeof b === 'string').slice(0, MAX_CARD_BULLETS)
    : [];
  return {
    id: row.id,
    title: row.title,
    bullets,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

/** Trim + begrens de bullets voor opslag. */
function sanitizeBullets(bullets: string[]): string[] {
  return bullets
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .slice(0, MAX_CARD_BULLETS);
}

/** Haal alle opdrachtkaarten van de ingelogde docent op. */
export async function fetchTeacherCards(): Promise<Opdrachtkaart[]> {
  const supabase = await getSupabase();
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    15_000,
    'errors.networkTimeout'
  );
  if (!user) return [];

  const { data, error } = await withTimeout(
    supabase
      .from('assignment_cards')
      .select('id, title, bullets, is_active, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij ophalen opdrachtkaarten:', sanitizeError(error));
    throw new Error('Kon opdrachtkaarten niet laden');
  }

  return (data || []).map(mapRow);
}

/** Maak een nieuwe opdrachtkaart aan. */
export async function createCard(params: CreateCardParams): Promise<Opdrachtkaart> {
  const supabase = await getSupabase();
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    15_000,
    'errors.networkTimeout'
  );
  if (!user) throw new Error('Je moet ingelogd zijn');

  const { data, error } = await withTimeout(
    supabase
      .from('assignment_cards')
      .insert({
        teacher_id: user.id,
        title: params.title.trim(),
        bullets: sanitizeBullets(params.bullets),
      })
      .select('id, title, bullets, is_active, created_at')
      .single(),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Opdrachtkaart aanmaken mislukt:', sanitizeError(error));
    throw new Error('Kon opdrachtkaart niet aanmaken');
  }

  return mapRow(data);
}

/** Werk een bestaande opdrachtkaart bij. */
export async function updateCard(id: string, params: CreateCardParams): Promise<Opdrachtkaart> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase
      .from('assignment_cards')
      .update({
        title: params.title.trim(),
        bullets: sanitizeBullets(params.bullets),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, title, bullets, is_active, created_at')
      .single(),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Opdrachtkaart bijwerken mislukt:', sanitizeError(error));
    throw new Error('Kon opdrachtkaart niet bijwerken');
  }

  return mapRow(data);
}

/** Verwijder een opdrachtkaart. */
export async function deleteCard(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.from('assignment_cards').delete().eq('id', id),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Opdrachtkaart verwijderen mislukt:', sanitizeError(error));
    throw new Error('Kon opdrachtkaart niet verwijderen');
  }
}
