/**
 * Staat de podiumstap "Luisterspiegel" aan?
 *
 * DIT IS DE ENIGE PLEK waar dat bepaald wordt. Nu: de dev-vlag
 * `luisterspiegel` (aan in ontwikkeling, uit in productie, ?dev=true zet hem
 * aan). Zodra een docent de Luisterspiegel per opdracht kan aan- of uitzetten,
 * vervang je de regel hieronder door de waarde uit de opdracht, bijvoorbeeld:
 *
 *   const session = useAppStore((s) => s.classSession);
 *   return session ? session.luisterspiegel !== false : true;
 */

import { useDevFlagsStore } from '../stores/devFlagsStore';

export function useLuisterspiegelEnabled(): boolean {
  return useDevFlagsStore((s) => s.luisterspiegel);
}
