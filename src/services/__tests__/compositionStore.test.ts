/**
 * compositionStore — lokale composities in IndexedDB met localStorage als
 * back-up en terugval (V2 Fase 2). Draait op fake-indexeddb; elke test krijgt
 * een eigen, lege database.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange, IDBObjectStore } from 'fake-indexeddb';
import Dexie from 'dexie';
import {
  CompositionStore,
  LEGACY_COMPOSITIONS_KEY,
  MIGRATION_MARKER_KEY,
  OUTBOX_KEY,
} from '../compositionStore';
import type { CompositionStoreOptions, CompositionWriteError } from '../compositionStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { parseSavedCompositions } from '../../utils/schemas';

const DB_NAME = 'soundscout-test';

interface Fixture {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

function composition(n: number, overrides: Partial<Fixture> = {}): Fixture {
  const stamp = new Date(Date.UTC(2026, 0, n, 12)).toISOString();
  return {
    id: `comp-${n}`,
    name: `Soundscape ${n}`,
    createdAt: stamp,
    updatedAt: stamp,
    timeline: JSON.parse(JSON.stringify(useTimelineStore.getState().getTimelineState())),
    samples: [],
    metadata: { duration: 0, trackCount: 0, clipCount: 0, locations: [] },
    ...overrides,
  };
}

function seedLegacy(items: unknown[]): string {
  const text = JSON.stringify(items);
  localStorage.setItem(LEGACY_COMPOSITIONS_KEY, text);
  return text;
}

const open: CompositionStore[] = [];

function createStore(idb: IDBFactory | null, extra: Partial<CompositionStoreOptions> = {}): CompositionStore {
  const store = new CompositionStore({
    indexedDB: idb,
    IDBKeyRange,
    dbName: DB_NAME,
    crossTab: false,
    ...extra,
  });
  open.push(store);
  return store;
}

function ids(store: CompositionStore): string[] {
  return (store.list().raw as Fixture[]).map((c) => c.id);
}

/** Rechtstreeks in de database kijken, buiten de store om */
async function rowsInIdb(idb: IDBFactory): Promise<Fixture[]> {
  const db = new Dexie(DB_NAME, { indexedDB: idb, IDBKeyRange });
  db.version(1).stores({ compositions: 'id, updatedAt', meta: 'key' });
  try {
    return await db.table<Fixture>('compositions').toArray();
  } finally {
    db.close();
  }
}

/** localStorage die op commando "vol" is */
function fullableStorage() {
  const state = { full: false };
  const storage: Storage = {
    get length() { return localStorage.length; },
    clear: () => localStorage.clear(),
    getItem: (key) => localStorage.getItem(key),
    key: (index) => localStorage.key(index),
    removeItem: (key) => localStorage.removeItem(key),
    setItem: (key, value) => {
      if (state.full) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      localStorage.setItem(key, value);
    },
  };
  return { storage, state };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  for (const store of open.splice(0)) store.dispose();
  vi.restoreAllMocks();
});

describe('nieuwe installatie', () => {
  it('start leeg in IndexedDB en legt vast dat er niets over te zetten was', async () => {
    const store = createStore(new IDBFactory());
    expect(store.getMode()).toBe('pending');
    expect(await store.whenReady()).toBe('idb');

    expect(store.list()).toEqual({ raw: [], extraDropped: 0 });
    expect(store.getMigrationMarker()).toMatchObject({ state: 'done', sourceCount: 0, migratedCount: 0, skippedCount: 0 });
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBeNull();
  });
});

describe('migratie', () => {
  it('zet N composities over en laat de oude lijst onaangeroerd staan', async () => {
    const idb = new IDBFactory();
    const items = [composition(1), composition(2), composition(3)];
    const before = seedLegacy(items);

    const store = createStore(idb);
    await store.whenReady();

    expect(store.getMode()).toBe('idb');
    expect(store.list().raw).toEqual(items);
    expect(parseSavedCompositions(store.list().raw)).toHaveLength(3);
    expect(await rowsInIdb(idb)).toHaveLength(3);
    // Back-up: byte voor byte gelijk
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBe(before);
    const marker = store.getMigrationMarker();
    expect(marker).toMatchObject({ version: 1, state: 'done', sourceCount: 3, migratedCount: 3, skippedCount: 0 });
    expect(Number.isNaN(Date.parse(marker!.migratedAt!))).toBe(false);
  });

  it('is idempotent: opnieuw starten dupliceert niets en haalt niets terug', async () => {
    const idb = new IDBFactory();
    seedLegacy([composition(1), composition(2), composition(3)]);

    const first = createStore(idb);
    await first.whenReady();
    // Een stille opruiming (de oudste bij het maximum) raakt de back-up niet
    first.remove('comp-2');
    first.put(composition(1, { name: 'Bijgewerkt', updatedAt: '2026-06-01T10:00:00.000Z' }));
    await first.whenIdle();
    first.dispose();

    const second = createStore(idb);
    await second.whenReady();

    expect(ids(second).sort()).toEqual(['comp-1', 'comp-3']);
    expect((second.list().raw as Fixture[]).find((c) => c.id === 'comp-1')?.name).toBe('Bijgewerkt');
    // comp-2 staat nog in de back-up, maar komt niet terug
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toContain('comp-2');
  });

  it('slaat een kapot item over, meldt het en bewaart het in de back-up', async () => {
    const idb = new IDBFactory();
    const corrupt = { id: 'comp-kapot', name: 'Half bewaard', timeline: 'geen tijdlijn' };
    const before = seedLegacy([composition(1), corrupt, composition(2), 'losse tekst']);

    const store = createStore(idb);
    await store.whenReady();

    expect(store.getMode()).toBe('idb');
    expect(ids(store)).toEqual(['comp-1', 'comp-2']);
    expect(store.list().extraDropped).toBe(2);
    expect(store.getMigrationMarker()).toMatchObject({ state: 'done', sourceCount: 4, migratedCount: 2, skippedCount: 2 });
    expect((await rowsInIdb(idb)).map((r) => r.id).sort()).toEqual(['comp-1', 'comp-2']);
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBe(before);
  });

  it('een halverwege afgebroken migratie verliest of dupliceert niets bij de volgende start', async () => {
    const idb = new IDBFactory();
    const items = [composition(1), composition(2), composition(3)];
    const before = seedLegacy(items);

    // De tweede kopie mislukt: de hele transactie moet terugdraaien
    const realPut = IDBObjectStore.prototype.put;
    let calls = 0;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      calls += 1;
      if (calls === 2) throw new DOMException('Schijf weg', 'UnknownError');
      return realPut.apply(this, args as Parameters<typeof realPut>);
    });

    const crashed = createStore(idb);
    expect(await crashed.whenReady()).toBe('local');
    // Het kind ziet gewoon zijn werk (uit localStorage)
    expect(crashed.list().raw).toEqual(items);
    expect(crashed.getMigrationMarker()).toMatchObject({ state: 'copying' });
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBe(before);

    // Werk dat in deze sessie bewaard wordt, komt in het logboek, niet in de back-up
    expect(crashed.put(composition(4))).toEqual({ ok: true });
    expect(ids(crashed)).toEqual(['comp-1', 'comp-2', 'comp-3', 'comp-4']);
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBe(before);
    crashed.dispose();
    vi.restoreAllMocks();
    expect(await rowsInIdb(idb)).toHaveLength(0);

    const retry = createStore(idb);
    expect(await retry.whenReady()).toBe('idb');
    expect(ids(retry)).toEqual(['comp-1', 'comp-2', 'comp-3', 'comp-4']);
    expect(await rowsInIdb(idb)).toHaveLength(4);
    expect(retry.getMigrationMarker()).toMatchObject({ state: 'done', migratedCount: 3 });
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBe(before);
  });

  it('een achtergebleven marker "copying" zonder kopie start de migratie gewoon opnieuw', async () => {
    const idb = new IDBFactory();
    seedLegacy([composition(1), composition(2)]);
    localStorage.setItem(MIGRATION_MARKER_KEY, JSON.stringify({
      version: 1, state: 'copying', startedAt: '2026-01-01T00:00:00.000Z', sourceCount: 2, migratedCount: 2, skippedCount: 0,
    }));

    const store = createStore(idb);
    await store.whenReady();

    expect(ids(store)).toEqual(['comp-1', 'comp-2']);
    expect(store.getMigrationMarker()?.state).toBe('done');
  });

  it('herstelt uit de back-up als IndexedDB is leeggemaakt terwijl de marker er nog staat', async () => {
    seedLegacy([composition(1), composition(2)]);
    const first = createStore(new IDBFactory());
    await first.whenReady();
    first.dispose();

    // Nieuwe, lege database; localStorage (marker + back-up) is er nog
    const restored = createStore(new IDBFactory());
    await restored.whenReady();

    expect(restored.getMode()).toBe('idb');
    expect(ids(restored)).toEqual(['comp-1', 'comp-2']);
  });

  it('bewaren terwijl de opslag nog opent gaat niet verloren en wordt niet dubbel', async () => {
    const idb = new IDBFactory();
    seedLegacy([composition(1)]);

    const store = createStore(idb);
    expect(store.getMode()).toBe('pending');
    // Lezen kan meteen: de oude lijst
    expect(ids(store)).toEqual(['comp-1']);
    expect(store.put(composition(2))).toEqual({ ok: true });
    expect(store.remove('comp-1')).toEqual({ ok: true });
    expect(ids(store)).toEqual(['comp-2']);

    await store.whenReady();
    expect(store.getMode()).toBe('idb');
    expect(ids(store)).toEqual(['comp-2']);
    expect((await rowsInIdb(idb)).map((r) => r.id)).toEqual(['comp-2']);
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });
});

describe('terugval op localStorage', () => {
  it('zonder IndexedDB werkt alles zoals vroeger op soundscout:compositions', async () => {
    seedLegacy([composition(1)]);
    const store = createStore(null);

    // Meteen beslist, geen wachttijd
    expect(store.getMode()).toBe('local');
    expect(ids(store)).toEqual(['comp-1']);

    expect(store.put(composition(2))).toEqual({ ok: true });
    expect(store.put(composition(1, { name: 'Nieuwe naam' }))).toEqual({ ok: true });
    expect(store.remove('comp-2', true)).toEqual({ ok: true });

    const stored = JSON.parse(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)!) as Fixture[];
    expect(stored.map((c) => [c.id, c.name])).toEqual([['comp-1', 'Nieuwe naam']]);
    expect(localStorage.getItem(MIGRATION_MARKER_KEY)).toBeNull();
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
    expect(await store.whenReady()).toBe('local');
  });

  it('een IndexedDB die niet opent valt terug zonder iets te beschadigen', async () => {
    const before = seedLegacy([composition(1), composition(2)]);
    const broken = {
      open: () => { throw new DOMException('Geblokkeerd', 'SecurityError'); },
    } as unknown as IDBFactory;

    const store = createStore(broken);
    store.put(composition(3)); // tijdens het openen
    expect(await store.whenReady()).toBe('local');

    expect(ids(store)).toEqual(['comp-1', 'comp-2', 'comp-3']);
    expect(localStorage.getItem(MIGRATION_MARKER_KEY)).toBeNull();
    // Nooit gemigreerd: het wachtende werk staat gewoon in de oude lijst
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)!)).toHaveLength(3);
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toContain(before.slice(1, -1));
  });

  it('een IndexedDB die blijft hangen valt na de wachttijd terug', async () => {
    seedLegacy([composition(1)]);
    const hanging = { open: () => ({}) } as unknown as IDBFactory;

    const store = createStore(hanging, { openTimeoutMs: 30 });
    expect(await store.whenReady()).toBe('local');
    expect(ids(store)).toEqual(['comp-1']);
  });

  it('na een geslaagde migratie blijft de back-up bevroren en wordt later werk alsnog verwerkt', async () => {
    const idb = new IDBFactory();
    const before = seedLegacy([composition(1)]);
    const first = createStore(idb);
    await first.whenReady();
    first.dispose();

    // Volgende sessie: IndexedDB doet het niet
    const offline = createStore(null);
    expect(offline.getMode()).toBe('local');
    expect(offline.put(composition(2))).toEqual({ ok: true });
    expect(ids(offline)).toEqual(['comp-1', 'comp-2']);
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBe(before);
    offline.dispose();

    // En daarna weer wel
    const back = createStore(idb);
    await back.whenReady();
    expect(ids(back)).toEqual(['comp-1', 'comp-2']);
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });
});

describe('bewaren, laden, verwijderen', () => {
  it('rondje in IndexedDB dat een nieuwe sessie overleeft', async () => {
    const idb = new IDBFactory();
    const store = createStore(idb);
    await store.whenReady();

    expect(store.put(composition(1))).toEqual({ ok: true });
    expect(store.put(composition(2))).toEqual({ ok: true });
    // Synchroon zichtbaar, nog vóór IndexedDB bevestigt
    expect(ids(store)).toEqual(['comp-1', 'comp-2']);
    expect(store.put(composition(1, { name: 'Versie 2' }))).toEqual({ ok: true });
    expect(store.remove('comp-2')).toEqual({ ok: true });
    await store.whenIdle();
    store.dispose();

    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
    // Composities staan niet meer in de oude sleutel
    expect(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)).toBeNull();

    const next = createStore(idb);
    await next.whenReady();
    expect((next.list().raw as Fixture[]).map((c) => [c.id, c.name])).toEqual([['comp-1', 'Versie 2']]);
  });

  it('lezen geeft steeds verse objecten: aanpassen raakt de opslag niet', async () => {
    const store = createStore(new IDBFactory());
    await store.whenReady();
    store.put(composition(1));

    (store.list().raw[0] as Fixture).name = 'Stiekem aangepast';
    expect((store.list().raw[0] as Fixture).name).toBe('Soundscape 1');
  });

  it('een tabblad dat sluit vóór IndexedDB bevestigt: het logboek wordt bij de volgende start verwerkt', async () => {
    const idb = new IDBFactory();
    seedLegacy([]);
    const first = createStore(idb);
    await first.whenReady();
    first.put(composition(1, { updatedAt: '2026-03-01T10:00:00.000Z' }));
    await first.whenIdle();
    first.dispose();

    // Nagebootst: een nieuwere versie en een verwijdering die alleen het logboek haalden
    localStorage.setItem(OUTBOX_KEY, JSON.stringify({
      v: 1,
      ops: [
        { seq: 'a', type: 'put', id: 'comp-1', item: composition(1, { name: 'Laatste versie', updatedAt: '2026-03-02T10:00:00.000Z' }) },
        { seq: 'b', type: 'put', id: 'comp-9', item: composition(9) },
        { seq: 'c', type: 'delete', id: 'comp-bestaat-niet' },
      ],
    }));

    const next = createStore(idb);
    await next.whenReady();
    expect((next.list().raw as Fixture[]).map((c) => [c.id, c.name]).sort()).toEqual([
      ['comp-1', 'Laatste versie'],
      ['comp-9', 'Soundscape 9'],
    ]);
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it('een bewuste verwijdering haalt de compositie ook uit de back-up, de rest blijft', async () => {
    const idb = new IDBFactory();
    const corrupt = { id: 'comp-kapot', name: 'Half bewaard' };
    seedLegacy([composition(1), corrupt, composition(2)]);
    const store = createStore(idb);
    await store.whenReady();

    expect(store.remove('comp-1', true)).toEqual({ ok: true });
    await store.whenIdle();

    const backup = JSON.parse(localStorage.getItem(LEGACY_COMPOSITIONS_KEY)!) as Fixture[];
    expect(backup.map((c) => c.id)).toEqual(['comp-kapot', 'comp-2']);
    expect(ids(store)).toEqual(['comp-2']);
  });

  it('wat niet te serialiseren is wordt geweigerd', async () => {
    const store = createStore(new IDBFactory());
    await store.whenReady();
    const circular: Record<string, unknown> & { id: string } = { id: 'rond' };
    circular.self = circular;

    expect(store.put(circular)).toEqual({ ok: false, error: 'serialization' });
    expect(store.list().raw).toEqual([]);
  });

  it('geeft luisteraars een seintje zodra de opslag klaar is', async () => {
    const store = createStore(new IDBFactory());
    const listener = vi.fn();
    store.subscribe(listener);
    const versionBefore = store.getVersion();

    await store.whenReady();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getVersion()).toBe(versionBefore + 1);
  });
});

describe('opslag vol', () => {
  it('terugval: een volle localStorage komt synchroon terug als quota-fout', () => {
    const { storage, state } = fullableStorage();
    seedLegacy([composition(1)]);
    const store = createStore(null, { storage });

    state.full = true;
    expect(store.put(composition(2))).toEqual({ ok: false, error: 'quota_exceeded' });
    // Niets half geschreven
    expect(ids(store)).toEqual(['comp-1']);

    state.full = false;
    expect(store.put(composition(2))).toEqual({ ok: true });
  });

  it('IndexedDB: een volle localStorage houdt het bewaren niet tegen', async () => {
    const idb = new IDBFactory();
    const { storage, state } = fullableStorage();
    const errors: CompositionWriteError[] = [];
    const store = createStore(idb, { storage, onAsyncError: (e) => errors.push(e) });
    await store.whenReady();

    state.full = true;
    expect(store.put(composition(1))).toEqual({ ok: true });
    await store.whenIdle();

    expect(errors).toEqual([]);
    expect((await rowsInIdb(idb)).map((r) => r.id)).toEqual(['comp-1']);
  });

  it('IndexedDB vol, logboek wel gelukt: geen fout, het werk staat veilig in localStorage', async () => {
    const idb = new IDBFactory();
    const errors: CompositionWriteError[] = [];
    const store = createStore(idb, { onAsyncError: (e) => errors.push(e) });
    await store.whenReady();

    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Vol', 'QuotaExceededError');
    });
    expect(store.put(composition(1))).toEqual({ ok: true });
    await store.whenIdle();

    expect(errors).toEqual([]);
    expect(ids(store)).toEqual(['comp-1']);
    expect(localStorage.getItem(OUTBOX_KEY)).toContain('comp-1');
    store.dispose();
    vi.restoreAllMocks();

    // Volgende start: alsnog in IndexedDB
    const next = createStore(idb);
    await next.whenReady();
    expect(ids(next)).toEqual(['comp-1']);
    expect((await rowsInIdb(idb)).map((r) => r.id)).toEqual(['comp-1']);
  });

  it('IndexedDB én localStorage vol: de fout komt achteraf boven, het werk blijft in beeld en wordt opnieuw geprobeerd', async () => {
    const idb = new IDBFactory();
    const { storage, state } = fullableStorage();
    const errors: CompositionWriteError[] = [];
    const store = createStore(idb, { storage, onAsyncError: (e) => errors.push(e) });
    await store.whenReady();
    const listener = vi.fn();
    store.subscribe(listener);

    state.full = true;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Vol', 'QuotaExceededError');
    });
    expect(store.put(composition(1))).toEqual({ ok: true });
    await store.whenIdle();

    expect(errors).toEqual(['quota_exceeded']);
    expect(listener).toHaveBeenCalled();
    expect(ids(store)).toEqual(['comp-1']);
    expect(await rowsInIdb(idb)).toHaveLength(0);

    // Er komt weer ruimte: de volgende schrijfactie neemt de wachtende mee
    vi.restoreAllMocks();
    state.full = false;
    store.put(composition(2));
    await store.whenIdle();
    expect((await rowsInIdb(idb)).map((r) => r.id).sort()).toEqual(['comp-1', 'comp-2']);
  });
});
