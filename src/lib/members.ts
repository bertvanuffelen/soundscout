/**
 * Leerlingcodes (fase 4.2, migratie 038, ontwerp LEERLING-CODES v2)
 *
 * Een docent zet per klas codes klaar (XX-0000). Een kind logt daarmee in:
 * vaste schuilnaam, automatisch in de juiste klas, verder werken op elk
 * apparaat. Er staat geen echte naam in de database.
 *
 * Zolang migratie 038 niet gedraaid is, bestaan de RPC's niet: de leerling-
 * route valt dan stil terug op de bewaarcode, en de docent ziet de knop niet.
 */

import { getSupabase } from './supabase';
import { logger } from '../utils/logger';
import { sanitizeError } from '../utils/errorSanitize';
import { generateMultipleNames } from '../utils/randomNames';
import i18n from '../i18n';

export const MEMBER_CODE_PATTERN = /^[A-Z]{2}\d{4}$/;

/** "LK4827" → "LK-4827" (zo staat hij op het kaartje) */
export function formatMemberCode(code: string): string {
  return MEMBER_CODE_PATTERN.test(code) ? `${code.slice(0, 2)}-${code.slice(2)}` : code;
}

export type MemberLoginResult =
  | { status: 'ok'; memberId: string; pseudonym: string; classId: string; className: string; classCode: string; expiresAt: string; latestSaveCode: string | null }
  | { status: 'expired' | 'inactive' };

/** Leerling logt in. `null` = geen leerlingcode (probeer dan de bewaarcode). */
export async function loginWithMemberCode(code: string): Promise<MemberLoginResult | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('login_with_member_code', { p_code: code });
  if (error) {
    // Migratie nog niet gedraaid, of tijdelijke fout: val terug op de bewaarcode
    logger.warn('login_with_member_code mislukt:', sanitizeError(error));
    return null;
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  if (row.status !== 'ok') return { status: row.status === 'expired' ? 'expired' : 'inactive' };
  return {
    status: 'ok',
    memberId: row.member_id,
    pseudonym: row.pseudonym,
    classId: row.class_id,
    className: row.class_name,
    classCode: String(row.class_code).trim(),
    expiresAt: row.expires_at,
    latestSaveCode: row.latest_save_code ?? null,
  };
}

/** Koppel een ingeleverde inzending aan de leerlingcode (stil, best effort) */
export async function linkSubmissionToMember(submissionId: string, saveSecret: string, memberCode: string): Promise<boolean> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('link_submission_to_member', {
      p_submission_id: submissionId,
      p_save_secret: saveSecret,
      p_member_code: memberCode,
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    logger.warn('Inzending koppelen aan leerlingcode mislukt', err);
    return false;
  }
}

// --- Docent ---

export interface ClassMember {
  id: string;
  code: string;
  pseudonym: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  lastActivity: string | null;
  submissionCount: number;
}

interface RawMember {
  id: string;
  member_code: string;
  pseudonym: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  last_activity: string | null;
  submission_count: number;
}

function mapMember(row: RawMember): ClassMember {
  return {
    id: row.id,
    code: row.member_code,
    pseudonym: row.pseudonym,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastActivity: row.last_activity,
    submissionCount: row.submission_count ?? 0,
  };
}

/**
 * Leden van een klas. Geeft `null` als de functie niet bestaat (migratie
 * 038 niet gedraaid): dan toont de docent-UI het blok niet.
 */
export async function getClassMembers(classId: string): Promise<ClassMember[] | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('get_class_members', { p_class_id: classId });
  if (error) {
    logger.warn('get_class_members mislukt:', sanitizeError(error));
    return null;
  }
  return ((data ?? []) as RawMember[]).map(mapMember);
}

/** Maak `count` nieuwe codes; schuilnamen in de taal van de docent */
export async function generateClassMembers(classId: string, count: number): Promise<void> {
  const pseudonyms = generateMultipleNames(Math.max(1, Math.min(60, count)), i18n.language);
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('generate_class_members', { p_class_id: classId, p_pseudonyms: pseudonyms });
  if (error) {
    logger.error('generate_class_members mislukt:', sanitizeError(error));
    throw new Error(i18n.t('members.errors.generate'));
  }
}

export async function extendClassMembers(classId: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('extend_class_members', { p_class_id: classId });
  if (error) {
    logger.error('extend_class_members mislukt:', sanitizeError(error));
    throw new Error(i18n.t('members.errors.generic'));
  }
}

export async function setMemberActive(memberId: string, active: boolean): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('set_class_member_active', { p_member_id: memberId, p_active: active });
  if (error) {
    logger.error('set_class_member_active mislukt:', sanitizeError(error));
    throw new Error(i18n.t('members.errors.generic'));
  }
}

export async function replaceMemberCode(memberId: string): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('replace_class_member_code', { p_member_id: memberId });
  if (error || typeof data !== 'string') {
    logger.error('replace_class_member_code mislukt:', sanitizeError(error));
    throw new Error(i18n.t('members.errors.generic'));
  }
  return data;
}
