/**
 * Beheerdashboard /beheer (V2 Fase 3, docs/v2/ADMIN-DASHBOARD.md) en de
 * leerlingkant van in Supabase gepubliceerde thema's — tegen een nep-Supabase.
 *
 * Alle verzoeken naar /__e2e-supabase/ worden onderschept (zie
 * playwright.config.ts en e2e/teacher-query.spec.ts). Wat hier NIET wordt
 * getest: echte RLS, echte Storage-policies, echte sessies; daarvoor is er
 * `npm run test:db` (PGlite) en de checklist in ADMIN-DASHBOARD.md.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Route } from '@playwright/test';
import { prepare } from './helpers';
// @ts-expect-error -- gewoon JS-hulpscript (geen typen)
import { makeManifest, makePng } from './fixtures/make-theme-pack.mjs';

const START_BUTTON = 'Nieuwe soundscape';
const PACK = 'e2e/fixtures/e2e-pakket.sspack';
const PNG = makePng(1920, 1080) as Buffer;

interface Backend {
  isAdmin: boolean | 'missing';
  themes: Array<Record<string, unknown>>;
  versions: Array<Record<string, unknown>>;
  published: Array<Record<string, unknown>> | 'error';
  uploads: string[];
  versionInserts: Array<Record<string, unknown>>;
  rpcCalls: Array<{ name: string; body: unknown }>;
}

const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

function fakeSession(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: `${userId}@example.test`, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const accessToken = [b64url({ alg: 'HS256', typ: 'JWT' }), b64url({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now }), 'e2e-signature'].join('.');
  return { access_token: accessToken, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: `refresh-${userId}`, user };
}

/** Een thema uit het dashboard: v1 gepubliceerd, v2 concept (zelfde fixture-manifest, geen fouten). */
function kerstBackend(): Pick<Backend, 'themes' | 'versions'> {
  const m = (version: number) => ({ ...makeManifest('kerst'), version, texts: { ...makeManifest('kerst').texts, nl: { ...makeManifest('kerst').texts.nl, name: 'Kerst' } } });
  return {
    themes: [{ id: 'kerst', status: 'published', is_public: true, season_from: null, season_until: null, sort: 5, published_version: 1, updated_at: '2026-11-10T00:00:00Z' }],
    versions: [
      { theme_id: 'kerst', version: 1, manifest: m(1), created_at: '2026-11-01T00:00:00Z', published_at: '2026-11-02T00:00:00Z' },
      { theme_id: 'kerst', version: 2, manifest: m(2), created_at: '2026-11-09T00:00:00Z', published_at: null },
    ],
  };
}

function newBackend(overrides: Partial<Backend> = {}): Backend {
  return { isAdmin: true, ...kerstBackend(), published: [], uploads: [], versionInserts: [], rpcCalls: [], ...overrides };
}

async function mockBackend(page: Page, backend: Backend): Promise<void> {
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route(/\/__e2e-supabase\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/__e2e-supabase/, '');
    const method = request.method();

    if (path === '/auth/v1/token') return json(route, fakeSession('beheerder'));
    if (path === '/auth/v1/user') return json(route, fakeSession('beheerder').user);
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });

    if (path === '/rest/v1/rpc/is_admin') {
      if (backend.isAdmin === 'missing') return json(route, { code: 'PGRST202', message: 'Could not find the function public.is_admin without parameters in the schema cache' }, 404);
      return json(route, backend.isAdmin);
    }
    if (path.startsWith('/rest/v1/rpc/publish_theme_version') || path.startsWith('/rest/v1/rpc/rollback_theme')) {
      const body = request.postDataJSON() as { p_theme_id: string; p_version: number };
      backend.rpcCalls.push({ name: path.split('/').pop()!, body });
      const theme = backend.themes.find((t) => t.id === body.p_theme_id);
      const version = backend.versions.find((v) => v.theme_id === body.p_theme_id && v.version === body.p_version);
      if (theme) theme.published_version = body.p_version;
      if (theme) theme.status = 'published';
      if (version) version.published_at = new Date().toISOString();
      return json(route, { theme_id: body.p_theme_id, version: body.p_version });
    }

    if (path === '/rest/v1/published_themes') {
      if (backend.published === 'error') return json(route, { message: 'e2e: database plat' }, 503);
      return json(route, backend.published);
    }

    if (path === '/rest/v1/themes' && method === 'GET') {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      return json(route, id ? backend.themes.filter((t) => t.id === id) : backend.themes);
    }
    if (path === '/rest/v1/themes' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      backend.themes.push({ status: 'draft', is_public: false, season_from: null, season_until: null, sort: null, published_version: null, updated_at: new Date().toISOString(), ...body });
      return route.fulfill({ status: 201, body: '' });
    }
    if (path === '/rest/v1/themes' && method === 'PATCH') return route.fulfill({ status: 204, body: '' });

    if (path === '/rest/v1/theme_versions' && method === 'GET') {
      const id = url.searchParams.get('theme_id')?.replace(/^eq\./, '');
      const rows = id ? backend.versions.filter((v) => v.theme_id === id) : backend.versions;
      if (url.searchParams.get('select') === 'version') return json(route, [...rows].sort((a, b) => Number(b.version) - Number(a.version)).slice(0, 1).map((r) => ({ version: r.version })));
      return json(route, rows);
    }
    if (path === '/rest/v1/theme_versions' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      backend.versionInserts.push(body);
      backend.versions.push({ ...body, created_at: new Date().toISOString(), published_at: null });
      return route.fulfill({ status: 201, body: '' });
    }
    if (path === '/rest/v1/theme_assets') return route.fulfill({ status: 201, body: '' });

    if (path.startsWith('/storage/v1/object/public/themes/')) {
      return route.fulfill({ status: 200, contentType: path.endsWith('.png') ? 'image/png' : 'application/octet-stream', body: path.endsWith('.png') ? PNG : Buffer.alloc(0) });
    }
    if (path.startsWith('/storage/v1/object/themes/') && method === 'POST') {
      backend.uploads.push(path.replace('/storage/v1/object/themes/', ''));
      return json(route, { Key: path });
    }
    return json(route, []);
  });
}

async function login(page: Page): Promise<void> {
  await page.getByLabel('E-mailadres').fill('beheer@example.test');
  await page.getByLabel('Wachtwoord').fill('e2e-wachtwoord');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
}

test.describe('/beheer', () => {
  test('een docent zonder beheerdersrecht ziet "Geen toegang"', async ({ page }) => {
    await prepare(page);
    await mockBackend(page, newBackend({ isAdmin: false }));
    await page.goto('/beheer');
    await login(page);
    await expect(page.getByRole('heading', { name: 'Geen toegang' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Beheer-onderdelen' })).toHaveCount(0);
  });

  test('een beheerder ziet de thema-lijst: database-thema\'s en de ingebouwde', async ({ page }) => {
    await prepare(page);
    await mockBackend(page, newBackend());
    await page.goto('/beheer');
    await login(page);
    const list = page.getByRole('list', { name: "Thema's" });
    await expect(list.locator('[data-theme-id="kerst"]')).toContainText('Kerst');
    await expect(list.locator('[data-theme-id="kerst"]')).toContainText('Gepubliceerd');
    for (const id of ['basis', 'winterspelen', 'piraten']) await expect(list.locator(`[data-theme-id="${id}"]`)).toContainText('Ingebouwd');
    // basis heeft bekende afstandsfouten (docs/v2/THEMES.md §2): die worden geteld
    await expect(list.locator('[data-theme-id="basis"]')).toContainText('3 fouten');
  });

  test('hotspot buiten de veilige zone slepen: fout zichtbaar, publiceren uit', async ({ page }) => {
    await prepare(page);
    await mockBackend(page, newBackend());
    await page.goto('/beheer');
    await login(page);
    await page.locator('[data-theme-id="kerst"]').getByRole('button', { name: /^Kerst Hele jaar/ }).click();
    await page.getByRole('button', { name: 'Open in editor' }).click();

    const publish = page.getByRole('button', { name: 'Publiceren', exact: true });
    await expect(page.getByRole('heading', { name: 'Editor · Kerst' })).toBeVisible();
    await expect(publish).toBeEnabled();

    const scene = page.getByTestId('hotspot-scene');
    const hotspot = page.locator('[data-hotspot-id="plein-toon"]');
    const box = (await scene.boundingBox())!;
    const spot = (await hotspot.boundingBox())!;
    await page.mouse.move(spot.x + spot.width / 2, spot.y + spot.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.95, { steps: 8 });
    await page.mouse.up();

    await expect(hotspot).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-rule="hotspot-safe-zone"][data-severity="error"]')).toBeVisible();
    await expect(page.getByText('Hotspot buiten de veilige zone').first()).toBeVisible();
    await expect(publish).toBeDisabled();
    await expect(page.getByTestId('publish-reason')).toContainText('Los eerst 1 punten op');

    // Met het toetsenbord terug de veilige zone in: publiceren mag pas na bewaren
    await hotspot.focus();
    for (let i = 0; i < 2; i++) await page.keyboard.press('Shift+ArrowUp');
    await expect(hotspot).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('publish-reason')).toContainText('Bewaar eerst het concept');
  });

  test('een klein geldig themapakket importeren → concept bewaard → publiceren roept de RPC aan', async ({ page }) => {
    const backend = newBackend();
    await prepare(page);
    await mockBackend(page, backend);
    await page.goto('/beheer');
    await login(page);
    await page.getByRole('navigation', { name: 'Beheer-onderdelen' }).getByRole('button', { name: 'Importeren' }).click();
    await page.getByTestId('pack-zip-input').setInputFiles({ name: 'e2e-pakket.sspack', mimeType: 'application/zip', buffer: readFileSync(PACK) });

    await expect(page.getByTestId('import-summary')).toHaveText('3 bestanden · 0 fouten · 0 waarschuwingen');
    await expect(page.getByText('Rapport uit het pakket (alleen ter info)')).toBeVisible();
    await page.getByRole('button', { name: 'Maak concept', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Editor · E2E-pakket' })).toBeVisible();
    await page.getByRole('button', { name: 'Concept bewaren' }).click();
    await expect(page.getByText('Concept bewaard als v1')).toBeVisible();

    expect(backend.uploads.sort()).toEqual(['e2e-pakket/v1/audio/plein-toon.wav', 'e2e-pakket/v1/images/plattegrond.png', 'e2e-pakket/v1/images/plein.png']);
    expect(backend.versionInserts).toHaveLength(1);
    expect(backend.versionInserts[0]).toMatchObject({ theme_id: 'e2e-pakket', version: 1, manifest: { id: 'e2e-pakket', version: 1, status: 'draft' } });

    // Het concept staat nu in de lijst
    await page.getByRole('navigation', { name: 'Beheer-onderdelen' }).getByRole('button', { name: "Thema's" }).click();
    await expect(page.locator('[data-theme-id="e2e-pakket"]')).toContainText('Concept');

    await page.getByRole('navigation', { name: 'Beheer-onderdelen' }).getByRole('button', { name: 'Editor' }).click();
    await page.getByRole('button', { name: 'Publiceren', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publiceren' }).click();
    await expect(page.getByText('Versie 1 is gepubliceerd')).toBeVisible();
    expect(backend.rpcCalls).toEqual([{ name: 'publish_theme_version', body: { p_theme_id: 'e2e-pakket', p_version: 1 } }]);
  });
});

test('"Bekijk als leerling" opent het concept alleen in dit tabblad, zonder te publiceren', async ({ page, context }) => {
  const backend = newBackend();
  await prepare(page);
  await mockBackend(page, backend);
  await page.goto('/beheer');
  await login(page);
  await page.locator('[data-theme-id="kerst"]').getByRole('button', { name: /^Kerst Hele jaar/ }).click();
  await page.getByRole('button', { name: 'Bekijk als leerling' }).click();

  await expect(page).toHaveURL(/\/\?theme=kerst$/);
  await expect(page.getByRole('status').filter({ hasText: 'Voorbeeld van een concept' })).toContainText('Kerst (v2)');
  const version = await page.evaluate(async () => {
    const { getThemeSummary } = await import('/src/themes/registry.ts');
    return getThemeSummary('kerst')?.version;
  });
  expect(version).toBe(2);
  expect(backend.rpcCalls).toEqual([]);

  // Een ander tabblad ziet het concept niet
  const other = await context.newPage();
  await prepare(other);
  await mockBackend(other, backend);
  await other.goto('/?theme=kerst');
  await expect(other.getByRole('button', { name: START_BUTTON })).toBeVisible();
  await expect(other.getByText('Voorbeeld van een concept')).toHaveCount(0);

  await page.getByRole('button', { name: 'Voorbeeld stoppen' }).click();
  await expect(page.getByText('Voorbeeld van een concept')).toHaveCount(0);
});

test.describe('leerlingkant', () => {
  const published = (id: string) => ({
    id, status: 'published', is_public: true, season_from: null, season_until: null, sort: 1, version: 3,
    manifest: { ...makeManifest(id), version: 3, texts: { ...makeManifest(id).texts, nl: { ...makeManifest(id).texts.nl, name: 'Uit Supabase' } } },
  });

  test('een in Supabase gepubliceerd thema laadt via /?theme=<id>, met media uit de thema-bucket', async ({ page }) => {
    await prepare(page);
    await mockBackend(page, newBackend({ published: [published('e2e-pakket')] }));
    await page.goto('/?theme=e2e-pakket');
    await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
    const state = await page.evaluate(async () => {
      const { useThemeStore } = await import('/src/stores/themeStore.ts');
      const s = useThemeStore.getState();
      return { id: s.activeThemeId, image: s.theme?.locations[0].backgroundImage };
    });
    expect(state.id).toBe('e2e-pakket');
    expect(state.image).toMatch(/\/__e2e-supabase\/storage\/v1\/object\/public\/themes\/e2e-pakket\/v3\/images\/plein\.png$/);

    // En hij staat in de themakiezer
    await page.getByRole('button', { name: START_BUTTON }).click();
    await page.getByText('Hoe wil je componeren?').waitFor();
    await page.getByRole('button', { name: 'Volgende' }).click();
    await expect(page.getByRole('dialog').getByText('Uit Supabase')).toBeVisible();
  });

  test('met een kapotte backend laadt de app gewoon de statische thema\'s', async ({ page }) => {
    await prepare(page);
    await mockBackend(page, newBackend({ published: 'error' }));
    await page.goto('/?theme=winterspelen');
    await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
    expect(await page.evaluate(async () => (await import('/src/stores/themeStore.ts')).useThemeStore.getState().activeThemeId)).toBe('winterspelen');

    await page.goto('/?theme=e2e-pakket');
    await expect(page.getByRole('button', { name: START_BUTTON })).toBeVisible();
    expect(await page.evaluate(async () => (await import('/src/stores/themeStore.ts')).useThemeStore.getState().activeThemeId)).toBe('basis');
  });
});
