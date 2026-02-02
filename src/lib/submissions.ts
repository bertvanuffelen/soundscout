/**
 * Submissions Helper Functies
 *
 * Functies voor het versturen van composities naar docenten
 * (Werkt zonder login - voor leerlingen)
 */

import { supabase } from './supabase';
import { generateRandomDutchName } from '../utils/randomNames';

interface SubmitCompositionParams {
  classCode: string;
  studentName?: string;
  compositionName: string;
  compositionData: any;
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
    console.error('Fout bij valideren klas-code:', error);
    throw new Error('Kon klas niet controleren');
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
    console.error('Fout bij versturen compositie:', error);

    // Vertaal bekende fouten
    if (error.message.includes('niet gevonden')) {
      throw new Error('Klas-code niet gevonden. Controleer de code en probeer opnieuw.');
    }

    throw new Error('Kon compositie niet versturen. Probeer opnieuw.');
  }

  return {
    id: data as string,
    studentName: finalStudentName,
  };
}
