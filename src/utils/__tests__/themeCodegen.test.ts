/**
 * Tests voor themeCodegen (Thema-wizard, week 4).
 *
 * Dekt: validatie (slugs, dubbelen, halve seizoensvensters), promptbouw
 * en de code-export (paden, i18n-fragmenten, registratie-instructie).
 */

import { describe, it, expect } from 'vitest';
import {
  makeEmptyDraft,
  makeEmptyLocation,
  validateDraft,
  buildImagePrompt,
  buildSoundSearchPack,
  generateThemeFiles,
  type ThemeDraft,
} from '../themeCodegen';

/** Volledig ingevuld, geldig concept voor de export-tests */
function validDraft(): ThemeDraft {
  const draft = makeEmptyDraft();
  draft.themeId = 'herfst';
  draft.nameNl = 'Herfst';
  draft.nameEn = 'Autumn';
  draft.descriptionNl = 'Bos, storm en oogst';
  draft.descriptionEn = 'Forest, storm and harvest';
  draft.seasonLabel = 'Herfst';
  draft.activeFrom = '09-15';
  draft.activeUntil = '11-30';
  draft.locations = [0, 1].map((i) => {
    const loc = makeEmptyLocation(i);
    loc.id = i === 0 ? 'bos' : 'boomgaard';
    loc.nameNl = i === 0 ? 'Het Bos' : 'De Boomgaard';
    loc.nameEn = i === 0 ? 'The Forest' : 'The Orchard';
    loc.descriptionNl = 'Beschrijving';
    loc.descriptionEn = 'Description';
    loc.sceneIdea = 'Een herfstbos met vallende bladeren';
    loc.mapX = 25;
    loc.mapY = 60;
    loc.samples = loc.samples.map((s, j) => ({
      ...s,
      id: `geluid-${j + 1}`,
      nameNl: `Geluid ${j + 1}`,
      nameEn: `Sound ${j + 1}`,
      soundIdea: 'ritselende bladeren',
      icon: 'Leaf',
      color: '#FF9800',
    }));
    return loc;
  });
  return draft;
}

describe('validateDraft', () => {
  it('leeg concept levert problemen op', () => {
    const issues = validateDraft(makeEmptyDraft());
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join(' ')).toContain('Thema-id');
  });

  it('geldig concept levert geen problemen op', () => {
    expect(validateDraft(validDraft())).toEqual([]);
  });

  it('wijst ongeldige slugs af', () => {
    const draft = validDraft();
    draft.themeId = 'Herfst Thema!';
    expect(validateDraft(draft).join(' ')).toContain('kleine letters');
  });

  it('wijst dubbele locatie-ids af', () => {
    const draft = validDraft();
    draft.locations[1].id = draft.locations[0].id;
    expect(validateDraft(draft).join(' ')).toContain('dubbel');
  });

  it('wijst een half seizoensvenster af', () => {
    const draft = validDraft();
    draft.activeUntil = '';
    expect(validateDraft(draft).join(' ')).toContain('half ingevuld');
  });

  it('eist minstens 4 geluiden per locatie', () => {
    const draft = validDraft();
    draft.locations[0].samples = draft.locations[0].samples.slice(0, 2);
    expect(validateDraft(draft).join(' ')).toContain('minstens 4');
  });
});

describe('buildImagePrompt', () => {
  it('combineert scène, stijlprofiel en technische eisen', () => {
    const prompt = buildImagePrompt(validDraft(), 'Een bakkerij vol geuren', 'location');
    expect(prompt).toContain('Een bakkerij vol geuren');
    expect(prompt).toContain('cartoon-illustratie');
    expect(prompt).toContain('1920×1080');
    expect(prompt).toContain('hotspots');
  });

  it('praatplaat-prompt vraagt om een rijke klassikale scène', () => {
    const prompt = buildImagePrompt(validDraft(), 'Herfstmarkt', 'praatplaat');
    expect(prompt).toContain('Praatplaat');
    expect(prompt).toContain('8-12');
  });
});

describe('buildSoundSearchPack', () => {
  it('bevat zoektermen, eisen en het doelpad', () => {
    const draft = validDraft();
    const loc = draft.locations[0];
    const pack = buildSoundSearchPack(loc, loc.samples[0]);
    expect(pack).toContain('freesound.org');
    expect(pack).toContain('CC0');
    expect(pack).toContain(`/${loc.id}/geluid-1.mp3`);
  });
});

describe('generateThemeFiles', () => {
  const files = generateThemeFiles(validDraft());
  const byPath = (fragment: string) => files.find((f) => f.path.includes(fragment))!;

  it('genereert de vier themabestanden + 2 i18n-fragmenten + Claude-opdracht', () => {
    expect(files.map((f) => f.path)).toEqual([
      'src/data/themes/herfst/locations.ts',
      'src/data/themes/herfst/samples.ts',
      'src/data/themes/herfst/map.ts',
      'src/data/themes/herfst/index.ts',
      expect.stringContaining('i18n-fragment-nl'),
      expect.stringContaining('i18n-fragment-en'),
      'CLAUDE-OPDRACHT-herfst.md',
    ]);
  });

  it('locations.ts volgt het bestaande patroon (i18n-keys, lege hotspots)', () => {
    const content = byPath('locations.ts').content;
    expect(content).toContain("name: 'locations.bos.name'");
    expect(content).toContain("backgroundImage: '/images/themes/herfst/bos.jpg'");
    expect(content).toContain('hotspots: []');
  });

  it('samples.ts prefixt sample-ids met de locatie', () => {
    const content = byPath('samples.ts').content;
    expect(content).toContain("id: 'bos-geluid-1'");
    expect(content).toContain("name: 'samples.bos-geluid-1'");
    expect(content).toContain("audioUrl: '/audio/themes/herfst/bos/geluid-1.mp3'");
  });

  it('index.ts bevat het seizoensvenster en een geldige camelCase-export', () => {
    const content = byPath('index.ts').content;
    expect(content).toContain("activeFrom: '09-15'");
    expect(content).toContain('export const herfstTheme: ThemeConfig');
  });

  it('i18n-fragment is geldige JSON met alle namen', () => {
    const nl = JSON.parse(byPath('i18n-fragment-nl').content);
    expect(nl.themes.herfst.name).toBe('Herfst');
    expect(nl.locations.bos.name).toBe('Het Bos');
    expect(nl.samples['boomgaard-geluid-6']).toBe('Geluid 6');
    const en = JSON.parse(byPath('i18n-fragment-en').content);
    expect(en.themes.herfst.name).toBe('Autumn');
  });

  it('Claude-opdracht bevat registratie- en gate-instructies', () => {
    const content = byPath('CLAUDE-OPDRACHT').content;
    expect(content).toContain("import { herfstTheme } from './herfst'");
    expect(content).toContain('npx tsc -b --noEmit');
    expect(content).toContain('?theme=herfst');
  });

  it('camelCase-export werkt ook voor ids met streepjes', () => {
    const draft = validDraft();
    draft.themeId = 'lente-feest';
    const indexContent = generateThemeFiles(draft).find((f) => f.path.endsWith('index.ts'))!.content;
    expect(indexContent).toContain('export const lenteFeestTheme: ThemeConfig');
  });
});
