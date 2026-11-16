/**
 * useLeaveGuard - voorkomt dat een leerling ongemerkt zijn werk kwijtraakt (AUD-03)
 *
 * Verlaten/herladen: zolang er werk in het geheugen staat (clips, verzamelde
 * geluiden) vraagt de browser eerst "weet je het zeker?". Dat dekt ook de
 * volledige paginawissel van "Ben je docent?".
 *
 * De terugknop hoort hier sinds V2 Fase 2 niet meer bij: elk scherm heeft een
 * eigen pad, dus Terug en Vooruit (en de iPad-veeg) lopen via de router door
 * de schermen die de leerling echt bezocht (podium → studio → locatie → kaart
 * → start). Zie src/router/screenSync.ts.
 */

import { useEffect } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';

export function hasUnsavedWork(): boolean {
  const { librarySamples, recorderSlots } = useLibraryStore.getState();
  return (
    useTimelineStore.getState().selectHasClips() ||
    librarySamples.length > 0 ||
    recorderSlots.some((slot) => slot !== null)
  );
}

export function useLeaveGuard(): void {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedWork()) return;
      event.preventDefault();
      // Oudere browsers (o.a. Safari < 17) vragen nog een returnValue
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
