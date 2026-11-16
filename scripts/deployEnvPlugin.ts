/**
 * deployEnvPlugin — maakt de build geschikt voor de omgeving waar hij heen gaat
 * (V2-stabilisatie, docs/v2/STAGING.md).
 *
 * Na de build (dist/ is dan compleet, inclusief de gekopieerde public/-bestanden):
 *
 * 1. Supabase-host in de CSP. `public/.htaccess` noemt de productie-host op
 *    drie plekken (connect-src, img-src, media-src). Wijst VITE_SUPABASE_URL
 *    van deze build naar een ander project (bijv. het testproject voor
 *    staging), dan wordt die host in dist/.htaccess vervangen. Zonder dit
 *    blokkeert de browser elke Supabase-aanroep op staging.
 * 2. Alleen in `--mode staging`: staging mag nooit in zoekmachines komen.
 *    dist/robots.txt verbiedt alles en dist/.htaccess stuurt
 *    `X-Robots-Tag: noindex, nofollow` mee, en de sitemap wordt weggelaten.
 *
 * Productie (`npm run build`, mode "production") met de productie-URL: er
 * verandert niets aan dist/.htaccess of dist/robots.txt.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/** Host die in public/.htaccess staat (de bron). */
export function supabaseHostInHtaccess(htaccess: string): string | null {
  const match = htaccess.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
  return match ? match[0] : null;
}

/** Vervang elke vermelding van `from` door `to` (alle drie de directives + commentaar). */
export function rewriteSupabaseHost(htaccess: string, from: string, to: string): string {
  return htaccess.split(from).join(to);
}

const STAGING_HEADERS = `

# --- STAGING (toegevoegd door scripts/deployEnvPlugin.ts) ---
# Deze kopie van SoundScout is alleen om te testen: nooit indexeren.
<IfModule mod_headers.c>
  Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
`;

export function deployEnvPlugin(options: { mode: string; supabaseUrl: string | undefined }): Plugin {
  let outDir = 'dist';
  return {
    name: 'soundscout-deploy-env',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const htaccessPath = join(outDir, '.htaccess');
      if (!existsSync(htaccessPath)) return;
      let htaccess = readFileSync(htaccessPath, 'utf8');

      const target = options.supabaseUrl ? new URL(options.supabaseUrl).origin : null;
      const current = supabaseHostInHtaccess(htaccess);
      if (!target) {
        this.warn('VITE_SUPABASE_URL ontbreekt: de CSP in dist/.htaccess blijft naar de productie-host wijzen.');
      } else if (current && current !== target) {
        htaccess = rewriteSupabaseHost(htaccess, current, target);
        this.info(`CSP: Supabase-host ${current} vervangen door ${target}`);
      }

      if (options.mode === 'staging') {
        htaccess += STAGING_HEADERS;
        writeFileSync(join(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
        rmSync(join(outDir, 'sitemap.xml'), { force: true });
        this.info('Staging: noindex-header, robots.txt "Disallow: /", geen sitemap.');
      }

      writeFileSync(htaccessPath, htaccess);
    },
  };
}
