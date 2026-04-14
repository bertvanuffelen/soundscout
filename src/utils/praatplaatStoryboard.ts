/**
 * Helper om een praatplaat om te zetten naar een virtueel Storyboard.
 *
 * Dit wordt gebruikt door:
 * - PraatplaatSelectScreen (bij start van een nieuwe praatplaat-sessie)
 * - compositionInit.hydrateCompositionContext (bij heropenen van een
 *   opgeslagen praatplaat-compositie)
 *
 * Het virtuele storyboard heeft id `praatplaat-{praatplaatId}` en bevat één
 * image (de praatplaat-afbeelding). Zo kan de bestaande studio-UI de
 * praatplaat renderen zonder extra code-paden.
 */

import type { ActivePraatplaat, Storyboard } from '../types';

export function praatplaatToStoryboard(praatplaat: Pick<ActivePraatplaat, 'id' | 'name' | 'imageUrl' | 'themeId'>): Storyboard {
  return {
    id: `praatplaat-${praatplaat.id}`,
    themeId: praatplaat.themeId,
    name: praatplaat.name,
    description: 'Praatplaat',
    coverImage: praatplaat.imageUrl,
    images: [
      {
        id: praatplaat.id,
        url: praatplaat.imageUrl,
        label: praatplaat.name,
      },
    ],
  };
}
