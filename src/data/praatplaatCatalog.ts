/**
 * Praatplaat-catalogus
 *
 * De vaste set afbeeldingen waaruit een docent een praatplaat-opdracht kiest —
 * dezelfde bronnen die `CreatePraatplaatModal` combineert:
 *   1. de universele praatplaat-bibliotheek (`praatplaatImages`, docent-flow)
 *   2. de thema-locatie-afbeeldingen (`getAllLocationsByTheme`)
 *
 * De docent kiest een entry; het systeem find-or-create't één praatplaat-
 * instance per (klas + afbeelding) via `activatePraatplaatFromCatalog`.
 */

import { praatplaatImages, isAvailableForTeacher } from './praatplaatImages';
import { getAllLocationsByTheme } from './themes';

export interface PraatplaatCatalogEntry {
  /** Stabiele referentie (voor React-keys). */
  ref: string;
  /** i18n-key voor de naam (UI vertaalt via t()). */
  nameKey: string;
  /** Afbeeldings-URL. */
  imageUrl: string;
  /** Geluiden-thema dat bij deze afbeelding hoort. */
  themeId: string;
  /** Locatie-/afbeeldings-id. */
  locationId: string;
}

/** De volledige praatplaat-catalogus (bibliotheek + thema-locaties). */
export function getPraatplaatCatalog(): PraatplaatCatalogEntry[] {
  const entries: PraatplaatCatalogEntry[] = [];

  // 1. Universele bibliotheek
  for (const img of praatplaatImages.filter(isAvailableForTeacher)) {
    entries.push({
      ref: img.id,
      nameKey: img.nameKey,
      imageUrl: img.imageUrl,
      themeId: img.themeId ?? 'general',
      locationId: img.id,
    });
  }

  // 2. Thema-locatie-afbeeldingen
  for (const group of getAllLocationsByTheme()) {
    for (const loc of group.locations) {
      entries.push({
        ref: `${group.themeId}:${loc.id}`,
        nameKey: loc.name,
        imageUrl: loc.backgroundImage,
        themeId: group.themeId,
        locationId: loc.id,
      });
    }
  }

  return entries;
}
