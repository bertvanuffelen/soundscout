/**
 * Maakt de app-iconen voor de installeerbare app (PWA) uit het bestaande logo.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Bron:   public/images/overige/logo-soundscout-white.svg (het witte logo)
 * Uitvoer: public/images/overige/pwa/
 *   icon-192.png, icon-512.png   wit logo op donkerblauw (#0F172A), doel "any"
 *   icon-maskable-512.png        idem, logo binnen de veilige zone (doel "maskable")
 *   apple-touch-icon.png         180×180, dekkend (iOS rondt zelf de hoeken af)
 *
 * Er wordt niets nieuws getekend: alleen het logo geschaald op de merkkleur.
 * Gebruikt de Chromium van Playwright (al een devDependency) om de SVG scherp
 * te renderen. Alleen opnieuw draaien als het logo verandert; de PNG's staan in git.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}public/images/overige/pwa`;
const svg = readFileSync(`${root}public/images/overige/logo-soundscout-white.svg`, 'utf8')
  .replace(/<\?xml[^>]*\?>/, '');
const BRAND = '#0F172A';

/** scale = deel van de zijde dat het logo beslaat */
const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.72 },
  { file: 'icon-512.png', size: 512, scale: 0.72 },
  // Maskable: alles buiten de middelste cirkel (80% van de zijde) mag worden weggesneden
  { file: 'icon-maskable-512.png', size: 512, scale: 0.56 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.68 },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const { file, size, scale } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><style>
      html,body{margin:0;width:${size}px;height:${size}px;background:${BRAND}}
      body{display:flex;align-items:center;justify-content:center}
      svg{width:${Math.round(size * scale)}px;height:auto;display:block}
    </style>${svg}`);
    await page.screenshot({ path: `${outDir}/${file}`, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log(`✓ ${file}`);
  }
} finally {
  await browser.close();
}
