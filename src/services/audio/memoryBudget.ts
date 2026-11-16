/**
 * DecodedAudioBudget — geheugenbudget voor gedecodeerde audio (V2 Fase 3).
 *
 * Gedecodeerde audio is ~15× de MP3-grootte (docs/v2/PHASE-0-BASELINE.md
 * §Memory): één volledig thema is 43–58 MB, drie thema's ~145 MB. Dit
 * bestand houdt per langlevende buffer bij hoeveel bytes hij inneemt
 * (`length × kanalen × 4`, float32-PCM), kent een budget per apparaat en
 * ruimt bij overschrijding de minst recent gebruikte buffers op (LRU) —
 * maar NOOIT een buffer die vastgepind is (zie audioPins.ts en
 * docs/v2/AUDIO-MEMORY.md voor de regels).
 *
 * Twee categorieën tellen mee:
 *  - 'sample': de ToneAudioBuffers van SampleStore (één per geluid)
 *  - 'pitch':  de vooraf gebakken pitch-buffers van PitchBufferService
 *
 * Het budget weet zelf niets van stores of de engine: het vraagt bij elke
 * opruimronde de pinset op via één provider-functie (`setPinProvider`), die
 * AudioService registreert. Zo is er precies één bron van waarheid voor
 * "in gebruik" en kan die nooit verouderd zijn.
 */

import { logger } from '../../utils/logger';

export type BudgetCategory = 'sample' | 'pitch';

/** Wat er nu in gebruik is: deze buffers mogen nooit weg. */
export interface PinSet {
  sampleIds: ReadonlySet<string>;
  /** `sampleId|semitonen` (zelfde sleutel als PitchBufferService) */
  pitchKeys: ReadonlySet<string>;
}

export const EMPTY_PINS: PinSet = { sampleIds: new Set(), pitchKeys: new Set() };

/** Sleutel van een pitch-bake: `sampleId|semitonen` */
export function pitchKey(sampleId: string, semitones: number): string {
  return `${sampleId}|${semitones}`;
}

/** Bytes van een gedecodeerde buffer (float32 per frame per kanaal). */
export function decodedBytes(buffer: { length?: number; numberOfChannels?: number } | null | undefined): number {
  if (!buffer) return 0;
  const length = Number(buffer.length);
  const channels = Number(buffer.numberOfChannels);
  if (!Number.isFinite(length) || length <= 0) return 0;
  return length * (Number.isFinite(channels) && channels > 0 ? channels : 1) * 4;
}

const MB = 1024 * 1024;

/**
 * Budget per apparaat, in bytes.
 *
 * `navigator.deviceMemory` (alleen Chromium: 0.25…8 GB, afgerond en op 8
 * afgekapt) bepaalt de trap. Safari (iPad!) en Firefox geven niets — dan het
 * conservatieve standaardbudget van 96 MB: ruim één volledig thema (58 MB)
 * plus pitch-bakes en een deel van een tweede thema, ver onder wat een
 * oudere iPad (2–3 GB RAM) per tabblad verdraagt.
 */
export function selectBudgetBytes(deviceMemoryGB: number | undefined): number {
  if (deviceMemoryGB === undefined || !Number.isFinite(deviceMemoryGB) || deviceMemoryGB <= 0) {
    return DEFAULT_BUDGET_BYTES;
  }
  if (deviceMemoryGB <= 1) return 64 * MB;
  if (deviceMemoryGB <= 2) return 96 * MB;
  if (deviceMemoryGB <= 4) return 128 * MB;
  return 192 * MB;
}

export const DEFAULT_BUDGET_BYTES = 96 * MB;

export type BudgetSource = 'deviceMemory' | 'default' | 'override';

function readDeviceMemory(): number | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const value = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof value === 'number' ? value : undefined;
}

interface BudgetEntry {
  category: BudgetCategory;
  sampleId: string;
  /** alleen voor 'pitch' */
  pitchKey?: string;
  bytes: number;
  lastUsed: number;
  evict: () => void;
}

export interface RegisterOptions {
  category: BudgetCategory;
  sampleId: string;
  pitchKey?: string;
  bytes: number;
  /** Ruim de buffer op bij de eigenaar (Map-entry weg, Tone-objecten disposen) */
  evict: () => void;
}

export interface CategoryStats {
  bytes: number;
  count: number;
}

export interface AudioMemoryStats {
  totalBytes: number;
  totalMB: number;
  budgetBytes: number;
  budgetMB: number;
  budgetSource: BudgetSource;
  deviceMemoryGB: number | null;
  entryCount: number;
  byCategory: Record<BudgetCategory, CategoryStats>;
  /** Bytes die nu vastgepind zijn (niet opruimbaar) */
  pinnedBytes: number;
  /** Aantal buffers dat sinds de start is opgeruimd */
  evictedTotal: number;
}

export interface EnforceResult {
  evicted: number;
  freedBytes: number;
}

function toMB(bytes: number): number {
  return Number((bytes / MB).toFixed(1));
}

export class DecodedAudioBudget {
  private entries = new Map<string, BudgetEntry>();
  private tick = 0;
  private budgetBytes: number;
  private budgetSource: BudgetSource;
  private deviceMemoryGB: number | undefined;
  private pinProvider: () => PinSet = () => EMPTY_PINS;
  private evictedTotal = 0;
  /** Waarschuwing "alles vastgepind" maar één keer tot we weer onder budget zijn */
  private overBudgetWarned = false;

  constructor(deviceMemoryGB: number | undefined = readDeviceMemory()) {
    this.deviceMemoryGB = deviceMemoryGB;
    this.budgetBytes = selectBudgetBytes(deviceMemoryGB);
    this.budgetSource = deviceMemoryGB === undefined ? 'default' : 'deviceMemory';
  }

  // --- Configuratie ---

  /** Eén functie die zegt wat er nu in gebruik is (AudioService registreert hem). */
  setPinProvider(provider: () => PinSet): void {
    this.pinProvider = provider;
  }

  /** Budget handmatig zetten (tests, afstemmen). `null` = terug naar automatisch. */
  setBudgetBytes(bytes: number | null): void {
    if (bytes === null) {
      this.budgetBytes = selectBudgetBytes(this.deviceMemoryGB);
      this.budgetSource = this.deviceMemoryGB === undefined ? 'default' : 'deviceMemory';
    } else {
      this.budgetBytes = Math.max(0, bytes);
      this.budgetSource = 'override';
    }
  }

  getBudgetBytes(): number {
    return this.budgetBytes;
  }

  // --- Boekhouding ---

  private entryKey(category: BudgetCategory, id: string): string {
    return `${category}:${id}`;
  }

  /** Registreer (of vervang) een buffer. Ruimt niet zelf op — roep `enforce` aan. */
  register(id: string, options: RegisterOptions): void {
    this.entries.set(this.entryKey(options.category, id), {
      category: options.category,
      sampleId: options.sampleId,
      pitchKey: options.pitchKey,
      bytes: options.bytes,
      lastUsed: ++this.tick,
      evict: options.evict,
    });
  }

  /** Buffer is weg bij de eigenaar zelf (themawissel, dispose) — alleen afboeken. */
  unregister(category: BudgetCategory, id: string): void {
    this.entries.delete(this.entryKey(category, id));
  }

  /** Markeer als zojuist gebruikt (LRU-volgorde). */
  touch(category: BudgetCategory, id: string): void {
    const entry = this.entries.get(this.entryKey(category, id));
    if (entry) entry.lastUsed = ++this.tick;
  }

  has(category: BudgetCategory, id: string): boolean {
    return this.entries.has(this.entryKey(category, id));
  }

  getTotalBytes(): number {
    let total = 0;
    for (const entry of this.entries.values()) total += entry.bytes;
    return total;
  }

  private isPinned(entry: BudgetEntry, pins: PinSet): boolean {
    if (entry.category === 'pitch') {
      return entry.pitchKey !== undefined && pins.pitchKeys.has(entry.pitchKey);
    }
    return pins.sampleIds.has(entry.sampleId);
  }

  /**
   * Ruim minst-recent-gebruikte, niet-vastgepinde buffers op tot we onder
   * het budget zitten. `keep` = de buffer die net is toegevoegd: die is
   * per definitie gevraagd en mag in dezelfde ronde niet meteen weer weg.
   *
   * Is alles vastgepind en zitten we tóch boven budget, dan ruimen we niets
   * op en loggen één waarschuwing: afspelen gaat altijd voor het budget.
   */
  enforce(keep?: { category: BudgetCategory; id: string }): EnforceResult {
    let total = this.getTotalBytes();
    if (total <= this.budgetBytes) {
      this.overBudgetWarned = false;
      return { evicted: 0, freedBytes: 0 };
    }

    const pins = this.pinProvider();
    const keepKey = keep ? this.entryKey(keep.category, keep.id) : null;
    const candidates = [...this.entries.entries()]
      .filter(([key, entry]) => key !== keepKey && !this.isPinned(entry, pins))
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    let evicted = 0;
    let freedBytes = 0;
    for (const [key, entry] of candidates) {
      if (total <= this.budgetBytes) break;
      this.entries.delete(key);
      try {
        entry.evict();
      } catch (err) {
        logger.warn('Audio-geheugen: opruimen van buffer mislukt', { key, err });
      }
      total -= entry.bytes;
      freedBytes += entry.bytes;
      evicted++;
    }
    this.evictedTotal += evicted;

    if (evicted > 0) {
      logger.info(
        `Audio-geheugen: ${evicted} buffer(s) opgeruimd, ${toMB(freedBytes)} MB vrij, ` +
          `nu ${toMB(total)} MB van ${toMB(this.budgetBytes)} MB budget`
      );
    }
    if (total > this.budgetBytes) {
      if (!this.overBudgetWarned) {
        this.overBudgetWarned = true;
        logger.warn(
          `Audio-geheugen boven budget (${toMB(total)} / ${toMB(this.budgetBytes)} MB), ` +
            'maar alles wat overblijft is in gebruik — niets opgeruimd'
        );
      }
    } else {
      this.overBudgetWarned = false;
    }
    return { evicted, freedBytes };
  }

  getStats(): AudioMemoryStats {
    const byCategory: Record<BudgetCategory, CategoryStats> = {
      sample: { bytes: 0, count: 0 },
      pitch: { bytes: 0, count: 0 },
    };
    const pins = this.pinProvider();
    let pinnedBytes = 0;
    let totalBytes = 0;
    for (const entry of this.entries.values()) {
      byCategory[entry.category].bytes += entry.bytes;
      byCategory[entry.category].count += 1;
      totalBytes += entry.bytes;
      if (this.isPinned(entry, pins)) pinnedBytes += entry.bytes;
    }
    return {
      totalBytes,
      totalMB: toMB(totalBytes),
      budgetBytes: this.budgetBytes,
      budgetMB: toMB(this.budgetBytes),
      budgetSource: this.budgetSource,
      deviceMemoryGB: this.deviceMemoryGB ?? null,
      entryCount: this.entries.size,
      byCategory,
      pinnedBytes,
      evictedTotal: this.evictedTotal,
    };
  }

  /** Alles afboeken (dispose van de engine, tests) — roept geen evict aan. */
  reset(): void {
    this.entries.clear();
    this.overBudgetWarned = false;
  }
}

/** Gedeeld budget voor de hele app (SampleStore + PitchBufferService). */
export const decodedAudioBudget = new DecodedAudioBudget();
