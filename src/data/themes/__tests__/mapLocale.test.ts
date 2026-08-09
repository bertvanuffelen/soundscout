import { describe, it, expect } from 'vitest';
import { getMapBackgroundImage } from '../index';
import { piratenTheme } from '../piraten';
import { basisTheme } from '../basis';

describe('getMapBackgroundImage', () => {
  it('geeft de NL-kaart bij nl', () => {
    expect(getMapBackgroundImage(piratenTheme.map, 'nl')).toBe('/images/themes/piraten/plattegrond.jpg');
  });
  it('geeft de EN-kaart bij en', () => {
    expect(getMapBackgroundImage(piratenTheme.map, 'en')).toBe('/images/themes/piraten/plattegrond-en.jpg');
  });
  it('normaliseert en-US naar en', () => {
    expect(getMapBackgroundImage(piratenTheme.map, 'en-US')).toBe('/images/themes/piraten/plattegrond-en.jpg');
  });
  it('valt terug op de standaard als een thema geen variant heeft', () => {
    expect(getMapBackgroundImage(basisTheme.map, 'en')).toBe(basisTheme.map.backgroundImage);
  });
  it('gaat om met een ontbrekende map', () => {
    expect(getMapBackgroundImage(undefined, 'en')).toBe('');
  });
});
