/**
 * themeCodegen - Motor achter de Thema-wizard (week 4)
 *
 * Pure functies zonder UI: het concept-model van een nieuw thema-pakket,
 * AI-promptgeneratie (afbeeldingen + geluid-zoekpakketten) en de uiteindelijke
 * code-export (locations.ts / samples.ts / map.ts / index.ts / i18n-fragmenten
 * + een kant-en-klare Claude Code-opdracht).
 *
 * De wizard is een dev-tool (bereikbaar via /editor); alle teksten hier zijn
 * bewust Nederlands en niet ge-i18n'd, net als de LocationEditor.
 */

// --- Model ---------------------------------------------------------------

export interface WizardSample {
  /** Slug binnen de locatie, bv. 'kippen' → sample-id '{locId}-kippen' */
  id: string;
  nameNl: string;
  nameEn: string;
  /** Omschrijving van het gewenste geluid (voor het zoekpakket) */
  soundIdea: string;
  /** Lucide-iconnaam, bv. 'Bird' */
  icon: string;
  /** Hex-kleur voor de tijdlijn, bv. '#FFC107' */
  color: string;
}

export interface WizardLocation {
  /** Slug, bv. 'bakkerij' */
  id: string;
  nameNl: string;
  nameEn: string;
  descriptionNl: string;
  descriptionEn: string;
  /** Scène-omschrijving voor de afbeeldingsprompt */
  sceneIdea: string;
  samples: WizardSample[];
  /** Positie op de kaart in % (null = nog niet geplaatst) */
  mapX: number | null;
  mapY: number | null;
}

export interface WizardPraatplaat {
  id: string;
  titleNl: string;
  titleEn: string;
  sceneIdea: string;
}

export interface ThemeDraft {
  /** Thema-slug, bv. 'herfst' */
  themeId: string;
  nameNl: string;
  nameEn: string;
  descriptionNl: string;
  descriptionEn: string;
  /** Vrij label, bv. 'Herfst / Sinterklaas' */
  seasonLabel: string;
  /** Seizoensvenster 'MM-DD' (leeg = altijd zichtbaar) */
  activeFrom: string;
  activeUntil: string;
  /** Beeldstijl-omschrijving die in élke afbeeldingsprompt meegaat */
  styleProfile: string;
  locations: WizardLocation[];
  praatplaten: WizardPraatplaat[];
  storyboardTitleNl: string;
  storyboardTitleEn: string;
  /** Scène-omschrijvingen van de storyboard-frames (leeg = geen storyboard) */
  storyboardFrames: string[];
}

/**
 * Stijlprofiel-basis, afgeleid van de bestaande thema-art (basis/winterspelen).
 * Bewerkbaar in stap 1 van de wizard, zodat een themapakket desgewenst een
 * eigen accent krijgt zonder de herkenbare SoundScout-look te verliezen.
 */
export const DEFAULT_STYLE_PROFILE =
  'Vriendelijke, kleurrijke cartoon-illustratie in de stijl van een moderne ' +
  'kinderboeken-illustratie. Warm licht, zachte schaduwen, verzadigde maar niet ' +
  'schreeuwerige kleuren. Vriendelijke robots als bewoners (consistent met de ' +
  'bestaande SoundScout-werelden), géén mensen, géén tekst of logo\'s in beeld. ' +
  'Overzichtelijke compositie met duidelijk herkenbare plekken waar geluid ' +
  'vandaan kan komen.';

export function makeEmptySample(): WizardSample {
  return { id: '', nameNl: '', nameEn: '', soundIdea: '', icon: 'Music', color: '#FFC107' };
}

export function makeEmptyLocation(index: number): WizardLocation {
  return {
    id: `locatie-${index + 1}`,
    nameNl: '',
    nameEn: '',
    descriptionNl: '',
    descriptionEn: '',
    sceneIdea: '',
    samples: Array.from({ length: 6 }, makeEmptySample),
    mapX: null,
    mapY: null,
  };
}

export function makeEmptyDraft(): ThemeDraft {
  return {
    themeId: '',
    nameNl: '',
    nameEn: '',
    descriptionNl: '',
    descriptionEn: '',
    seasonLabel: '',
    activeFrom: '',
    activeUntil: '',
    styleProfile: DEFAULT_STYLE_PROFILE,
    locations: [makeEmptyLocation(0), makeEmptyLocation(1), makeEmptyLocation(2)],
    praatplaten: [],
    storyboardTitleNl: '',
    storyboardTitleEn: '',
    storyboardFrames: [],
  };
}

// --- Prompt-generatie ------------------------------------------------------

export type ImagePromptKind = 'location' | 'map' | 'praatplaat' | 'storyboard-frame';

const KIND_SPECS: Record<ImagePromptKind, string> = {
  location:
    'Locatie-achtergrond voor een geluiden-zoekscherm: één samenhangende scène ' +
    'met 5-7 visueel duidelijke plekken/objecten die elk een eigen geluid kunnen ' +
    'maken (die worden klikbare hotspots). Niet te druk; elk geluidsobject moet ' +
    'los herkenbaar zijn.',
  map:
    'Overzichtskaart/plattegrond van het hele themagebied, van bovenaf of in ' +
    'licht vogelvluchtperspectief. Alle locaties van het thema zijn als aparte, ' +
    'herkenbare gebouwen/plekken zichtbaar met ruimte ertussen voor markers.',
  praatplaat:
    'Praatplaat (klassikale kijkplaat): één rijke scène waar een hele klas over ' +
    'kan praten, met veel kleine verhaaltjes en 8-12 plekken die geluid zouden ' +
    'kunnen maken. Vergelijkbaar met een zoekplaat, maar overzichtelijk.',
  'storyboard-frame':
    'Storyboard-frame: één scène uit een reeks die samen een kort verhaal ' +
    'vertellen. Zelfde personages/plek als de andere frames, duidelijk ' +
    'verschillend moment.',
};

/** Bouw een kant-en-klare afbeeldingsprompt (voor Claude/beeldgenerator). */
export function buildImagePrompt(
  draft: ThemeDraft,
  sceneIdea: string,
  kind: ImagePromptKind
): string {
  const scene = sceneIdea.trim() || '[scène-omschrijving invullen]';
  return [
    `**Scène**: ${scene}`,
    `**Type**: ${KIND_SPECS[kind]}`,
    `**Stijl**: ${draft.styleProfile.trim() || DEFAULT_STYLE_PROFILE}`,
    `**Thema-context**: "${draft.nameNl || draft.themeId}" (${draft.seasonLabel || 'geen seizoen'}).`,
    '**Technisch**: liggend 16:9, 1920×1080 px, geschikt als webafbeelding (JPG).',
  ].join('\n');
}

/** Zoekpakket voor één geluid: freesound-zoektermen + eisen-checklist. */
export function buildSoundSearchPack(location: WizardLocation, sample: WizardSample): string {
  const idea = sample.soundIdea.trim() || sample.nameNl || '[geluid-omschrijving invullen]';
  const searchTerms = [sample.nameEn, idea]
    .filter(Boolean)
    .map((s) => s.toLowerCase())
    .join(' · ');
  return [
    `**Geluid**: ${sample.nameNl || sample.id} — ${idea}`,
    `**Zoektermen (freesound.org, Engels)**: ${searchTerms}`,
    '**Eisen**: 2-8 seconden · schoon opgenomen (geen ruis/achtergrondmuziek) · ',
    'loop-vriendelijk of duidelijk begin/eind · licentie CC0 of CC-BY (naam noteren!) · ',
    `**Opslaan als**: /public/audio/themes/{themaId}/${location.id}/${sample.id || '[sample-id]'}.mp3 (mp3, 128kbps of beter)`,
  ].join('\n');
}

// --- Validatie ---------------------------------------------------------------

const SLUG_RE = /^[a-z0-9-]+$/;

/** Controleer het concept; geeft een lijst leesbare problemen terug (leeg = klaar voor export). */
export function validateDraft(draft: ThemeDraft): string[] {
  const issues: string[] = [];
  const add = (msg: string) => issues.push(msg);

  if (!draft.themeId) add('Thema-id ontbreekt (stap 1).');
  else if (!SLUG_RE.test(draft.themeId)) add(`Thema-id '${draft.themeId}' mag alleen kleine letters, cijfers en streepjes bevatten.`);
  if (!draft.nameNl) add('Nederlandse themanaam ontbreekt (stap 1).');
  if (!draft.nameEn) add('Engelse themanaam ontbreekt (stap 1).');
  if ((draft.activeFrom && !draft.activeUntil) || (!draft.activeFrom && draft.activeUntil)) {
    add('Seizoensvenster is half ingevuld: zet activeFrom én activeUntil, of maak beide leeg.');
  }
  if (draft.locations.length === 0) add('Minstens één locatie nodig.');

  const seenLocationIds = new Set<string>();
  draft.locations.forEach((loc, i) => {
    const label = loc.nameNl || loc.id || `locatie ${i + 1}`;
    if (!loc.id) add(`Locatie ${i + 1}: id (slug) ontbreekt.`);
    else if (!SLUG_RE.test(loc.id)) add(`Locatie '${label}': id mag alleen kleine letters, cijfers en streepjes bevatten.`);
    else if (seenLocationIds.has(loc.id)) add(`Locatie-id '${loc.id}' komt dubbel voor.`);
    seenLocationIds.add(loc.id);
    if (!loc.nameNl || !loc.nameEn) add(`Locatie '${label}': NL en EN naam zijn verplicht.`);
    if (!loc.sceneIdea.trim()) add(`Locatie '${label}': scène-omschrijving voor de afbeelding ontbreekt.`);
    if (loc.mapX == null || loc.mapY == null) add(`Locatie '${label}': nog geen positie op de kaart (stap 4).`);

    const filledSamples = loc.samples.filter((s) => s.id || s.nameNl);
    if (filledSamples.length < 4) add(`Locatie '${label}': minstens 4 geluiden invullen (nu ${filledSamples.length}).`);
    const seenSampleIds = new Set<string>();
    filledSamples.forEach((s) => {
      if (!s.id) add(`Locatie '${label}': geluid '${s.nameNl}' mist een id (slug).`);
      else if (!SLUG_RE.test(s.id)) add(`Locatie '${label}': geluid-id '${s.id}' mag alleen kleine letters, cijfers en streepjes bevatten.`);
      else if (seenSampleIds.has(s.id)) add(`Locatie '${label}': geluid-id '${s.id}' komt dubbel voor.`);
      seenSampleIds.add(s.id);
      if (!s.nameNl || !s.nameEn) add(`Locatie '${label}': geluid '${s.id || s.nameNl}' mist NL/EN naam.`);
    });
  });

  return issues;
}

// --- Code-export ---------------------------------------------------------------

export interface GeneratedFile {
  /** Doelpad in de repo (relatief) */
  path: string;
  content: string;
}

const HEADER = (what: string, draft: ThemeDraft) =>
  `/**\n * ${what} for the '${draft.themeId}' theme.\n *\n * Gegenereerd door de Thema-wizard (/editor). Hotspot-posities volgen\n * later via de Locatie-editor; zie de meegeleverde Claude-opdracht.\n */\n\n`;

function fullSampleId(loc: WizardLocation, s: WizardSample): string {
  return `${loc.id}-${s.id}`;
}

function filledSamples(loc: WizardLocation): WizardSample[] {
  return loc.samples.filter((s) => s.id || s.nameNl);
}

export function generateThemeFiles(draft: ThemeDraft): GeneratedFile[] {
  const t = draft.themeId;
  const files: GeneratedFile[] = [];
  const camel = t.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

  // --- locations.ts ---
  const locationsTs = HEADER('Locations', draft) +
    `import type { Location } from '../../../types';\n\n` +
    `export const locations: Location[] = [\n` +
    draft.locations.map((loc) => (
      `  {\n` +
      `    id: '${loc.id}',\n` +
      `    name: 'locations.${loc.id}.name',\n` +
      `    description: 'locations.${loc.id}.description',\n` +
      `    backgroundImage: '/images/themes/${t}/${loc.id}.jpg',\n` +
      `    ambientAudio: '',\n` +
      `    unlocked: true,\n` +
      `    // TODO: hotspots plaatsen via de Locatie-editor (/editor → Locatie-editor)\n` +
      `    hotspots: [],\n` +
      `  },\n`
    )).join('') +
    `];\n`;
  files.push({ path: `src/data/themes/${t}/locations.ts`, content: locationsTs });

  // --- samples.ts ---
  const samplesTs = HEADER('Samples', draft) +
    `import type { Sample } from '../../../types';\n\n` +
    `export const samples: Sample[] = [\n` +
    draft.locations.map((loc) =>
      `  // ${loc.nameNl || loc.id}\n` +
      filledSamples(loc).map((s) => (
        `  {\n` +
        `    id: '${fullSampleId(loc, s)}',\n` +
        `    name: 'samples.${fullSampleId(loc, s)}',\n` +
        `    locationId: '${loc.id}',\n` +
        `    audioUrl: '/audio/themes/${t}/${loc.id}/${s.id}.mp3',\n` +
        `    duration: 4.0, // TODO: echte duur invullen (Locatie-editor meet dit automatisch)\n` +
        `    icon: '${s.icon || 'Music'}',\n` +
        `    color: '${s.color || '#FFC107'}',\n` +
        `  },\n`
      )).join('')
    ).join('') +
    `];\n`;
  files.push({ path: `src/data/themes/${t}/samples.ts`, content: samplesTs });

  // --- map.ts ---
  const mapTs = HEADER('Map configuration', draft) +
    `import type { MapConfig } from '../types';\n\n` +
    `export const mapConfig: MapConfig = {\n` +
    `  backgroundImage: '/images/themes/${t}/plattegrond.jpg',\n` +
    `  locationPositions: [\n` +
    draft.locations.map((loc) =>
      `    { locationId: '${loc.id}', x: ${loc.mapX ?? 50}, y: ${loc.mapY ?? 50} },\n`
    ).join('') +
    `  ],\n` +
    `};\n`;
  files.push({ path: `src/data/themes/${t}/map.ts`, content: mapTs });

  // --- index.ts ---
  const seasonLines = draft.activeFrom && draft.activeUntil
    ? `\n  // Seizoensvenster (${draft.seasonLabel || 'seizoen'})\n  activeFrom: '${draft.activeFrom}',\n  activeUntil: '${draft.activeUntil}',\n`
    : '';
  const indexTs =
    `/**\n * ${draft.nameNl || t} Theme (${draft.seasonLabel || 'geen seizoen'})\n * Gegenereerd door de Thema-wizard.\n */\n\n` +
    `import type { ThemeConfig } from '../types';\n` +
    `import { locations } from './locations';\n` +
    `import { samples } from './samples';\n` +
    `import { mapConfig } from './map';\n\n` +
    `export const ${camel}Theme: ThemeConfig = {\n` +
    `  id: '${t}',\n` +
    `  name: 'themes.${t}.name',\n` +
    `  description: 'themes.${t}.description',\n` +
    `  isPublic: true,\n` +
    seasonLines +
    `\n  locations,\n  samples,\n  map: mapConfig,\n};\n`;
  files.push({ path: `src/data/themes/${t}/index.ts`, content: indexTs });

  // --- i18n-fragmenten (NL + EN) ---
  const i18nFor = (lang: 'nl' | 'en') => {
    const name = lang === 'nl' ? draft.nameNl : draft.nameEn;
    const desc = lang === 'nl' ? draft.descriptionNl : draft.descriptionEn;
    const themesBlock = { [t]: { name, description: desc } };
    const locationsBlock: Record<string, { name: string; description: string }> = {};
    const samplesBlock: Record<string, string> = {};
    draft.locations.forEach((loc) => {
      locationsBlock[loc.id] = {
        name: lang === 'nl' ? loc.nameNl : loc.nameEn,
        description: lang === 'nl' ? loc.descriptionNl : loc.descriptionEn,
      };
      filledSamples(loc).forEach((s) => {
        samplesBlock[fullSampleId(loc, s)] = lang === 'nl' ? s.nameNl : s.nameEn;
      });
    });
    return JSON.stringify({ themes: themesBlock, locations: locationsBlock, samples: samplesBlock }, null, 2);
  };
  files.push({ path: `i18n-fragment-nl.json (mergen in src/i18n/locales/nl.json)`, content: i18nFor('nl') });
  files.push({ path: `i18n-fragment-en.json (mergen in src/i18n/locales/en.json)`, content: i18nFor('en') });

  // --- Claude Code-opdracht ---
  const praatplaatLines = draft.praatplaten.length
    ? draft.praatplaten.map((p) => `   - '${p.id}' ("${p.titleNl}" / "${p.titleEn}") → afbeelding naar /public/images/praatplaten/${p.id}.jpg + entry in src/data/praatplaatImages.ts (availableFor: 'both', themeId: '${t}')`).join('\n')
    : '   (geen)';
  const storyboardLine = draft.storyboardFrames.length
    ? `Storyboard "${draft.storyboardTitleNl}" met ${draft.storyboardFrames.length} frames → frames naar /public/images/storyboards/${t}-verhaal/ + entry in src/data/storyboards.ts (themeId: '${t}') + i18n-keys storyboards.${t}-verhaal.*`
    : '(geen storyboard)';
  const claudeTask =
    `# Claude Code-opdracht — thema '${t}' inbouwen\n\n` +
    `Plaats het nieuwe thema '${draft.nameNl}' (${draft.seasonLabel || 'geen seizoen'}) in de codebase:\n\n` +
    `1. Maak de map src/data/themes/${t}/ met de vier meegeleverde bestanden (index.ts, locations.ts, samples.ts, map.ts).\n` +
    `2. Registreer het thema in src/data/themes/index.ts: import { ${camel}Theme } from './${t}'; en voeg '${t}: ${camel}Theme' toe aan het themes-object.\n` +
    `3. Merge de twee i18n-fragmenten in src/i18n/locales/nl.json en en.json (onder themes/locations/samples; pariteit bewaken).\n` +
    `4. Controleer dat deze assets bestaan (door mij geplaatst):\n` +
    `   - /public/images/themes/${t}/plattegrond.jpg (1920×1080)\n` +
    draft.locations.map((l) => `   - /public/images/themes/${t}/${l.id}.jpg + /public/audio/themes/${t}/${l.id}/*.mp3`).join('\n') + '\n' +
    `5. Praatplaten:\n${praatplaatLines}\n` +
    `6. ${storyboardLine}\n` +
    `7. Hotspots: per locatie de export uit de Locatie-editor (/editor → locatie laden → JSON) mergen in locations.ts, inclusief gemeten sample-duraties in samples.ts.\n` +
    `8. Gate: npx tsc -b --noEmit && npm run test:run groen; daarna ?theme=${t} handmatig testen (kaart → locatie → studio).\n`;
  files.push({ path: `CLAUDE-OPDRACHT-${t}.md`, content: claudeTask });

  return files;
}
