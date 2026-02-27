/**
 * Submissions Helper Functies
 *
 * Functies voor het versturen van composities naar docenten
 * en het genereren/ophalen van publieke luisterlinks.
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
    throw new Error(i18n.t('submissions.loadError'));
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}
