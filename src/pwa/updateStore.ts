/**
 * Toestand van "er staat een nieuwe versie klaar" (V2 Fase 2 — offline).
 * Gevuld door registerServiceWorker.ts, gelezen door UpdateNotice.tsx.
 */
import { create } from 'zustand';

interface UpdateStore {
  /** Een nieuwe service worker is geïnstalleerd en wacht */
  needRefresh: boolean;
  /** De melding is in deze sessie weggeklikt ("Later") */
  dismissed: boolean;
  /** Neemt de nieuwe versie in gebruik en herlaadt de pagina */
  applyUpdate: () => void;
}

export const useUpdateStore = create<UpdateStore>(() => ({
  needRefresh: false,
  dismissed: false,
  applyUpdate: () => undefined,
}));
