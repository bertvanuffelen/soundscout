/**
 * "Les afronden" op het leerlingapparaat (migratie 045): alleen opruimen als
 * de docent de les heeft afgerond ná het moment dat dit kind begon, en nooit
 * iets weggooien of breken als de server niet antwoordt.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../supabase', () => ({ getSupabase: async () => ({ rpc }) }));
const setWorkAside = vi.fn();
vi.mock('../../utils/finishSession', () => ({ setWorkAside: () => setWorkAside() }));

import { syncLessonState, consumeLessonEndedNotice, endLesson } from '../lessonState';
import { useAppStore } from '../../stores/appStore';

const T1 = '2026-11-17T10:00:00+00:00';
const T2 = '2026-11-17T10:45:00+00:00';
const inClass = (code = '4827') => useAppStore.setState({ currentScreen: 'studio', classSession: { classCode: code, className: 'Groep 6a', assignmentType: 'free' } as never });
const server = (value: string | null) => rpc.mockResolvedValueOnce({ data: value, error: null });

describe('syncLessonState', () => {
  beforeEach(() => {
    localStorage.clear();
    rpc.mockReset();
    setWorkAside.mockReset();
    consumeLessonEndedNotice();
    useAppStore.setState({ currentScreen: 'start', classSession: null });
  });

  it('doet niets zonder klas', async () => {
    expect(await syncLessonState()).toBe('skipped');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('eerste keer met deze klas: onthoudt het beginpunt en ruimt niets op', async () => {
    inClass();
    server(T1); // de les van vorige week was al afgerond
    expect(await syncLessonState()).toBe('baseline');
    expect(setWorkAside).not.toHaveBeenCalled();
    expect(useAppStore.getState().currentScreen).toBe('studio');
  });

  it('zelfde tijdstip als bij het begin: er gebeurt niets', async () => {
    inClass();
    server(T1); await syncLessonState();
    server(T1);
    expect(await syncLessonState()).toBe('unchanged');
    expect(setWorkAside).not.toHaveBeenCalled();
  });

  it('de docent rondt af: werk opzij, naar het startscherm, één melding', async () => {
    inClass();
    server(null); await syncLessonState();
    server(T2);
    expect(await syncLessonState()).toBe('ended');
    expect(setWorkAside).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().currentScreen).toBe('start');
    expect(consumeLessonEndedNotice()).toBe(true);
    expect(consumeLessonEndedNotice()).toBe(false);
    // daarna is dit het nieuwe beginpunt: niet nog eens opruimen
    inClass();
    server(T2);
    expect(await syncLessonState()).toBe('unchanged');
    expect(setWorkAside).toHaveBeenCalledTimes(1);
  });

  it('een andere klas op hetzelfde apparaat begint met een eigen beginpunt', async () => {
    inClass('4827'); server(T1); await syncLessonState();
    inClass('1111'); server(T2);
    expect(await syncLessonState()).toBe('baseline');
    expect(setWorkAside).not.toHaveBeenCalled();
  });

  it('offline of migratie nog niet gedraaid: niets opruimen', async () => {
    inClass();
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'function get_lesson_state does not exist' } });
    expect(await syncLessonState()).toBe('skipped');
    rpc.mockRejectedValueOnce(new Error('Failed to fetch'));
    expect(await syncLessonState()).toBe('skipped');
    expect(setWorkAside).not.toHaveBeenCalled();
  });
});

describe('endLesson', () => {
  beforeEach(() => { rpc.mockReset(); });

  it('roept de RPC aan met de klas en geeft het tijdstip terug', async () => {
    rpc.mockResolvedValueOnce({ data: T2, error: null });
    expect(await endLesson('class-1')).toBe(T2);
    expect(rpc).toHaveBeenCalledWith('end_lesson', { p_class_id: 'class-1' });
  });

  it('geeft een leesbare fout als het niet lukt', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'class_not_found' } });
    await expect(endLesson('class-1')).rejects.toThrow(/lukte niet|did not work/);
  });
});
