/**
 * StorageService - Type-safe lokale opslag
 *
 * Handles:
 * - Compositions CRUD — sinds V2 Fase 2 in IndexedDB via `compositionStore`
 *   (met localStorage als terugval en als back-up; zie docs/v2/LOCAL-STORAGE.md)
 * - Library state persistence (localStorage)
 * - User preferences (localStorage)
 * - Share code generation
 *
 * De API is bewust synchroon gebleven; zie de ontwerpnotitie bovenaan
 * `compositionStore.ts`.
 */

import type {
  SavedComposition,
  Sample,
  TimelineState,
  CompositionMetadata,
  LibraryState,
  UserPreferences,
  StorageKey,
} from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';
import { generateId, generateShareCode } from '../utils/uuid';
import { logger } from '../utils/logger';
import { CompositionStore } from './compositionStore';
import type { CompositionStoreMode, CompositionWriteResult } from './compositionStore';
import { beatsToSeconds, getClipEndBeat } from '../utils/audio';
import {
  parseSavedCompositions,
  parseUserPreferences,
  parseLibraryState,
} from '../utils/schemas';
import { logUsageEvent } from '../utils/usageStats';

// Current storage version for migrations (reserved for future use)
// const STORAGE_VERSION = 1;
/**
 * Maximum aantal lokaal bewaarde composities ("Mijn composities"). Bij de
 * volgende die erbij komt verdwijnt de oudste. De technische reden (de 5 MB
 * van localStorage) is met IndexedDB vervallen; het getal is nu een
 * productkeuze en staat alleen hier. Verhogen: zie docs/v2/LOCAL-STORAGE.md.
 */
export const MAX_LOCAL_COMPOSITIONS = 10;
// H3 (eindtest): een computerlokaal levert op één apparaat veel meer dan 20
// keer per week in; te weinig ruimte maakte van versie 2 een nieuwe inzending
const MAX_SUBMISSION_SECRETS = 200;

/** Error types returned by save operations (TP5-11) */
export type StorageSaveError = 'quota_exceeded' | 'serialization' | 'unknown';

function isQuotaExceeded(error: unknown): boolean {
  if (error instanceof DOMException) {
    // Most browsers
    return error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
  return false;
}

class StorageServiceImpl {
  // --- Compositions ---

  /**
   * Opslag van de composities (IndexedDB met localStorage-terugval). Opent
   * zichzelf bij het aanmaken; er is geen aanroep in main.tsx/App.tsx nodig.
   */
  private compositionStore = new CompositionStore({
    onAsyncError: (error) => { this.lastSaveError = error; },
  });

  /** 'idb' = IndexedDB, 'local' = terugval op localStorage, 'pending' = bezig met openen */
  getCompositionStorageMode(): CompositionStoreMode {
    return this.compositionStore.getMode();
  }

  /** Klaar met openen en (eenmalig) overzetten */
  whenCompositionsReady(): Promise<CompositionStoreMode> {
    return this.compositionStore.whenReady();
  }

  /** Alle schrijfacties tot nu toe zijn door IndexedDB bevestigd (of gelogd als mislukt) */
  whenCompositionsPersisted(): Promise<void> {
    return this.compositionStore.whenIdle();
  }

  /** Voor React (useSyncExternalStore): seintje als de lijst van buitenaf verandert */
  subscribeCompositions = (listener: () => void): (() => void) =>
    this.compositionStore.subscribe(listener);

  getCompositionsVersion = (): number => this.compositionStore.getVersion();

  private writeComposition(result: CompositionWriteResult): boolean {
    if (result.ok) {
      this.lastSaveError = null;
      return true;
    }
    this.lastSaveError = result.error;
    if (result.error === 'quota_exceeded') {
      logger.error('localStorage quota exceeded', { key: 'soundscout:compositions', usage: this.getStorageUsage() });
    } else {
      logger.error('Failed to save composition', { error: result.error });
    }
    return false;
  }

  /**
   * Get all saved compositions
   */
  getCompositions(): SavedComposition[] {
    this.lastLoadDroppedCount = 0;
    try {
      const { raw, extraDropped } = this.compositionStore.list();
      const validated = parseSavedCompositions(raw);
      const dropped = raw.length - validated.length + extraDropped;
      if (dropped > 0) {
        this.lastLoadDroppedCount = dropped;
        logger.warn('Some compositions failed validation, filtered out invalid entries', { dropped });
      }
      return validated as SavedComposition[];
    } catch (error) {
      logger.error('Failed to get compositions', error);
      return [];
    }
  }

  /**
   * Get a composition by ID
   */
  getCompositionById(id: string): SavedComposition | null {
    const compositions = this.getCompositions();
    return compositions.find((c) => c.id === id) || null;
  }

  /**
   * Get a composition by share code
   */
  getCompositionByShareCode(shareCode: string): SavedComposition | null {
    const compositions = this.getCompositions();
    return compositions.find((c) => c.shareCode === shareCode) || null;
  }

  /**
   * Save a new composition
   * @returns The saved composition, or null if save failed
   */
  saveComposition(
    name: string,
    timeline: TimelineState,
    samples: Sample[],
    storyboardId?: string,
    classSession?: SavedComposition['classSession'],
    submissionId?: string,
    praatplaat?: SavedComposition['praatplaat'],
    praatplaatPosition?: SavedComposition['praatplaatPosition'],
  ): SavedComposition | null {
    const compositions = this.getCompositions();

    // Check max limit: de oudste maakt plaats, maar pas als de nieuwe er staat
    const oldest = compositions.length >= MAX_LOCAL_COMPOSITIONS
      ? [...compositions].sort(
        (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      )[0]
      : null;

    const now = new Date().toISOString();
    const newComposition: SavedComposition = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      timeline,
      samples,
      metadata: this.computeMetadata(timeline, samples),
      ...(storyboardId ? { storyboardId } : {}),
      ...(classSession ? { classSession } : {}),
      ...(submissionId ? { submissionId } : {}),
      ...(praatplaat ? { praatplaat } : {}),
      ...(praatplaatPosition ? { praatplaatPosition } : {}),
    };

    const saved = this.writeComposition(this.compositionStore.put(newComposition));

    if (!saved) {
      logger.error('Failed to save new composition', { name });
      return null;
    }

    if (oldest) {
      this.compositionStore.remove(oldest.id);
      logger.warn('Max compositions reached, removed oldest');
    }

    logger.info('Composition saved', { id: newComposition.id, name });
    logUsageEvent('composition_saved');
    return newComposition;
  }

  /**
   * Update an existing composition
   * @returns The updated composition, or null if update/save failed
   */
  updateComposition(
    id: string,
    updates: Partial<Pick<SavedComposition, 'name' | 'timeline' | 'samples' | 'classSession' | 'submissionId' | 'praatplaat' | 'praatplaatPosition' | 'storyboardId' | 'saveCode'>>
  ): SavedComposition | null {
    const compositions = this.getCompositions();
    const index = compositions.findIndex((c) => c.id === id);

    if (index === -1) {
      logger.warn('Composition not found for update', { id });
      return null;
    }

    const existing = compositions[index];
    const updated: SavedComposition = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      metadata:
        updates.timeline && updates.samples
          ? this.computeMetadata(updates.timeline, updates.samples)
          : existing.metadata,
    };

    const saved = this.writeComposition(this.compositionStore.put(updated));

    if (!saved) {
      logger.error('Failed to save updated composition', { id });
      return null;
    }

    logger.info('Composition updated', { id });
    return updated;
  }

  /**
   * Delete a composition
   * @returns true if deleted, false if not found or save failed
   */
  deleteComposition(id: string): boolean {
    const compositions = this.getCompositions();

    if (!compositions.some((c) => c.id === id)) {
      logger.warn('Composition not found for deletion', { id });
      return false;
    }

    // Bewuste verwijdering: ook uit de localStorage-back-up van de migratie
    const saved = this.writeComposition(this.compositionStore.remove(id, true));
    if (!saved) {
      logger.error('Failed to save after deleting composition', { id });
      return false;
    }

    logger.info('Composition deleted', { id });
    return true;
  }

  /**
   * Generate and attach a share code to a composition
   * @returns The share code (new or existing), or null if composition not found or save failed
   */
  shareComposition(id: string): string | null {
    const compositions = this.getCompositions();
    const index = compositions.findIndex((c) => c.id === id);

    if (index === -1) {
      logger.warn('Composition not found for sharing', { id });
      return null;
    }

    // If already has a share code, return it
    if (compositions[index].shareCode) {
      return compositions[index].shareCode!;
    }

    const shareCode = generateShareCode();
    const shared: SavedComposition = {
      ...compositions[index],
      shareCode,
      sharedAt: new Date().toISOString(),
    };
    const saved = this.writeComposition(this.compositionStore.put(shared));
    if (!saved) {
      logger.error('Failed to save share code', { id, shareCode });
      return null;
    }

    logger.info('Composition shared', { id, shareCode });
    return shareCode;
  }

  // --- Library ---

  /**
   * Get saved library state
   */
  getLibrary(): LibraryState | null {
    const raw = this.getRaw('soundscout:library');
    if (!raw) return null;
    const validated = parseLibraryState(raw);
    if (!validated) {
      logger.warn('Library state failed validation');
      return null;
    }
    return validated as LibraryState;
  }

  /**
   * Save library state
   * @returns true if saved successfully, false if save failed
   */
  saveLibrary(library: LibraryState): boolean {
    const saved = this.set('soundscout:library', library);
    if (!saved) {
      logger.error('Failed to save library state');
    }
    return saved;
  }

  // --- Preferences ---

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    const raw = this.getRaw('soundscout:preferences');
    if (!raw) return DEFAULT_USER_PREFERENCES;
    const validated = parseUserPreferences(raw);
    return validated ? (validated as UserPreferences) : DEFAULT_USER_PREFERENCES;
  }

  /**
   * Save user preferences
   * @returns true if saved successfully, false if save failed
   */
  savePreferences(preferences: Partial<UserPreferences>): boolean {
    const current = this.getPreferences();
    const saved = this.set('soundscout:preferences', { ...current, ...preferences });
    if (!saved) {
      logger.error('Failed to save preferences');
    }
    return saved;
  }

  // --- Utilities ---

  /**
   * Get storage usage info
   */
  getStorageUsage(): { used: number; max: number; percentage: number } {
    let totalSize = 0;
    const keys: StorageKey[] = [
      'soundscout:compositions',
      'soundscout:library',
      'soundscout:preferences',
      'soundscout:version',
    ];

    for (const key of keys) {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length * 2; // UTF-16 characters = 2 bytes each
      }
    }

    const maxSize = 5 * 1024 * 1024; // 5MB typical localStorage limit

    return {
      used: totalSize,
      max: maxSize,
      percentage: (totalSize / maxSize) * 100,
    };
  }

  /**
   * Clear all SoundScout data
   */
  clearAll(): void {
    for (const composition of this.getCompositions()) {
      this.compositionStore.remove(composition.id, true);
    }
    localStorage.removeItem('soundscout:compositions');
    localStorage.removeItem('soundscout:library');
    localStorage.removeItem('soundscout:preferences');
    localStorage.removeItem('soundscout:version');
    localStorage.removeItem('soundscout:save-online');
    logger.info('All storage cleared');
  }

  // --- Online bewaren (#52) ---

  /**
   * Sla online bewaar-info op (saveCode + saveSecret + compositionName).
   * Wordt opgeslagen na succesvol aanmaken of claimen.
   */
  setSaveOnlineInfo(saveCode: string, saveSecret: string, compositionName: string): void {
    this.set('soundscout:save-online', { saveCode, saveSecret, compositionName });
  }

  /**
   * Haal online bewaar-info op (saveCode + saveSecret + compositionName).
   * Retourneert null als er geen bewaar-info is.
   */
  getSaveOnlineInfo(): { saveCode: string; saveSecret: string; compositionName: string } | null {
    const raw = this.getRaw('soundscout:save-online');
    if (!raw || typeof raw !== 'object') return null;
    const info = raw as Record<string, unknown>;
    if (typeof info.saveCode !== 'string' || typeof info.saveSecret !== 'string') return null;
    return {
      saveCode: info.saveCode as string,
      saveSecret: info.saveSecret as string,
      compositionName: (info.compositionName as string) || '',
    };
  }

  /**
   * Verwijder online bewaar-info (bij nieuwe compositie of clearAll).
   */
  clearSaveOnlineInfo(): void {
    localStorage.removeItem('soundscout:save-online');
  }

  // --- Klas-inzending bewaarcode (feedback-terugweg, migratie 026) ---

  /**
   * Bewaar de automatisch geminte bewaarcode van een klas-inzending, zodat
   * dit apparaat later stil kan checken op docent-feedback.
   */
  setClassFeedbackCode(info: {
    saveCode: string;
    compositionName: string;
    /** feedback_at die de leerling al gezien heeft (dedup voor de melding) */
    lastSeenFeedbackAt?: string | null;
    /** Inzending waar deze code bij hoort — zodat het podium de code alleen
     *  toont voor de HUIDIGE compositie (testronde 2, bug 5b: gedeelde
     *  apparaten toonden de code van een vorige leerling) */
    submissionId?: string | null;
  }): void {
    this.set('soundscout:class-feedback-code', info);
  }

  getClassFeedbackCode(): {
    saveCode: string;
    compositionName: string;
    lastSeenFeedbackAt: string | null;
    submissionId: string | null;
  } | null {
    const raw = this.getRaw('soundscout:class-feedback-code');
    if (!raw || typeof raw !== 'object') return null;
    const info = raw as Record<string, unknown>;
    if (typeof info.saveCode !== 'string') return null;
    return {
      saveCode: info.saveCode,
      compositionName: (info.compositionName as string) || '',
      lastSeenFeedbackAt: (info.lastSeenFeedbackAt as string) || null,
      submissionId: (info.submissionId as string) || null,
    };
  }

  clearClassFeedbackCode(): void {
    localStorage.removeItem('soundscout:class-feedback-code');
  }

  // --- Geheim per klas-inzending (migratie 036) ---

  /**
   * Bewaar het geheim waarmee dit apparaat een klas-inzending mag bijwerken.
   * Per inzending-id, zodat elk pad dat een bestaande inzending hergebruikt
   * (podium, bewaarcode openen, "Mijn composities") het terugvindt. Alleen
   * de laatste 200 blijven bewaard.
   */
  setSubmissionSecret(submissionId: string, secret: string): void {
    const map = this.getSubmissionSecrets();
    delete map[submissionId];
    map[submissionId] = secret;
    const entries = Object.entries(map).slice(-MAX_SUBMISSION_SECRETS);
    this.set('soundscout:submission-secrets', Object.fromEntries(entries));
  }

  /** Geheim van één inzending vergeten ("Klaar, ik stop" op een gedeeld apparaat) */
  removeSubmissionSecret(submissionId: string): void {
    const map = this.getSubmissionSecrets();
    if (!(submissionId in map)) return;
    delete map[submissionId];
    this.set('soundscout:submission-secrets', map);
  }

  getSubmissionSecret(submissionId: string): string | null {
    return this.getSubmissionSecrets()[submissionId] ?? null;
  }

  private getSubmissionSecrets(): Record<string, string> {
    const raw = this.getRaw('soundscout:submission-secrets');
    if (!raw || typeof raw !== 'object') return {};
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }

  // --- Private helpers ---

  private getRaw(key: StorageKey): unknown {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      logger.warn('Failed to parse localStorage JSON', { key, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }

  /** Last save error type, readable by callers for user-facing feedback (TP5-11) */
  lastSaveError: StorageSaveError | null = null;

  /** Aantal composities dat bij de laatste getCompositions()-load is weggefilterd
   *  wegens validatiefout. Leesbaar door UI voor feedback (mirror van lastSaveError). */
  lastLoadDroppedCount = 0;

  private set<T>(key: StorageKey, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.lastSaveError = null;
      return true;
    } catch (error) {
      if (isQuotaExceeded(error)) {
        this.lastSaveError = 'quota_exceeded';
        logger.error('localStorage quota exceeded', { key, usage: this.getStorageUsage() });
      } else {
        this.lastSaveError = 'unknown';
        logger.error('Failed to save to localStorage', { key, error });
      }
      return false;
    }
  }

  private computeMetadata(
    timeline: TimelineState,
    samples: Sample[]
  ): CompositionMetadata {
    const clipCount = timeline.tracks.reduce(
      (sum, track) => sum + track.clips.length,
      0
    );

    const tracksWithClips = timeline.tracks.filter(
      (t) => t.clips.length > 0
    ).length;

    // Find all unique location IDs
    const sampleMap = new Map(samples.map((s) => [s.id, s]));
    const locationIds = new Set<string>();
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        const sample = sampleMap.get(clip.sampleId);
        if (sample) {
          locationIds.add(sample.locationId);
        }
      }
    }

    // Calculate duration (find the last clip end time, respecting trim)
    let maxEndBeat = 0;
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        const sample = sampleMap.get(clip.sampleId);
        if (sample) {
          const endBeat = getClipEndBeat(clip, sample, timeline.bpm);
          if (endBeat > maxEndBeat) {
            maxEndBeat = endBeat;
          }
        }
      }
    }

    return {
      duration: beatsToSeconds(maxEndBeat, timeline.bpm),
      trackCount: tracksWithClips,
      clipCount,
      locations: Array.from(locationIds),
    };
  }
}

// Singleton instance
export const storageService = new StorageServiceImpl();
