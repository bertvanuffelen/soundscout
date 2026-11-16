import { describe, it, expect } from 'vitest';
import { parseSearch, stringifySearch, validateAppSearch } from '../searchParams';

describe('parseSearch / stringifySearch', () => {
  it('houdt codes letterlijk als tekst', () => {
    // De standaardparser van de router maakt hier getallen van
    expect(parseSearch('?share=12345E67')).toEqual({ share: '12345E67' });
    expect(parseSearch('?pp=0042')).toEqual({ pp: '0042' });
    expect(parseSearch('?dev=true')).toEqual({ dev: 'true' });
    expect(parseSearch('?x=null')).toEqual({ x: 'null' });
  });

  it('leest een leeg zoekdeel als leeg object', () => {
    expect(parseSearch('')).toEqual({});
    expect(parseSearch('?')).toEqual({});
  });

  it('bewaart herhaalde parameters', () => {
    expect(parseSearch('?a=1&a=2&b=3')).toEqual({ a: ['1', '2'], b: '3' });
    expect(stringifySearch({ a: ['1', '2'], b: '3' })).toBe('?a=1&a=2&b=3');
  });

  it('schrijft zonder aanhalingstekens en slaat lege waarden over', () => {
    expect(stringifySearch({ theme: 'winterspelen', share: undefined, x: null })).toBe('?theme=winterspelen');
    expect(stringifySearch({})).toBe('');
  });

  it('is een rondje waard voor de vormen die de app kent', () => {
    for (const search of ['?theme=basis', '?pp-share=AB12CD34', '?screen=teacher&lesson=drumbeat&tab=lessons', '?utm_source=mail&theme=piraten']) {
      expect(stringifySearch(parseSearch(search))).toBe(search);
    }
  });
});

describe('validateAppSearch', () => {
  it('geeft bekende parameters als tekst terug', () => {
    expect(validateAppSearch({ theme: 'basis', album: 'ALBUM001' })).toEqual({ theme: 'basis', album: 'ALBUM001' });
  });

  it('laat onbekende parameters staan', () => {
    expect(validateAppSearch({ utm_source: 'mail', location: 'park' })).toEqual({ utm_source: 'mail', location: 'park' });
  });

  it('negeert lege of herhaalde waarden in plaats van te falen', () => {
    const result = validateAppSearch({ share: '', theme: ['a', 'b'], pp: '1234' });
    expect(result.share).toBeUndefined();
    expect(result.theme).toBeUndefined();
    expect(result.pp).toBe('1234');
  });
});
