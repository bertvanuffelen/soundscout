/**
 * De kant-en-klare Sinterklaasles (migratie 048) staat op drie plekken: de
 * seed-migratie, scripts/les-pages-data.json (statische /les/-pagina) en de
 * vertalingen. Deze test bewaakt dat de plaat overal dezelfde is, dat het
 * bestand bestaat en dat de teksten in beide talen compleet zijn.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import nl from '../../i18n/locales/nl.json';
import en from '../../i18n/locales/en.json';
import { praatplaatImages } from '../../data/praatplaatImages';

const root = resolve(__dirname, '../../..');
const seed = readFileSync(resolve(root, 'supabase/migrations/048_seed_sinterklaas_lesson_card.sql'), 'utf8');
const lesPages = JSON.parse(readFileSync(resolve(root, 'scripts/les-pages-data.json'), 'utf8')) as {
  keys: Array<{ key: string; cover: string | null }>;
};

describe('leskaart sinterklaas', () => {
  const image = /v_image CONSTANT TEXT := '([^']+)'/.exec(seed)?.[1];

  it('de plaat staat op één plek in de seed en bestaat in de build', () => {
    expect(image).toBeTruthy();
    expect(existsSync(resolve(root, 'public', image!.replace(/^\//, '')))).toBe(true);
  });

  it('de /les-pagina gebruikt dezelfde plaat', () => {
    expect(lesPages.keys.find((k) => k.key === 'sinterklaas')?.cover).toBe(image);
  });

  it('de plaat staat ook in de praatplaat-catalogus, met het Sinterklaas-geluidenthema', () => {
    const entry = praatplaatImages.find((img) => img.id === 'pp-sinterklaas-paleis');
    expect(entry?.imageUrl).toBe(image);
    expect(entry?.themeId).toBe('sinterklaas');
  });

  it('de seed zet de les volledig klaar: thema, plekken verborgen, 1 les', () => {
    expect(seed).toContain("'pp-sinterklaas', 'sinterklaas', 'pp-sinterklaas', v_image");
    expect(seed).toMatch(/FALSE, '1 les'/);
  });

  it('teksten in NL en EN: titel, doel en vier fasen; NL gelijk aan de seed', () => {
    for (const locale of [nl, en]) {
      const card = locale.lessonCards.builtin.sinterklaas;
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.goal.length).toBeGreaterThan(0);
      expect(card.phases).toHaveLength(4);
    }
    const card = nl.lessonCards.builtin.sinterklaas;
    expect(seed).toContain(`'${card.title}'`);
    expect(seed).toContain(`'${card.goal}'`);
    for (const phase of card.phases) expect(seed).toContain(`'${phase.text}'`);
  });
});
