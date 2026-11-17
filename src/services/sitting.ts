/**
 * "Zit hier nog hetzelfde kind?" (designronde nov 2026, mockup B3).
 *
 * Werk-in-uitvoering overleeft herladen (workInProgress.ts), en dat is op een
 * gedeelde Chromebook precies het probleem: het volgende kind krijgt het werk
 * van het vorige voorgeschoteld. Een "zitting" is één browsertab-sessie
 * (sessionStorage): herladen telt als hetzelfde kind, een nieuw geopende
 * browser niet. Staat er werk dat níet in deze zitting is gemaakt of
 * bevestigd, dan vraagt het startscherm eerst van wie het is.
 *
 * Er wordt niets over het kind bewaard: alleen een vlag in sessionStorage.
 */

const KEY = 'soundscout:sitting';

/** Dit kind heeft in deze zitting gewerkt of bevestigd dat het werk van hem is. */
export function markOwnSitting(): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // privévenster of geblokkeerde opslag: dan vragen we het hooguit een keer te vaak
  }
}

export function isOwnSitting(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return true; // zonder opslag kunnen we het niet weten: niet lastigvallen
  }
}
