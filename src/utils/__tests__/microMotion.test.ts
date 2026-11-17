/**
 * Tastbare momenten (mockup A4): de vlucht naar de tas is puur decoratief en
 * mag nooit iets breken; de land-beweging geldt alleen voor het blok dat net
 * is neergezet.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flyToBag, markDropped, wasJustDropped } from '../microMotion';

function stubMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: reduce }));
}

describe('wasJustDropped', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('geldt alleen voor het net neergezette blok, en maar even', () => {
    markDropped('clip-1');
    expect(wasJustDropped('clip-1')).toBe(true);
    expect(wasJustDropped('clip-2')).toBe(false);
    vi.advanceTimersByTime(600);
    expect(wasJustDropped('clip-1')).toBe(false);
  });
});

describe('flyToBag', () => {
  let from: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<button id="hot"></button><div data-recorder-slot="0" data-empty="false"></div><div data-recorder-slot="1" data-empty="true"></div>';
    from = document.getElementById('hot')!;
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('doet niets bij prefers-reduced-motion', () => {
    stubMotion(true);
    flyToBag(from, '#FFC107');
    expect(document.body.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('doet niets als de tas vol is (geen leeg vak)', () => {
    stubMotion(false);
    document.querySelector('[data-empty="true"]')!.setAttribute('data-empty', 'false');
    flyToBag(from, '#FFC107');
    expect(document.body.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('breekt niet zonder element.animate (oude browser, tests)', () => {
    stubMotion(false);
    expect(() => flyToBag(from, '#FFC107')).not.toThrow();
    expect(document.body.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('laat een blokje vliegen en ruimt het daarna op', () => {
    stubMotion(false);
    const anim: { onfinish: null | (() => void); oncancel: null | (() => void) } = { onfinish: null, oncancel: null };
    // jsdom kent element.animate niet: tijdelijk op het prototype zetten
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    proto.animate = vi.fn().mockReturnValue(anim);
    flyToBag(from, '#FFC107');
    delete proto.animate;
    const dot = document.body.querySelector<HTMLElement>('[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot!.style.pointerEvents).toBe('none');
    anim.onfinish?.();
    expect(document.body.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
