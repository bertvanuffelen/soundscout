/**
 * Supabase client — lazy-loaded (TP5-2)
 *
 * The @supabase/supabase-js package (~167KB) is dynamically imported on first
 * use so it doesn't bloat the initial bundle for students who never need it.
 * All consumers call `getSupabase()` which returns the cached client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _initPromise: Promise<SupabaseClient> | null = null;

/**
 * Get the Supabase client instance (lazy-loaded).
 * Safe to call multiple times — the client is created once and cached.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (_supabase) return Promise.resolve(_supabase);

  if (!_initPromise) {
    _initPromise = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables. Check .env.local file.');
      }

      _supabase = createClient(supabaseUrl, supabaseAnonKey);
      return _supabase;
    })();
  }

  return _initPromise;
}
