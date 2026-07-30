/**
 * Tests voor de zelfstandige sequencer-opslag (localStorage + Zod).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadSequences, saveSequences } from '../sequencerStorage';
import { createDefaultSequence } from '../../utils/sequencer';

const STORAGE_KEY = 'soundscout:sequencer-lab';

describe('sequencerStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('roundtrip: save → load geeft dezelfde sequences terug', () => {
    const seq = createDefaultSequence('Roundtrip');
    saveSequences([seq]);
    const loaded = loadSequences();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(seq);
  });

  it('geeft lege lijst bij afwezige opslag', () => {
    expect(loadSequences()).toEqual([]);
  });

  it('geeft lege lijst bij kapotte JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{niet-json');
    expect(loadSequences()).toEqual([]);
  });

  it('geeft lege lijst bij een ongeldige envelop', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(loadSequences()).toEqual([]);
  });

  it('dropt ongeldige entries maar behoudt geldige', () => {
    const good = createDefaultSequence('Geldig');
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        sequences: [good, { id: 'kapot', name: 'Zonder sporen' }],
      })
    );
    const loaded = loadSequences();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Geldig');
  });

  it('weigert sequences buiten de grenzen (lengthSteps > 32)', () => {
    const bad = { ...createDefaultSequence('Te lang'), lengthSteps: 64 };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, sequences: [bad] })
    );
    expect(loadSequences()).toEqual([]);
  });
});
