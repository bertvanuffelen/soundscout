/**
 * Opslaan op het podium (AUD-08): twee keer opslaan = één compositie, niet
 * twee kopieën (en bij de 11e geen stil gewiste oudste).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageSave } from '../useStageSave';
import { useAppStore } from '../../stores/appStore';
import { storageService } from '../../services/StorageService';

describe('useStageSave', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('soundscout:hideSaveWarning', 'true');
    useAppStore.setState({ currentCompositionId: null, classSession: null, submissionId: null });
  });

  it('maakt bij herhaald opslaan geen nieuwe kopie', () => {
    const { result } = renderHook(() => useStageSave());

    act(() => result.current.setCompositionName('Mijn muziek'));
    act(() => result.current.saveLocal());
    expect(storageService.getCompositions()).toHaveLength(1);
    const id = useAppStore.getState().currentCompositionId;
    expect(id).toBe(storageService.getCompositions()[0].id);

    act(() => result.current.setCompositionName('Mijn muziek v2'));
    act(() => result.current.saveLocal());
    const saved = storageService.getCompositions();
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(id);
    expect(saved[0].name).toBe('Mijn muziek v2');
  });

  it('kiest een titel als de leerling er geen typte (v4)', () => {
    const { result } = renderHook(() => useStageSave());
    act(() => result.current.saveLocal());
    const saved = storageService.getCompositions();
    expect(saved).toHaveLength(1);
    expect(saved[0].name.trim().length).toBeGreaterThan(0);
    expect(result.current.compositionName).toBe(saved[0].name);
  });
});
