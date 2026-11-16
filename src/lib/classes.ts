/**
 * classes — losse klasbewerkingen die zowel het dashboard (useClasses) als
 * de klaspagina ("Meer opties → Klas verwijderen") gebruiken.
 */

import { getSupabase } from './supabase';
import i18n from '../i18n';

/** Verwijder een klas van de ingelogde docent (RLS + expliciete teacher_id-filter). */
export async function deleteClassById(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error(i18n.t('errors.notLoggedIn'));

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id)
    .eq('teacher_id', user.id);

  if (error) {
    throw new Error(i18n.t('errors.classes.delete') + ': ' + error.message);
  }
}
