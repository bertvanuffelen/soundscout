import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ThemeManifestSchema, type ThemeManifest } from '../manifest';
import { checkManifest, integrityErrors, summarizeIssues } from '../rules';

function load(id: string): ThemeManifest {
  return ThemeManifestSchema.parse(JSON.parse(readFileSync(join(process.cwd(), 'public', 'themes', id, 'manifest.json'), 'utf8')));
}

/** Een klein, correct manifest om regels op los te laten. */
function base(): ThemeManifest {
  return {
    schemaVersion: 1,
    id: 'test',
    version: 1,
    status: 'published',
    isPublic: true,
    map: { image: { nl: 'kaart.jpg' }, positions: [{ locationId: 'plein', x: 50, y: 50 }] },
    locations: [{
      id: 'plein',
      image: 'plein.jpg',
      hotspots: [
        { id: 'h1', x: 20, y: 50, sampleId: 's1', visualHint: 'pulse' },
        { id: 'h2', x: 80, y: 50, sampleId: 's2', visualHint: 'pulse' },
      ],
    }],
    samples: [
      { id: 's1', locationId: 'plein', file: 's1.mp3', duration: 4, icon: 'Bird', color: '#112233', kind: 'sfx' },
      { id: 's2', locationId: 'plein', file: 's2.mp3', duration: 8, icon: 'Music', color: '#445566', kind: 'loop' },
    ],
    texts: {
      nl: { name: 'Test', description: '', locations: { plein: { name: 'Plein' } }, samples: { s1: 'Een', s2: 'Twee' } },
      en: { name: 'Test', locations: { plein: { name: 'Square' } }, samples: { s1: 'One', s2: 'Two' } },
    },
  };
}

describe('checkManifest', () => {
  it('geeft geen meldingen op een correct manifest', () => {
    expect(checkManifest(base())).toEqual([]);
  });

  it('veilige zone: hotspot boven 12 % of onder 88 % is een fout', () => {
    const m = base();
    m.locations[0].hotspots[0].y = 8;
    m.locations[0].hotspots[1].y = 92;
    const issues = checkManifest(m).filter((i) => i.rule === 'hotspot-safe-zone');
    expect(issues.map((i) => i.hotspotId)).toEqual(['h1', 'h2']);
    expect(issues.every((i) => i.severity === 'error')).toBe(true);
  });

  it('afstand: hotspots die elkaar op de kleinste scène raken, zijn een fout', () => {
    const m = base();
    m.locations[0].hotspots[1].x = 25; // 5 % van 373 px ≈ 19 px
    expect(checkManifest(m).some((i) => i.rule === 'hotspot-spacing' && i.severity === 'error')).toBe(true);
  });

  it('duur: sfx buiten 2–8 s en een loop die niet exact 8.0 s is, zijn fouten', () => {
    const m = base();
    m.samples[0].duration = 1.5;
    m.samples[1].duration = 7.9;
    const issues = checkManifest(m).filter((i) => i.rule === 'sample-duration');
    expect(issues.map((i) => [i.sampleId, i.severity])).toEqual([['s1', 'error'], ['s2', 'error']]);
  });

  it('duur zonder bekend type (oude thema\'s) is alleen een waarschuwing', () => {
    const m = base();
    delete m.samples[0].kind;
    m.samples[0].duration = 12;
    expect(checkManifest(m).find((i) => i.rule === 'sample-duration')?.severity).toBe('warning');
  });

  it('integriteit: hotspot naar een onbekende sample en een dubbele id weigert de loader', () => {
    const m = base();
    m.locations[0].hotspots[0].sampleId = 'bestaat-niet';
    m.samples.push({ ...m.samples[1] });
    const broken = integrityErrors(checkManifest(m)).map((i) => i.rule);
    expect(broken).toContain('hotspot-unknown-sample');
    expect(broken).toContain('duplicate-id');
  });

  it('ontbrekende vertaling is een waarschuwing, ontbrekend Nederlands een fout', () => {
    const m = base();
    delete m.texts.en.samples!.s2;
    delete (m.texts.nl.samples as Record<string, string>).s1;
    const issues = checkManifest(m);
    expect(issues.find((i) => i.rule === 'missing-translation')?.severity).toBe('warning');
    expect(issues.find((i) => i.rule === 'missing-nl-text')?.severity).toBe('error');
  });

  it('locatie zonder kaartpositie is een fout', () => {
    const m = base();
    m.map.positions = [];
    expect(checkManifest(m).some((i) => i.rule === 'location-without-position')).toBe(true);
  });
});

describe('bestaande thema\'s', () => {
  // Fase 3 telde 15 hotspotfouten (basis 3, winterspelen 3, piraten 9); die
  // zijn bij de V2-release verschoven (LEGACY_HOTSPOT_MOVES). Over blijven
  // alleen duurwaarschuwingen van oude geluiden zonder type: die blokkeren
  // niets. Verandert een thema, dan hier bijwerken.
  const expected: Record<string, Record<string, number>> = {
    basis: {},
    winterspelen: { 'sample-duration (warning)': 1 },
    piraten: { 'sample-duration (warning)': 4 },
  };

  it.each(Object.keys(expected))('%s: geen integriteitsfouten, ontwerpregels geteld', (id) => {
    const issues = checkManifest(load(id));
    expect(integrityErrors(issues)).toEqual([]);
    expect(summarizeIssues(issues)).toEqual(expected[id]);
  });
});
