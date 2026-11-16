import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { rewriteSupabaseHost, supabaseHostInHtaccess } from '../../../scripts/deployEnvPlugin';

const htaccess = readFileSync(join(process.cwd(), 'public', '.htaccess'), 'utf8');

describe('deployEnvPlugin', () => {
  it('vindt de productie-host in public/.htaccess', () => {
    expect(supabaseHostInHtaccess(htaccess)).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
  });

  it('vervangt de host in alle drie de CSP-directives en laat niets van de oude host achter', () => {
    const from = supabaseHostInHtaccess(htaccess)!;
    const out = rewriteSupabaseHost(htaccess, from, 'https://testproject123.supabase.co');
    expect(out).not.toContain(from);
    const policy = out.match(/Content-Security-Policy "([^"]+)"/)![1];
    for (const d of ['connect-src', 'img-src', 'media-src']) {
      expect(policy).toMatch(new RegExp(`${d} [^;]*https://testproject123\\.supabase\\.co`));
    }
  });
});
