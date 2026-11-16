/**
 * Oude links blijven werken (V2 Fase 2, harde eis).
 *
 * Tot en met V1 had de app geen paden: alles kwam binnen op `/` met een
 * zoekparameter of een #hash (deellinks, QR-codes, de brug vanaf /teacher en
 * /les/<key>/, de wachtwoord-reset-mail). Die vormen staan in mails, op
 * geprinte muziekkaarten en in QR-codes en mogen nooit breken.
 *
 * `resolveLegacyEntry` is de enige plek die ze kent. Het is een pure functie:
 * adres erin → waar de bezoeker heen moet + wat de app moet onthouden. De
 * router (routes.tsx, `beforeLoad` van de app-layout) voert het uit.
 *
 * Zie docs/v2/URL-CONTRACT.md voor de volledige tabel.
 */
import { readSaveCodeFromHash } from '../utils/saveCodeLink';
import { pathForScreen, SCREEN_PATHS } from './paths';
import { stringifySearch, type AppSearch } from './searchParams';

export type LegacyEffect =
  /** ?dev=true — alle ontwikkelvlaggen aan */
  | { type: 'enableDevFlags' }
  /** ?pp=1234 — klascode opzoeken en naar de opdracht-landing */
  | { type: 'lookupClassCode'; code: string }
  /** ?screen=teacher&lesson= — leskaart die na het inloggen opent */
  | { type: 'pendingLessonCard'; key: string }
  /** ?screen=teacher&tab= — dashboard-tab die na het inloggen opent */
  | { type: 'pendingTeacherTab'; tab: string }
  /** ?screen=teacher-guide&section= — sectie waarop de handleiding opent */
  | { type: 'guideSection'; section: string | null }
  /** #code=ABC123 — bewaarcode die het startscherm meteen opzoekt */
  | { type: 'pendingSaveCode'; code: string };

export interface LegacyEntry {
  /** Adres (pad + zoekdeel + hash) waar de bezoeker op uitkomt */
  href: string;
  effects: LegacyEffect[];
}

/** Supabase zet het recovery-token (of de verlopen-fout) in de hash. */
export function isPasswordRecovery(screen: string | undefined, hash: string): boolean {
  return (
    screen === 'reset-password' ||
    hash.includes('type=recovery') ||
    hash.includes('error_code=otp_expired')
  );
}

/**
 * @param pathname huidig pad
 * @param search   gevalideerde zoekparameters
 * @param hash     de hash mét of zonder '#'
 * @returns null als er niets ouds in het adres staat (of alles al verwerkt is)
 */
export function resolveLegacyEntry(pathname: string, search: AppSearch, hash: string): LegacyEntry | null {
  const hashText = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  const rest: Record<string, unknown> = { ...search };
  const effects: LegacyEffect[] = [];
  let path = pathname;
  let nextHash = '';
  let consumed = false;

  // Zelfde volgorde als de losse effecten in het oude App.tsx: komt er meer
  // dan één bestemming in een link voor, dan wint de laatste.
  if (search.dev === 'true') {
    effects.push({ type: 'enableDevFlags' });
    delete rest.dev;
    consumed = true;
  }

  if (search.share) {
    path = pathForScreen({ ...NO_SCREEN, currentScreen: 'shared', shareCode: search.share });
    delete rest.share;
    consumed = true;
  }

  if (search.pp) {
    effects.push({ type: 'lookupClassCode', code: search.pp });
    delete rest.pp;
    consumed = true;
  }

  if (search.screen === 'teacher') {
    if (search.lesson) effects.push({ type: 'pendingLessonCard', key: search.lesson });
    if (search.tab) effects.push({ type: 'pendingTeacherTab', tab: search.tab });
    path = SCREEN_PATHS.teacher;
    delete rest.screen;
    delete rest.lesson;
    delete rest.tab;
    consumed = true;
  }

  if (search.screen === 'teacher-guide') {
    effects.push({ type: 'guideSection', section: search.section ?? null });
    path = SCREEN_PATHS['teacher-guide'];
    delete rest.screen;
    delete rest.section;
    consumed = true;
  }

  if (isPasswordRecovery(search.screen, hashText)) {
    path = SCREEN_PATHS.teacher;
    // De hash MOET blijven staan: daar zit het recovery-token in, en de
    // (lazy) Supabase-client leest dat pas later. Zonder hash → altijd
    // "Link verlopen" (testronde 1).
    nextHash = hashText;
    if (search.screen === 'reset-password') delete rest.screen;
    consumed = true;
  }

  if (search['pp-share']) {
    path = pathForScreen({ ...NO_SCREEN, currentScreen: 'shared-praatplaat', sharedPraatplaatCode: search['pp-share'] });
    delete rest['pp-share'];
    consumed = true;
  }

  if (search.album) {
    path = pathForScreen({ ...NO_SCREEN, currentScreen: 'shared-album', sharedAlbumCode: search.album });
    delete rest.album;
    consumed = true;
  }

  const saveCode = readSaveCodeFromHash(hashText);
  if (saveCode) {
    // De bewaarcode gaat meteen uit de adresbalk (privacy: zie saveCodeLink)
    effects.push({ type: 'pendingSaveCode', code: saveCode });
    path = SCREEN_PATHS.start;
    nextHash = '';
    consumed = true;
  }

  if (!consumed) return null;

  const href = `${path}${stringifySearch(rest)}${nextHash}`;
  // Al op de plek van bestemming en niets meer te doen (bv. /docent met het
  // recovery-token nog in de hash): geen nieuwe omleiding, anders een lus.
  const currentHref = `${pathname}${stringifySearch(search)}${hashText === '#' ? '' : hashText}`;
  if (href === currentHref && effects.length === 0) return null;

  return { href, effects };
}

const NO_SCREEN = {
  currentLocationId: null,
  shareCode: null,
  sharedPraatplaatCode: null,
  sharedAlbumCode: null,
} as const;
