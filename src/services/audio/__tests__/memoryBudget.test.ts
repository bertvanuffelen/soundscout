import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DecodedAudioBudget,
  DEFAULT_BUDGET_BYTES,
  decodedBytes,
  selectBudgetBytes,
  pitchKey,
  type PinSet,
} from '../memoryBudget';
import { logger } from '../../../utils/logger';

const MB = 1024 * 1024;

function pins(sampleIds: string[] = [], pitchKeys: string[] = []): PinSet {
  return { sampleIds: new Set(sampleIds), pitchKeys: new Set(pitchKeys) };
}

describe('decodedBytes', () => {
  it('telt length × kanalen × 4 (float32)', () => {
    expect(decodedBytes({ length: 44100, numberOfChannels: 2 })).toBe(44100 * 2 * 4);
    expect(decodedBytes({ length: 1000, numberOfChannels: 1 })).toBe(4000);
  });

  it('is 0 voor lege of onbekende buffers', () => {
    expect(decodedBytes(null)).toBe(0);
    expect(decodedBytes(undefined)).toBe(0);
    expect(decodedBytes({})).toBe(0);
    expect(decodedBytes({ length: 0, numberOfChannels: 2 })).toBe(0);
  });

  it('neemt 1 kanaal aan als het aantal ontbreekt', () => {
    expect(decodedBytes({ length: 10 })).toBe(40);
  });
});

describe('selectBudgetBytes', () => {
  it('kiest het conservatieve standaardbudget zonder deviceMemory (Safari/iPad, Firefox)', () => {
    expect(selectBudgetBytes(undefined)).toBe(DEFAULT_BUDGET_BYTES);
    expect(DEFAULT_BUDGET_BYTES).toBe(96 * MB);
    expect(selectBudgetBytes(Number.NaN)).toBe(DEFAULT_BUDGET_BYTES);
    expect(selectBudgetBytes(0)).toBe(DEFAULT_BUDGET_BYTES);
  });

  it('volgt de trappen van navigator.deviceMemory', () => {
    expect(selectBudgetBytes(0.5)).toBe(64 * MB);
    expect(selectBudgetBytes(1)).toBe(64 * MB);
    expect(selectBudgetBytes(2)).toBe(96 * MB);
    expect(selectBudgetBytes(4)).toBe(128 * MB);
    expect(selectBudgetBytes(8)).toBe(192 * MB);
  });

  it('elk budget past minstens één volledig thema (58 MB gedecodeerd)', () => {
    for (const gb of [undefined, 0.25, 1, 2, 4, 8]) {
      expect(selectBudgetBytes(gb)).toBeGreaterThan(58 * MB);
    }
  });

  it('is overschrijfbaar voor tests en terug te zetten', () => {
    const budget = new DecodedAudioBudget(4);
    expect(budget.getStats().budgetSource).toBe('deviceMemory');
    budget.setBudgetBytes(10 * MB);
    expect(budget.getBudgetBytes()).toBe(10 * MB);
    expect(budget.getStats().budgetSource).toBe('override');
    budget.setBudgetBytes(null);
    expect(budget.getBudgetBytes()).toBe(128 * MB);
    expect(new DecodedAudioBudget(undefined).getStats().budgetSource).toBe('default');
  });
});

describe('DecodedAudioBudget', () => {
  let budget: DecodedAudioBudget;
  let evicted: string[];
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  function add(id: string, bytes: number, category: 'sample' | 'pitch' = 'sample', sampleId = id) {
    budget.register(id, {
      category,
      sampleId,
      pitchKey: category === 'pitch' ? id : undefined,
      bytes,
      evict: () => evicted.push(id),
    });
  }

  beforeEach(() => {
    budget = new DecodedAudioBudget(undefined);
    budget.setBudgetBytes(100);
    evicted = [];
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('boekt bytes per categorie en aantal', () => {
    add('a', 30);
    add('b', 20);
    add(pitchKey('a', 3), 25, 'pitch', 'a');
    const stats = budget.getStats();
    expect(stats.totalBytes).toBe(75);
    expect(stats.entryCount).toBe(3);
    expect(stats.byCategory.sample).toEqual({ bytes: 50, count: 2 });
    expect(stats.byCategory.pitch).toEqual({ bytes: 25, count: 1 });
    expect(stats.budgetBytes).toBe(100);

    budget.unregister('sample', 'b');
    expect(budget.getStats().totalBytes).toBe(55);
  });

  it('opnieuw registreren vervangt de entry (geen dubbeltelling)', () => {
    add('a', 30);
    add('a', 40);
    expect(budget.getStats().totalBytes).toBe(40);
    expect(budget.getStats().entryCount).toBe(1);
  });

  it('ruimt niets op onder budget', () => {
    add('a', 50);
    add('b', 50);
    expect(budget.enforce()).toEqual({ evicted: 0, freedBytes: 0 });
    expect(evicted).toEqual([]);
  });

  it('ruimt in LRU-volgorde op tot onder budget', () => {
    add('a', 40);
    add('b', 40);
    add('c', 40);
    add('d', 40);
    budget.touch('sample', 'a'); // a is nu het meest recent gebruikt
    const result = budget.enforce();
    // 160 > 100: b (oudst) en c moeten weg, daarna 80 ≤ 100
    expect(evicted).toEqual(['b', 'c']);
    expect(result).toEqual({ evicted: 2, freedBytes: 80 });
    expect(budget.getStats().totalBytes).toBe(80);
    expect(budget.getStats().evictedTotal).toBe(2);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(String(infoSpy.mock.calls[0][0])).toContain('2 buffer(s) opgeruimd');
  });

  it('ruimt nooit vastgepinde samples of pitch-bakes op', () => {
    add('a', 40);
    add(pitchKey('b', 2), 40, 'pitch', 'b');
    add('c', 40);
    budget.setPinProvider(() => pins(['a'], [pitchKey('b', 2)]));
    budget.enforce();
    expect(evicted).toEqual(['c']);
  });

  it('pint een pitch-bake per toonhoogte, niet per sample', () => {
    add('a', 10);
    add(pitchKey('a', 2), 50, 'pitch', 'a');
    add(pitchKey('a', 5), 50, 'pitch', 'a');
    // sample a staat op de tijdlijn met +5; de +2 (oude preview) is los
    budget.setPinProvider(() => pins(['a'], [pitchKey('a', 5)]));
    budget.enforce();
    expect(evicted).toEqual([pitchKey('a', 2)]);
  });

  it('spaart de net toegevoegde buffer (keep)', () => {
    add('a', 60);
    add('b', 60);
    budget.enforce({ category: 'sample', id: 'a' });
    expect(evicted).toEqual(['b']);
  });

  it('ruimt niets op en waarschuwt één keer als alles vastgepind is', () => {
    add('a', 80);
    add('b', 80);
    budget.setPinProvider(() => pins(['a', 'b']));
    expect(budget.enforce()).toEqual({ evicted: 0, freedBytes: 0 });
    budget.enforce();
    expect(evicted).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(budget.getStats().pinnedBytes).toBe(160);

    // Weer onder budget → bij een volgende overschrijding opnieuw waarschuwen
    budget.unregister('sample', 'b');
    budget.enforce();
    add('c', 80);
    budget.setPinProvider(() => pins(['a', 'c']));
    budget.enforce();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('een falende evict-callback breekt de ronde niet', () => {
    budget.register('x', {
      category: 'sample',
      sampleId: 'x',
      bytes: 80,
      evict: () => { throw new Error('boem'); },
    });
    add('y', 80);
    const result = budget.enforce();
    expect(result.evicted).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
  });
});
