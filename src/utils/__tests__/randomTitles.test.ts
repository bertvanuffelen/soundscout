import { describe, it, expect } from 'vitest';
import { randomTitle, titleSuggestions } from '../randomTitles';

describe('randomTitles', () => {
  it('maakt twee woorden in de juiste taal', () => {
    expect(randomTitle('nl', () => 0)).toBe('Dansende Beat');
    expect(randomTitle('en-GB', () => 0)).toBe('Dancing Beat');
  });

  it('geeft verschillende suggesties', () => {
    const list = titleSuggestions(3, 'nl');
    expect(new Set(list).size).toBe(list.length);
    expect(list.length).toBe(3);
  });
});

import { vi, afterEach } from 'vitest';
import { generateRandomName } from '../randomNames';

describe('generateRandomName (fase 3.3)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('geeft een Engelse schuilnaam in het Engels', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(generateRandomName('en-GB')).toBe('Happy Parrot');
  });

  it('blijft Nederlands in het Nederlands', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(generateRandomName('nl')).toBe('Vrolijke Papegaai');
  });
});

import { peerChipLabel } from '../peerChipLabel';

describe('peerChipLabel (fase 3.3)', () => {
  it('vertaalt ingebouwde criteria alleen in het Engels', () => {
    expect(peerChipLabel('Lekker ritme!', 'en')).toBe('Great rhythm!');
    expect(peerChipLabel('Lekker ritme!', 'nl')).toBe('Lekker ritme!');
    expect(peerChipLabel('Eigen criterium', 'en')).toBe('Eigen criterium');
  });
});
