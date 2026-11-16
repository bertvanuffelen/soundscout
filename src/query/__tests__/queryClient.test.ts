/**
 * QueryClient-standaarden: wanneer een mislukte query het nog eens probeert
 * (alleen bij een herkenbaar tijdelijke storing) en wanneer zeker niet.
 */
import { describe, it, expect } from 'vitest';
import {
  QUERY_MAX_RETRIES,
  QUERY_STALE_TIME_MS,
  createQueryClient,
  isTransientError,
  shouldRetryQuery,
} from '../queryClient';
import { queryKeys } from '../queryKeys';
import { ERR_RATE_LIMIT, ERR_CLASS_NOT_FOUND, ERR_NOT_ACTIVE } from '../../lib/supabaseErrors';
import { AssignmentLookupError } from '../../lib/assignments';
import { SubmissionForbiddenError } from '../../lib/submissions';
import { PeerFeedbackError } from '../../lib/peerFeedback';
import { TimeoutError } from '../../utils/withTimeout';

describe('isTransientError', () => {
  it.each([
    ['fetch-fout van de browser', new TypeError('Failed to fetch')],
    ['supabase-js met de fetch-tekst in message', { message: 'TypeError: Failed to fetch', code: '' }],
    ['Firefox', { message: 'NetworkError when attempting to fetch resource.' }],
    ['Safari', new TypeError('Load failed')],
    ['server 503', { message: 'Service Unavailable', status: 503 }],
    ['auth-netwerkfout', { name: 'AuthRetryableFetchError', message: 'x', status: 0 }],
  ])('tijdelijk: %s', (_label, error) => {
    expect(isTransientError(error)).toBe(true);
  });

  it.each([
    ['rate limit (RPC)', new Error(`${ERR_RATE_LIMIT} for submit`)],
    ['rate limit (auth)', new Error('email rate limit exceeded')],
    ['klascode niet gevonden', new Error(`Klas ${ERR_CLASS_NOT_FOUND}`)],
    ['opdracht niet actief', new Error(`Opdracht ${ERR_NOT_ACTIVE}`)],
    ['rechten (RLS)', { message: 'new row violates row-level security policy', code: '42501' }],
    ['permission denied', { message: 'permission denied for table classes', code: '42501' }],
    ['verlopen sessie', { message: 'JWT expired', code: 'PGRST301' }],
    ['geen rij', { message: 'Results contain 0 rows', code: 'PGRST116' }],
    ['401', { message: 'Unauthorized', status: 401 }],
    ['403', { message: 'Forbidden', status: 403 }],
    ['404', { message: 'Not Found', status: 404 }],
    ['429', { message: 'Too Many Requests', status: 429 }],
    ['time-out (15 s gewacht)', new TimeoutError('errors.networkTimeout')],
    ['AssignmentLookupError', new AssignmentLookupError('busy')],
    ['SubmissionForbiddenError', new SubmissionForbiddenError()],
    ['PeerFeedbackError', new PeerFeedbackError('Te snel', 'rateLimit')],
    ['al vertaalde melding uit src/lib', new Error('Kon templates niet laden')],
    ['geen foutobject', 'kapot'],
    ['null', null],
  ])('niet opnieuw: %s', (_label, error) => {
    expect(isTransientError(error)).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it(`probeert een netwerkfout hooguit ${QUERY_MAX_RETRIES} keer opnieuw`, () => {
    const error = new TypeError('Failed to fetch');
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(QUERY_MAX_RETRIES - 1, error)).toBe(true);
    expect(shouldRetryQuery(QUERY_MAX_RETRIES, error)).toBe(false);
  });

  it('probeert een rechtenfout nooit opnieuw', () => {
    expect(shouldRetryQuery(0, { message: 'permission denied', code: '42501' })).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('heeft de afgesproken standaarden', () => {
    const { queries, mutations } = createQueryClient().getDefaultOptions();
    expect(queries?.staleTime).toBe(QUERY_STALE_TIME_MS);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.refetchOnReconnect).toBe(false);
    expect(queries?.networkMode).toBe('always');
    expect(queries?.retry).toBe(shouldRetryQuery);
    expect(mutations?.retry).toBe(false);
    expect(mutations?.networkMode).toBe('always');
  });
});

describe('queryKeys', () => {
  it('zet de docent-id in elke docent-sleutel', () => {
    const keys = [
      queryKeys.teacher.classes('a'),
      queryKeys.teacher.templates('a'),
      queryKeys.teacher.assignmentCards('a'),
      queryKeys.teacher.lessonCards('a'),
      queryKeys.teacher.praatplaten('a'),
      queryKeys.teacher.praatplaten('a', 'c1'),
      queryKeys.teacher.submissions('a', 'c1'),
      queryKeys.teacher.classAssignment('a', 'c1'),
    ];
    for (const key of keys) expect(key.slice(0, 2)).toEqual(['teacher', 'a']);
    expect(new Set(keys.map((k) => JSON.stringify(k))).size).toBe(keys.length);
  });

  it('hangt klasdata onder de klas-prefix', () => {
    const prefix = queryKeys.teacher.class('a', 'c1');
    expect(queryKeys.teacher.submissions('a', 'c1').slice(0, prefix.length)).toEqual([...prefix]);
    expect(queryKeys.teacher.classAssignment('a', 'c1').slice(0, prefix.length)).toEqual([...prefix]);
  });
});
