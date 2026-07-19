/**
 * export-teksten.mjs — alle app-teksten als één bewerkbaar document.
 *
 * Leest src/i18n/locales/nl.json + en.json en schrijft docs/TEKSTEN.md:
 * één hoofdstuk per top-level sectie, met per regel `sleutel | NL | EN`.
 * Bert bewerkt de NL/EN-kolommen; import-teksten.mjs zet ze terug.
 *
 * Gebruik: npm run teksten:export
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NL_PATH = resolve(ROOT, 'src/i18n/locales/nl.json');
const EN_PATH = resolve(ROOT, 'src/i18n/locales/en.json');
const OUT_PATH = resolve(ROOT, 'docs/TEKSTEN.md');

/** Platte {pad: waarde}-map; arrays worden `pad.0`, `pad.1`, … */
export function flatten(value, prefix = '', out = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}.${i}`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out[prefix] = String(value);
  }
  return out;
}

/** Tabelcellen: pipes en regeleindes moeten de tabel niet breken. */
function cell(text) {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function main() {
  const nl = JSON.parse(readFileSync(NL_PATH, 'utf8'));
  const en = JSON.parse(readFileSync(EN_PATH, 'utf8'));
  const flatNl = flatten(nl);
  const flatEn = flatten(en);

  // Groepeer op top-level sectie, in de volgorde van nl.json
  const sections = new Map();
  for (const key of Object.keys(flatNl)) {
    const section = key.split('.')[0];
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section).push(key);
  }

  const lines = [
    '# Alle teksten in SoundScout',
    '',
    '> **Automatisch gegenereerd** uit `src/i18n/locales/nl.json` en `en.json`.',
    '> Niet met de hand aanvullen: nieuwe sleutels komen erbij via de code.',
    '',
    '## Zo pas je teksten aan',
    '',
    '1. Draai `npm run teksten:export` (of vraag Claude erom) voor de actuele stand.',
    '2. Bewerk in de tabellen hieronder de kolom **NL** en/of **EN**. Laat de',
    '   kolom **Sleutel** ongemoeid — die is de koppeling met de code.',
    '3. Zeg tegen Claude: "verwerk TEKSTEN.md". Die draait `npm run teksten:import`,',
    '   controleert de vertaal-pariteit en test de build.',
    '',
    '**Let op bij het bewerken:**',
    '',
    '- `{{naam}}` en `{{count}}` zijn invulplekken — laat ze exact staan.',
    '- `<br>` in een cel betekent een regeleinde in de app.',
    '- `\\|` is een echte pipe in de tekst.',
    '- Een lege cel betekent: leeg laten in de app (zelden nodig).',
    '',
    `_Stand: ${Object.keys(flatNl).length} teksten in ${sections.size} secties._`,
    '',
  ];

  for (const [section, keys] of sections) {
    lines.push(`## ${section}`, '');
    lines.push('| Sleutel | NL | EN |', '|---|---|---|');
    for (const key of keys) {
      lines.push(`| \`${key}\` | ${cell(flatNl[key])} | ${cell(flatEn[key] ?? '')} |`);
    }
    lines.push('');
  }

  writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  console.log(`docs/TEKSTEN.md geschreven — ${Object.keys(flatNl).length} teksten, ${sections.size} secties.`);
}

main();
