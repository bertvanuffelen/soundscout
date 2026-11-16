import { describe, it, expect } from 'vitest';
import { themeAssetUrls, themeDataUrls } from '../warmThemeCache';
import { getDefaultTheme } from '../../data/themes';

const basisTheme = getDefaultTheme();
import { isThemeAudio, isAppImage, isThemeData } from '../swRouting';

describe('themeAssetUrls', () => {
  const urls = themeAssetUrls(basisTheme);

  it('bevat de kaart, elk locatiebeeld en elk geluid van het thema, zonder dubbelen', () => {
    expect(urls).toContain(basisTheme.map.backgroundImage);
    for (const location of basisTheme.locations) expect(urls).toContain(location.backgroundImage);
    for (const sample of basisTheme.samples) expect(urls).toContain(sample.audioUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('levert alleen adressen die de service worker ook echt bewaart', () => {
    for (const path of urls) {
      const url = new URL(path, 'https://soundscout.nl');
      const input = { url, sameOrigin: true };
      expect(isThemeAudio(input) || isAppImage(input), path).toBe(true);
    }
  });

  it('slaat lege en externe adressen over', () => {
    const result = themeAssetUrls({
      map: { backgroundImage: 'https://elders.example/kaart.jpg', locationPositions: [] },
      locations: [{ ...basisTheme.locations[0], backgroundImage: '//elders.example/x.jpg', ambientAudio: '' }],
      samples: [{ ...basisTheme.samples[0], audioUrl: '/audio/themes/basis/boerderij/koe.mp3' }],
    });
    expect(result).toEqual(['/audio/themes/basis/boerderij/koe.mp3']);
  });
});

describe('themeDataUrls', () => {
  it('warmt de thema-index en het manifest van het actieve thema op (network-first in de service worker)', () => {
    const urls = themeDataUrls('winterspelen');
    expect(urls).toEqual(['/themes/index.json', '/themes/winterspelen/manifest.json']);
    for (const path of urls) expect(isThemeData({ url: new URL(path, 'https://soundscout.nl'), sameOrigin: true })).toBe(true);
  });
});
