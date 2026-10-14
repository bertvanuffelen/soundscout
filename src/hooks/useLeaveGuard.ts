/**
 * useLeaveGuard - voorkomt dat een leerling ongemerkt zijn werk kwijtraakt (AUD-03)
 *
 * De app heeft geen router: schermen wisselen via appStore. Zonder deze hook
 * verliet de browser-terugknop (of de iPad-veeg) de hele app, en wisten
 * herladen of tabblad sluiten het werk zonder waarschuwing.
 *
 * - Terugknop: op een werkscherm (kaart, locatie, studio, podium) staat er één
 *   extra history-entry klaar. Terug gaat dan één stap terug binnen de app
 *   (podium → studio → kaart → start) in plaats van SoundScout te verlaten.
 * - Verlaten/herladen: zolang er werk in het geheugen staat (clips, verzamelde
 *   geluiden) vraagt de browser eerst "weet je het zeker?". Dat dekt ook de
 *   volledige paginawissel van "Ben je docent?".
 */

import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import type { GameScreen } from '../types';

const GUARD_STATE_KEY = 'soundscoutBackGuard';

/** Schermen waar terug binnen de app moet blijven, met hun "vorige" scherm */
const BACK_TARGET: Partial<Record<GameScreen, GameScreen>> = {
  location: 'map',
  studio: 'map',
  stage: 'studio',
  map: 'start',
};

export function hasUnsavedWork(): boolean {
  const { librarySamples, recorderSlots } = useLibraryStore.getState();
  return (
    useTimelineStore.getState().selectHasClips() ||
    librarySamples.length > 0 ||
    recorderSlots.some((slot) => slot !== null)
  );
}

function isGuarded(screen: GameScreen): boolean {
  return screen in BACK_TARGET;
}

function pushGuard(): void {
  const state = window.history.state as Record<string, unknown> | null;
  if (state?.[GUARD_STATE_KEY]) return;
  window.history.pushState({ ...(state ?? {}), [GUARD_STATE_KEY]: true }, '');
}

function goBackInApp(screen: GameScreen): void {
  const app = useAppStore.getState();
  switch (BACK_TARGET[screen]) {
    case 'map': app.goToMap(); break;
    case 'studio': app.goToStudio(); break;
    case 'start': app.goToStart(); break;
  }
}

export function useLeaveGuard(): void {
  useEffect(() => {
    // --- Terugknop binnen de app houden ---
    if (isGuarded(useAppStore.getState().currentScreen)) pushGuard();

    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.currentScreen !== prev.currentScreen && isGuarded(state.currentScreen)) {
        pushGuard();
      }
    });

    const handlePopState = () => {
      const screen = useAppStore.getState().currentScreen;
      if (!isGuarded(screen)) return;
      goBackInApp(screen);
      if (isGuarded(useAppStore.getState().currentScreen)) pushGuard();
    };

    // --- Waarschuwen bij verlaten / herladen ---
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedWork()) return;
      event.preventDefault();
      // Oudere browsers (o.a. Safari < 17) vragen nog een returnValue
      event.returnValue = '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
