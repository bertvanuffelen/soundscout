/**
 * De ene QueryClient van SoundScout (V2 Fase 2, voorstel §2.6).
 *
 * Standaarden, en waarom:
 *
 *  - staleTime 5 s — bewust kort. Het ontdubbelt de golf van gelijktijdige
 *    mounts (dashboard + modals vragen dezelfde lijst), maar een scherm dat
 *    je opnieuw opent haalt nog steeds verse data, net als vóór TanStack
 *    Query. Langer kan pas als álle schrijfacties via mutaties lopen: nu
 *    schrijven o.a. SaveAsTemplateModal en ActivateLessonCardModal nog direct
 *    via src/lib, buiten de cache om.
 *  - gcTime 5 min (standaard) — terug naar het dashboard toont meteen de
 *    vorige lijst en ververst op de achtergrond, i.p.v. eerst "Laden…".
 *  - refetchOnWindowFocus uit — een docent wisselt de hele les tussen
 *    tabbladen (digibord, mail, leerlingvolgsysteem); elke wissel een salvo
 *    verzoeken is zinloos en kost rate-limit-budget.
 *  - refetchOnReconnect uit — zelfde reden; verversen gebeurt bij openen,
 *    met de ververs-knop en via de polling tijdens presenteren.
 *  - networkMode 'always' — Query pauzeert standaard zodra de browser
 *    "offline" meldt; dan blijft een scherm eindeloos laden. Wij willen het
 *    oude gedrag: het verzoek mislukt en de docent ziet de foutmelding met
 *    "opnieuw proberen".
 *  - retry: hooguit 2 keer, en alléén bij een herkenbaar tijdelijke storing
 *    (netwerk weg, 5xx). Nooit bij inlog-/rechtenfouten, rate limits,
 *    "niet gevonden", time-outs of al vertaalde meldingen — zie
 *    `isTransientError`.
 *  - mutaties: nooit automatisch opnieuw (een aanmaak-actie twee keer
 *    uitvoeren is erger dan een foutmelding).
 */

import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import {
  ERR_RATE_LIMIT,
  ERR_AUTH_RATE_LIMIT,
  ERR_CLASS_NOT_FOUND,
  ERR_NOT_ACTIVE,
  ERR_INVALID_SAVE_CODE,
  ERR_SUBMISSION_FORBIDDEN,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_EMAIL_NOT_CONFIRMED,
} from '../lib/supabaseErrors';

export const QUERY_STALE_TIME_MS = 5_000;
export const QUERY_MAX_RETRIES = 2;

/** Berichtpatronen die nooit vanzelf goedkomen door het nog eens te proberen */
const PERMANENT_MESSAGE_PATTERNS = [
  ERR_RATE_LIMIT,
  ERR_AUTH_RATE_LIMIT,
  ERR_CLASS_NOT_FOUND,
  ERR_NOT_ACTIVE,
  ERR_INVALID_SAVE_CODE,
  ERR_SUBMISSION_FORBIDDEN,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_EMAIL_NOT_CONFIRMED,
  'JWT',
  'permission denied',
  'row-level security',
];

/** Namen van de getypeerde fouten uit src/lib en utils (bewust op naam: geen import-keten naar Supabase) */
const PERMANENT_ERROR_NAMES = new Set([
  'TimeoutError',
  'AssignmentLookupError',
  'SubmissionForbiddenError',
  'PeerFeedbackError',
  'AuthApiError',
  'AuthSessionMissingError',
]);

/** PostgREST/Postgres-codes voor rechten, verlopen sessie en "geen rij" */
const PERMANENT_CODES = new Set(['42501', 'PGRST301', 'PGRST302', 'PGRST116', '23505', '23503']);

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
}

/**
 * Is dit een storing die vanzelf kan overgaan (netwerk weg, server even
 * onbereikbaar)? Alleen dan mag een query het opnieuw proberen.
 *
 * Witte lijst i.p.v. zwarte: de functies in src/lib vertalen de meeste
 * Supabase-fouten naar een gebruikersmelding (`new Error(i18n.t(...))`),
 * waardoor de oorzaak niet meer te zien is. Bij twijfel dus NIET opnieuw
 * proberen — dan is het gedrag exact als vóór TanStack Query.
 */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as ErrorLike;
  const name = typeof e.name === 'string' ? e.name : '';
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';
  const status = typeof e.status === 'number' ? e.status : null;

  if (PERMANENT_ERROR_NAMES.has(name)) return false;
  if (PERMANENT_CODES.has(code)) return false;
  if (PERMANENT_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))) return false;
  if (status !== null) return status >= 500 || status === 0;

  // fetch() faalt met een TypeError; supabase-js geeft die tekst door in `message`
  return (
    name === 'AuthRetryableFetchError' ||
    /Failed to fetch|NetworkError|Load failed|network request failed|fetch failed/i.test(message)
  );
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < QUERY_MAX_RETRIES && isTransientError(error);
}

export const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: 'always',
    retry: shouldRetryQuery,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 4_000),
  },
  mutations: {
    networkMode: 'always',
    retry: false,
  },
};

export function createQueryClient(overrides: DefaultOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { ...defaultQueryOptions.queries, ...overrides.queries },
      mutations: { ...defaultQueryOptions.mutations, ...overrides.mutations },
    },
  });
}

/** De app-brede instantie; in tests maak je er per test één met createQueryClient(). */
export const queryClient = createQueryClient();
