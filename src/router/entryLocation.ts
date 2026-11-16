/**
 * De adresbalk zoals de bezoeker binnenkwam.
 *
 * De router schoont oude link-parameters op vóórdat React rendert. Code die
 * moet weten hoe iemand binnenkwam (AuthContext: kwam de docent via een
 * wachtwoord-reset-link?) leest daarom deze momentopname in plaats van
 * `window.location`. Zonder router (unit-tests) is er geen momentopname en
 * geldt gewoon de huidige adresbalk.
 */
export interface EntryLocation {
  search: string;
  hash: string;
}

let entry: EntryLocation | null = null;

/** Eenmalig aanroepen, vóór de router de adresbalk aanraakt. */
export function captureEntryLocation(): void {
  if (entry || typeof window === 'undefined') return;
  entry = { search: window.location.search, hash: window.location.hash };
}

export function getEntryLocation(): EntryLocation {
  return entry ?? { search: window.location.search, hash: window.location.hash };
}
