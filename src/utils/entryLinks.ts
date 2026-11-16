/**
 * Links die de app uitdeelt (deelvensters, QR-codes).
 *
 * Ze houden bewust hun oude vorm (`/?share=CODE`): die staat al in mails, op
 * digiborden en in geprinte QR-codes, en `resolveLegacyEntry`
 * (src/router/legacyEntry.ts) leidt elke vorm naar het juiste scherm.
 * `src/router/__tests__/legacyEntry.test.ts` bewaakt dat elke link die hier
 * gebouwd wordt ook weer opengaat. De bewaarcode-link staat in saveCodeLink.ts.
 */

const origin = () => window.location.origin;

/** Deellink van een soundscape (8 tekens, alleen luisteren) */
export function buildShareLink(code: string, base: string = origin()): string {
  return `${base}/?share=${code}`;
}

/** Klascode-link / QR voor leerlingen (4 cijfers) */
export function buildClassCodeLink(classCode: string, base: string = origin()): string {
  return `${base}/?pp=${classCode}`;
}

/** Publieke praatplaat (8 tekens) */
export function buildPraatplaatShareLink(code: string, base: string = origin()): string {
  return `${base}/?pp-share=${code}`;
}

/** Publiek klas-album (8 tekens) */
export function buildAlbumLink(code: string, base: string = origin()): string {
  return `${base}/?album=${code}`;
}
