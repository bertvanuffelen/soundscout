import { describe, it, expect } from 'vitest';
import { pathForScreen, SCREEN_PATHS, type ScreenState } from '../paths';

const base: ScreenState = {
  currentScreen: 'start',
  currentLocationId: null,
  shareCode: null,
  sharedPraatplaatCode: null,
  sharedAlbumCode: null,
};

describe('pathForScreen', () => {
  it('geeft elk scherm zonder parameter zijn vaste pad', () => {
    expect(pathForScreen(base)).toBe('/');
    expect(pathForScreen({ ...base, currentScreen: 'map' })).toBe('/kaart');
    expect(pathForScreen({ ...base, currentScreen: 'studio' })).toBe('/studio');
    expect(pathForScreen({ ...base, currentScreen: 'stage' })).toBe('/podium');
    expect(pathForScreen({ ...base, currentScreen: 'teacher' })).toBe('/docent');
    expect(pathForScreen({ ...base, currentScreen: 'assignment-landing' })).toBe('/opdracht');
  });

  it('zet locatie-id en deelcodes in het pad', () => {
    expect(pathForScreen({ ...base, currentScreen: 'location', currentLocationId: 'park' })).toBe('/locatie/park');
    expect(pathForScreen({ ...base, currentScreen: 'shared', shareCode: 'AB12CD34' })).toBe('/gedeeld/AB12CD34');
    expect(pathForScreen({ ...base, currentScreen: 'shared-praatplaat', sharedPraatplaatCode: 'PP000001' })).toBe('/praatplaat/gedeeld/PP000001');
    expect(pathForScreen({ ...base, currentScreen: 'shared-album', sharedAlbumCode: 'ALBUM001' })).toBe('/album/ALBUM001');
  });

  it('valt terug als de waarde ontbreekt', () => {
    expect(pathForScreen({ ...base, currentScreen: 'location' })).toBe('/kaart');
    expect(pathForScreen({ ...base, currentScreen: 'shared' })).toBe('/');
    expect(pathForScreen({ ...base, currentScreen: 'shared-album' })).toBe('/');
  });

  it('heeft geen twee schermen op hetzelfde pad, en botst niet met statische mappen', () => {
    const paths = Object.values(SCREEN_PATHS);
    expect(new Set(paths).size).toBe(paths.length);
    for (const reserved of ['/teacher', '/over', '/les', '/animaties', '/privacy', '/audio', '/images', '/fonts', '/assets']) {
      expect(paths.some((p) => p === reserved || p.startsWith(`${reserved}/`))).toBe(false);
    }
  });
});
