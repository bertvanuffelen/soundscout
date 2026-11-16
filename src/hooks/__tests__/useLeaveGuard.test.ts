/**
 * Werk niet kwijt (AUD-03): verlaten met werk vraagt om bevestiging.
 * De terugknop loopt sinds V2 Fase 2 via de router: zie
 * src/router/__tests__/screenSync.test.ts en e2e/routing.spec.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeaveGuard } from '../useLeaveGuard';
import { useLibraryStore } from '../../stores/libraryStore';
import type { Sample } from '../../types';

function fireBeforeUnload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('useLeaveGuard', () => {
  beforeEach(() => {
    useLibraryStore.getState().clearLibrary();
  });

  it('vraagt bevestiging bij verlaten als er geluiden verzameld zijn', () => {
    renderHook(() => useLeaveGuard());
    expect(fireBeforeUnload()).toBe(false);
    act(() => useLibraryStore.setState({ librarySamples: [{ id: 's1' } as Sample] }));
    expect(fireBeforeUnload()).toBe(true);
  });
});
