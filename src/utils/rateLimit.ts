/**
 * Client-side rate limiting voor submissions en share links.
 *
 * Voorkomt dat leerlingen (per ongeluk of opzettelijk) dezelfde
 * compositie meerdere keren snel achter elkaar insturen.
 *
 * Niet waterdicht (client-side is altijd te omzeilen), maar
 * voldoende voor de doelgroep (basisschoolleerlingen).
 */

// --- Cooldown configuratie ---
const SUBMISSION_COOLDOWN_MS = 30_000; // 30 seconden tussen submissions
const SHARE_COOLDOWN_MS = 15_000;      // 15 seconden tussen share links

// --- Interne state ---
let lastSubmissionTime = 0;
let lastShareTime = 0;

// --- Submission rate limiting ---

/** Controleer of een nieuwe submission is toegestaan */
export function canSubmit(): boolean {
  return Date.now() - lastSubmissionTime >= SUBMISSION_COOLDOWN_MS;
}

/** Markeer dat er zojuist een submission is gedaan */
export function markSubmission(): void {
  lastSubmissionTime = Date.now();
}

/** Hoeveel milliseconden tot de volgende submission is toegestaan (0 = nu) */
export function getSubmitCooldownRemaining(): number {
  const elapsed = Date.now() - lastSubmissionTime;
  return Math.max(0, SUBMISSION_COOLDOWN_MS - elapsed);
}

// --- Share link rate limiting ---

/** Controleer of een nieuwe share link is toegestaan */
export function canShare(): boolean {
  return Date.now() - lastShareTime >= SHARE_COOLDOWN_MS;
}

/** Markeer dat er zojuist een share link is aangemaakt */
export function markShare(): void {
  lastShareTime = Date.now();
}

/** Hoeveel milliseconden tot de volgende share link is toegestaan (0 = nu) */
export function getShareCooldownRemaining(): number {
  const elapsed = Date.now() - lastShareTime;
  return Math.max(0, SHARE_COOLDOWN_MS - elapsed);
}
