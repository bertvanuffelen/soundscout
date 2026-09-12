/**
 * generate-handboek.mjs — één leesbaar handboek uit de drie thema-skills
 *
 * Bundelt .claude/skills/soundscout-{thema-studio,afbeeldingen-generator,
 * geluiden-verzamelen}/ (SKILL.md + reference/*.md + korte beschrijving van
 * templates en scripts) tot docs/HANDBOEK-THEMA-STUDIO.md.
 *
 * De skills zijn de enige bron van waarheid — dit bestand is een AFGELEIDE.
 * Nooit met de hand bewerken; na elke skill-wijziging opnieuw genereren:
 *   npm run handboek
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, '.claude/skills');
const outFile = join(root, 'docs/HANDBOEK-THEMA-STUDIO.md');

// Vaste volgorde: regie eerst, dan de twee productie-skills.
const SKILLS = [
  { dir: 'soundscout-thema-studio', titel: 'Thema-studio (regie)' },
  { dir: 'soundscout-afbeeldingen-generator', titel: 'Afbeeldingen-generator' },
  { dir: 'soundscout-geluiden-verzamelen', titel: 'Geluiden-verzamelen' },
];

// Leesvolgorde van reference-bestanden per skill (rest alfabetisch erachter).
const REF_ORDER = {
  'soundscout-thema-studio': ['datamodel-thema.md', 'voorbeeld-piraten.md'],
  'soundscout-afbeeldingen-generator': [
    'gotchas.md', 'stijl-robots.md', 'stijl-cast.md', 'prompt-recept.md',
    'stijl-praatplaat.md', 'stijl-locatie.md', 'stijl-storyboard.md',
    'stijl-plattegrond.md', 'beoordeling-checklist.md', 'api-setup.md',
  ],
  'soundscout-geluiden-verzamelen': [
    'audio-specificaties.md', 'higgsfield-audio.md', 'muziek-stems.md', 'api-setup.md',
  ],
};

const anchor = (skill, file) => `${skill.replace('soundscout-', '')}--${basename(file, '.md')}`;

/** Frontmatter (--- … ---) eraf; description eruit voor de intro. */
function splitFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { body: md, description: '' };
  const desc = (m[1].match(/description:\s*>-?\n([\s\S]*)/) ?? [])[1] ?? '';
  return {
    body: md.slice(m[0].length),
    description: desc.split('\n').map((l) => l.trim()).join(' ').trim(),
  };
}

/**
 * Koppen twee niveaus dieper (deel = #, bestand = ##), fenced code met rust laten,
 * en relatieve skill-links omzetten naar ankers binnen het handboek.
 */
function transform(md, skill) {
  const out = [];
  let inFence = false;
  for (const line of md.split('\n')) {
    if (/^```/.test(line)) { inFence = !inFence; out.push(line); continue; }
    if (inFence) { out.push(line); continue; }
    let l = line;
    if (/^#{1,4} /.test(l)) l = '##' + l;
    l = l
      .replace(/\]\(reference\/([\w.-]+)\.md(#[\w-]*)?\)/g, (_, f) => `](#${anchor(skill, f)})`)
      // [tekst](templates/x) of [tekst](templates/) → tekst (`templates/x`)
      .replace(/\[([^\]]+)\]\(((?:templates|scripts)\/[\w./-]*)\)/g, (_, t, f) => `${t} (\`${f}\`)`);
    out.push(l);
  }
  return out.join('\n');
}

/** Eerste docstring-alinea van een Python-script als één regel. */
function scriptSummary(path) {
  const src = readFileSync(path, 'utf8');
  const m = src.match(/"""([\s\S]*?)"""/);
  if (!m) return '';
  return m[1].trim().split('\n\n')[0].replace(/\s+/g, ' ').trim();
}

function refFiles(skillDir, skill) {
  const dir = join(skillDir, 'reference');
  if (!existsSync(dir)) return [];
  const all = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const order = REF_ORDER[skill] ?? [];
  return [...order.filter((f) => all.includes(f)), ...all.filter((f) => !order.includes(f)).sort()];
}

// --- Bouwen ---

const toc = [];
const parts = [];

for (const { dir: skill, titel } of SKILLS) {
  const skillDir = join(skillsDir, skill);
  const { body, description } = splitFrontmatter(readFileSync(join(skillDir, 'SKILL.md'), 'utf8'));
  const partAnchor = skill.replace('soundscout-', '');

  toc.push(`- [${titel}](#${partAnchor})`);
  const section = [];
  section.push(`<a id="${partAnchor}"></a>\n# ${titel}\n`);
  section.push(`> **Skill:** \`${skill}\` · **Trigger:** ${description}\n`);
  section.push(transform(body, skill));

  for (const f of refFiles(skillDir, skill)) {
    const a = anchor(skill, f);
    toc.push(`  - [${basename(f, '.md')}](#${a})`);
    const md = readFileSync(join(skillDir, 'reference', f), 'utf8');
    section.push(`\n<a id="${a}"></a>\n`);
    section.push(transform(md, skill));
  }

  // Cast-galerij: de canonieke portretten horen zichtbaar bij de cast-spec.
  const castDir = join(skillDir, 'reference/cast');
  if (existsSync(castDir)) {
    const rel = relative(dirname(outFile), castDir);
    const imgs = readdirSync(castDir).filter((f) => f.endsWith('.jpg')).sort();
    section.push(`\n## Cast — canonieke beelden\n`);
    section.push(imgs.map((f) => `![${basename(f, '.jpg')}](${rel}/${f})`).join('\n'));
    section.push('');
  }

  const tplDir = join(skillDir, 'templates');
  if (existsSync(tplDir)) {
    section.push(`\n## Templates (\`${skill}/templates/\`)\n`);
    for (const f of readdirSync(tplDir).sort()) section.push(`- \`${f}\``);
  }

  const scrDir = join(skillDir, 'scripts');
  if (existsSync(scrDir)) {
    section.push(`\n## Scripts (\`${skill}/scripts/\`)\n`);
    for (const f of readdirSync(scrDir).filter((f) => f.endsWith('.py') && !f.startsWith('_')).sort()) {
      section.push(`- \`${f}\` — ${scriptSummary(join(scrDir, f))}`);
    }
  }

  parts.push(section.join('\n'));
}

const stamp = new Date().toISOString().slice(0, 10);
const header = `<!-- GEGENEREERD — niet met de hand bewerken. Bron: .claude/skills/. Bijwerken: npm run handboek -->

# Handboek Thema-studio

*Gegenereerd op ${stamp} uit de drie SoundScout-skills. Dit is de leesversie voor Bert;
Claude leest de skills zelf. Wijzig je iets, doe dat in \`.claude/skills/\` en draai
\`npm run handboek\` — dan blijven beide gelijk.*

## Zo start je een nieuw thema

1. Open een nieuwe chat **in de SoundScout-map** (de skills zijn projectgebonden).
2. Zeg: *"Ik wil een nieuw thema. Ik zit aan … te denken."* — de thema-studio start de
   intake-wizard (fase A) en vraagt door tot het themaplan compleet is.
3. Elke fase eindigt met jouw akkoord. Beelden en geluiden lopen via de deelskills; jij
   keurt goed, Claude keurt alleen af.
4. Piraten is het uitgewerkte voorbeeld (deel 1, "voorbeeld-piraten") — leen de
   redenering, niet de keuzes.

## Inhoud

${toc.join('\n')}

---
`;

writeFileSync(outFile, header + parts.join('\n\n---\n\n') + '\n');
const lines = (header + parts.join('\n')).split('\n').length;
console.log(`OK: ${relative(root, outFile)} (${lines} regels, ${SKILLS.length} skills)`);
