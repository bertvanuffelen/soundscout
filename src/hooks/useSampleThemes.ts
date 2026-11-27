/**
 * useSampleThemes — laad de thema's waar getoonde geluiden bij horen.
 *
 * Alleen `basis` zit in de bundel; de namen van geluiden uit andere thema's
 * worden pas als i18n-sleutels geregistreerd na `loadTheme(id)` (zie
 * src/themes/registry.ts). De leerling laadt zijn thema bij het starten, maar
 * een docent (feedback, presentatie) of een bezoeker van een gedeelde link
 * opent een soundscape zonder dat thema ooit gekozen te hebben — dan stond er
 * de ruwe sleutel "themes.sinterklaas.samples.…" in beeld.
 *
 * De hook haalt de thema-ids uit de naam-sleutels van de samples en laadt wat
 * nog ontbreekt. Opnieuw tekenen gaat vanzelf: i18n is ingesteld met
 * `bindI18nStore: 'added'`, dus elk onderdeel met `useTranslation` tekent
 * opnieuw zodra de teksten er zijn. Een onbekend of niet te laden thema is
 * geen fout: de naam blijft dan zoals hij was.
 */

import { useEffect, useMemo } from 'react';
import { getLoadedTheme, loadTheme } from '../themes/registry';

const SAMPLE_KEY = /^themes\.([^.]+)\.samples\./;

/** Thema-ids uit de naam-sleutels van samples (uniek, gesorteerd). */
export function themeIdsFromSamples(
  samples: ReadonlyArray<{ name?: string | null } | null | undefined> | null | undefined,
): string[] {
  const ids = new Set<string>();
  for (const sample of samples ?? []) {
    const match = typeof sample?.name === 'string' ? SAMPLE_KEY.exec(sample.name) : null;
    if (match) ids.add(match[1]);
  }
  return [...ids].sort();
}

/**
 * Laad de thema's van deze samples. Geef álle samples mee die in beeld kunnen
 * komen (bijvoorbeeld van de hele playlist), dan staat alles klaar bij wisselen.
 */
export function useSampleThemes(
  samples: ReadonlyArray<{ name?: string | null } | null | undefined> | null | undefined,
): void {
  // Als tekst, zodat een nieuwe array met dezelfde thema's niets opnieuw start
  const key = useMemo(() => themeIdsFromSamples(samples).join(','), [samples]);
  useEffect(() => {
    if (!key) return;
    for (const id of key.split(',')) {
      if (!getLoadedTheme(id)) void loadTheme(id);
    }
  }, [key]);
}
