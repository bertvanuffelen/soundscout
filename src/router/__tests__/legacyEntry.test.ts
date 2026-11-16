import { describe, it, expect } from 'vitest';
import { resolveLegacyEntry } from '../legacyEntry';
import { parseSearch, validateAppSearch } from '../searchParams';
import { buildAlbumLink, buildClassCodeLink, buildPraatplaatShareLink, buildShareLink } from '../../utils/entryLinks';
import { buildSaveCodeLink } from '../../utils/saveCodeLink';

/** Los een volledig adres op, zoals de router dat doet. */
function resolve(address: string) {
  const url = new URL(address, 'https://soundscout.nl');
  return resolveLegacyEntry(url.pathname, validateAppSearch(parseSearch(url.search)), url.hash);
}

describe('resolveLegacyEntry', () => {
  it('doet niets zonder oude parameters', () => {
    expect(resolve('/')).toBeNull();
    expect(resolve('/?theme=winterspelen')).toBeNull();
    expect(resolve('/kaart?theme=basis&utm_source=mail')).toBeNull();
    expect(resolve('/?screen=iets-anders')).toBeNull();
    expect(resolve('/#code=te-lang-1234')).toBeNull();
  });

  it('?share= → de speler, code letterlijk', () => {
    expect(resolve('/?share=12345E67')).toEqual({ href: '/gedeeld/12345E67', effects: [] });
  });

  it('?pp-share= → de publieke praatplaat', () => {
    expect(resolve('/?pp-share=PPSHARE1')).toEqual({ href: '/praatplaat/gedeeld/PPSHARE1', effects: [] });
  });

  it('?album= → het klas-album', () => {
    expect(resolve('/?album=ALBUM001')).toEqual({ href: '/album/ALBUM001', effects: [] });
  });

  it('?pp= blijft op het scherm en zoekt de klascode op (nullen blijven staan)', () => {
    expect(resolve('/?pp=0042')).toEqual({ href: '/', effects: [{ type: 'lookupClassCode', code: '0042' }] });
  });

  it('?screen=teacher met leskaart en tab', () => {
    expect(resolve('/?screen=teacher&lesson=drumbeat&tab=lessons')).toEqual({
      href: '/docent',
      effects: [
        { type: 'pendingLessonCard', key: 'drumbeat' },
        { type: 'pendingTeacherTab', tab: 'lessons' },
      ],
    });
    expect(resolve('/?screen=teacher')).toEqual({ href: '/docent', effects: [] });
  });

  it('?screen=teacher-guide met en zonder sectie', () => {
    expect(resolve('/?screen=teacher-guide&section=sequencer')).toEqual({
      href: '/handleiding',
      effects: [{ type: 'guideSection', section: 'sequencer' }],
    });
    expect(resolve('/?screen=teacher-guide')).toEqual({
      href: '/handleiding',
      effects: [{ type: 'guideSection', section: null }],
    });
  });

  it('wachtwoord-reset: naar het docentenscherm, de hash met het token blijft staan', () => {
    const hash = '#access_token=abc&type=recovery';
    expect(resolve(`/?screen=reset-password${hash}`)).toEqual({ href: `/docent${hash}`, effects: [] });
    expect(resolve(`/${hash}`)).toEqual({ href: `/docent${hash}`, effects: [] });
    expect(resolve('/#error=access_denied&error_code=otp_expired')).toEqual({
      href: '/docent#error=access_denied&error_code=otp_expired',
      effects: [],
    });
  });

  it('wachtwoord-reset: eenmaal op /docent volgt geen tweede omleiding (geen lus)', () => {
    expect(resolve('/docent#access_token=abc&type=recovery')).toBeNull();
  });

  it('#code= → startscherm, code onthouden (hoofdletters), hash weg', () => {
    expect(resolve('/#code=abc123')).toEqual({ href: '/', effects: [{ type: 'pendingSaveCode', code: 'ABC123' }] });
  });

  it('?dev=true zet de vlaggen aan en laat de rest staan', () => {
    expect(resolve('/?dev=true&theme=winterspelen')).toEqual({
      href: '/?theme=winterspelen',
      effects: [{ type: 'enableDevFlags' }],
    });
    expect(resolve('/?dev=false')).toBeNull();
  });

  it('thema en onbekende parameters reizen mee naar de bestemming', () => {
    expect(resolve('/?theme=winterspelen&share=ABCD2345&utm_source=mail')?.href)
      .toBe('/gedeeld/ABCD2345?theme=winterspelen&utm_source=mail');
  });

  it('werkt op elk pad, niet alleen op /', () => {
    expect(resolve('/docent?album=ALBUM001')?.href).toBe('/album/ALBUM001');
    expect(resolve('/index.html?share=ABCD2345')?.href).toBe('/gedeeld/ABCD2345');
  });

  it('bij meer bestemmingen wint de laatste, zoals voorheen', () => {
    expect(resolve('/?share=ABCD2345&album=ALBUM001')?.href).toBe('/album/ALBUM001');
    expect(resolve('/?album=ALBUM001#code=ABC123')?.href).toBe('/');
  });

  it('de uitkomst bevat zelf geen oude parameter meer (geen lus)', () => {
    for (const address of ['/?share=A1B2C3D4', '/?pp=1234', '/?album=X', '/?pp-share=Y', '/?screen=teacher&lesson=k', '/?dev=true', '/#code=ABC123']) {
      const first = resolve(address);
      expect(first).not.toBeNull();
      expect(resolve(first!.href)).toBeNull();
    }
  });
});

describe('links die de app uitdeelt gaan weer open', () => {
  const origin = 'https://soundscout.nl';

  it('deellink van een soundscape', () => {
    expect(buildShareLink('AB12CD34', origin)).toBe('https://soundscout.nl/?share=AB12CD34');
    expect(resolve(buildShareLink('AB12CD34', origin))?.href).toBe('/gedeeld/AB12CD34');
  });

  it('klascode-link (QR van de docent)', () => {
    expect(buildClassCodeLink('0042', origin)).toBe('https://soundscout.nl/?pp=0042');
    expect(resolve(buildClassCodeLink('0042', origin))?.effects).toEqual([{ type: 'lookupClassCode', code: '0042' }]);
  });

  it('publieke praatplaat', () => {
    expect(buildPraatplaatShareLink('PP12CD34', origin)).toBe('https://soundscout.nl/?pp-share=PP12CD34');
    expect(resolve(buildPraatplaatShareLink('PP12CD34', origin))?.href).toBe('/praatplaat/gedeeld/PP12CD34');
  });

  it('klas-album', () => {
    expect(buildAlbumLink('AL12CD34', origin)).toBe('https://soundscout.nl/?album=AL12CD34');
    expect(resolve(buildAlbumLink('AL12CD34', origin))?.href).toBe('/album/AL12CD34');
  });

  it('bewaarcode ("mee naar huis", muziekkaart-QR)', () => {
    expect(resolve(buildSaveCodeLink('ABC123', origin))?.effects).toEqual([{ type: 'pendingSaveCode', code: 'ABC123' }]);
  });
});
