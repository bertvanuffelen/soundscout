/**
 * firstRun - Eenmalige hints en first-run flags (week 3, onboarding)
 *
 * Kleine localStorage-helper voor "toon dit één keer"-gedrag: de
 * onboarding-intro, de studio-cliptools-hint en de kaart-hint.
 * Bewust los van StorageService: dit zijn wegwerp-flags, geen data.
 */

export type FirstRunFlag =
  | 'onboarding-intro'   // animatie bij de allereerste "Nieuwe compositie"
  | 'clip-tools-hint'    // "klik op een blokje" in de studio
  | 'map-hint';          // "klik op een locatie" op de kaart

const PREFIX = 'soundscout:first-run:';

export function hasSeenFirstRun(flag: FirstRunFlag): boolean {
  try {
    return localStorage.getItem(PREFIX + flag) === 'true';
  } catch {
    return true; // zonder localStorage: nooit hints tonen (geen herhaal-spam)
  }
}

export function markFirstRunSeen(flag: FirstRunFlag): void {
  try {
    localStorage.setItem(PREFIX + flag, 'true');
  } catch {
    // stil — hint verschijnt dan mogelijk nog een keer
  }
}
