/**
 * Submissions Helper Functies
 *
 * Functies voor het versturen van composities naar docenten,
 * het genereren/ophalen van publieke luisterlinks,
 * en het online bewaren/laden van composities (#52).
 * (Werkt zonder login - voor leerlingen)
 */

import { getSupabase } from './supabase';
import { ERR_RATE_LIMIT, ERR_CLASS_NOT_FOUND, ERR_NOT_ACTIVE, ERR_INVALID_SAVE_CODE, matchesError } from './supabaseErrors';
import { withTimeout } from '../utils/withTimeout';
import { generateRandomDutchName } from '../utils/randomNames';
import { sanitizeError } from '../utils/errorSanitize';
import { parseCompositionData } from '../utils/schemas';
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
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('get_class_by_code', {
      p_code: code,
    }),
    15_000,
    'errors.networkTimeout'
  );

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

  const supabase = await getSupabase();

  // Gebruik grappige naam als geen naam opgegeven
  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const { data, error } = await withTimeout(
    supabase.rpc('submit_composition', {
      p_class_code: classCode,
      p_student_name: finalStudentName,
      p_composition_name: compositionName,
      p_composition_data: compositionData,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij versturen compositie:', sanitizeError(error));

    // Vertaal bekende fouten
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (matchesError(error, ERR_CLASS_NOT_FOUND)) {
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
  /** Identifier of the assignment: template_id/praatplaat_id (UUID), storyboard-registry-id or theme-id (TEXT) */
  assignmentId?: string;
  /** Type of assignment */
  assignmentType?: 'template' | 'praatplaat' | 'storyboard' | 'free';
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

  const supabase = await getSupabase();
  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const rpcParams: Record<string, unknown> = {
    p_class_code: classCode.trim(),
    p_student_name: finalStudentName,
    p_composition_name: compositionName,
    p_composition_data: compositionData,
  };

  // Only include optional params when they have a value (avoids PostgREST ambiguity)
  if (clientId) rpcParams.p_client_id = clientId;
  if (assignmentType) rpcParams.p_assignment_type = assignmentType;
  // Storyboard-ref (registry-id) en free (thema-id) zijn tekst, geen UUID → naar
  // p_assignment_ref; template/praatplaat leveren een UUID → naar p_assignment_id.
  if (assignmentId) {
    if (assignmentType === 'storyboard' || assignmentType === 'free') {
      rpcParams.p_assignment_ref = assignmentId;
    } else {
      rpcParams.p_assignment_id = assignmentId;
    }
  }
  if (praatplaatPositionX != null) rpcParams.p_praatplaat_position_x = praatplaatPositionX;
  if (praatplaatPositionY != null) rpcParams.p_praatplaat_position_y = praatplaatPositionY;

  const { data, error } = await withTimeout(
    supabase.rpc('submit_or_update_composition', rpcParams),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij submit_or_update_composition:', sanitizeError(error));

    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (matchesError(error, ERR_CLASS_NOT_FOUND) || matchesError(error, ERR_NOT_ACTIVE)) {
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
  const supabase = await getSupabase();

  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const { data, error } = await withTimeout(
    supabase.rpc('share_composition', {
      p_student_name: finalStudentName,
      p_composition_name: compositionName,
      p_composition_data: compositionData,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij delen compositie:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
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
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('get_shared_composition', {
      p_code: code.toUpperCase().trim(),
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij ophalen gedeelde compositie:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('submissions.loadError'));
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];

  // Validate composition_data via Zod (TP5-5)
  const compositionData = parseCompositionData(row.composition_data);
  if (!compositionData) {
    logger.warn('Shared composition data validation failed', { code });
    return null;
  }

  return { ...row, composition_data: compositionData } as SharedComposition;
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
  const supabase = await getSupabase();

  const { data, error } = await withTimeout(
    supabase.rpc('save_composition_online', {
      p_student_name: studentName.trim(),
      p_composition_name: compositionName,
      p_composition_data: compositionData,
      p_class_code: classCode?.trim() || null,
      p_email: email?.trim() || null,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij online bewaren:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
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
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.rpc('update_saved_composition', {
      p_save_code: saveCode.toUpperCase().trim(),
      p_save_secret: saveSecret,
      p_composition_data: compositionData,
      p_composition_name: compositionName || null,
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij bijwerken bewaarde compositie:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (matchesError(error, ERR_INVALID_SAVE_CODE)) {
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
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('load_saved_composition', {
      p_save_code: saveCode.toUpperCase().trim(),
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij laden bewaarde compositie:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('submissions.loadError'));
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];

  // Validate composition_data via Zod (TP5-5)
  const compositionData = parseCompositionData(row.composition_data);
  if (!compositionData) {
    logger.warn('Saved composition data validation failed', { saveCode });
    return null;
  }

  return { ...row, composition_data: compositionData } as SavedOnlineComposition;
}

/**
 * Claim een bewaarde compositie op een nieuw apparaat.
 * Genereert een nieuwe save_secret (oude wordt overschreven).
 */
export async function claimSavedComposition(
  saveCode: string,
  studentName: string,
): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('claim_saved_composition', {
      p_save_code: saveCode.toUpperCase().trim(),
      p_student_name: studentName.trim(),
    }),
    20_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('Fout bij claimen compositie:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    if (matchesError(error, ERR_CLASS_NOT_FOUND)) {
      throw new Error(i18n.t('saveOnline.codeNotFound'));
    }
    throw new Error(i18n.t('saveOnline.claimError'));
  }

  return data as string;
}
