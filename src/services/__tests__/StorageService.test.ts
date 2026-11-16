/**
 * StorageService — composities via de nieuwe opslag (V2 Fase 2), gezien door
 * de bestaande synchrone API. Twee werelden: mét IndexedDB (fake-indexeddb)
 * en de terugval zonder (gewone jsdom).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { useTimelineStore } from '../../stores/timelineStore';
import type { storageService as StorageServiceInstance } from '../StorageService';

type Service = typeof StorageServiceInstance;

const LEGACY_KEY = 'soundscout:compositions';

async function loadService(withIndexedDb: boolean): Promise<{ service: Service; max: number }> {
  vi.resetModules();
  if (withIndexedDb) {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  }
  const mod = await import('../StorageService');
  return { service: mod.storageService, max: mod.MAX_LOCAL_COMPOSITIONS };
}

function timeline() {
  return useTimelineStore.getState().getTimelineState();
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('StorageService met IndexedDB', () => {
  it('bewaart, werkt bij, deelt en verwijdert zonder de oude sleutel te gebruiken', async () => {
    const { service } = await loadService(true);
    expect(await service.whenCompositionsReady()).toBe('idb');

    const saved = service.saveComposition('Verre Droom', timeline(), []);
    expect(saved).not.toBeNull();
    expect(service.lastSaveError).toBeNull();
    expect(service.getCompositionById(saved!.id)?.name).toBe('Verre Droom');

    const updated = service.updateComposition(saved!.id, { name: 'Dichtbij' });
    expect(updated?.name).toBe('Dichtbij');
    const code = service.shareComposition(saved!.id);
    expect(code).toBeTruthy();
    expect(service.getCompositionByShareCode(code!)?.id).toBe(saved!.id);
    expect(service.shareComposition(saved!.id)).toBe(code);

    await service.whenCompositionsPersisted();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();

    expect(service.deleteComposition(saved!.id)).toBe(true);
    expect(service.deleteComposition(saved!.id)).toBe(false);
    expect(service.getCompositions()).toEqual([]);
  });

  it('houdt het maximum aan: de oudste maakt plaats voor de nieuwe', async () => {
    const { service, max } = await loadService(true);
    await service.whenCompositionsReady();
    expect(max).toBe(10);

    vi.useFakeTimers();
    const names: string[] = [];
    for (let i = 1; i <= max + 1; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, i)));
      names.push(service.saveComposition(`Nummer ${i}`, timeline(), [])!.name);
    }
    vi.useRealTimers();

    const kept = service.getCompositions().map((c) => c.name);
    expect(kept).toHaveLength(max);
    expect(kept).not.toContain('Nummer 1');
    expect(kept).toContain(`Nummer ${max + 1}`);
  });

  it('neemt bestaande composities over en meldt kapotte items', async () => {
    // Eerst op de oude manier bewaren (zonder IndexedDB) …
    const old = await loadService(false);
    old.service.saveComposition('Van vroeger', timeline(), []);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY)!) as unknown[];
    const seeded = JSON.stringify([...legacy, { id: 'kapot' }]);
    localStorage.setItem(LEGACY_KEY, seeded);

    // … dan de nieuwe versie van de app
    const { service } = await loadService(true);
    await service.whenCompositionsReady();

    expect(service.getCompositions().map((c) => c.name)).toEqual(['Van vroeger']);
    expect(service.lastLoadDroppedCount).toBe(1);
    expect(localStorage.getItem(LEGACY_KEY)).toBe(seeded);
    expect(JSON.parse(localStorage.getItem('soundscout:migrated-to-idb')!)).toMatchObject({
      state: 'done', migratedCount: 1, skippedCount: 1,
    });
  });

  it('instellingen en codes blijven in localStorage', async () => {
    const { service } = await loadService(true);
    await service.whenCompositionsReady();

    service.setSaveOnlineInfo('ABC123', 'geheim', 'Verre Droom');
    service.savePreferences({ masterVolume: 0.5 });
    service.setSubmissionSecret('sub-1', 's');

    expect(localStorage.getItem('soundscout:save-online')).toContain('ABC123');
    expect(localStorage.getItem('soundscout:preferences')).toContain('0.5');
    expect(service.getSaveOnlineInfo()?.saveCode).toBe('ABC123');
    expect(service.getSubmissionSecret('sub-1')).toBe('s');
  });
});

describe('StorageService zonder IndexedDB (terugval)', () => {
  it('werkt als vanouds op localStorage', async () => {
    const { service } = await loadService(false);
    expect(service.getCompositionStorageMode()).toBe('local');

    const saved = service.saveComposition('Verre Droom', timeline(), []);
    expect(saved).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(LEGACY_KEY)!)).toHaveLength(1);
    expect(service.updateComposition(saved!.id, { name: 'Dichtbij' })?.name).toBe('Dichtbij');
    expect(service.deleteComposition(saved!.id)).toBe(true);
    expect(JSON.parse(localStorage.getItem(LEGACY_KEY)!)).toEqual([]);
  });

  it('een volle opslag komt boven in lastSaveError', async () => {
    const { service } = await loadService(false);
    service.saveComposition('Past nog', timeline(), []);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    expect(service.saveComposition('Past niet meer', timeline(), [])).toBeNull();
    expect(service.lastSaveError).toBe('quota_exceeded');
    vi.restoreAllMocks();

    expect(service.getCompositions().map((c) => c.name)).toEqual(['Past nog']);
    expect(service.saveComposition('Nu wel', timeline(), [])).not.toBeNull();
    expect(service.lastSaveError).toBeNull();
  });
});
