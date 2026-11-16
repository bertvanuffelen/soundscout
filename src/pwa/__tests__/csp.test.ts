import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const htaccess = readFileSync(join(process.cwd(), 'public', '.htaccess'), 'utf8');
const policy = (htaccess.match(/Content-Security-Policy "([^"]+)"/)?.[1] ?? '').replace(/\\\n/g, ' ');
const directive = (name: string) => {
  const match = policy.match(new RegExp(`(?:^|;)\\s*${name} ([^;]+);`));
  return match ? match[1].trim().split(/\s+/) : [];
};

describe('CSP en Supabase Storage (migratie 043)', () => {
  const supabaseHosts = directive('connect-src').filter((s) => s.endsWith('.supabase.co'));

  it('kent precies één Supabase-host, zonder wildcard', () => {
    expect(supabaseHosts).toHaveLength(1);
    expect(supabaseHosts[0]).not.toContain('*');
  });

  it('staat beelden en geluid uit de thema-bucket toe van diezelfde host', () => {
    expect(directive('img-src')).toContain(supabaseHosts[0]);
    expect(directive('media-src')).toContain(supabaseHosts[0]);
  });

  it('laat de rest van de policy ongemoeid', () => {
    expect(directive('script-src')).toEqual(["'self'", 'blob:', "'wasm-unsafe-eval'"]);
    expect(directive('default-src')).toEqual(["'self'"]);
  });
});
