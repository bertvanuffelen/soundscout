/**
 * Template Helper Functies
 *
 * - getTemplateByCode: publiek, voor leerlingen (via RPC)
 * - createTemplate / deleteTemplate / toggleTemplate: voor docenten (direct table)
 * - fetchTeacherTemplates: voor docenten dashboard
 */

import { supabase } from './supabase';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import { parseCompositionData } from '../utils/schemas';
import type { Template, CompositionData, TemplateLockOptions } from '../types';
import { DEFAULT_LOCK_OPTIONS } from '../types';

// --- Types voor dashboard ---

export interface TeacherTemplate {
  id: string;
  name: string;
  description?: string;
  code: string;
  instructions?: string;
  lockOptions: TemplateLockOptions;
  isActive: boolean;
  createdAt: string;
}

export interface CreateTemplateParams {
  name: string;
  description?: string;
  compositionData: CompositionData;
  instructions?: string;
  lockOptions: TemplateLockOptions;
}

/**
 * Convert legacy `clips_locked` boolean to TemplateLockOptions.
 * Old templates only had clips_locked — map to full options with sensible defaults.
 */
function parseLockOptions(row: { lock_options?: TemplateLockOptions | null; clips_locked?: boolean }): TemplateLockOptions {
  // New format: lock_options JSONB column
  if (row.lock_options && typeof row.lock_options === 'object') {
    return {
      clipsLocked: row.lock_options.clipsLocked ?? DEFAULT_LOCK_OPTIONS.clipsLocked,
      sectionsLocked: row.lock_options.sectionsLocked ?? DEFAULT_LOCK_OPTIONS.sectionsLocked,
      libraryLocked: row.lock_options.libraryLocked ?? DEFAULT_LOCK_OPTIONS.libraryLocked,
      allowNewClips: row.lock_options.allowNewClips ?? DEFAULT_LOCK_OPTIONS.allowNewClips,
    };
  }
  // Legacy format: only clips_locked boolean
  return {
    clipsLocked: row.clips_locked ?? false,
    sectionsLocked: row.clips_locked ?? false, // legacy: sections followed clips
    libraryLocked: true, // legacy: library was always locked
    allowNewClips: true, // legacy: new clips were always allowed
  };
}

/**
 * Haal een template op via code.
 * Retourneert null als de code niet bestaat of inactief is.
 */
export async function getTemplateByCode(code: string): Promise<Template | null> {
  try {
    const { data, error } = await supabase.rpc('get_template_by_code', {
      p_code: code.toUpperCase().trim(),
    });

    if (error) {
      logger.error('Fout bij ophalen template:', sanitizeError(error));
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];

    // Validate composition data
    const compositionData = parseCompositionData(row.composition_data);
    if (!compositionData) {
      logger.warn('Template composition data validatie mislukt:', code);
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      teacherName: row.teacher_name,
      compositionData,
      instructions: row.instructions ?? undefined,
      lockOptions: parseLockOptions(row),
      createdAt: row.created_at,
    };
  } catch (err) {
    logger.error('Onverwachte fout bij ophalen template:', sanitizeError(err));
    return null;
  }
}

// --- Docent CRUD functies ---

/**
 * Haal alle templates op van de ingelogde docent.
 */
export async function fetchTeacherTemplates(): Promise<TeacherTemplate[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('templates')
    .select('id, name, description, code, instructions, clips_locked, lock_options, is_active, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Fout bij ophalen templates:', sanitizeError(error));
    throw new Error('Kon templates niet laden');
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    code: row.code,
    instructions: row.instructions ?? undefined,
    lockOptions: parseLockOptions(row),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  }));
}

/**
 * Maak een nieuw template aan.
 */
export async function createTemplate(params: CreateTemplateParams): Promise<TeacherTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Je moet ingelogd zijn');

  // Genereer unieke code
  const { data: codeData, error: codeError } = await supabase.rpc('generate_template_code');
  if (codeError || typeof codeData !== 'string' || !codeData) {
    logger.error('Code generatie mislukt:', sanitizeError(codeError));
    throw new Error('Kon template-code niet genereren');
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      teacher_id: user.id,
      name: params.name.trim(),
      description: params.description?.trim() || null,
      code: codeData,
      composition_data: params.compositionData,
      instructions: params.instructions?.trim() || null,
      clips_locked: params.lockOptions.clipsLocked, // backward compat column
      lock_options: params.lockOptions, // new JSONB column (#59)
    })
    .select()
    .single();

  if (error) {
    logger.error('Template aanmaken mislukt:', sanitizeError(error));
    throw new Error('Kon template niet aanmaken');
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    code: data.code,
    instructions: data.instructions ?? undefined,
    lockOptions: parseLockOptions(data),
    isActive: data.is_active ?? true,
    createdAt: data.created_at,
  };
}

/**
 * Verwijder een template.
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Template verwijderen mislukt:', sanitizeError(error));
    throw new Error('Kon template niet verwijderen');
  }
}

/**
 * Schakel een template actief/inactief.
 */
export async function toggleTemplate(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('Template toggle mislukt:', sanitizeError(error));
    throw new Error('Kon template status niet wijzigen');
  }
}
