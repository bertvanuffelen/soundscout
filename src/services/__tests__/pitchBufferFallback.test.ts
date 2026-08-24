/**
 * Regressietest voor de structurele-fout-latch in PitchBufferService.
 *
 * Aanleiding (13-8-2026): op ss-dev blokkeerde de CSP `blob:` in script-src,
 * waardoor de Signalsmith-worklet niet kon registreren. De oude detectie
 * (`typeof AudioWorkletNode === 'undefined'`) zag dat niet — AudioWorkletNode
 * bestáát immers, alleen het laden van de module werd geweigerd. Gevolg:
 * `supported` bleef true en élke gepitchte clip probeerde opnieuw een bake
 * die altijd faalde.
 *
 * Deze test bewaakt dat een niet-registreerbare worklet één keer meldt en
 * daarna de hele sessie uitgeschakeld blijft.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PitchBufferService } from '../PitchBufferService';
import { logger } from '../../utils/logger';

/** Minimale AudioBuffer-dubbel — de bake komt nooit voorbij de node-creatie. */
function fakeBuffer(): AudioBuffer {
  return {
    numberOfChannels: 1,
    length: 128,
    sampleRate: 44100,
    duration: 128 / 44100,
    getChannelData: () => new Float32Array(128),
  } as unknown as AudioBuffer;
}

/** Verse instantie zonder de singleton van andere tests te vervuilen. */
function freshService(): PitchBufferService {
  return new (PitchBufferService as unknown as new () => PitchBufferService)();
}

/**
 * jsdom kent geen Web Audio. Zonder deze stubs struikelt de bake al op
 * `new OfflineAudioContext(...)` en bereiken we de node-creatie nooit — dan
 * zou de test de latch bewijzen om de verkeerde reden (AudioWorkletNode
 * ontbreekt) in plaats van om de reden die we willen bewaken (de worklet
 * mag niet laden terwijl AudioWorkletNode wél bestaat, zoals bij een CSP).
 */
function stubWebAudio(): void {
  (globalThis as Record<string, unknown>).OfflineAudioContext = class {
    destination = {};
    startRendering() { return Promise.resolve(fakeBuffer()); }
  };
  (globalThis as Record<string, unknown>).AudioWorkletNode = class {};
}

describe('PitchBufferService — structurele fout latcht uit', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stubWebAudio();
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).OfflineAudioContext;
    delete (globalThis as Record<string, unknown>).AudioWorkletNode;
  });

  it('probeert na een niet-registreerbare worklet geen tweede bake', async () => {
    const service = freshService();

    // Bootst de CSP-blokkade na: de factory laadt prima, maar het aanmaken
    // van de worklet-node faalt (Chrome geeft hier AbortError).
    const factory = vi.fn().mockRejectedValue(
      Object.assign(new Error('blocked by CSP'), { name: 'AbortError' })
    );
    (service as unknown as { factoryPromise: Promise<unknown> }).factoryPromise =
      Promise.resolve(factory);

    const first = await service.bake('sample-a', 5, fakeBuffer());
    expect(first).toBeNull();
    expect(factory).toHaveBeenCalledTimes(1);

    // Tweede clip: mag de worklet niet opnieuw proberen.
    const second = await service.bake('sample-b', 7, fakeBuffer());
    expect(second).toBeNull();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('meldt de structurele fout één keer op error-niveau, niet als warn', async () => {
    const service = freshService();
    const factory = vi.fn().mockRejectedValue(new Error('geen worklet'));
    (service as unknown as { factoryPromise: Promise<unknown> }).factoryPromise =
      Promise.resolve(factory);

    await service.bake('sample-a', 3, fakeBuffer());
    await service.bake('sample-b', 3, fakeBuffer());

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/niet beschikbaar/i);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('laat pitch 0 ongemoeid (geen bake, geen fout)', async () => {
    const service = freshService();
    const factory = vi.fn();
    (service as unknown as { factoryPromise: Promise<unknown> }).factoryPromise =
      Promise.resolve(factory);

    expect(await service.bake('sample-a', 0, fakeBuffer())).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });
});
