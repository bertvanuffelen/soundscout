/**
 * albums - Supabase-client voor het klas-album (R4, migratie 031)
 *
 * Eén deelbare 8-karakter code per klas-opdracht: publiek toont die alle
 * formeel ingeleverde composities van de opdracht in het presentatiescherm
 * (bij een praatplaat-opdracht als klikbaar bord). Patroon gelijk aan
 * de praatplaat-share in src/lib/praatplaat.ts.
 */

import { getSupabase } from './supabase';
import { withTimeout } from '../utils/withTimeout';
import { parseCompositionData } from '../utils/schemas';
import { matchesError, ERR_RATE_LIMIT } from './supabaseErrors';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import type { CompositionData } from '../types';
import type { AssignmentType } from './assignments';

export interface SharedAlbumData {
  class_name: string;
  assignment_type: AssignmentType;
  /** Naam van de opdracht (praatplaat/template); storyboard/free resolvet de client via de refs */
  assignment_name: string | null;
  /** Praatplaat-afbeelding (alleen bij praatplaat-opdrachten) */
  image_url: string | null;
  storyboard_ref: string | null;
  free_theme_id: string | null;
  submissions: Array<{
    id: string;
    student_name: string;
    composition_name: string;
    composition_data: CompositionData;
    position_x: number | null;
    position_y: number | null;
    created_at: string;
  }>;
}

/**
 * Genereer (of verleng) de album-deelcode voor een klas-opdracht (docent).
 */
export async function shareClassAlbum(assignmentId: string): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('share_class_album', {
      p_assignment_id: assignmentId,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij delen klas-album:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('album.shareError'));
  }

  return data as string;
}

/**
 * Haal een gedeeld klas-album op via de deelcode (publiek, geen auth).
 * null = niet gevonden; gooit bij verlopen link (boodschap bevat 'verlopen').
 */
export async function getSharedClassAlbum(code: string): Promise<SharedAlbumData | null> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('get_shared_class_album', {
      p_code: code.trim().toUpperCase(),
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij ophalen gedeeld album:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    // Verlopen expliciet doorgeven zodat de viewer de juiste staat toont
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('verlopen') || msg.includes('expired')) {
      throw new Error(msg);
    }
    return null;
  }

  if (!data) return null;

  // Validate composition_data per submission (zelfde bescherming als praatplaat)
  const result = data as SharedAlbumData;
  result.submissions = result.submissions.filter((sub) => {
    const compositionData = parseCompositionData(sub.composition_data);
    if (!compositionData) {
      logger.warn('Shared album submission data validation failed', { id: sub.id });
      return false;
    }
    sub.composition_data = compositionData;
    return true;
  });

  return result;
}
