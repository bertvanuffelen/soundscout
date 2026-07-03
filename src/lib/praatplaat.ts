/**
 * Praatplaat Helper Functies (#72)
 *
 * Client-side functies voor het beheren van praatplaten (docenten)
 * en het ophalen/insturen van praatplaat-composities (leerlingen).
 */

import { getSupabase } from './supabase';
import { ERR_RATE_LIMIT, matchesError } from './supabaseErrors';
import { withTimeout } from '../utils/withTimeout';
import { generateRandomDutchName } from '../utils/randomNames';
import { sanitizeError } from '../utils/errorSanitize';
import { parseCompositionData } from '../utils/schemas';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import type { CompositionData } from '../types';

// --- Types ---

export interface PraatplaatRow {
  id: string;
  class_id: string | null;
  teacher_id: string;
  name: string;
  theme_id: string;
  location_id: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export interface PraatplaatSubmission {
  id: string;
  student_name: string;
  composition_name: string;
  composition_data: CompositionData;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface ActivePraatplaatInfo {
  praatplaatId: string;
  praatplaatName: string;
  imageUrl: string;
  themeId: string;
  locationId: string;
  classId: string;
  className: string;
}

// --- Docent functies (vereisen auth) ---

/**
 * Maak een nieuwe praatplaat aan voor een klas.
 */
export async function createPraatplaat(params: {
  classId?: string;
  name: string;
  themeId: string;
  locationId: string;
  imageUrl: string;
}): Promise<string> {
  const { classId, name, themeId, locationId, imageUrl } = params;
  const supabase = await getSupabase();

  const rpcParams: Record<string, unknown> = {
    p_name: name.trim(),
    p_theme_id: themeId,
    p_location_id: locationId,
    p_image_url: imageUrl,
  };
  if (classId) rpcParams.p_class_id = classId;

  const { data, error } = await withTimeout(
    supabase.rpc('create_praatplaat', rpcParams),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij aanmaken praatplaat:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.createError'));
  }

  return data as string;
}

/**
 * Activeer een praatplaat uit de catalogus voor een klas.
 * Vindt-of-maakt één praatplaat-instance per (klas + afbeelding) en activeert die
 * als opdracht. Retourneert het class_assignments-id.
 */
export async function activatePraatplaatFromCatalog(
  classId: string,
  entry: { name: string; themeId: string; locationId: string; imageUrl: string },
  cardId?: string | null,
): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('activate_praatplaat_from_catalog', {
      p_class_id: classId,
      p_name: entry.name.trim(),
      p_theme_id: entry.themeId,
      p_location_id: entry.locationId,
      p_image_url: entry.imageUrl,
      p_card_id: cardId || null,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij activeren praatplaat uit catalogus:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.createError'));
  }

  return data as string;
}

/**
 * Activeer een praatplaat (deactiveert automatisch andere praatplaten van dezelfde klas).
 */
export async function activatePraatplaat(praatplaatId: string): Promise<boolean> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.rpc('activate_praatplaat', {
      p_praatplaat_id: praatplaatId,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij activeren praatplaat:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.activateError'));
  }

  return true;
}

/**
 * Deactiveer een praatplaat.
 */
export async function deactivatePraatplaat(praatplaatId: string): Promise<boolean> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.rpc('deactivate_praatplaat', {
      p_praatplaat_id: praatplaatId,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij deactiveren praatplaat:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.deactivateError'));
  }

  return true;
}

/**
 * Verwijder een praatplaat. Submissions blijven bewaard (praatplaat_id wordt NULL).
 */
export async function deletePraatplaat(praatplaatId: string): Promise<boolean> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.rpc('delete_praatplaat', {
      p_praatplaat_id: praatplaatId,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij verwijderen praatplaat:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.deleteError'));
  }

  return true;
}

/**
 * Haal alle praatplaten op voor een specifieke klas (docent).
 */
export async function fetchPraatplaten(classId?: string): Promise<PraatplaatRow[]> {
  const supabase = await getSupabase();
  let query = supabase
    .from('praatplaten')
    .select('*')
    .order('created_at', { ascending: false });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Fout bij ophalen praatplaten:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.fetchError'));
  }

  return data || [];
}

/**
 * Haal submissions op voor een praatplaat (docent).
 * Met classId: alleen submissions van die klas.
 * Zonder classId: alle submissions (backward compatible).
 */
export async function getPraatplaatSubmissions(
  praatplaatId: string,
  classId?: string
): Promise<PraatplaatSubmission[]> {
  const supabase = await getSupabase();
  const params: Record<string, string> = { p_praatplaat_id: praatplaatId };
  if (classId) params.p_class_id = classId;

  const { data, error } = await withTimeout(
    supabase.rpc('get_praatplaat_submissions', params),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij ophalen praatplaat-composities:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.fetchSubmissionsError'));
  }

  // Validate composition_data per submission (TP5-5)
  const validated = (data || []).filter((row: PraatplaatSubmission) => {
    const compositionData = parseCompositionData(row.composition_data);
    if (!compositionData) {
      logger.warn('Praatplaat submission data validation failed', { id: row.id });
      return false;
    }
    return true;
  });

  return validated as PraatplaatSubmission[];
}

// --- Leerling functies (publiek, geen auth nodig) ---

/**
 * Check of een klas een actieve praatplaat heeft.
 * Publieke functie — gebruikt door leerlingen na het invoeren van een klascode.
 */
export async function getActivePraatplaat(
  classCode: string
): Promise<ActivePraatplaatInfo | null> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('get_active_praatplaat', {
      p_class_code: classCode.trim(),
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij ophalen actieve praatplaat:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('praatplaat.fetchError'));
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0] as {
    praatplaat_id: string;
    praatplaat_name: string;
    image_url: string;
    theme_id: string;
    location_id: string;
    class_id: string;
    class_name: string;
  };

  return {
    praatplaatId: row.praatplaat_id,
    praatplaatName: row.praatplaat_name,
    imageUrl: row.image_url,
    themeId: row.theme_id,
    locationId: row.location_id,
    classId: row.class_id,
    className: row.class_name,
  };
}

/**
 * Dien een compositie in gekoppeld aan een praatplaat-positie.
 */
export async function submitPraatplaatComposition(params: {
  classCode: string;
  praatplaatId: string;
  positionX: number;
  positionY: number;
  studentName?: string;
  compositionName: string;
  compositionData: CompositionData;
}): Promise<string> {
  const {
    classCode, praatplaatId, positionX, positionY,
    studentName, compositionName, compositionData,
  } = params;

  const supabase = await getSupabase();
  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const { data, error } = await withTimeout(
    supabase.rpc('submit_praatplaat_composition', {
      p_class_code: classCode.trim(),
      p_praatplaat_id: praatplaatId,
      p_position_x: positionX,
      p_position_y: positionY,
      p_student_name: finalStudentName,
      p_composition_name: compositionName,
      p_composition_data: compositionData,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij insturen praatplaat-compositie:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('praatplaat.submitError'));
  }

  return data as string;
}

// --- Deelbare praatplaat (#73) ---

export interface SharedPraatplaatData {
  praatplaat: {
    id: string;
    name: string;
    image_url: string;
    theme_id: string;
    location_id: string;
  };
  submissions: Array<{
    id: string;
    student_name: string;
    composition_name: string;
    composition_data: CompositionData;
    position_x: number;
    position_y: number;
    created_at: string;
  }>;
}

/**
 * Genereer een share code voor een praatplaat (docent).
 * Bij herhaaldelijk aanroepen wordt de bestaande code + verlengde verloopdatum teruggegeven.
 */
export async function sharePraatplaat(praatplaatId: string): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('share_praatplaat', {
      p_praatplaat_id: praatplaatId,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij delen praatplaat:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('teacher.praatplaat.shareError'));
  }

  return data as string;
}

/**
 * Haal een gedeelde praatplaat op via share code (publiek, geen auth nodig).
 * Retourneert praatplaat metadata + alle leerlingcomposities.
 */
export async function getSharedPraatplaat(
  code: string
): Promise<SharedPraatplaatData | null> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('get_shared_praatplaat', {
      p_code: code.trim().toUpperCase(),
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij ophalen gedeelde praatplaat:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    return null;
  }

  if (!data) return null;

  // Validate composition_data per submission
  const result = data as SharedPraatplaatData;
  result.submissions = result.submissions.filter((sub) => {
    const compositionData = parseCompositionData(sub.composition_data);
    if (!compositionData) {
      logger.warn('Shared praatplaat submission data validation failed', { id: sub.id });
      return false;
    }
    return true;
  });

  return result;
}
