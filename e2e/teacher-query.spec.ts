/**
 * Docentendashboard op TanStack Query (V2 Fase 2) — tegen een nep-Supabase.
 *
 * Er is geen testbackend: alle verzoeken naar /__e2e-supabase/ worden
 * onderschept (zie playwright.config.ts). Inloggen gaat via het echte
 * formulier; het token-verzoek krijgt een nepsessie terug. Wat hier NIET
 * wordt getest: echte rechten (RLS), echte sessies en de database zelf.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { prepare } from './helpers';

interface ClassRow {
  id: string;
  name: string;
  code: string;
  created_at: string;
  is_active: boolean;
  teacher_id: string;
}

interface Backend {
  /** Klassen per docent-id */
  classes: Record<string, ClassRow[]>;
  /** Welke docent logt er in bij het volgende token-verzoek */
  loginAs: string;
  /** Laat het aanmaken van een klas mislukken */
  failInsert: boolean;
  /** Aantal keer dat de klassenlijst is opgevraagd */
  classListRequests: number;
}

const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

function fakeSession(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: userId, aud: 'authenticated', role: 'authenticated', email: `${userId}@example.test`,
    app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  };
  const accessToken = [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now }),
    'e2e-signature',
  ].join('.');
  return {
    access_token: accessToken, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
    refresh_token: `refresh-${userId}`, user,
  };
}

/** De docent-id uit het Authorization-token van een verzoek. */
function userIdOf(route: Route): string | null {
  const token = (route.request().headers().authorization ?? '').replace(/^Bearer /, '');
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return (JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

async function mockTeacherBackend(page: Page, backend: Backend): Promise<void> {
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(/\/__e2e-supabase\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/__e2e-supabase/, '');
    const method = request.method();
    const userId = userIdOf(route);

    // --- Auth ---
    if (path === '/auth/v1/token') return json(route, fakeSession(backend.loginAs));
    if (path === '/auth/v1/user') {
      return userId ? json(route, fakeSession(userId).user) : json(route, { message: 'no session' }, 401);
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });

    // --- Tabellen ---
    if (path === '/rest/v1/teachers') return json(route, { max_classes: 8 });
    if (path === '/rest/v1/classes' && method === 'GET') {
      backend.classListRequests += 1;
      const rows = (userId && backend.classes[userId]) || [];
      return json(route, rows.map((row) => ({ ...row, submissions: [{ count: 0 }] })));
    }
    if (path === '/rest/v1/classes' && method === 'POST') {
      if (backend.failInsert || !userId) {
        return json(route, { message: 'e2e: opslaan geweigerd', code: '42501', details: null, hint: null }, 403);
      }
      const body = request.postDataJSON() as { name: string; code: string };
      const row: ClassRow = {
        id: `class-${Date.now()}`, name: body.name, code: body.code,
        created_at: new Date().toISOString(), is_active: true, teacher_id: userId,
      };
      backend.classes[userId] = [row, ...(backend.classes[userId] ?? [])];
      return json(route, row, 201);
    }
    if (path === '/rest/v1/rpc/generate_class_code') return json(route, '4821');

    // Al het andere (templates, opdrachtkaarten, tellers …): leeg
    return json(route, []);
  });
}

function newBackend(): Backend {
  return {
    classes: {
      'teacher-a': [
        { id: 'a1', name: 'Groep 5 van A', code: '1111', created_at: '2026-11-01T09:00:00Z', is_active: true, teacher_id: 'teacher-a' },
        { id: 'a2', name: 'Groep 6 van A', code: '2222', created_at: '2026-10-01T09:00:00Z', is_active: true, teacher_id: 'teacher-a' },
      ],
      'teacher-b': [
        { id: 'b1', name: 'Groep 7 van B', code: '3333', created_at: '2026-11-01T09:00:00Z', is_active: true, teacher_id: 'teacher-b' },
      ],
    },
    loginAs: 'teacher-a',
    failInsert: false,
    classListRequests: 0,
  };
}

async function login(page: Page): Promise<void> {
  await page.getByLabel('E-mailadres').fill('docent@example.test');
  await page.getByLabel('Wachtwoord').fill('e2e-wachtwoord');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
}

async function createClass(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Nieuwe klas', exact: true }).click();
  await page.getByLabel('Klasnaam').fill(name);
  await page.getByRole('button', { name: 'Maak klas en kies een opdracht', exact: true }).click();
}

let backend: Backend;

test.beforeEach(async ({ page }) => {
  backend = newBackend();
  await prepare(page);
  await mockTeacherBackend(page, backend);
  await page.goto('/docent');
});

test('na inloggen staan de klassen van de docent in het dashboard', async ({ page }) => {
  await login(page);

  await expect(page.getByText('Groep 5 van A')).toBeVisible();
  await expect(page.getByText('Groep 6 van A')).toBeVisible();
  await expect(page.getByText('Groep 7 van B')).toHaveCount(0);
});

test('een nieuwe klas staat er meteen, zonder de lijst opnieuw op te halen', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Groep 5 van A')).toBeVisible();
  const requestsBefore = backend.classListRequests;

  await createClass(page, 'Groep 8 nieuw');

  // Docentenportaal: na aanmaken opent meteen de opdrachtwizard voor de nieuwe klas
  await expect(page.getByText('Groep 8 nieuw').first()).toBeVisible();
  await expect(page.getByLabel('Klasnaam')).toHaveCount(0);
  // De klassenlijst in de cache is bijgewerkt (nieuwe klas bovenaan), zonder
  // de lijst opnieuw op te halen
  const cachedNames = await page.evaluate(async () => {
    const { queryClient } = await import('/src/query/queryClient.ts');
    const query = queryClient.getQueryCache().getAll()
      .find((q) => JSON.stringify(q.queryKey).endsWith('"classes"]'));
    const data = query?.state.data as { classes: { name: string }[] } | undefined;
    return data?.classes.map((c) => c.name) ?? [];
  });
  expect(cachedNames[0]).toBe('Groep 8 nieuw');
  expect(cachedNames).toContain('Groep 5 van A');
  expect(backend.classListRequests).toBe(requestsBefore);
});

test('mislukt het aanmaken, dan blijft de lijst zoals hij was en staat de bestaande foutmelding er', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Groep 5 van A')).toBeVisible();
  backend.failInsert = true;

  await createClass(page, 'Groep 8 mislukt');

  await expect(page.getByText(/Kon klas niet aanmaken: e2e: opslaan geweigerd/)).toBeVisible();
  await expect(page.getByText('Groep 5 van A')).toBeAttached();
  await expect(page.getByText('Groep 6 van A')).toBeAttached();
  // De mislukte klas staat nergens in de lijst (alleen nog in het invulveld)
  await expect(page.getByRole('listitem').filter({ hasText: 'Groep 8 mislukt' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Groep 8 mislukt/ })).toHaveCount(0);
});

test('na uitloggen en inloggen als een andere docent is er niets van de vorige te zien', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Groep 5 van A')).toBeVisible();

  await page.getByRole('button', { name: /Uitloggen/ }).click();
  await expect(page.getByLabel('E-mailadres')).toBeVisible();
  await expect(page.getByText('Groep 5 van A')).toHaveCount(0);

  // Niets van docent A meer in de query-cache
  const leftovers = await page.evaluate(async () => {
    const { queryClient } = await import('/src/query/queryClient.ts');
    return queryClient.getQueryCache().getAll()
      .map((query) => JSON.stringify(query.queryKey))
      .filter((key) => key.includes('teacher-a'));
  });
  expect(leftovers).toEqual([]);

  backend.loginAs = 'teacher-b';
  const seenA: string[] = [];
  await page.exposeFunction('__e2eSawA', (text: string) => { seenA.push(text); });
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.body.innerText.includes('van A')) void (window as unknown as { __e2eSawA: (t: string) => void }).__e2eSawA('van A');
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await login(page);

  await expect(page.getByText('Groep 7 van B')).toBeVisible();
  await expect(page.getByText('Groep 5 van A')).toHaveCount(0);
  expect(seenA).toEqual([]);
});
