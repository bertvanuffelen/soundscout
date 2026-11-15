/**
 * audibleBeat — pure rekenhulpjes voor de hoorbare afspeelpositie (V2 Fase 1).
 * Los bestand zodat AudioService en playbackClock elkaar niet in een kring
 * importeren, en zodat dit zonder audio te testen is.
 */

/** Uitvoervertraging begrenzen: sommige browsers geven 0, NaN of onzin terug. */
const MAX_LATENCY_SECONDS = 0.5;

/**
 * Bruikbare uitvoervertraging in seconden.
 * `outputLatency` (Chrome 102+, Firefox 70+, Safari 18.4+) heeft de voorkeur;
 * anders `baseLatency`; anders 0.
 */
export function sanitizeLatency(outputLatency: unknown, baseLatency: unknown): number {
  const pick = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
  const latency = pick(outputLatency) ?? pick(baseLatency) ?? 0;
  return Math.min(latency, MAX_LATENCY_SECONDS);
}

/** Seconden op de transportklok → tellen. Nooit negatief. */
export function secondsToAudibleBeat(transportSeconds: number, bpm: number): number {
  if (!Number.isFinite(transportSeconds) || transportSeconds <= 0) return 0;
  return (transportSeconds / 60) * bpm;
}

/**
 * Positie binnen een compositie van `totalBeats` tellen: bij loopen modulo de
 * lengte, anders begrensd op het einde. Nooit negatief.
 * (Weergaves met een eigen afspeelmotor — useCompositionPlayback.)
 */
export function wrapBeat(beat: number, totalBeats: number, looping: boolean): number {
  if (!Number.isFinite(beat) || beat <= 0) return 0;
  if (!(totalBeats > 0)) return 0;
  return looping ? beat % totalBeats : Math.min(beat, totalBeats);
}

/**
 * Positie (s) van de voorbeeld-afspeellijn in trim-/effectenvenster, of `null`
 * zodra het voorbeeld is afgelopen.
 */
export function previewPosition(
  elapsedSeconds: number,
  startSeconds: number,
  durationSeconds: number,
): number | null {
  if (elapsedSeconds >= durationSeconds) return null;
  return startSeconds + Math.max(0, elapsedSeconds);
}
