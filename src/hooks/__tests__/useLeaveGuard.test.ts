/**
 * Werk niet kwijt (AUD-03): terug blijft binnen de app, en verlaten met werk
 * vraagt om bevestiging.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeaveGuard } from '../useLeaveGuard';
import { useAppStore } from '../../stores/appStore';
import { useLibraryStore } from '../../stores/libraryStore';
import type { Sample } from '../../types';

function pressBack() {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  });
}

function fireBeforeUnload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('useLeaveGuard', () => {
  beforeEach(() => {
    window.history.replaceState(null, '');
    useAppStore.setState({ currentScreen: 'start' });
    useLibraryStore.getState().clearLibrary();
  });

  it('zet een terug-buffer klaar zodra een werkscherm opent', () => {
    renderHook(() => useLeaveGuard());
    act(() => useAppStore.getState().goToStudio());
    expect((window.history.state as Record<string, unknown>)?.soundscoutBackGuard).toBe(true);
  });

  it('terug gaat stap voor stap binnen de app: podium → studio → kaart → start', () => {
    renderHook(() => useLeaveGuard());
    act(() => useAppStore.getState().goToStage());
    pressBack();
    expect(useAppStore.getState().currentScreen).toBe('studio');
    pressBack();
    expect(useAppStore.getState().currentScreen).toBe('map');
    pressBack();
    expect(useAppStore.getState().currentScreen).toBe('start');
  });

  it('laat terug op het startscherm met rust', () => {
    renderHook(() => useLeaveGuard());
    pressBack();
    expect(useAppStore.getState().currentScreen).toBe('start');
  });

  it('vraagt bevestiging bij verlaten als er geluiden verzameld zijn', () => {
    renderHook(() => useLeaveGuard());
    expect(fireBeforeUnload()).toBe(false);
    act(() => useLibraryStore.setState({ librarySamples: [{ id: 's1' } as Sample] }));
    expect(fireBeforeUnload()).toBe(true);
  });
});
