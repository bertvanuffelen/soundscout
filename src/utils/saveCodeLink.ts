/**
 * Bewaarcode als link — "mee naar huis" (besluit Bert 14-10).
 *
 * De code staat in de hash (`/#code=ABC123`), niet in de query: het deel na
 * de # gaat niet naar de server (dus niet in de Strato-logboeken) en wordt niet
 * als Referer aan andere sites doorgegeven. App.tsx haalt hem na het openen
 * meteen uit de adresbalk.
 */

const SAVE_CODE_HASH = /^#code=([A-Za-z0-9]{6})$/;

export function buildSaveCodeLink(code: string, origin: string = window.location.origin): string {
  return `${origin}/#code=${code}`;
}

/** Leest een bewaarcode uit `location.hash`, of null als die er niet (geldig) in staat. */
export function readSaveCodeFromHash(hash: string): string | null {
  const match = hash.match(SAVE_CODE_HASH);
  return match ? match[1].toUpperCase() : null;
}
