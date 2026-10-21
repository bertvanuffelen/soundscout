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
