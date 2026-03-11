/**
 * Storyboards for the Basis (De Stad) theme.
 *
 * Each storyboard is a sequence of images (or a single image)
 * that the user can compose a soundscape for.
 *
 * Images are stored in /public/images/themes/basis/storyboards/
 */

import type { Storyboard } from '../../../types';

export const storyboards: Storyboard[] = [
  {
    id: 'stad-dag',
    themeId: 'basis',
    name: 'storyboards.basis.stad-dag.name',
    description: 'storyboards.basis.stad-dag.description',
    coverImage: '/images/themes/basis/storyboards/stad-dag-cover.jpg',
    images: [
      {
        id: 'ochtend',
        url: '/images/themes/basis/storyboards/stad-dag-ochtend.jpg',
        label: 'storyboards.basis.stad-dag.ochtend',
      },
      {
        id: 'middag',
        url: '/images/themes/basis/storyboards/stad-dag-middag.jpg',
        label: 'storyboards.basis.stad-dag.middag',
      },
      {
        id: 'avond',
        url: '/images/themes/basis/storyboards/stad-dag-avond.jpg',
        label: 'storyboards.basis.stad-dag.avond',
      },
    ],
  },
  {
    id: 'stad-markt',
    themeId: 'basis',
    name: 'storyboards.basis.stad-markt.name',
    description: 'storyboards.basis.stad-markt.description',
    coverImage: '/images/themes/basis/storyboards/stad-markt-cover.jpg',
    images: [
      {
        id: 'markt',
        url: '/images/themes/basis/storyboards/stad-markt.jpg',
        label: 'storyboards.basis.stad-markt.markt',
      },
    ],
  },
];
