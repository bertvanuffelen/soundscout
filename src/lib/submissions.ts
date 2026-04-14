/**
 * Submissions Helper Functies
 *
 * Functies voor het versturen van composities naar docenten,
 * het genereren/ophalen van publieke luisterlinks,
 * en het online bewaren/laden van composities (#52).
 * (Werkt zonder login - voor leerlingen)
 */

import { supabase } from './supabase';
import { generateRandomDutchName } from '../utils/randomNames';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import type { CompositionData } from '../types';

interface SubmitCompositionParams {
  classCode: string;
  studentName?: string;
  compositionName: string;
  compositionData: CompositionData;
}

interface SubmitCompositionResult {
  id: string;
  studentName: string;
}

/**
 * Valideer een klas-code en haal klas info op
 *
 * @param code - 4-cijferige klas-code
 * @returns Klas info of null als niet gevonden
 */
export async function validateClassCode(code: string): Promise<{
  id: string;
  name: string;
  teacher_name: string;
} | null> {
  const { data, error } = await supabase.rpc('get_class_by_code', {
    p_code: code,
  });

  if (error) {
    logger.error('Fout bij valideren klas-code:', sanitizeError(error));
    throw new Error(i18n.t('submissions.validateClassCodeError'));
  }

  // data is een array, we willen het eerste resultaat
  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * Verstuur een compositie naar een docent
 *
 * @param params - Compositie gegevens
 * @returns ID van de submission en de gebruikte leerling naam
 */
export async function submitComposition(
  params: SubmitCompositionParams
): Promise<SubmitCompositionResult> {
  const { classCode, studentName, compositionName, compositionData } = params;

  // Gebruik grappige naam als geen naam opgegeven
  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const { data, error } = await supabase.rpc('submit_composition', {
    p_class_code: classCode,
    p_student_name: finalStudentName,
    p_composition_name: compositionName,
    p_composition_data: compositionData,
  });

  if (error) {
    logger.error('Fout bij versturen compositie:', sanitizeError(error));

    // Vertaal bekende fouten
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (error.message.includes('niet gevonden')) {
      throw new Error(i18n.t('submissions.classCodeNotFound'));
    }

    throw new Error(i18n.t('submissions.submitError'));
  }

  return {
    id: data as string,
    studentName: finalStudentName,
  };
}

// --- Universele klascode-submit (UPSERT) ---

interface SubmitOrUpdateParams {
  classCode: string;
  studentName?: string;
  compositionName: string;
  compositionData: CompositionData;
  /** Client-generated UUID for idempotent UPSERT (reuse across retries) */
  clientId?: string;
  /** UUID of the assignment (template or praatplaat) */
  assignmentId?: string;
  /** Type of assignment */
  assignmentType?: 'template' | 'praatplaat';
  /** Praatplaat position (only for praatplaat assignments) */
  praatplaatPositionX?: number;
  praatplaatPositionY?: number;
}

/**
 * Submit or update a composition via klascode (idempotent UPSERT).
 *
 * First call (clientId = new UUID): creates a submission.
 * Subsequent calls (same clientId): updates the existing submission.
 * If the response is lost, retrying with the same clientId is safe.
 *
 * @returns The submission UUID
 */
export async function submitOrUpdateComposition(
  params: SubmitOrUpdateParams
): Promise<string> {
  const {
    classCode, studentName, compositionName, compositionData,
    clientId, assignmentId, assignmentType,
    praatplaatPositionX, praatplaatPositionY,
  } = params;

  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const rpcParams: Record<string, unknown> = {
    p_class_code: classCode.trim(),
    p_student_name: finalStudentName,
    p_composition_name: compositionName,
    p_composition_data: compositionData,
  };

  // Only include optional params when they have a value (avoids PostgREST ambiguity)
  if (clientId) rpcParams.p_client_id = clientId;
  if (assignmentId) rpcParams.p_assignment_id = assignmentId;
  if (assignmentType) rpcParams.p_assignment_type = assignmentType;
  if (praatplaatPositionX != null) rpcParams.p_praatplaat_position_x = praatplaatPositionX;
  if (praatplaatPositionY != null) rpcParams.p_praatplaat_position_y = praatplaatPositionY;

  const { data, error } = await supabase.rpc('submit_or_update_composition', rpcParams);

  if (error) {
    logger.error('Fout bij submit_or_update_composition:', sanitizeError(error));

    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (error.message.includes('niet gevonden') || error.message.includes('niet actief')) {
      throw new Error(i18n.t('submissions.classCodeNotFound'));
    }

    throw new Error(i18n.t('submissions.submitError'));
  }

  return data as string;
}

// --- Publieke luisterlinks ---

interface ShareCompositionParams {
  studentName?: string;
  compositionName: string;
  compositionData: CompositionData;
}

interface SharedComposition {
  composition_name: string;
  student_name: string;
  composition_data: CompositionData;
  created_at: string;
  view_count: number;
}

/**
 * Genereer een publieke luisterlink voor een compositie
 *
 * @param params - Compositie gegevens
 * @returns 8-karakter share code
 */
export async function shareComposition(
  params: ShareCompositionParams
): Promise<string> {
  const { studentName, compositionName, compositionData } = params;

  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const { data, error } = await supabase.rpc('share_composition', {
    p_student_name: finalStudentName,
    p_composition_name: compositionName,
    p_composition_data: compositionData,
  });

  if (error) {
    logger.error('Fout bij delen compositie:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('submissions.shareLinkError'));
  }

  return data as string;
}

/**
 * Haal een gedeelde compositie op via share code
 *
 * @param code - 8-karakter share code
 * @returns Compositie data of null als niet gevonden/verlopen
 */
export async function getSharedComposition(
  code: string
): Promise<SharedComposition | null> {
  const { data, error } = await supabase.rpc('get_shared_composition', {
    p_code: code.toUpperCase().trim(),
  });

  if (error) {
    logger.error('Fout bij ophalen gedeelde compositie:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('submissions.loadError'));
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as SharedComposition;
}

// --- Online bewaren (#52) ---

interface SaveCompositionOnlineParams {
  studentName: string;
  compositionName: string;
  compositionData: CompositionData;
  classCode?: string;
  email?: string;
}

export interface SaveCompositionOnlineResult {
  saveCode: string;
  saveSecret: string;
}

export interface SavedOnlineComposition {
  id: string;
  student_name: string;
  composition_name: string;
  composition_data: CompositionData;
  last_updated_at: string;
  student_email: string | null;
}

/**
 * Bewaar een compositie online en krijg een 6-karakter bewaarcode.
 * Optioneel: koppel aan een klas en/of voeg e-mailadres toe.
 */
export async function saveCompositionOnline(
  params: SaveCompositionOnlineParams
): Promise<SaveCompositionOnlineResult> {
  const { studentName, compositionName, compositionData, classCode, email } = params;

  const { data, error } = await supabase.rpc('save_composition_online', {
    p_student_name: studentName.trim(),
    p_composition_name: compositionName,
    p_composition_data: compositionData,
    p_class_code: classCode?.trim() || null,
    p_email: email?.trim() || null,
  });

  if (error) {
    logger.error('Fout bij online bewaren:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('saveOnline.saveError'));
  }

  if (!data || data.length === 0) {
    throw new Error(i18n.t('saveOnline.saveError'));
  }

  const result = data[0] as { save_code: string; save_secret: string };
  return {
    saveCode: result.save_code,
    saveSecret: result.save_secret,
  };
}

/**
 * Werk een online bewaarde compositie bij via bewaarcode + secret.
 * Reset de 60-dagen vervaltermijn.
 */
export async function updateSavedComposition(
  saveCode: string,
  saveSecret: string,
  compositionData: CompositionData,
  compositionName?: string,
): Promise<boolean> {
  const { error } = await supabase.rpc('update_saved_composition', {
    p_save_code: saveCode.toUpperCase().trim(),
    p_save_secret: saveSecret,
    p_composition_data: compositionData,
    p_composition_name: compositionName || null,
  });

  if (error) {
    logger.error('Fout bij bijwerken bewaarde compositie:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (error.message.includes('Ongeldige bewaarcode')) {
      throw new Error(i18n.t('saveOnline.invalidSecret'));
    }
    throw new Error(i18n.t('saveOnline.updateError'));
  }

  return true;
}

/**
 * Laad een online bewaarde compositie via bewaarcode.
 * Geen secret nodig (read-only). Verlopen na 60 dagen inactiviteit.
 */
export async function loadSavedComposition(
  saveCode: string
): Promise<SavedOnlineComposition | null> {
  const { data, error } = await supabase.rpc('load_saved_composition', {
    p_save_code: saveCode.toUpperCase().trim(),
  });

  if (error) {
    logger.error('Fout bij laden bewaarde compositie:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('submissions.loadError'));
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as SavedOnlineComposition;
}

/**
 * Claim een bewaarde compositie op een nieuw apparaat.
 * Genereert een nieuwe save_secret (oude wordt overschreven).
 */
export async function claimSavedComposition(
  saveCode: string,
  studentName: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('claim_saved_composition', {
    p_save_code: saveCode.toUpperCase().trim(),
    p_student_name: studentName.trim(),
  });

  if (error) {
    logger.error('Fout bij claimen compositie:', sanitizeError(error));
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (error.message.includes('niet gevonden')) {
      throw new Error(i18n.t('saveOnline.codeNotFound'));
    }
    throw new Error(i18n.t('saveOnline.claimError'));
  }

  return data as string;
}
