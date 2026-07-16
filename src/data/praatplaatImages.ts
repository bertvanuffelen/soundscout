/**
 * Praatplaat Image Library
 *
 * Universele praatplaat-achtergronden, losgekoppeld van thema's.
 * Docenten kiezen uit deze bibliotheek bij het aanmaken van een praatplaat.
 *
 * De afbeeldingen staan in /public/images/praatplaten/.
 * themeId en locationId zijn 'general' omdat ze niet gebonden zijn aan een thema.
 */

/**
 * Welke flow(s) mag deze afbeelding in verschijnen?
 *
 * - 'teacher' → alléén bij het aanmaken van een docent-praatplaat
 *   (zichtbaar in `CreatePraatplaatModal`).
 * - 'student' → alléén bij de leerling in compositie-modus
 *   (zichtbaar in `StoryboardPickerModal` variant="image").
 * - 'both'    → in beide flows.
 */
export type PraatplaatAvailability = 'teacher' | 'student' | 'both';

export interface PraatplaatImage {
  /** Unique identifier */
  id: string;
  /** i18n key for the display name */
  nameKey: string;
  /** Path to the image (relative to public/) */
  imageUrl: string;
  /** Category for optional grouping */
  category: 'natuur' | 'stad' | 'gebouw' | 'feest' | 'fictie' | 'overig';
  /**
   * Voor welke flow(s) is deze afbeelding beschikbaar?
   * Default (ontbrekend) = 'teacher' — back-compat met de bestaande lijst.
   */
  availableFor?: PraatplaatAvailability;
  /**
   * Welk geluiden-thema koppelen als deze afbeelding in de leerling-
   * compositie-flow (`availableFor` bevat 'student' / 'both') wordt gekozen.
   * Verplicht als `availableFor` 'student' of 'both' is.
   */
  themeId?: string;
}

export const praatplaatImages: PraatplaatImage[] = [
  {
    id: 'pp-koningsdag',
    nameKey: 'praatplaatImages.koningsdag',
    imageUrl: '/images/praatplaten/koningsdag.jpg',
    category: 'feest',
    availableFor: 'both',
    themeId: 'basis',
  },
  {
    id: 'pp-robotfabriek',
    nameKey: 'praatplaatImages.robotfabriek',
    imageUrl: '/images/praatplaten/robotfabriek.jpg',
    category: 'gebouw',
    availableFor: 'both',
    themeId: 'basis',
  },
  {
    id: 'pp-sportveld',
    nameKey: 'praatplaatImages.sportveld',
    imageUrl: '/images/praatplaten/sportveld.jpg',
    category: 'stad',
    availableFor: 'both',
    themeId: 'basis',
  },
  {
    id: 'pp-piratenmarkt',
    nameKey: 'praatplaatImages.piratenmarkt',
    imageUrl: '/images/praatplaten/piratenmarkt.jpg',
    category: 'fictie',
    availableFor: 'both',
    themeId: 'piraten',
  },
];

/**
 * Helper: wordt deze afbeelding getoond in de docent-flow?
 * Default (ontbrekend `availableFor`) = ja.
 */
export function isAvailableForTeacher(img: PraatplaatImage): boolean {
  const a = img.availableFor ?? 'teacher';
  return a === 'teacher' || a === 'both';
}

/**
 * Helper: wordt deze afbeelding getoond in de leerling-compositie-flow?
 */
export function isAvailableForStudent(img: PraatplaatImage): boolean {
  const a = img.availableFor ?? 'teacher';
  return a === 'student' || a === 'both';
}
