/**
 * StorageService - Type-safe localStorage management
 *
 * Handles:
 * - Compositions CRUD
 * - Library state persistence
 * - User preferences
 * - Share code generation
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
import { beatsToSeconds } from '../utils/audio';

// Current storage version for migrations (reserved for future use)
// const STORAGE_VERSION = 1;
const MAX_COMPOSITIONS = 10;

class StorageServiceImpl {
  // --- Compositions ---

  /**
   * Get all saved compositions
   */
  getCompositions(): SavedComposition[] {
    try {
      const data = this.get<SavedComposition[]>('soundscout:compositions');
      return data || [];
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
   */
  saveComposition(
    name: string,
    timeline: TimelineState,
    samples: Sample[]
  ): SavedComposition {
    const compositions = this.getCompositions();

    // Check max limit
    if (compositions.length >= MAX_COMPOSITIONS) {
      // Remove oldest
      compositions.sort(
        (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
      compositions.shift();
      logger.warn('Max compositions reached, removed oldest');
    }

    const now = new Date().toISOString();
    const newComposition: SavedComposition = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      timeline,
      samples,
      metadata: this.computeMetadata(timeline, samples),
    };

    compositions.push(newComposition);
    this.set('soundscout:compositions', compositions);

    logger.info('Composition saved', { id: newComposition.id, name });
    return newComposition;
  }

  /**
   * Update an existing composition
   */
  updateComposition(
    id: string,
    updates: Partial<Pick<SavedComposition, 'name' | 'timeline' | 'samples'>>
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

    compositions[index] = updated;
    this.set('soundscout:compositions', compositions);

    logger.info('Composition updated', { id });
    return updated;
  }

  /**
   * Delete a composition
   */
  deleteComposition(id: string): boolean {
    const compositions = this.getCompositions();
    const filtered = compositions.filter((c) => c.id !== id);

    if (filtered.length === compositions.length) {
      return false;
    }

    this.set('soundscout:compositions', filtered);
    logger.info('Composition deleted', { id });
    return true;
  }

  /**
   * Generate and attach a share code to a composition
   */
  shareComposition(id: string): string | null {
    const compositions = this.getCompositions();
    const index = compositions.findIndex((c) => c.id === id);

    if (index === -1) {
      return null;
    }

    // If already has a share code, return it
    if (compositions[index].shareCode) {
      return compositions[index].shareCode!;
    }

    const shareCode = generateShareCode();
    compositions[index] = {
      ...compositions[index],
      shareCode,
      sharedAt: new Date().toISOString(),
    };

    this.set('soundscout:compositions', compositions);
    logger.info('Composition shared', { id, shareCode });
    return shareCode;
  }

  // --- Library ---

  /**
   * Get saved library state
   */
  getLibrary(): LibraryState | null {
    return this.get<LibraryState>('soundscout:library');
  }

  /**
   * Save library state
   */
  saveLibrary(library: LibraryState): void {
    this.set('soundscout:library', library);
  }

  // --- Preferences ---

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    return this.get<UserPreferences>('soundscout:preferences') || DEFAULT_USER_PREFERENCES;
  }

  /**
   * Save user preferences
   */
  savePreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    this.set('soundscout:preferences', { ...current, ...preferences });
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
    localStorage.removeItem('soundscout:compositions');
    localStorage.removeItem('soundscout:library');
    localStorage.removeItem('soundscout:preferences');
    localStorage.removeItem('soundscout:version');
    logger.info('All storage cleared');
  }

  // --- Private helpers ---

  private get<T>(key: StorageKey): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private set<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Failed to save to localStorage', { key, error });
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

    // Calculate duration (find the last clip end time)
    let maxEndBeat = 0;
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        const sample = sampleMap.get(clip.sampleId);
        if (sample) {
          const endBeat =
            clip.startBeat + Math.ceil(sample.duration * (timeline.bpm / 60));
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
