/**
 * Sanitize Supabase/API errors for safe logging.
 * Only extracts message and code — strips schema/table details.
 */
export function sanitizeError(error: unknown): { message: string; code?: string } {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const e = error as Record<string, unknown>;
  return {
    message: typeof e.message === 'string' ? e.message : 'Unknown error',
    code: typeof e.code === 'string' ? e.code : undefined,
  };
}
