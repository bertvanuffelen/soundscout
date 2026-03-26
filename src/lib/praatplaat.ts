/**
 * Praatplaat Helper Functies (#72)
 *
 * Client-side functies voor het beheren van praatplaten (docenten)
 * en het ophalen/insturen van praatplaat-composities (leerlingen).
 */

import { supabase } from './supabase';
import { generateRandomDutchName } from '../utils/randomNames';
import { sanitizeError } from '../utils/errorSanitize';
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

  const { data, error } = await supabase.rpc('create_praatplaat', {
    p_name: name.trim(),
    p_theme_id: themeId,
    p_location_id: locationId,
    p_image_url: imageUrl,
    p_class_id: classId || null,
  });

  if (error) {
    logger.error('Fout bij aanmaken praatplaat:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.createError'));
  }

  return data as string;
}

/**
 * Activeer een praatplaat (deactiveert automatisch andere praatplaten van dezelfde klas).
 */
export async function activatePraatplaat(praatplaatId: string): Promise<boolean> {
  const { error } = await supabase.rpc('activate_praatplaat', {
    p_praatplaat_id: praatplaatId,
  });

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
  const { error } = await supabase.rpc('deactivate_praatplaat', {
    p_praatplaat_id: praatplaatId,
  });

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
  const { error } = await supabase.rpc('delete_praatplaat', {
    p_praatplaat_id: praatplaatId,
  });

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
  const params: Record<string, string> = { p_praatplaat_id: praatplaatId };
  if (classId) params.p_class_id = classId;

  const { data, error } = await supabase.rpc('get_praatplaat_submissions', params);

  if (error) {
    logger.error('Fout bij ophalen praatplaat-composities:', sanitizeError(error));
    throw new Error(i18n.t('teacher.praatplaat.fetchSubmissionsError'));
  }

  return (data || []) as PraatplaatSubmission[];
}

// --- Leerling functies (publiek, geen auth nodig) ---

/**
 * Check of een klas een actieve praatplaat heeft.
 * Publieke functie — gebruikt door leerlingen na het invoeren van een klascode.
 */
export async function getActivePraatplaat(
  classCode: string
): Promise<ActivePraatplaatInfo | null> {
  const { data, error } = await supabase.rpc('get_active_praatplaat', {
    p_class_code: classCode.trim(),
  });

  if (error) {
    logger.error('Fout bij ophalen actieve praatplaat:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
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

  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const { data, error } = await supabase.rpc('submit_praatplaat_composition', {
    p_class_code: classCode.trim(),
    p_praatplaat_id: praatplaatId,
    p_position_x: positionX,
    p_position_y: positionY,
    p_student_name: finalStudentName,
    p_composition_name: compositionName,
    p_composition_data: compositionData,
  });

  if (error) {
    logger.error('Fout bij insturen praatplaat-compositie:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('praatplaat.submitError'));
  }

  return data as string;
}
