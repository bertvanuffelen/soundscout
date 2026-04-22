/**
 * Supabase error string constants (TP5-15)
 *
 * Centralizes all error message patterns matched against Supabase RPC
 * and Auth error messages. These strings originate from:
 * - PostgreSQL RPC functions (RAISE EXCEPTION in SQL)
 * - Supabase Auth error messages
 *
 * Keeping them in one place prevents silent breakage when server-side
 * error messages change.
 */

// --- RPC error patterns (from PostgreSQL RAISE EXCEPTION) ---

/** Rate limiting triggered on any public RPC function */
export const ERR_RATE_LIMIT = 'Rate limit exceeded';

/** Class code not found in database */
export const ERR_CLASS_NOT_FOUND = 'niet gevonden';

/** Assignment/praatplaat not active for class */
export const ERR_NOT_ACTIVE = 'niet actief';

/** Invalid save code (bewaarcode) */
export const ERR_INVALID_SAVE_CODE = 'Ongeldige bewaarcode';

// --- Auth error patterns (from Supabase Auth) ---

/** Email already registered */
export const ERR_AUTH_ALREADY_REGISTERED = 'already registered';

/** Invalid email format */
export const ERR_AUTH_INVALID_EMAIL = 'valid email';

/** Password too short */
export const ERR_AUTH_PASSWORD_TOO_SHORT = 'at least 6 characters';

/** Wrong email/password combination */
export const ERR_AUTH_INVALID_CREDENTIALS = 'Invalid login credentials';

/** Email not yet confirmed */
export const ERR_AUTH_EMAIL_NOT_CONFIRMED = 'Email not confirmed';

/** Auth rate limit (lowercase variant) */
export const ERR_AUTH_RATE_LIMIT = 'rate limit';

// --- Helper ---

/** Check if an error message matches a known pattern */
export function matchesError(error: { message: string }, pattern: string): boolean {
  return error.message.includes(pattern);
}
