/**
 * Geheugenbudget × engine (V2 Fase 3): elke pinregel, LRU via het echte
 * laadpad, herladen na opruimen, en pitch-bake opruimen + opnieuw bakken.
 * Tone is gemockt (src/test/setup.ts); hier krijgen de buffers een echte
 * grootte zodat de boekhouding iets te tellen heeft.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Tone from 'tone';
import { AudioService } from '../../AudioService';
import { pitchBufferService } from '../../PitchBufferService';
import { decodedAudioBudget, pitchKey } from '../memoryBudget';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useLibraryStore } from '../../../stores/libraryStore';
import { logger } from '../../../utils/logger';
import type { Sample, Track } from '../../../types';
import type { SequencerSequence } from '../../../types/sequencer';

const MB = 1024 * 1024;
/** 1 MB per geluid: 262144 frames × 1 kanaal × 4 bytes */
const FRAMES_PER_MB = MB / 4;

function fakeAudioBuffer(frames = FRAMES_PER_MB): AudioBuffer {
  return {
    length: frames,
    numberOfChannels: 1,
    sampleRate: 44100,
    duration: frames / 44100,
    getChannelData: () => new Float32Array(1),
  } as unknown as AudioBuffer;
}

interface MockBuffer {
  url?: string;
  length: number;
  numberOfChannels: number;
  loaded: boolean;
  load: (url: string) => Promise<void>;
  get: () => AudioBuffer;
  dispose: ReturnType<typeof vi.fn>;
}

const createdBuffers: MockBuffer[] = [];
const createdPlayers: Array<{ start: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }> = [];

function sample(id: string): Sample {
  return {
    id, name: id, locationId: 'loc', audioUrl: `/audio/${id}.mp3`,
    duration: 2, icon: 'Music', color: '#000000',
  } as Sample;
}

function trackWith(clips: Array<{ sampleId: string; pitch?: number }>): Track {
  return {
    id: 't0', name: 'Spoor 1',
    clips: clips.map((c, i) => ({
      id: `c${i}`, sampleId: c.sampleId, startBeat: i * 4,
      effects: c.pitch ? { pitch: c.pitch, reverb: 0, fadeIn: 0, fadeOut: 0 } : undefined,
    })),
  } as unknown as Track;
}

function emptyTracks(): Track[] {
  return [{ id: 't0', name: 'Spoor 1', clips: [] } as unknown as Track];
}

let audio: AudioService;

function setScheduled(tracks: Track[], sequences: SequencerSequence[] = []): void {
  const engine = audio as unknown as { scheduledTracks: Track[]; scheduledSequences: SequencerSequence[] };
  engine.scheduledTracks = tracks;
  engine.scheduledSequences = sequences;
}

/** Laad elk geluid in een eigen verzoek (zo schuift de "recente werkset" door) */
async function loadEach(ids: string[]): Promise<void> {
  for (const id of ids) await audio.loadSamples([sample(id)]);
}

function loadedIds(): string[] {
  return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].filter((id) => audio.isSampleLoaded(id));
}

beforeEach(() => {
  createdBuffers.length = 0;
  createdPlayers.length = 0;
  vi.mocked(Tone.ToneAudioBuffer).mockImplementation(function (this: unknown) {
    const buffer: MockBuffer = {
      length: 0,
      numberOfChannels: 1,
      loaded: false,
      load: vi.fn(async (url: string) => {
        buffer.url = url;
        buffer.length = FRAMES_PER_MB;
        buffer.loaded = true;
      }),
      get: () => fakeAudioBuffer(),
      dispose: vi.fn(),
    };
    createdBuffers.push(buffer);
    return buffer;
  } as unknown as () => Tone.ToneAudioBuffer);
  vi.mocked(Tone.Player).mockImplementation(function () {
    const player = {
      toDestination: vi.fn().mockReturnThis(),
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      loaded: true,
      state: 'stopped',
      volume: { value: 0 },
    };
    createdPlayers.push(player);
    return player;
  } as unknown as () => Tone.Player);

  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});

  AudioService.resetInstance();
  decodedAudioBudget.reset();
  pitchBufferService.clear();
  audio = AudioService.getInstance();
  audio.setMemoryBudget(3 * MB);

  useTimelineStore.setState({ tracks: emptyTracks(), sequences: [] });
  useLibraryStore.setState({ librarySamples: [], recorderSlots: [null, null, null, null, null, null] });
});

afterEach(() => {
  vi.restoreAllMocks();
  audio.setMemoryBudget(null);
});

describe('boekhouding', () => {
  it('telt geladen geluiden met length × kanalen × 4', async () => {
    await audio.loadSamples([sample('a'), sample('b')]);
    const stats = audio.getMemoryStats();
    expect(stats.byCategory.sample).toEqual({ bytes: 2 * MB, count: 2 });
    expect(stats.entryCount).toBe(2);
    expect(stats.budgetBytes).toBe(3 * MB);
  });

  it('dubbel laden telt één keer', async () => {
    await audio.loadSamples([sample('a')]);
    await audio.loadSamples([sample('a')]);
    expect(audio.getMemoryStats().byCategory.sample.count).toBe(1);
  });

  it('disposeUnusedPlayers (themawissel) boekt af', async () => {
    await audio.loadSamples([sample('a'), sample('b')]);
    audio.disposeUnusedPlayers(new Set(['a']));
    expect(audio.getMemoryStats().totalBytes).toBe(1 * MB);
    expect(loadedIds()).toEqual(['a']);
  });
});

describe('LRU via het laadpad', () => {
  it('ruimt het minst recent gebruikte, niet-beschermde geluid op', async () => {
    // a, b, c, d, e elk in een eigen verzoek; alleen de laatste 3 verzoeken
    // zijn beschermd (regel f) → a en b zijn kandidaat, a is het oudst
    await loadEach(['a', 'b', 'c']);
    expect(loadedIds()).toEqual(['a', 'b', 'c']);
    await loadEach(['d']);
    expect(loadedIds()).toEqual(['b', 'c', 'd']);
    // Recent beschermd: c, d, e. b is dan de enige onbeschermde en gaat weg,
    // ook al is hij net gebruikt (export-hergebruik telt als gebruik)
    audio.getLoadedBuffer('b');
    await loadEach(['e']);
    expect(loadedIds()).toEqual(['c', 'd', 'e']);
    expect(audio.getMemoryStats().evictedTotal).toBe(2);
  });

  it('logt één info-regel per opruimronde', async () => {
    await loadEach(['a', 'b', 'c', 'd']);
    const lines = vi.mocked(logger.info).mock.calls.map((c) => String(c[0]))
      .filter((l) => l.includes('opgeruimd'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/1 buffer\(s\) opgeruimd, 1 MB vrij, nu 3 MB van 3 MB budget/);
  });

  it('opruimen disposet de preview-Player maar NIET de buffer (export houdt hem vast)', async () => {
    await loadEach(['a']);
    const exportHeld = audio.getLoadedBuffer('a');
    const bufferA = createdBuffers[0];
    const playerA = createdPlayers[0];
    await loadEach(['b', 'c', 'd']);
    expect(audio.isSampleLoaded('a')).toBe(false);
    expect(playerA.dispose).toHaveBeenCalled();
    expect(bufferA.dispose).not.toHaveBeenCalled();
    expect(exportHeld?.loaded).toBe(true);
  });

  it('één grote werkset ruimt zichzelf niet op', async () => {
    await audio.loadSamples(['a', 'b', 'c', 'd', 'e'].map(sample));
    expect(loadedIds()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(audio.getMemoryStats().totalBytes).toBe(5 * MB);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boven budget'));
  });
});

describe('pinregels — nooit opruimen', () => {
  async function overfillWith(protectedId: string): Promise<void> {
    await loadEach([protectedId, 'x1', 'x2', 'x3', 'x4']);
  }

  it('(a) clips op de tijdlijn', async () => {
    useTimelineStore.setState({ tracks: [trackWith([{ sampleId: 'a' }])] });
    await overfillWith('a');
    expect(audio.isSampleLoaded('a')).toBe(true);
  });

  it('(a) geluiden in een sequence-patroon (seq:-clip pakt uit)', async () => {
    const sequence = {
      id: 's1', name: 'Beat', lengthSteps: 16, bpm: 120,
      tracks: [{ id: 'p1', sampleId: 'a', steps: [], mode: 'ring' }],
    } as unknown as SequencerSequence;
    useTimelineStore.setState({
      tracks: [trackWith([{ sampleId: 'seq:s1' }])],
      sequences: [sequence],
    });
    await overfillWith('a');
    expect(audio.isSampleLoaded('a')).toBe(true);
    expect(audio.collectPins().sampleIds.has('seq:s1')).toBe(false);
  });

  it('(b) bibliotheek van de sessie', async () => {
    useLibraryStore.setState({ librarySamples: [sample('a')] });
    await overfillWith('a');
    expect(audio.isSampleLoaded('a')).toBe(true);
  });

  it('(b) recorder-slots', async () => {
    useLibraryStore.setState({ recorderSlots: [null, sample('a'), null, null, null, null] });
    await overfillWith('a');
    expect(audio.isSampleLoaded('a')).toBe(true);
  });

  it('(c)/(d) wat de motor gepland heeft (ook tracks buiten de stores, bv. presentatie/export)', async () => {
    setScheduled([trackWith([{ sampleId: 'a' }])]);
    await overfillWith('a');
    expect(audio.isSampleLoaded('a')).toBe(true);
  });

  it('(e) wat er als preview klinkt', async () => {
    await loadEach(['a']);
    audio.playSample('a');
    await loadEach(['x1', 'x2', 'x3', 'x4']);
    expect(audio.isSampleLoaded('a')).toBe(true);
  });

  it('(f) de laatst gevraagde werksets (bv. hotspots van de huidige locatie)', async () => {
    await audio.loadSamples([sample('a'), sample('b')]); // "locatie"
    await loadEach(['x1', 'x2']);
    expect(audio.isSampleLoaded('a')).toBe(true);
    expect(audio.isSampleLoaded('b')).toBe(true);
  });

  it('alles vastgepind boven budget → niets weg, één waarschuwing, afspelen blijft werken', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    useLibraryStore.setState({ librarySamples: ids.map(sample) });
    await loadEach(ids);
    await loadEach(['x1', 'x2', 'x3']);
    expect(ids.every((id) => audio.isSampleLoaded(id))).toBe(true);
    const warnings = vi.mocked(logger.warn).mock.calls.filter((c) => String(c[0]).includes('boven budget'));
    expect(warnings).toHaveLength(1);
    audio.playSample('a');
    expect(createdPlayers.some((p) => p.start.mock.calls.length > 0)).toBe(true);
  });
});

describe('herladen na opruimen', () => {
  it('playSample laadt een opgeruimd geluid transparant opnieuw en speelt het', async () => {
    await loadEach(['a', 'b', 'c', 'd']);
    expect(audio.isSampleLoaded('a')).toBe(false);
    const playersBefore = createdPlayers.length;
    audio.playSample('a');
    await vi.waitFor(() => expect(audio.isSampleLoaded('a')).toBe(true));
    const reloaded = createdPlayers.slice(playersBefore);
    await vi.waitFor(() => expect(reloaded.some((p) => p.start.mock.calls.length > 0)).toBe(true));
  });

  it('het gewone loadSample-pad laadt een opgeruimd geluid opnieuw', async () => {
    await loadEach(['a', 'b', 'c', 'd']);
    expect(audio.isSampleLoaded('a')).toBe(false);
    const result = await audio.loadSample(sample('a'));
    expect(result.success).toBe(true);
    expect(audio.isSampleLoaded('a')).toBe(true);
  });

  it('een nieuwere preview wint van een herlaad-preview', async () => {
    await loadEach(['a', 'b', 'c', 'd']);
    audio.playSample('a'); // herlaadt asynchroon
    audio.playSample('d'); // geladen → speelt meteen, wordt de actuele preview
    await vi.waitFor(() => expect(audio.isSampleLoaded('a')).toBe(true));
    const playerA = createdPlayers[createdPlayers.length - 1];
    await Promise.resolve();
    expect(playerA.start).not.toHaveBeenCalled();
  });
});

describe('pitch-bakes', () => {
  beforeEach(() => {
    vi.spyOn(pitchBufferService as unknown as { renderPitched: () => Promise<AudioBuffer> }, 'renderPitched')
      .mockImplementation(async () => fakeAudioBuffer());
  });

  it('tellen mee in het budget', async () => {
    await audio.loadSamples([sample('a')]);
    setScheduled([trackWith([{ sampleId: 'a', pitch: 3 }])]);
    await pitchBufferService.bake('a', 3, fakeAudioBuffer());
    const stats = audio.getMemoryStats();
    expect(stats.byCategory.pitch).toEqual({ bytes: 1 * MB, count: 1 });
    expect(stats.totalBytes).toBe(2 * MB);
  });

  it('een losse bake (oude preview-toonhoogte) wordt opgeruimd en later opnieuw gebakken', async () => {
    useLibraryStore.setState({ librarySamples: [sample('a')] });
    await audio.loadSamples([sample('a')]);
    await pitchBufferService.bake('a', 2, fakeAudioBuffer()); // preview op +2…
    audio.setMemoryBudget(2 * MB);
    setScheduled([trackWith([{ sampleId: 'a', pitch: 5 }])]);
    await pitchBufferService.bake('a', 5, fakeAudioBuffer()); // …tijdlijn op +5
    expect(pitchBufferService.getBaked('a', 2)).toBeUndefined();
    expect(pitchBufferService.getBaked('a', 5)).toBeDefined();
    expect(audio.isSampleLoaded('a')).toBe(true);

    // Opnieuw gebruikt → bake() rendert hem gewoon opnieuw
    const again = await pitchBufferService.bake('a', 2, fakeAudioBuffer());
    expect(again).not.toBeNull();
    expect(pitchBufferService.getBaked('a', 2)).toBeDefined();
  });

  it('een bake op de tijdlijn blijft, ook boven budget', async () => {
    audio.setMemoryBudget(1);
    setScheduled([trackWith([{ sampleId: 'a', pitch: 7 }])]);
    await pitchBufferService.bake('a', 7, fakeAudioBuffer());
    await loadEach(['x1', 'x2', 'x3', 'x4']);
    expect(pitchBufferService.getBaked('a', 7)).toBeDefined();
    expect(audio.collectPins().pitchKeys.has(pitchKey('a', 7))).toBe(true);
  });

  it('prune bij themawissel boekt ook af', async () => {
    await pitchBufferService.bake('a', 4, fakeAudioBuffer());
    pitchBufferService.prune(new Set());
    expect(audio.getMemoryStats().byCategory.pitch.count).toBe(0);
  });
});
