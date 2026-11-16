/**
 * De ene plek waar de themabron van de app wordt gekozen (main.tsx roept dit
 * aan vóór de eerste render): statische thema's + Supabase (als ingesteld) +
 * een eventueel concept-voorbeeld in dit tabblad. Zie supabaseRepository.ts.
 */

import { createDefaultStaticRepository, setThemeRepository } from './registry';
import { browserLocalStore, createMergedThemeRepository, createRestPublishedSource } from './supabaseRepository';
import { getThemePreview } from './preview';

export function installThemeRepository(): void {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const configured = !!supabaseUrl && !!anonKey;
  setThemeRepository(
    createMergedThemeRepository({
      staticRepository: createDefaultStaticRepository(),
      published: configured ? createRestPublishedSource({ supabaseUrl: supabaseUrl!, anonKey: anonKey! }) : null,
      supabaseUrl: supabaseUrl ?? '',
      cache: browserLocalStore,
      preview: getThemePreview,
    }),
  );
}
