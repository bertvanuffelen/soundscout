/**
 * Bronvermelding voor geluiden van derden.
 *
 * CC-BY verplicht naamsvermelding; deze lijst is de plek waar SoundScout
 * daaraan voldoet. De colofonsectie op /over rendert hem.
 *
 * Bijwerken: de per-thema `BRONNEN.md` in `src/data/themes/{themeId}/` is de
 * werkbron tijdens het maken van een thema. Wat daar staat en publiek gaat,
 * hoort hier ook te staan — anders staat een CC-BY-geluid live zonder
 * naamsvermelding.
 */

export interface SoundCredit {
  /** Naam van het geluid zoals de maker het publiceerde */
  title: string;
  /** Makersnaam op Freesound */
  author: string;
  /** Korte licentienaam, bijv. 'CC BY 4.0' */
  license: string;
  /** Link naar de licentietekst */
  licenseUrl: string;
  /** Link naar het originele geluid */
  sourceUrl: string;
}

export interface ThemeCredits {
  /** themeId zoals in src/data/themes/ */
  themeId: string;
  /** i18n-sleutel voor de themanaam */
  nameKey: string;
  sounds: SoundCredit[];
}

const CC_BY_4 = { license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' };
const CC_BY_3 = { license: 'CC BY 3.0', licenseUrl: 'http://creativecommons.org/licenses/by/3.0/' };
const CC0 = { license: 'CC0 1.0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/' };

/** Thema Piraten — geluiden van Freesound (bron: themes/piraten/BRONNEN.md) */
const PIRATEN_SOUNDS: SoundCredit[] = [
  { title: 'Bedroom wooden door close', author: 'MattRuthSound', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/MattRuthSound/sounds/381964/' },
  { title: 'Dice Set A', author: 'Phorgador', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/Phorgador/sounds/678196/' },
  { title: 'Tin Whistle, Flutter, A', author: 'InspectorJ', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/InspectorJ/sounds/410406/' },
  { title: 'Plasticwaterjug BigBelly', author: 'DylanSmithSound', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/DylanSmithSound/sounds/547335/' },
  { title: 'bell3', author: 'juskiddink', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/juskiddink/sounds/59536/' },
  { title: 'wave sand beach 022', author: 'klankbeeld', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/klankbeeld/sounds/627803/' },
  { title: 'Creaking Metal Wire of Wooden Gate', author: 'qubodup', ...CC0, sourceUrl: 'https://freesound.org/people/qubodup/sounds/861827/' },
  { title: 'Boards Fall 1', author: 'AleXZavesa', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/AleXZavesa/sounds/853901/' },
  { title: 'seagull-toy-raw', author: 'freesound61476', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/freesound61476/sounds/62159/' },
  { title: 'Two Bells, Ship Time', author: 'Benboncan', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/Benboncan/sounds/77699/' },
  { title: 'Hits on wood', author: 'Aiwha', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/Aiwha/sounds/190027/' },
  { title: 'Sound of crickets at night', author: 'joanaseabra', ...CC0, sourceUrl: 'https://freesound.org/people/joanaseabra/sounds/424871/' },
  { title: 'woodland_kingfisher', author: 'soundbytez', ...CC_BY_3, sourceUrl: 'https://freesound.org/people/soundbytez/sounds/114450/' },
  { title: 'little waterfall', author: 'HelenaMRose', ...CC_BY_3, sourceUrl: 'https://freesound.org/people/HelenaMRose/sounds/515891/' },
  { title: 'Big Water Splash', author: 'qubodup', ...CC0, sourceUrl: 'https://freesound.org/people/qubodup/sounds/442773/' },
  { title: 'Cannon shot', author: 'SamsterBirdies', ...CC0, sourceUrl: 'https://freesound.org/people/SamsterBirdies/sounds/467883/' },
  { title: 'Ball bearing click 2', author: 'mattgirling', ...CC_BY_3, sourceUrl: 'https://freesound.org/people/mattgirling/sounds/493537/' },
  { title: 'Wind howling', author: 'paf60', ...CC0, sourceUrl: 'https://freesound.org/people/paf60/sounds/767148/' },
  { title: 'flag_flap_2', author: 'RichieMcMullen', ...CC0, sourceUrl: 'https://freesound.org/people/RichieMcMullen/sounds/386797/' },
  { title: 'Rattling Bones', author: 'spookymodem', ...CC0, sourceUrl: 'https://freesound.org/people/spookymodem/sounds/202102/' },
  { title: 'Dripping Water', author: 'spookymodem', ...CC0, sourceUrl: 'https://freesound.org/people/spookymodem/sounds/249806/' },
  { title: 'Gong-Cambodia', author: 'cdrk', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/cdrk/sounds/379865/' },
  { title: 'boiling bubbles 1', author: 'Jace', ...CC_BY_4, sourceUrl: 'https://freesound.org/people/Jace/sounds/19841/' },
  { title: 'wind chimes - single 03', author: 'Anthousai', ...CC0, sourceUrl: 'https://freesound.org/people/Anthousai/sounds/398492/' },
];

export const THEME_CREDITS: ThemeCredits[] = [
  { themeId: 'piraten', nameKey: 'themes.piraten.name', sounds: PIRATEN_SOUNDS },
];

/** Alle vermelde geluiden, over thema's heen. */
export function getAllSoundCredits(): SoundCredit[] {
  return THEME_CREDITS.flatMap((theme) => theme.sounds);
}

/** Unieke makers, alfabetisch — voor een compacte samenvatting. */
export function getCreditedAuthors(): string[] {
  return [...new Set(getAllSoundCredits().map((s) => s.author))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}
