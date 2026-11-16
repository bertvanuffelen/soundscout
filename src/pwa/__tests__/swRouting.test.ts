import { describe, it, expect } from 'vitest';
import { NAVIGATE_FALLBACK_DENYLIST, isThemeAudio, isAppImage, isThemeData } from '../swRouting';
import { SCREEN_PATHS } from '../../router/paths';

/** Zoals Workbox' NavigationRoute: pad + query tegen de denylist. */
const fallsBackToApp = (pathAndSearch: string) =>
  !NAVIGATE_FALLBACK_DENYLIST.some((re) => re.test(pathAndSearch));

const input = (href: string, origin = 'https://soundscout.nl') => {
  const url = new URL(href, origin);
  return { url, sameOrigin: url.origin === origin };
};

describe('navigatie-terugval van de service worker', () => {
  it('stuurt elk app-scherm naar index.html', () => {
    for (const path of Object.values(SCREEN_PATHS)) {
      expect(fallsBackToApp(path.replace('$locationId', 'boerderij').replace('$code', 'AB12CD34'))).toBe(true);
    }
    expect(fallsBackToApp('/onbekend-pad')).toBe(true);
  });

  it('laat oude links met parameters door naar de app', () => {
    for (const link of [
      '/?theme=winterspelen',
      '/?share=12345E67',
      '/?pp=1234',
      '/?pp-share=PP000001',
      '/?album=ALBUM001',
      '/?screen=teacher&lesson=drumbeat&tab=leskaarten',
      '/?screen=teacher-guide&section=compose-modes',
      '/?screen=reset-password',
      '/?dev=true',
      '/kaart?theme=basis',
      '/docent?album=X',
      // Een punt in de query maakt er geen bestand van
      '/?theme=a.b',
    ]) {
      expect(fallsBackToApp(link), link).toBe(true);
    }
  });

  it('blijft af van eigen pagina\'s en bestanden', () => {
    for (const link of [
      '/teacher', '/teacher/', '/teacher.html', '/teacher?utm_source=x',
      '/over', '/over/', '/over.html',
      '/les/drumbeat/', '/les/drumbeat/index.html', '/les',
      '/privacy/', '/privacy/en/',
      '/animaties/onboarding-4-stappen.html?lang=nl',
      '/sitemap.xml', '/robots.txt', '/manifest.json', '/sw.js',
      '/assets/main-abc.js', '/audio/themes/basis/boerderij/koe.mp3', '/images/themes/basis/plattegrond.jpg',
      '/__e2e-supabase/rest/v1/rpc/x',
      '/themes/index.json', '/themes/basis/manifest.json', '/themes',
    ]) {
      expect(fallsBackToApp(link), link).toBe(false);
    }
  });

  it('verwart app-paden niet met de statische pagina\'s', () => {
    // /overig of /teachers bestaan niet, maar mogen niet per ongeluk "statisch" heten
    expect(fallsBackToApp('/overzicht')).toBe(true);
    expect(fallsBackToApp('/teachers')).toBe(true);
    expect(fallsBackToApp('/lessen')).toBe(true);
  });
});

describe('wat de service worker bewaart', () => {
  it('bewaart thema-geluiden en beelden van de eigen site', () => {
    expect(isThemeAudio(input('/audio/themes/basis/boerderij/koe.mp3'))).toBe(true);
    expect(isAppImage(input('/images/themes/basis/plattegrond.jpg'))).toBe(true);
    expect(isAppImage(input('/images/storyboards/x/1.webp'))).toBe(true);
  });

  it('bewaart nooit iets van een andere site', () => {
    for (const href of [
      'https://xpjutrzonnranyqyqfzj.supabase.co/rest/v1/rpc/get_active_assignment',
      'https://xpjutrzonnranyqyqfzj.supabase.co/storage/v1/object/public/audio/koe.mp3',
      'https://xpjutrzonnranyqyqfzj.supabase.co/storage/v1/object/public/images/x.png',
      'https://api.emailjs.com/api/v1.0/email/send',
      'https://img.youtube.com/vi/abc/hqdefault.jpg',
      'https://www.youtube-nocookie.com/embed/abc',
    ]) {
      expect(isThemeAudio(input(href)), href).toBe(false);
      expect(isAppImage(input(href)), href).toBe(false);
    }
  });

  it('bewaart geen andere bestandssoorten', () => {
    expect(isThemeAudio(input('/audio/themes/basis/index.json'))).toBe(false);
    expect(isAppImage(input('/images/overige/iets.pdf'))).toBe(false);
    expect(isThemeAudio(input('/images/themes/basis/plattegrond.jpg'))).toBe(false);
  });
});

describe('thema-data (V2 Fase 3)', () => {
  it('herkent index en manifesten van de eigen site, niets anders', () => {
    expect(isThemeData(input('/themes/index.json'))).toBe(true);
    expect(isThemeData(input('/themes/winterspelen/manifest.json'))).toBe(true);
    expect(isThemeData(input('/manifest.json'))).toBe(false);
    expect(isThemeData(input('/audio/themes/basis/boerderij/koe.mp3'))).toBe(false);
    expect(isThemeData(input('https://example.supabase.co/themes/index.json'))).toBe(false);
  });
});
