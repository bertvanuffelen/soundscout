/**
 * import-teksten.mjs — bewerkte teksten uit docs/TEKSTEN.md terugschrijven.
 *
 * Leest de tabellen uit docs/TEKSTEN.md en zet gewijzigde NL/EN-waarden terug
 * in src/i18n/locales/nl.json en en.json. Alleen bestaande sleutels worden
 * bijgewerkt: nieuwe rijen in het document worden gemeld en genegeerd (nieuwe
 * teksten horen via de code te ontstaan). Structuur en sleutelvolgorde van de
 * json-bestanden blijven intact.
 *
 * Gebruik: npm run teksten:import
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NL_PATH = resolve(ROOT, 'src/i18n/locales/nl.json');
const EN_PATH = resolve(ROOT, 'src/i18n/locales/en.json');
const DOC_PATH = resolve(ROOT, 'docs/TEKSTEN.md');

/** Omgekeerde van cell() in export-teksten.mjs */
function uncell(text) {
  return text.trim().replace(/<br>/g, '\n').replace(/\\\|/g, '|');
}

/** Splits een tabelrij op onontsnapte pipes */
function splitRow(line) {
  const cells = [];
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') {
      current += '\\|';
      i++;
    } else if (ch === '|') {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  // Eerste en laatste cel zijn leeg door de rand-pipes
  return cells.slice(1, -1);
}

/** Zet waarde op pad `a.b.0.c` binnen een geneste structuur. Retourneert of het lukte. */
function setPath(obj, path, value) {
  const parts = path.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = Array.isArray(node) ? Number(parts[i]) : parts[i];
    if (node?.[key] === undefined) return false;
    node = node[key];
  }
  const last = Array.isArray(node) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
  if (node?.[last] === undefined) return false;
  if (typeof node[last] !== 'string') return false;
  node[last] = value;
  return true;
}

function getPath(obj, path) {
  return path.split('.').reduce((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    return Array.isArray(acc) ? acc[Number(part)] : acc[part];
  }, obj);
}

function main() {
  const nl = JSON.parse(readFileSync(NL_PATH, 'utf8'));
  const en = JSON.parse(readFileSync(EN_PATH, 'utf8'));
  const doc = readFileSync(DOC_PATH, 'utf8');

  const changedNl = [];
  const changedEn = [];
  const unknown = [];
  const skipped = [];

  for (const line of doc.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.startsWith('|---')) continue;
    const cells = splitRow(trimmed);
    if (cells.length < 3) continue;

    const keyCell = cells[0].trim();
    const match = keyCell.match(/^`(.+)`$/);
    if (!match) continue; // koprij of iets anders
    const key = match[1];

    const nlValue = uncell(cells[1]);
    const enValue = uncell(cells[2]);

    if (getPath(nl, key) === undefined) {
      unknown.push(key);
      continue;
    }
    if (getPath(nl, key) !== nlValue) {
      if (setPath(nl, key, nlValue)) changedNl.push(key);
      else skipped.push(key);
    }
    if (getPath(en, key) !== undefined && getPath(en, key) !== enValue) {
      if (setPath(en, key, enValue)) changedEn.push(key);
      else skipped.push(key);
    }
  }

  if (changedNl.length) writeFileSync(NL_PATH, `${JSON.stringify(nl, null, 2)}\n`, 'utf8');
  if (changedEn.length) writeFileSync(EN_PATH, `${JSON.stringify(en, null, 2)}\n`, 'utf8');

  console.log(`NL bijgewerkt: ${changedNl.length}`);
  changedNl.forEach((k) => console.log(`  · ${k}`));
  console.log(`EN bijgewerkt: ${changedEn.length}`);
  changedEn.forEach((k) => console.log(`  · ${k}`));
  if (unknown.length) {
    console.log(`\nGenegeerd — sleutel bestaat niet (nieuwe teksten horen via de code): ${unknown.length}`);
    unknown.slice(0, 20).forEach((k) => console.log(`  · ${k}`));
  }
  if (skipped.length) {
    console.log(`\nOvergeslagen — geen tekstwaarde op dat pad: ${skipped.length}`);
    skipped.slice(0, 20).forEach((k) => console.log(`  · ${k}`));
  }
  if (!changedNl.length && !changedEn.length) {
    console.log('\nGeen wijzigingen gevonden — de json-bestanden zijn ongemoeid gebleven.');
  }
}

main();
