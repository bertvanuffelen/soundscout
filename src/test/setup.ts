/**
 * Vitest test setup
 *
 * This file runs before each test and sets up:
 * - DOM testing library matchers
 * - Mock implementations for browser APIs
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Tone.js since it requires AudioContext
vi.mock('tone', () => ({
  start: vi.fn().mockResolvedValue(undefined),
  // LET OP: function-implementaties (geen arrows) — mocks moeten ook met
  // `new` construeerbaar zijn (SequencerEngine doet `new Tone.Player(...)`).
  Player: vi.fn().mockImplementation(function () {
    return {
      toDestination: vi.fn().mockReturnThis(),
      connect: vi.fn().mockReturnThis(),
      load: vi.fn().mockResolvedValue(undefined),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      loaded: true,
      state: 'stopped',
      fadeIn: 0,
      fadeOut: 0,
      volume: { value: 0 },
    };
  }),
  getTransport: vi.fn().mockReturnValue({
    bpm: { value: 120 },
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
    schedule: vi.fn(),
    seconds: 0,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
  }),
  // --- Toevoegingen voor het Sequencer Lab (eigen klok + keten) ---
  Clock: vi.fn().mockImplementation(function (
    callback?: (time: number) => void,
    frequency?: number
  ) {
    return {
      callback,
      frequency: { value: frequency ?? 2 },
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      state: 'stopped',
    };
  }),
  Gain: vi.fn().mockImplementation(function (gain?: number) {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      gain: { value: gain ?? 1, setValueAtTime: vi.fn() },
      dispose: vi.fn(),
    };
  }),
  Limiter: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    };
  }),
  ToneAudioBuffer: vi.fn().mockImplementation(function () {
    return {
      load: vi.fn().mockResolvedValue(undefined),
      loaded: true,
      duration: 1.5,
      get: vi.fn().mockReturnValue(null),
      dispose: vi.fn(),
    };
  }),
  getContext: vi.fn().mockReturnValue({ state: 'running' }),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// --- Thema-manifesten (V2 Fase 3) ---
// In de app komen /themes/index.json en /themes/<id>/manifest.json van de
// webserver; in jsdom bestaat die niet. Lees ze uit public/themes/ zodat
// loadTheme('winterspelen') in tests hetzelfde manifest krijgt als de app.
{
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.startsWith('/') ? url : (() => { try { return new URL(url).pathname; } catch { return url; } })();
    if (path.startsWith('/themes/') && path.endsWith('.json')) {
      try {
        const body = await readFile(join(process.cwd(), 'public', path), 'utf8');
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }
    return realFetch(input, init);
  }) as typeof fetch;
}
