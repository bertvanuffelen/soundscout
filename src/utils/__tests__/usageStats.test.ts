/**
 * Anonieme gebruiksstatistieken: alleen een eventnaam gaat naar de server,
 * hooguit één keer per sessie, en nooit iets over de gebruiker of de fout.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  logUsageEvent, logCompositionStarted, logFirstSound, installErrorCounter, resetUsageStatsForTests,
} from '../usageStats';

const sent = () => fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string).p_event as string);
let fetchMock: ReturnType<typeof vi.fn>;
let now = 0;

beforeEach(() => {
  resetUsageStatsForTests();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
  now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usageStats', () => {
  it('stuurt alleen de eventnaam, en elk event hooguit één keer per sessie', () => {
    logUsageEvent('mp3_export');
    logUsageEvent('mp3_export');
    expect(sent()).toEqual(['mp3_export']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/log_usage_event');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ p_event: 'mp3_export' });
  });

  it('respecteert Do Not Track', () => {
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    logUsageEvent('app_start');
    logCompositionStarted();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [12, 'first_sound_20s'],
    [20, 'first_sound_20s'],
    [45, 'first_sound_60s'],
    [200, 'first_sound_slow'],
  ])('eerste geluid na %i s telt in de emmer %s', (seconds, bucket) => {
    logCompositionStarted();
    now += seconds * 1000;
    logFirstSound();
    logFirstSound(); // het tweede geluid telt niet meer
    expect(sent()).toEqual(['composition_started', bucket]);
  });

  it('zonder gestarte soundscape telt een geluid niet (docent, presentatie)', () => {
    logFirstSound();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('de foutenteller telt een sessie met een fout één keer, zonder iets over de fout', () => {
    installErrorCounter();
    window.dispatchEvent(new ErrorEvent('error', { message: 'geheim detail', filename: '/pad/naar/bestand.js' }));
    window.dispatchEvent(new Event('unhandledrejection'));
    expect(sent()).toEqual(['client_error']);
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe('{"p_event":"client_error"}');
  });

  it('een mislukte afbeelding of geluid is geen fout', () => {
    installErrorCounter();
    window.dispatchEvent(new Event('error'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('events zijn echt aangesloten', () => {
  // Het gat dat hier dichtgaat: 8 van de 11 events stonden in de lijst maar
  // werden nergens verstuurd. Deze test faalt als dat weer gebeurt.
  const src = join(process.cwd(), 'src');
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === '__tests__' ? [] : files(join(dir, e.name))) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);
  const code = files(src).filter((f) => !f.endsWith('usageStats.ts')).map((f) => readFileSync(f, 'utf8')).join('\n');
  const helper = readFileSync(join(src, 'utils/usageStats.ts'), 'utf8');

  it.each([
    'app_start', 'composition_saved', 'composition_submitted', 'stage_reached', 'mp3_export', 'video_export',
    'share_link_created', 'save_code_created', 'class_code_entered', 'teacher_dashboard_opened',
  ])('%s wordt ergens verstuurd', (event) => {
    expect(code).toContain(`logUsageEvent('${event}')`);
  });

  it('start, eerste geluid en fouten lopen via hun helpers', () => {
    expect(code).toContain('logCompositionStarted()');
    expect(code).toContain('logFirstSound()');
    expect(code).toContain('installErrorCounter()');
  });

  it('elk event staat in de allowlist van de server (migratie 044) en heeft een label', () => {
    const events = [...helper.matchAll(/\| '([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(events).toHaveLength(15);
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/044_usage_events_errors_first_sound.sql'), 'utf8');
    const panel = readFileSync(join(src, 'components/teacher/UsageStatsPanel.tsx'), 'utf8');
    const nl = JSON.parse(readFileSync(join(src, 'i18n/locales/nl.json'), 'utf8')).teacher.stats.events;
    const en = JSON.parse(readFileSync(join(src, 'i18n/locales/en.json'), 'utf8')).teacher.stats.events;
    for (const e of events) {
      expect(migration, e).toContain(`'${e}'`);
      expect(panel, e).toContain(`'${e}'`);
      expect(nl[e], e).toBeTruthy();
      expect(en[e], e).toBeTruthy();
    }
  });
});
