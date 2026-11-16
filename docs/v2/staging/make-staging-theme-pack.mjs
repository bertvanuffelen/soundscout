// Maakt een geldig test-themapakket voor de stagingtest (runbook blok G):
//   docs/v2/staging/staging-testthema.sspack
//
// Een klein, nep thema dat aan ALLE regels van het dashboard voldoet, zodat je
// importeren -> publiceren -> terugzetten kunt testen zonder eerst de drie echte
// thema's te repareren. Alles is gegenereerd (effen beelden, sinustonen): geen
// auteursrechtelijk beschermde media. isPublic: false, dus het verschijnt nooit
// in een themakiezer; alleen via /?theme=staging-testthema.
//
// Opnieuw maken: node docs/v2/staging/make-staging-theme-pack.mjs
import { writeFileSync } from 'node:fs';
import { makePng, makeWav, zip } from '../../../e2e/fixtures/make-theme-pack.mjs';

const ID = 'staging-testthema';

// Hotspots in de veilige zone (y 12-88 %) en ver genoeg uit elkaar voor de
// kleinste scène (44 px op 373x210 = ~12 % breed, ~21 % hoog).
const PLEIN = [
  { id: 'plein-bel', x: 20, y: 30, freq: 880, seconds: 2.5, icon: 'Bell', color: '#3B82F6' },
  { id: 'plein-hoorn', x: 50, y: 30, freq: 330, seconds: 3, icon: 'Megaphone', color: '#F59E0B' },
  { id: 'plein-fluit', x: 80, y: 30, freq: 1320, seconds: 2.5, icon: 'Bird', color: '#10B981' },
  { id: 'plein-loop', x: 50, y: 70, freq: 220, seconds: 8, icon: 'Music', color: '#8B5CF6', kind: 'loop' },
];
const WERKPLAATS = [
  { id: 'werkplaats-klop', x: 25, y: 40, freq: 160, seconds: 2, icon: 'Hammer', color: '#EF4444' },
  { id: 'werkplaats-zoem', x: 75, y: 40, freq: 110, seconds: 4, icon: 'Zap', color: '#06B6D4' },
  { id: 'werkplaats-piep', x: 50, y: 75, freq: 1760, seconds: 2, icon: 'Bot', color: '#EC4899' },
];

const sample = (locationId) => (s) => ({
  id: s.id, locationId, file: `audio/${s.id}.wav`, duration: s.seconds, icon: s.icon, color: s.color, kind: s.kind ?? 'sfx',
});
const hotspot = (s) => ({ id: s.id, x: s.x, y: s.y, sampleId: s.id, visualHint: 'pulse' });

const manifest = {
  schemaVersion: 1,
  id: ID,
  version: 1,
  status: 'draft',
  isPublic: false,
  sort: 99,
  map: {
    image: { nl: 'images/plattegrond.png' },
    positions: [
      { locationId: 'plein', x: 30, y: 50 },
      { locationId: 'werkplaats', x: 70, y: 50 },
    ],
  },
  locations: [
    { id: 'plein', image: 'images/plein.png', hotspots: PLEIN.map(hotspot) },
    { id: 'werkplaats', image: 'images/werkplaats.png', hotspots: WERKPLAATS.map(hotspot) },
  ],
  samples: [...PLEIN.map(sample('plein')), ...WERKPLAATS.map(sample('werkplaats'))],
  texts: {
    nl: {
      name: 'Staging-testthema',
      description: 'Alleen voor de stagingtest',
      locations: {
        plein: { name: 'Het testplein', description: 'Een plein met tonen' },
        werkplaats: { name: 'De testwerkplaats', description: 'Een werkplaats met tonen' },
      },
      samples: {
        'plein-bel': 'Hoge toon', 'plein-hoorn': 'Lage toon', 'plein-fluit': 'Fluittoon', 'plein-loop': 'Testloop',
        'werkplaats-klop': 'Klop', 'werkplaats-zoem': 'Zoem', 'werkplaats-piep': 'Piep',
      },
    },
    en: {
      name: 'Staging test theme',
      description: 'For the staging test only',
      locations: {
        plein: { name: 'The test square', description: 'A square with tones' },
        werkplaats: { name: 'The test workshop', description: 'A workshop with tones' },
      },
      samples: {
        'plein-bel': 'High tone', 'plein-hoorn': 'Low tone', 'plein-fluit': 'Whistle', 'plein-loop': 'Test loop',
        'werkplaats-klop': 'Knock', 'werkplaats-zoem': 'Hum', 'werkplaats-piep': 'Beep',
      },
    },
  },
};

const own = { source: 'gegenereerd', author: 'SoundScout stagingtest', licence: 'CC0' };
const all = [...PLEIN, ...WERKPLAATS];
const credits = {
  'images/plattegrond.png': own, 'images/plein.png': own, 'images/werkplaats.png': own,
  ...Object.fromEntries(all.map((s) => [`${s.id}.wav`, own])),
};

const files = [
  [`${ID}/manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2))],
  [`${ID}/credits.json`, Buffer.from(JSON.stringify(credits, null, 2))],
  [`${ID}/images/plattegrond.png`, makePng(1920, 1080, [70, 90, 110])],
  [`${ID}/images/plein.png`, makePng(1920, 1080, [40, 120, 60])],
  [`${ID}/images/werkplaats.png`, makePng(1920, 1080, [120, 70, 40])],
  ...all.map((s) => [`${ID}/audio/${s.id}.wav`, makeWav(s.seconds, 8000, s.freq)]),
];

const out = new URL('./staging-testthema.sspack', import.meta.url);
writeFileSync(out, zip(files));
console.log(`geschreven: ${out.pathname}`);
