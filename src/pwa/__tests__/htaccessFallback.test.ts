import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// App-paden uit docs/v2/URL-CONTRACT.md (voorbeelden met codes en ids)
const APP_PATHS = ['/', '/kaart', '/locatie/boerderij', '/studio', '/podium', '/docent', '/beheer', '/gedeeld/ABCD2345', '/album/ABCD2345', '/teacher', '/over', '/les/verspringen/'];

const htaccess = readFileSync(join(process.cwd(), 'public', '.htaccess'), 'utf8');
const extensionPattern = htaccess.match(/RewriteCond %\{REQUEST_URI\} (\\\.\(.+\)\$) \[NC\]/)?.[1] ?? '';
const missingFile = new RegExp(extensionPattern.replace(/\\\\/g, '\\'), 'i');

describe('.htaccess: ontbrekend bestand ≠ startpagina (stagingtest 16-11)', () => {
  it('stuurt een ontbrekend bestand met extensie naar een 404, vóór de terugval op index.html', () => {
    const notFound = htaccess.indexOf('RewriteRule ^ - [R=404,L]');
    const fallback = htaccess.indexOf('RewriteRule ^ index.html [L]');
    expect(notFound).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(notFound);
  });

  it('vangt de bestanden waarvan het ontbreken de app stil breekt', () => {
    for (const path of ['/sw.js', '/assets/main-abc.js', '/assets/main.css', '/manifest.json', '/themes/x/manifest.json', '/audio/a.mp3']) {
      expect(missingFile.test(path), path).toBe(true);
    }
  });

  it('laat elk app-pad (zonder extensie) gewoon naar de app gaan', () => {
    for (const path of APP_PATHS) {
      expect(missingFile.test(path), path).toBe(false);
    }
  });
});
