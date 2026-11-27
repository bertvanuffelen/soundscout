/**
 * Raad-de-plek (migratie 047): welke plekken staan op de plaat?
 */

import { describe, it, expect } from 'vitest';
import {
  isSpotVisible, toggleRevealed, hiddenSpotIdsFor, spotsHiddenForPraatplaat, NO_REVEAL,
} from '../spotVisibility';

describe('isSpotVisible', () => {
  const hidden = new Set(['a', 'b']);

  it('zonder verborgen plekken is alles zichtbaar (bestaand gedrag)', () => {
    expect(isSpotVisible('a', null)).toBe(true);
    expect(isSpotVisible('a', undefined)).toBe(true);
    expect(isSpotVisible('a', new Set())).toBe(true);
  });

  it('een verborgen plek is niet zichtbaar tot hij onthuld is', () => {
    expect(isSpotVisible('a', hidden)).toBe(false);
    expect(isSpotVisible('a', hidden, NO_REVEAL)).toBe(false);
    expect(isSpotVisible('a', hidden, { revealAll: false, revealedIds: new Set(['a']) })).toBe(true);
    // b blijft verborgen als alleen a onthuld is
    expect(isSpotVisible('b', hidden, { revealAll: false, revealedIds: new Set(['a']) })).toBe(false);
  });

  it('"Alle plekken" toont alles', () => {
    expect(isSpotVisible('b', hidden, { revealAll: true, revealedIds: new Set() })).toBe(true);
  });

  it('een inzending van een andere opdracht (niet in de set) blijft zichtbaar', () => {
    expect(isSpotVisible('c', hidden)).toBe(true);
  });
});

describe('toggleRevealed', () => {
  it('onthult en verbergt, zonder de oude set te wijzigen', () => {
    const start = new Set<string>();
    const one = toggleRevealed(start, 'a');
    expect([...one]).toEqual(['a']);
    expect(start.size).toBe(0);
    expect(toggleRevealed(one, 'a').size).toBe(0);
  });
});

describe('hiddenSpotIdsFor', () => {
  const subs = [
    { id: 's1', praatplaat_id: 'pp1' },
    { id: 's2', assignment_id: 'pp1' },      // nieuwe flow: assignment_id
    { id: 's3', praatplaat_id: 'pp2' },      // andere praatplaat, plekken aan
    { id: 's4', assignment_id: 'template1' },
    { id: 's5' },
  ];

  it('kolom bestaat nog niet (null) = niets verborgen', () => {
    expect(hiddenSpotIdsFor(subs, null).size).toBe(0);
  });

  it('alleen inzendingen van een praatplaat met plekken UIT', () => {
    const hidden = hiddenSpotIdsFor(subs, [
      { praatplaatId: 'pp1', showSpots: false },
      { praatplaatId: 'pp2', showSpots: true },
    ]);
    expect([...hidden].sort()).toEqual(['s1', 's2']);
  });
});

describe('spotsHiddenForPraatplaat', () => {
  const settings = [{ praatplaatId: 'pp1', showSpots: false }, { praatplaatId: 'pp2', showSpots: true }];
  it('volgt de instelling; onbekend = tonen', () => {
    expect(spotsHiddenForPraatplaat('pp1', settings)).toBe(true);
    expect(spotsHiddenForPraatplaat('pp2', settings)).toBe(false);
    expect(spotsHiddenForPraatplaat('pp9', settings)).toBe(false);
    expect(spotsHiddenForPraatplaat('pp1', null)).toBe(false);
    expect(spotsHiddenForPraatplaat(null, settings)).toBe(false);
  });
});
