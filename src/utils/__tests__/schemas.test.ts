/**
 * Unit tests for schema validation utilities
 *
 * Tests cover:
 * - parseCompositionData: validates composition data structures
 * - parseSavedCompositions: filters and validates composition arrays
 * - parseUserPreferences: validates user preference objects
 * - parseLibraryState: validates library state objects
 */

import { describe, it, expect } from 'vitest';
import {
  parseCompositionData,
  parseSavedCompositions,
  parseUserPreferences,
  parseLibraryState,
} from '../schemas';

// =============================================================================
// VALID TEST DATA FIXTURES
// =============================================================================

const validCompositionData = {
  tracks: [
    {
      id: 'track-1',
      clips: [
        {
          id: 'clip-1',
          sampleId: 'sample-1',
          startBeat: 0,
          effects: { volume: 0.8, pitch: 1.0, reverb: 0.2, fadeIn: 0, fadeOut: 0 },
          trimStart: 0.1,
          trimEnd: 1.5,
        },
      ],
    },
  ],
  bpm: 120,
  totalBeats: 32,
  isLooping: true,
  samples: [
    {
      id: 'sample-1',
      name: 'Bird Song',
      locationId: 'park',
      audioUrl: '/audio/bird.mp3',
      duration: 2.0,
      icon: 'birds',
      color: '#FF0000',
    },
  ],
};

const validSavedComposition = {
  id: 'comp-1',
  name: 'My Composition',
  createdAt: '2026-02-27T10:00:00Z',
  updatedAt: '2026-02-27T11:00:00Z',
  timeline: {
    tracks: [
      {
        id: 'track-1',
        clips: [
          {
            id: 'clip-1',
            sampleId: 'sample-1',
            startBeat: 0,
          },
        ],
      },
    ],
    bpm: 120,
    totalBeats: 32,
    isLooping: true,
  },
  samples: [
    {
      id: 'sample-1',
      name: 'Bird Song',
      locationId: 'park',
      audioUrl: '/audio/bird.mp3',
      duration: 2.0,
      icon: 'birds',
      color: '#FF0000',
    },
  ],
  metadata: {
    duration: 8.0,
    trackCount: 1,
    clipCount: 1,
    locations: ['park'],
  },
};

const validUserPreferences = {
  masterVolume: 0.8,
  language: 'nl',
  showHints: true,
};

const validLibraryState = {
  samples: [
    {
      id: 'sample-1',
      name: 'Bird Song',
      locationId: 'park',
      audioUrl: '/audio/bird.mp3',
      duration: 2.0,
      icon: 'birds',
      color: '#FF0000',
    },
  ],
};

// =============================================================================
// parseCompositionData Tests
// =============================================================================

describe('parseCompositionData', () => {
  it('should parse valid composition data', () => {
    const result = parseCompositionData(validCompositionData);

    expect(result).not.toBeNull();
    expect(result).toEqual(validCompositionData);
  });

  it('should return null for missing required fields', () => {
    const invalidData = {
      tracks: [], // Missing bpm, totalBeats, isLooping, samples
    };

    const result = parseCompositionData(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for invalid bpm (non-positive)', () => {
    const invalidData = {
      ...validCompositionData,
      bpm: 0,
    };

    const result = parseCompositionData(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for invalid totalBeats (non-positive)', () => {
    const invalidData = {
      ...validCompositionData,
      totalBeats: 0,
    };

    const result = parseCompositionData(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for invalid isLooping (not boolean)', () => {
    const invalidData = {
      ...validCompositionData,
      isLooping: 'yes',
    };

    const result = parseCompositionData(invalidData);

    expect(result).toBeNull();
  });

  it('should return null when samples have invalid duration', () => {
    const invalidData = {
      ...validCompositionData,
      samples: [
        {
          ...validCompositionData.samples[0],
          duration: 0, // Non-positive duration
        },
      ],
    };

    const result = parseCompositionData(invalidData);

    expect(result).toBeNull();
  });

  it('should return null when tracks is not an array', () => {
    const invalidData = {
      ...validCompositionData,
      tracks: 'not an array',
    };

    const result = parseCompositionData(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = parseCompositionData(null);

    expect(result).toBeNull();
  });

  it('should return null for undefined input', () => {
    const result = parseCompositionData(undefined);

    expect(result).toBeNull();
  });

  it('should return null for non-object input', () => {
    const result = parseCompositionData('not an object');

    expect(result).toBeNull();
  });

  it('should allow extra fields in composition data', () => {
    const dataWithExtra = {
      ...validCompositionData,
      extraField: 'should be ignored',
    };

    const result = parseCompositionData(dataWithExtra);

    // Zod by default strips extra fields
    expect(result).not.toBeNull();
    expect(result).toEqual(validCompositionData);
  });

  it('should handle clips with optional effects', () => {
    const dataNoEffects = {
      ...validCompositionData,
      tracks: [
        {
          id: 'track-1',
          clips: [
            {
              id: 'clip-1',
              sampleId: 'sample-1',
              startBeat: 0,
              // effects omitted
            },
          ],
        },
      ],
    };

    const result = parseCompositionData(dataNoEffects);

    expect(result).not.toBeNull();
    expect(result?.tracks[0].clips[0].effects).toBeUndefined();
  });

  it('should handle clips with optional trim values', () => {
    const dataNoTrim = {
      ...validCompositionData,
      tracks: [
        {
          id: 'track-1',
          clips: [
            {
              id: 'clip-1',
              sampleId: 'sample-1',
              startBeat: 0,
              // trimStart and trimEnd omitted
            },
          ],
        },
      ],
    };

    const result = parseCompositionData(dataNoTrim);

    expect(result).not.toBeNull();
    expect(result?.tracks[0].clips[0].trimStart).toBeUndefined();
    expect(result?.tracks[0].clips[0].trimEnd).toBeUndefined();
  });
});

// =============================================================================
// parseSavedCompositions Tests
// =============================================================================

describe('parseSavedCompositions', () => {
  it('should parse array of valid saved compositions', () => {
    const data = [validSavedComposition, validSavedComposition];

    const result = parseSavedCompositions(data);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('should return empty array for non-array input', () => {
    const result = parseSavedCompositions({});

    expect(result).toEqual([]);
  });

  it('should return empty array for null input', () => {
    const result = parseSavedCompositions(null);

    expect(result).toEqual([]);
  });

  it('should return empty array for undefined input', () => {
    const result = parseSavedCompositions(undefined);

    expect(result).toEqual([]);
  });

  it('should return empty array for empty array input', () => {
    const result = parseSavedCompositions([]);

    expect(result).toEqual([]);
  });

  it('should filter out invalid compositions from array', () => {
    const invalidComposition = {
      // Missing required fields
      id: 'comp-2',
    };

    const data = [validSavedComposition, invalidComposition, validSavedComposition];

    const result = parseSavedCompositions(data);

    // Should only include valid ones
    expect(result.length).toBe(2);
    expect(result).toEqual([validSavedComposition, validSavedComposition]);
  });

  it('should filter compositions with missing id', () => {
    const noId = {
      ...validSavedComposition,
      id: undefined,
    };

    const data = [validSavedComposition, noId];

    const result = parseSavedCompositions(data);

    expect(result.length).toBe(1);
  });

  it('should filter compositions with missing name', () => {
    const noName = {
      ...validSavedComposition,
      name: undefined,
    };

    const data = [validSavedComposition, noName];

    const result = parseSavedCompositions(data);

    expect(result.length).toBe(1);
  });

  it('should filter compositions with missing createdAt', () => {
    const noCreatedAt = {
      ...validSavedComposition,
      createdAt: undefined,
    };

    const data = [validSavedComposition, noCreatedAt];

    const result = parseSavedCompositions(data);

    expect(result.length).toBe(1);
  });

  it('should filter compositions with invalid timeline', () => {
    const invalidTimeline = {
      ...validSavedComposition,
      timeline: {
        // Missing required fields
        tracks: [],
      },
    };

    const data = [validSavedComposition, invalidTimeline];

    const result = parseSavedCompositions(data);

    expect(result.length).toBe(1);
  });

  it('should allow optional shareCode and sharedAt fields', () => {
    const withShare = {
      ...validSavedComposition,
      shareCode: 'ABC123',
      sharedAt: '2026-02-27T12:00:00Z',
    };

    const result = parseSavedCompositions([withShare]);

    expect(result.length).toBe(1);
    expect(result[0].shareCode).toBe('ABC123');
    expect(result[0].sharedAt).toBe('2026-02-27T12:00:00Z');
  });

  it('should filter mix of valid and invalid compositions', () => {
    const invalid1 = { id: 'invalid' };
    const invalid2 = null;

    const data = [validSavedComposition, invalid1, validSavedComposition, invalid2];

    const result = parseSavedCompositions(data);

    expect(result.length).toBe(2);
    expect(result.every((c) => c.id)).toBe(true);
  });
});

// =============================================================================
// parseUserPreferences Tests
// =============================================================================

describe('parseUserPreferences', () => {
  it('should parse valid user preferences', () => {
    const result = parseUserPreferences(validUserPreferences);

    expect(result).not.toBeNull();
    expect(result).toEqual(validUserPreferences);
  });

  it('should return null for missing masterVolume', () => {
    const invalidData = {
      language: 'nl',
      showHints: true,
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for invalid masterVolume (not number)', () => {
    const invalidData = {
      ...validUserPreferences,
      masterVolume: 'high',
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for masterVolume out of range (< 0)', () => {
    const invalidData = {
      ...validUserPreferences,
      masterVolume: -0.5,
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for masterVolume out of range (> 1)', () => {
    const invalidData = {
      ...validUserPreferences,
      masterVolume: 1.5,
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should accept masterVolume at boundaries (0 and 1)', () => {
    const atZero = parseUserPreferences({
      ...validUserPreferences,
      masterVolume: 0,
    });
    expect(atZero).not.toBeNull();

    const atOne = parseUserPreferences({
      ...validUserPreferences,
      masterVolume: 1,
    });
    expect(atOne).not.toBeNull();
  });

  it('should return null for missing language', () => {
    const invalidData = {
      masterVolume: 0.8,
      showHints: true,
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for non-string language', () => {
    const invalidData = {
      ...validUserPreferences,
      language: 123,
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for missing showHints', () => {
    const invalidData = {
      masterVolume: 0.8,
      language: 'nl',
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for non-boolean showHints', () => {
    const invalidData = {
      ...validUserPreferences,
      showHints: 'yes',
    };

    const result = parseUserPreferences(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = parseUserPreferences(null);

    expect(result).toBeNull();
  });

  it('should return null for undefined input', () => {
    const result = parseUserPreferences(undefined);

    expect(result).toBeNull();
  });

  it('should return null for non-object input', () => {
    const result = parseUserPreferences('not an object');

    expect(result).toBeNull();
  });

  it('should allow extra fields in preferences', () => {
    const dataWithExtra = {
      ...validUserPreferences,
      customField: 'ignored',
    };

    const result = parseUserPreferences(dataWithExtra);

    expect(result).not.toBeNull();
    expect(result).toEqual(validUserPreferences);
  });

  it('should handle different language values', () => {
    const dutchPrefs = parseUserPreferences({
      ...validUserPreferences,
      language: 'nl',
    });
    expect(dutchPrefs).not.toBeNull();

    const englishPrefs = parseUserPreferences({
      ...validUserPreferences,
      language: 'en',
    });
    expect(englishPrefs).not.toBeNull();

    const customLang = parseUserPreferences({
      ...validUserPreferences,
      language: 'fr',
    });
    expect(customLang).not.toBeNull(); // Should accept any string
  });
});

// =============================================================================
// parseLibraryState Tests
// =============================================================================

describe('parseLibraryState', () => {
  it('should parse valid library state', () => {
    const result = parseLibraryState(validLibraryState);

    expect(result).not.toBeNull();
    expect(result).toEqual(validLibraryState);
  });

  it('should return null for missing samples array', () => {
    const invalidData = {};

    const result = parseLibraryState(invalidData);

    expect(result).toBeNull();
  });

  it('should return null if samples is not an array', () => {
    const invalidData = {
      samples: 'not an array',
    };

    const result = parseLibraryState(invalidData);

    expect(result).toBeNull();
  });

  it('should return null for samples with invalid items', () => {
    const invalidData = {
      samples: [
        validLibraryState.samples[0],
        { id: 'invalid' }, // Missing required fields
      ],
    };

    const result = parseLibraryState(invalidData);

    expect(result).toBeNull();
  });

  it('should allow empty samples array', () => {
    const emptyLibrary = {
      samples: [],
    };

    const result = parseLibraryState(emptyLibrary);

    expect(result).not.toBeNull();
    expect(result?.samples).toEqual([]);
  });

  it('should validate sample structure in library', () => {
    const withValidSample = {
      samples: [
        {
          id: 'sample-1',
          name: 'Test Sample',
          locationId: 'location-1',
          audioUrl: '/audio/test.mp3',
          duration: 2.5,
          icon: 'test-icon',
          color: '#FF0000',
        },
      ],
    };

    const result = parseLibraryState(withValidSample);

    expect(result).not.toBeNull();
    expect(result?.samples.length).toBe(1);
  });

  it('should reject sample with invalid duration', () => {
    const invalidDuration = {
      samples: [
        {
          ...validLibraryState.samples[0],
          duration: 0,
        },
      ],
    };

    const result = parseLibraryState(invalidDuration);

    expect(result).toBeNull();
  });

  it('should reject sample with missing fields', () => {
    const missingField = {
      samples: [
        {
          id: 'sample-1',
          name: 'Test',
          // Missing locationId, audioUrl, duration, icon, color
        },
      ],
    };

    const result = parseLibraryState(missingField);

    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = parseLibraryState(null);

    expect(result).toBeNull();
  });

  it('should return null for undefined input', () => {
    const result = parseLibraryState(undefined);

    expect(result).toBeNull();
  });

  it('should return null for non-object input', () => {
    const result = parseLibraryState('not an object');

    expect(result).toBeNull();
  });

  it('should allow extra fields in library state', () => {
    const dataWithExtra = {
      samples: validLibraryState.samples,
      extraField: 'ignored',
    };

    const result = parseLibraryState(dataWithExtra);

    expect(result).not.toBeNull();
    expect(result).toEqual(validLibraryState);
  });

  it('should handle multiple samples in library', () => {
    const multiSample = {
      samples: [
        validLibraryState.samples[0],
        {
          id: 'sample-2',
          name: 'Another Sample',
          locationId: 'park',
          audioUrl: '/audio/another.mp3',
          duration: 3.5,
          icon: 'birds2',
          color: '#00FF00',
        },
      ],
    };

    const result = parseLibraryState(multiSample);

    expect(result).not.toBeNull();
    expect(result?.samples.length).toBe(2);
  });
});

// =============================================================================
// Sequences in compositie-opslag (fase 2)
// =============================================================================

describe('CompositionData met sequences (fase 2)', () => {
  const sequence = {
    id: 'seq-1',
    name: 'Mijn beat',
    lengthSteps: 16,
    bpm: 120,
    tracks: [
      {
        id: 'strack-1',
        sampleId: 'park-birds',
        steps: Array.from({ length: 16 }, (_, i) => i % 4 === 0),
        mode: 'ring' as const,
        trimStart: 0.5,
        trimEnd: 2.0,
        volume: 0.8,
      },
    ],
    createdAt: '2026-07-30T10:00:00.000Z',
    updatedAt: '2026-07-30T10:00:00.000Z',
  };

  it('roundtrip: sequences overleven parseCompositionData volledig', () => {
    const data = { ...validCompositionData, sequences: [sequence] };
    const result = parseCompositionData(data);
    expect(result).not.toBeNull();
    expect(result?.sequences).toEqual([sequence]);
  });

  it('composities zonder sequences blijven geldig (backward compat)', () => {
    const result = parseCompositionData(validCompositionData);
    expect(result).not.toBeNull();
    expect(result?.sequences).toBeUndefined();
  });

  it('ongeldige sequence (lengthSteps buiten bereik) keurt de compositie af', () => {
    const data = {
      ...validCompositionData,
      sequences: [{ ...sequence, lengthSteps: 64 }],
    };
    expect(parseCompositionData(data)).toBeNull();
  });

  it('sequence-clips (sampleId seq:...) zijn gewone geldige clips', () => {
    const data = {
      ...validCompositionData,
      tracks: [
        {
          id: 'track-1',
          clips: [
            { id: 'clip-1', sampleId: 'seq:seq-1', startBeat: 4, loop: true, loopDurationBeats: 32 },
          ],
        },
      ],
      sequences: [sequence],
    };
    const result = parseCompositionData(data);
    expect(result).not.toBeNull();
    expect(result?.tracks[0].clips[0].sampleId).toBe('seq:seq-1');
  });
});
