/**
 * CompositionStore — lokaal bewaarde composities in IndexedDB (Dexie), V2 Fase 2.
 *
 * ── Ontwerpnotitie ──────────────────────────────────────────────────────────
 *
 * KEUZE: synchrone API behouden, met een cache in het geheugen die bij het
 * opstarten uit IndexedDB wordt gevuld en waar elke schrijfactie doorheen
 * gaat (write-through). GEEN async-API.
 *
 * Waarom: `storageService` wordt op ±40 plekken synchroon gebruikt, ook
 * midden in de bewaar-/inleverketen (`useStageSave`, `unsavedWork`,
 * `finishSession`) en tijdens renders (`StartScreen`). Die allemaal async
 * maken raakt de inleverlogica — het gevoeligste stuk van de app — voor een
 * opslagwissel die daar niets aan hoort te veranderen. Met de cache blijven
 * alle aanroepers ongewijzigd; alleen de twee schermen die bij het laden een
 * lijst tonen (`StartScreen`, `CompositionsView`) luisteren naar "de opslag
 * is klaar/veranderd" via `useCompositionsVersion`.
 *
 * Wat een synchrone API op een asynchrone database kost, en hoe dat is
 * afgedekt:
 *
 * 1. Lezen vóór de cache gevuld is (de eerste milliseconden): dan wordt
 *    gelezen uit localStorage (de oude lijst + het logboek hieronder). Zodra
 *    IndexedDB klaar is krijgen de luisteraars een seintje.
 * 2. Schrijven is pas "echt" als de IndexedDB-transactie klaar is, maar de
 *    aanroeper krijgt meteen antwoord. Daarom gaat elke schrijfactie EERST
 *    synchroon naar een klein logboek in localStorage (`OUTBOX_KEY`) en wordt
 *    daar pas uit gehaald als IndexedDB heeft bevestigd. Sluit een kind het
 *    tabblad direct na "Opslaan", dan wordt het logboek bij de volgende start
 *    alsnog verwerkt. Past het logboek niet (localStorage vol), dan gaat de
 *    schrijfactie toch door naar IndexedDB; mislukt die óók, dan komt de fout
 *    achteraf in `lastSaveError` (via `onAsyncError`) en blijft het werk in
 *    het geheugen staan en wordt bij de volgende schrijfactie opnieuw
 *    geprobeerd.
 * 3. Meerdere tabbladen: elk tabblad heeft een eigen cache. Na elke
 *    bevestigde schrijfactie gaat er een seintje over een BroadcastChannel;
 *    andere tabbladen lezen dan opnieuw in.
 *
 * DRIE STANDEN
 *  - `pending`  IndexedDB wordt geopend. Lezen = oude lijst + logboek;
 *               schrijven = naar het logboek.
 *  - `idb`      Normaal. Lezen = cache; schrijven = cache + logboek + IndexedDB.
 *  - `local`    IndexedDB is er niet of faalt. Zonder migratie-marker werkt
 *               alles precies als vroeger op `soundscout:compositions`. Mét
 *               marker is die sleutel een bevroren back-up: dan gaat schrijven
 *               naar het logboek en wordt dat bij de eerstvolgende geslaagde
 *               start in IndexedDB verwerkt.
 *
 * MIGRATIE (eenmalig, zie docs/v2/LOCAL-STORAGE.md): kopiëren + controleren +
 * "klaar"-vlag gebeuren in ÉÉN IndexedDB-transactie; die slaagt helemaal of
 * helemaal niet. De oude localStorage-lijst blijft staan als back-up. Alleen
 * een bewuste verwijdering door de gebruiker haalt die ene compositie óók uit
 * de back-up (gedeelde apparaten: "Klaar, ik stop" moet echt wissen).
 */

import Dexie, { type Table } from 'dexie';
import { SavedCompositionSchema } from '../utils/schemas';
import { logger } from '../utils/logger';

// --- Sleutels en namen ---

/** De oude lijst; na de migratie een bevroren back-up */
export const LEGACY_COMPOSITIONS_KEY = 'soundscout:compositions';
/** Marker: wanneer en hoeveel er naar IndexedDB is overgezet */
export const MIGRATION_MARKER_KEY = 'soundscout:migrated-to-idb';
/** Logboek van schrijfacties die IndexedDB nog niet heeft bevestigd */
export const OUTBOX_KEY = 'soundscout:compositions-outbox';
export const COMPOSITIONS_DB_NAME = 'soundscout-local';

const META_MIGRATION_KEY = 'legacy-migration';
const DEFAULT_OPEN_TIMEOUT_MS = 4000;
const MAX_HYDRATE_ROUNDS = 5;

// --- Types ---

export type CompositionStoreMode = 'pending' | 'idb' | 'local';
export type CompositionWriteError = 'quota_exceeded' | 'serialization' | 'unknown';
export type CompositionWriteResult = { ok: true } | { ok: false; error: CompositionWriteError };

/** Een opgeslagen compositie: minstens een id; de rest bewaakt het Zod-schema */
type StoredItem = { id: string; updatedAt?: unknown; createdAt?: unknown } & Record<string, unknown>;

interface MetaRow {
  key: string;
  value: unknown;
}

export interface MigrationMarker {
  version: 1;
  state: 'copying' | 'done';
  startedAt: string;
  migratedAt?: string;
  /** Aantal items in de oude lijst */
  sourceCount: number;
  /** Aantal geldige items dat in IndexedDB staat */
  migratedCount: number;
  /** Aantal ongeldige items: overgeslagen, staan nog in de back-up */
  skippedCount: number;
}

interface OutboxOp {
  seq: string;
  type: 'put' | 'delete';
  id: string;
  item?: StoredItem;
}

interface Outbox {
  v: 1;
  ops: OutboxOp[];
}

interface PendingOp {
  op: OutboxOp;
  /** false = staat niet in het logboek (localStorage vol): alleen in het geheugen */
  journaled: boolean;
}

export interface CompositionStoreOptions {
  storage?: Storage | null;
  /** `null` = doe alsof IndexedDB ontbreekt */
  indexedDB?: IDBFactory | null;
  IDBKeyRange?: typeof IDBKeyRange;
  dbName?: string;
  openTimeoutMs?: number;
  /** Andere tabbladen op de hoogte houden (BroadcastChannel) */
  crossTab?: boolean;
  /** Achteraf mislukte schrijfactie die nergens veilig staat */
  onAsyncError?: (error: CompositionWriteError) => void;
}

// --- Database ---

class CompositionsDB extends Dexie {
  compositions!: Table<StoredItem, string>;
  meta!: Table<MetaRow, string>;

  constructor(name: string, idb: IDBFactory, keyRange?: typeof IDBKeyRange) {
    super(name, { indexedDB: idb, ...(keyRange ? { IDBKeyRange: keyRange } : {}) });
    this.version(1).stores({
      compositions: 'id, updatedAt',
      meta: 'key',
    });
  }
}

// --- Pure hulpjes ---

function isStoredItem(value: unknown): value is StoredItem {
  return typeof value === 'object' && value !== null
    && typeof (value as { id?: unknown }).id === 'string';
}

function isValid(value: unknown): value is StoredItem {
  return isStoredItem(value) && SavedCompositionSchema.safeParse(value).success;
}

function time(value: unknown): number {
  const t = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const e = error as { name?: unknown; inner?: { name?: unknown } };
  return `${typeof e.name === 'string' ? e.name : ''} ${typeof e.inner?.name === 'string' ? e.inner.name : ''}`;
}

export function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException
    && (error.code === 22 || error.code === 1014)) return true;
  return /QuotaExceeded|NS_ERROR_DOM_QUOTA_REACHED/.test(errorName(error));
}

function classify(error: unknown): CompositionWriteError {
  return isQuotaError(error) ? 'quota_exceeded' : 'unknown';
}

/** Schrijfacties toepassen op een ruwe lijst; volgorde en vreemde items blijven staan */
function applyOps(list: unknown[], ops: OutboxOp[]): unknown[] {
  let result = list;
  for (const op of ops) {
    if (op.type === 'delete') {
      result = result.filter((entry) => !(isStoredItem(entry) && entry.id === op.id));
    } else if (op.item) {
      const index = result.findIndex((entry) => isStoredItem(entry) && entry.id === op.id);
      result = index === -1
        ? [...result, op.item]
        : result.map((entry, i) => (i === index ? op.item : entry));
    }
  }
  return result;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

let seqCounter = 0;
function nextSeq(): string {
  seqCounter += 1;
  return `${Date.now()}-${seqCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- De store ---

export class CompositionStore {
  private mode: CompositionStoreMode = 'pending';
  private db: CompositionsDB | null = null;
  /** id → JSON; alleen gevuld in stand `idb`. Lezen geeft steeds verse objecten. */
  private cache = new Map<string, string>();
  /** Rijen in IndexedDB die het schema niet halen (blijven staan, tellen als "niet geladen") */
  private invalidRows = 0;
  /** Bij de migratie in déze sessie overgeslagen items */
  private migrationSkipped = 0;
  private pending: PendingOp[] = [];
  private queue: Promise<void> = Promise.resolve();
  private readonly ready: Promise<CompositionStoreMode>;
  private listeners = new Set<() => void>();
  private version = 0;
  private channel: BroadcastChannel | null = null;
  private disposed = false;

  private readonly storage: Storage | null;
  private readonly idb: IDBFactory | null;
  private readonly keyRange: typeof IDBKeyRange | undefined;
  private readonly dbName: string;
  private readonly openTimeoutMs: number;
  private readonly crossTab: boolean;
  private readonly onAsyncError: ((error: CompositionWriteError) => void) | undefined;

  constructor(options: CompositionStoreOptions = {}) {
    this.storage = options.storage !== undefined ? options.storage : safeGlobal(() => globalThis.localStorage);
    this.idb = options.indexedDB !== undefined ? options.indexedDB : safeGlobal(() => globalThis.indexedDB);
    this.keyRange = options.IDBKeyRange ?? safeGlobal(() => globalThis.IDBKeyRange) ?? undefined;
    this.dbName = options.dbName ?? COMPOSITIONS_DB_NAME;
    this.openTimeoutMs = options.openTimeoutMs ?? DEFAULT_OPEN_TIMEOUT_MS;
    this.crossTab = options.crossTab ?? true;
    this.onAsyncError = options.onAsyncError;

    if (!this.idb) {
      // Synchroon beslist: geen wachttijd, meteen het oude gedrag
      this.enterLocal('IndexedDB is not available');
      this.ready = Promise.resolve(this.mode);
    } else {
      this.ready = this.hydrate();
    }
  }

  // --- Publiek: status ---

  getMode(): CompositionStoreMode {
    return this.mode;
  }

  /** Klaar met openen + migreren (of teruggevallen op localStorage) */
  whenReady(): Promise<CompositionStoreMode> {
    return this.ready;
  }

  /** Alle tot nu toe gevraagde schrijfacties zijn afgehandeld door IndexedDB */
  async whenIdle(): Promise<void> {
    await this.ready;
    let seen: Promise<void> | null = null;
    while (seen !== this.queue) {
      seen = this.queue;
      await seen;
    }
  }

  /** Seintje bij verandering van buitenaf: opslag klaar, ander tabblad, fout achteraf */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getVersion = (): number => this.version;

  /** Wat de migratie heeft vastgelegd (leesbaar voor tests en beheer) */
  getMigrationMarker(): MigrationMarker | null {
    const raw = this.readJson(MIGRATION_MARKER_KEY);
    if (typeof raw !== 'object' || raw === null) return null;
    const marker = raw as Partial<MigrationMarker>;
    return marker.version === 1 && (marker.state === 'copying' || marker.state === 'done')
      ? (marker as MigrationMarker)
      : null;
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.channel?.close();
    this.channel = null;
    this.db?.close();
    this.db = null;
  }

  // --- Publiek: lezen ---

  /**
   * De ruwe lijst (ongevalideerd) plus het aantal items dat al eerder is
   * afgekeurd en dus niet in de lijst zit.
   */
  list(): { raw: unknown[]; extraDropped: number } {
    if (this.mode === 'idb') {
      const raw: unknown[] = [];
      for (const json of this.cache.values()) raw.push(JSON.parse(json));
      return { raw, extraDropped: this.invalidRows + this.migrationSkipped };
    }
    return { raw: applyOps(this.readLegacyList(), this.readOutbox().ops), extraDropped: 0 };
  }

  // --- Publiek: schrijven ---

  put(item: { id: string }): CompositionWriteResult {
    let json: string;
    try {
      json = JSON.stringify(item);
    } catch (error) {
      logger.error('[compositionStore] composition cannot be serialized', error);
      return { ok: false, error: 'serialization' };
    }
    const op: OutboxOp = { seq: nextSeq(), type: 'put', id: item.id, item: JSON.parse(json) as StoredItem };
    return this.write(op, () => { this.cache.set(item.id, json); });
  }

  /**
   * @param fromBackupToo  Bewuste verwijdering door de gebruiker: ook uit de
   *   bevroren localStorage-back-up halen (anders blijft werk van een kind op
   *   een gedeeld apparaat daar staan).
   */
  remove(id: string, fromBackupToo = false): CompositionWriteResult {
    const op: OutboxOp = { seq: nextSeq(), type: 'delete', id };
    const result = this.write(op, () => { this.cache.delete(id); });
    if (result.ok && fromBackupToo && !this.writesGoToLegacyList()) this.pruneBackup(id);
    return result;
  }

  // --- Schrijfpad ---

  private writesGoToLegacyList(): boolean {
    return this.mode === 'local' && this.getMigrationMarker() === null;
  }

  private write(op: OutboxOp, applyToCache: () => void): CompositionWriteResult {
    if (this.mode === 'idb') {
      applyToCache();
      let journaled = true;
      try {
        this.appendOutbox(op);
      } catch (error) {
        // localStorage vol of geblokkeerd: IndexedDB is nu het enige vangnet
        journaled = false;
        logger.warn('[compositionStore] journal write failed, relying on IndexedDB only', { reason: errorName(error) });
      }
      // Een latere actie op hetzelfde id vervangt een nog wachtende eerdere
      this.pending = this.pending.filter((entry) => entry.op.id !== op.id);
      this.pending.push({ op, journaled });
      this.queue = this.queue.then(() => this.drain());
      return { ok: true };
    }

    try {
      if (this.writesGoToLegacyList()) {
        // Precies het oude gedrag: de hele lijst in soundscout:compositions
        const outbox = this.readOutbox();
        const next = applyOps(this.readLegacyList(), [...outbox.ops, op]);
        this.setItem(LEGACY_COMPOSITIONS_KEY, JSON.stringify(next));
        if (outbox.ops.length > 0) this.removeItem(OUTBOX_KEY);
      } else {
        this.appendOutbox(op);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: classify(error) };
    }
  }

  /** Wachtende schrijfacties in één transactie naar IndexedDB */
  private async drain(): Promise<void> {
    const db = this.db;
    if (!db || this.pending.length === 0) return;
    const batch = this.pending.splice(0);
    try {
      await db.transaction('rw', db.compositions, async () => {
        for (const { op } of batch) {
          if (op.type === 'delete') await db.compositions.delete(op.id);
          else if (op.item) await db.compositions.put(op.item);
        }
      });
      this.removeFromOutbox(batch.map((entry) => entry.op.seq));
      this.broadcast();
    } catch (error) {
      // Niets weggooien: terug in de rij, bij de volgende schrijfactie opnieuw
      this.pending.unshift(...batch);
      const unsafe = batch.some((entry) => !entry.journaled);
      if (unsafe) {
        logger.error('[compositionStore] IndexedDB write failed and the journal is unavailable', error);
        this.onAsyncError?.(classify(error));
        this.notify();
      } else {
        logger.warn('[compositionStore] IndexedDB write failed; kept in the localStorage journal', { reason: errorName(error) });
      }
    }
  }

  // --- Opstarten ---

  private async hydrate(): Promise<CompositionStoreMode> {
    let db: CompositionsDB | null = null;
    try {
      db = new CompositionsDB(this.dbName, this.idb as IDBFactory, this.keyRange);
      await withTimeout(db.open(), this.openTimeoutMs, 'IndexedDB open');
      await this.migrateLegacy(db);
      // Schrijfacties die tijdens het openen binnenkwamen staan in het logboek.
      // De controle "logboek leeg" en het omzetten van de stand gebeuren in
      // dezelfde synchrone stap, zodat er niets tussendoor glipt.
      for (let round = 0; ; round++) {
        await this.replayOutbox(db);
        await this.loadCache(db);
        if (this.readOutbox().ops.length === 0 || round >= MAX_HYDRATE_ROUNDS) break;
      }
      if (this.disposed) {
        db.close();
        return this.mode;
      }
      this.db = db;
      this.mode = 'idb';
      this.openChannel();
    } catch (error) {
      db?.close();
      this.enterLocal(error instanceof Error ? error.message : String(error));
    }
    this.notify();
    return this.mode;
  }

  private enterLocal(reason: string): void {
    this.mode = 'local';
    this.db = null;
    this.cache.clear();
    logger.warn('[compositionStore] IndexedDB unavailable, compositions stay in localStorage', { reason });
    if (this.getMigrationMarker() !== null) return;
    // Nooit gemigreerd: wat in het logboek wachtte hoort gewoon in de oude lijst
    const outbox = this.readOutbox();
    if (outbox.ops.length === 0) return;
    try {
      this.setItem(LEGACY_COMPOSITIONS_KEY, JSON.stringify(applyOps(this.readLegacyList(), outbox.ops)));
      this.removeItem(OUTBOX_KEY);
    } catch {
      // Blijft in het logboek staan; lezen legt het er toch overheen
    }
  }

  /**
   * Eenmalige overzet van de oude localStorage-lijst.
   *
   * 1. Marker `copying` in localStorage (lukt dat niet → niet migreren).
   * 2. Eén transactie: geldige items kopiëren (bestaat het id al, dan wint de
   *    nieuwste), teruglezen en controleren, en de "klaar"-vlag in `meta`.
   *    Faalt er iets, dan wordt de hele transactie teruggedraaid.
   * 3. Marker `done` met datum en aantallen.
   *
   * De "klaar"-vlag in IndexedDB is leidend. Is IndexedDB leeggemaakt terwijl
   * de marker er nog staat, dan wordt de back-up opnieuw ingelezen.
   */
  private async migrateLegacy(db: CompositionsDB): Promise<void> {
    const meta = await db.meta.get(META_MIGRATION_KEY);
    const marker = this.getMigrationMarker();
    if (meta) {
      if (marker?.state !== 'done' && typeof meta.value === 'object' && meta.value !== null) {
        this.trySetItem(MIGRATION_MARKER_KEY, JSON.stringify(meta.value));
      }
      return;
    }

    if (marker?.state === 'done') {
      logger.warn('[compositionStore] IndexedDB was empty although the migration was marked done; restoring from the localStorage backup');
    }

    const source = this.readLegacyList();
    const valid = new Map<string, StoredItem>();
    let skipped = 0;
    for (const entry of source) {
      if (isValid(entry)) valid.set(entry.id, entry);
      else skipped += 1;
    }
    const items = [...valid.values()];

    const startedAt = new Date().toISOString();
    const summary: MigrationMarker = {
      version: 1,
      state: 'copying',
      startedAt,
      sourceCount: source.length,
      migratedCount: items.length,
      skippedCount: skipped,
    };
    // Lukt deze marker niet, dan is localStorage onbruikbaar als bron van
    // waarheid over de migratie: dan liever helemaal niet migreren.
    this.setItem(MIGRATION_MARKER_KEY, JSON.stringify(summary));

    const done: MigrationMarker = { ...summary, state: 'done', migratedAt: new Date().toISOString() };
    await db.transaction('rw', db.compositions, db.meta, async () => {
      for (const item of items) {
        const existing = await db.compositions.get(item.id);
        if (!existing || time(item.updatedAt) > time(existing.updatedAt)) {
          await db.compositions.put(item);
        }
      }
      const copied = await db.compositions.bulkGet(items.map((item) => item.id));
      const verified = copied.filter((row) => isValid(row)).length;
      if (verified !== items.length) {
        throw new Error(`migration verification failed: ${verified} of ${items.length} compositions readable`);
      }
      await db.meta.put({ key: META_MIGRATION_KEY, value: done });
    });

    this.trySetItem(MIGRATION_MARKER_KEY, JSON.stringify(done));
    this.migrationSkipped = skipped;
    if (skipped > 0) {
      logger.warn('[compositionStore] migration skipped invalid compositions; they remain in the localStorage backup', { skipped });
    }
    logger.info('[compositionStore] compositions migrated to IndexedDB', { migrated: items.length, skipped });
  }

  /** Logboek verwerken: put alleen als IndexedDB niets nieuwers heeft */
  private async replayOutbox(db: CompositionsDB): Promise<void> {
    const { ops } = this.readOutbox();
    if (ops.length === 0) return;
    await db.transaction('rw', db.compositions, async () => {
      for (const op of ops) {
        if (op.type === 'delete') {
          await db.compositions.delete(op.id);
        } else if (op.item) {
          const existing = await db.compositions.get(op.id);
          if (!existing || time(existing.updatedAt) <= time(op.item.updatedAt)) {
            await db.compositions.put(op.item);
          }
        }
      }
    });
    this.removeFromOutbox(ops.map((op) => op.seq));
  }

  private async loadCache(db: CompositionsDB): Promise<void> {
    const rows = await db.compositions.toArray();
    // Oudste eerst: dezelfde volgorde als de oude lijst (nieuwe achteraan)
    rows.sort((a, b) => time(a.createdAt) - time(b.createdAt));
    const cache = new Map<string, string>();
    let invalid = 0;
    for (const row of rows) {
      if (isValid(row)) cache.set(row.id, JSON.stringify(row));
      else invalid += 1;
    }
    // Wat hier nog niet bevestigd is, blijft zichtbaar
    for (const { op } of this.pending) {
      if (op.type === 'delete') cache.delete(op.id);
      else if (op.item) cache.set(op.id, JSON.stringify(op.item));
    }
    this.cache = cache;
    this.invalidRows = invalid;
  }

  // --- Andere tabbladen ---

  private openChannel(): void {
    if (!this.crossTab || typeof BroadcastChannel === 'undefined') return;
    try {
      this.channel = new BroadcastChannel(`soundscout:compositions:${this.dbName}`);
      this.channel.onmessage = () => {
        this.queue = this.queue.then(async () => {
          if (!this.db) return;
          try {
            await this.loadCache(this.db);
            this.notify();
          } catch (error) {
            logger.warn('[compositionStore] reload after change in another tab failed', { reason: errorName(error) });
          }
        });
      };
    } catch {
      this.channel = null;
    }
  }

  private broadcast(): void {
    try {
      this.channel?.postMessage('changed');
    } catch { /* kanaal dicht */ }
  }

  private notify(): void {
    this.version += 1;
    for (const listener of [...this.listeners]) listener();
  }

  // --- localStorage ---

  private readJson(key: string): unknown {
    try {
      const text = this.storage?.getItem(key);
      return text ? JSON.parse(text) : null;
    } catch (error) {
      logger.warn('Failed to parse localStorage JSON', { key, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  private readLegacyList(): unknown[] {
    const raw = this.readJson(LEGACY_COMPOSITIONS_KEY);
    return Array.isArray(raw) ? raw : [];
  }

  private readOutbox(): Outbox {
    const raw = this.readJson(OUTBOX_KEY) as Partial<Outbox> | null;
    const ops = raw && raw.v === 1 && Array.isArray(raw.ops)
      ? raw.ops.filter((op): op is OutboxOp =>
        typeof op === 'object' && op !== null && typeof op.seq === 'string' && typeof op.id === 'string'
        && (op.type === 'delete' || (op.type === 'put' && isStoredItem(op.item))))
      : [];
    return { v: 1, ops };
  }

  /** Gooit bij een volle of geblokkeerde localStorage */
  private appendOutbox(op: OutboxOp): void {
    const { ops } = this.readOutbox();
    // Een latere actie op hetzelfde id vervangt de eerdere
    const next: Outbox = { v: 1, ops: [...ops.filter((existing) => existing.id !== op.id), op] };
    this.setItem(OUTBOX_KEY, JSON.stringify(next));
  }

  private removeFromOutbox(seqs: string[]): void {
    const done = new Set(seqs);
    const { ops } = this.readOutbox();
    const rest = ops.filter((op) => !done.has(op.seq));
    if (rest.length === ops.length) return;
    try {
      if (rest.length === 0) this.removeItem(OUTBOX_KEY);
      else this.setItem(OUTBOX_KEY, JSON.stringify({ v: 1, ops: rest } satisfies Outbox));
    } catch {
      // Blijft staan; opnieuw verwerken is onschadelijk (nieuwste wint)
    }
  }

  /** Eén compositie uit de bevroren back-up halen; de rest blijft onaangeroerd */
  private pruneBackup(id: string): void {
    const list = this.readLegacyList();
    const next = list.filter((entry) => !(isStoredItem(entry) && entry.id === id));
    if (next.length === list.length) return;
    this.trySetItem(LEGACY_COMPOSITIONS_KEY, JSON.stringify(next));
  }

  private setItem(key: string, value: string): void {
    if (!this.storage) throw new Error('localStorage is not available');
    this.storage.setItem(key, value);
  }

  private trySetItem(key: string, value: string): boolean {
    try {
      this.setItem(key, value);
      return true;
    } catch (error) {
      logger.warn('[compositionStore] localStorage write failed', { key, reason: errorName(error) });
      return false;
    }
  }

  private removeItem(key: string): void {
    try {
      this.storage?.removeItem(key);
    } catch { /* geen opslag */ }
  }
}

function safeGlobal<T>(read: () => T | undefined): T | null {
  try {
    return read() ?? null;
  } catch {
    // Sommige browsers gooien al bij het aanraken van geblokkeerde opslag
    return null;
  }
}
