/**
 * useCompositionsVersion — teller die oploopt als de lijst lokaal bewaarde
 * composities van buitenaf verandert: de opslag (IndexedDB) is klaar met
 * openen, een ander tabblad heeft iets bewaard, of een schrijfactie is
 * achteraf mislukt.
 *
 * Gebruik hem als dependency van een effect of memo dat `storageService`
 * leest; eigen schrijfacties van het scherm geven géén seintje.
 */

import { useSyncExternalStore } from 'react';
import { storageService } from '../services/StorageService';

export function useCompositionsVersion(): number {
  return useSyncExternalStore(
    storageService.subscribeCompositions,
    storageService.getCompositionsVersion,
    storageService.getCompositionsVersion,
  );
}
