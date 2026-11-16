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

/** Bijwerken van een bestaande inzending zonder geldig geheim (migratie 036) */
export const ERR_SUBMISSION_FORBIDDEN = 'submission_forbidden';

// --- Auth error patterns (from Supabase Auth) ---

/** Email already registered */
export const ERR_AUTH_ALREADY_REGISTERED = 'already registered';

/** Invalid email format */
export const ERR_AUTH_INVALID_EMAIL = 'valid email';

/** Password too short or too weak ("Password should be at least 8 characters",
 *  "Password should contain at least one character of each: ...") */
export const ERR_AUTH_PASSWORD_TOO_SHORT = 'Password should';

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

// --- Ontbrekende database-objecten (migratie nog niet gedraaid) ---

/** PostgreSQL: tabel/view bestaat niet */
export const ERR_PG_UNDEFINED_TABLE = '42P01';
/** PostgreSQL: functie bestaat niet */
export const ERR_PG_UNDEFINED_FUNCTION = '42883';
/** PostgREST: tabel/view niet in de schema-cache */
export const ERR_PGRST_TABLE_NOT_FOUND = 'PGRST205';
/** PostgREST: functie niet in de schema-cache */
export const ERR_PGRST_FUNCTION_NOT_FOUND = 'PGRST202';

/**
 * Wijst de fout erop dat een tabel, view of functie (nog) niet bestaat? Dan is
 * een migratie nog niet toegepast en valt de app terug op wat er al was.
 */
export function isMissingDatabaseObject(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if ([ERR_PG_UNDEFINED_TABLE, ERR_PG_UNDEFINED_FUNCTION, ERR_PGRST_TABLE_NOT_FOUND, ERR_PGRST_FUNCTION_NOT_FOUND].includes(code)) return true;
  const message = error.message ?? '';
  return /does not exist|Could not find the (table|function)|schema cache/i.test(message);
}
