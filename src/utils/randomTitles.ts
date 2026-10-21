/**
 * Titelsuggesties voor een soundscape (podium v4): de dobbelsteen en de
 * drie snelle keuzes in de stap "Geef je soundscape een titel". Ook de
 * automatische titel als een leerling inlevert zonder titel.
 *
 * Bewust zonder namen of persoonlijke woorden, en zonder verkleinwoorden.
 */

const WORDS = {
  nl: {
    first: ['Dansende', 'Vrolijke', 'Geheime', 'Wilde', 'Zachte', 'Snelle', 'Dromende', 'Gekke', 'Stille', 'Bonkende', 'Zwevende', 'Verre'],
    second: ['Beat', 'Storm', 'Reis', 'Stad', 'Droom', 'Parade', 'Golf', 'Echo', 'Machine', 'Jungle', 'Nacht', 'Haven'],
  },
  en: {
    first: ['Dancing', 'Happy', 'Secret', 'Wild', 'Gentle', 'Speedy', 'Dreaming', 'Crazy', 'Quiet', 'Bouncing', 'Floating', 'Distant'],
    second: ['Beat', 'Storm', 'Journey', 'City', 'Dream', 'Parade', 'Wave', 'Echo', 'Machine', 'Jungle', 'Night', 'Harbour'],
  },
} as const;

type Lang = keyof typeof WORDS;

function langOf(language: string | undefined): Lang {
  return language?.startsWith('en') ? 'en' : 'nl';
}

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length) % list.length];
}

export function randomTitle(language?: string, random: () => number = Math.random): string {
  const words = WORDS[langOf(language)];
  return `${pick(words.first, random)} ${pick(words.second, random)}`;
}

/** Een paar verschillende suggesties tegelijk (voor de keuzeknoppen) */
export function titleSuggestions(count: number, language?: string, random: () => number = Math.random): string[] {
  const result = new Set<string>();
  let guard = 0;
  while (result.size < count && guard++ < 50) result.add(randomTitle(language, random));
  return [...result];
}
