/**
 * Random Namen Generator
 *
 * Genereert grappige Nederlandse namen voor anonieme leerlingen
 * Voorbeelden: "Vrolijke Papegaai", "Dansende Robot", "Zingende Zeehond"
 */

// Bijvoeglijke naamwoorden (30 opties)
const adjectives = [
  'Vrolijke',
  'Dansende',
  'Zingende',
  'Springende',
  'Fluitende',
  'Huppelende',
  'Grappige',
  'Stralende',
  'Blije',
  'Speelse',
  'Snelle',
  'Slimme',
  'Dappere',
  'Levendige',
  'Kleurrijke',
  'Schitterende',
  'Galopperende',
  'Twirrelende',
  'Zwiepende',
  'Glinsterende',
  'Piepende',
  'Trippelende',
  'Stuiterende',
  'Fladderende',
  'Hopsende',
  'Tollende',
  'Swingende',
  'Rockende',
  'Drummende',
  'Tokkellende',
];

// Zelfstandige naamwoorden (35 opties)
const nouns = [
  // Dieren (20)
  'Papegaai',
  'Zeehond',
  'Pinguïn',
  'Uil',
  'Konijn',
  'Dolfijn',
  'Aap',
  'Panda',
  'Kat',
  'Vogel',
  'Egel',
  'Vos',
  'Hond',
  'IJsbeer',
  'Eenhoorn',
  'Kangoeroe',
  'Flamingo',
  'Wasbeer',
  'Otter',
  'Koala',
  // Muziek/geluid objecten (15)
  'Robot',
  'Trompet',
  'Piano',
  'Trommel',
  'Fluit',
  'Xylofoon',
  'Gitaar',
  'Tamboerijn',
  'Viool',
  'Synthesizer',
  'Bel',
  'Gong',
  'Marimba',
  'Orgel',
  'Bas',
];

/**
 * Genereert een grappige Nederlandse naam
 *
 * @returns Naam zoals "Vrolijke Papegaai" of "Dansende Robot"
 *
 * @example
 * const name = generateRandomDutchName();
 * // => "Zingende Zeehond"
 */
export function generateRandomDutchName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

/**
 * Genereert meerdere unieke namen
 *
 * @param count - Aantal namen om te genereren
 * @returns Array met unieke namen
 *
 * @example
 * const names = generateMultipleNames(5);
 * // => ["Vrolijke Papegaai", "Dansende Robot", ...]
 */
export function generateMultipleNames(count: number): string[] {
  const used = new Set<string>();
  const names: string[] = [];
  const maxAttempts = count * 3;
  let attempts = 0;

  while (names.length < count && attempts < maxAttempts) {
    const name = generateRandomDutchName();
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
    attempts++;
  }

  return names;
}

// Totaal mogelijke combinaties: 30 × 35 = 1050
