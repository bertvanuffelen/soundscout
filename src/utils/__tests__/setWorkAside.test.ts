/**
 * "Ik ben iemand anders" (mockup B3): het werk van het vorige kind gaat van
 * het werkblad, maar een soundscape wordt nooit weggegooid.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setWorkAside } from '../finishSession';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { storageService } from '../../services/StorageService';
import type { Sample } from '../../types';

const dog: Sample = { id: 'dog', name: 'Hond', locationId: 'boerderij', audioUrl: '/a.mp3', duration: 2, icon: 'Dog', color: '#FF9800' };

describe('setWorkAside', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useTimelineStore.getState().resetTimeline();
    useLibraryStore.setState({ librarySamples: [dog] });
    useAppStore.setState({ currentCompositionId: null, compositionTitle: '', classSession: null, submissionId: null });
    vi.restoreAllMocks();
  });

  it('bewaart een soundscape bij "Mijn soundscapes" en maakt het werkblad leeg', () => {
    useTimelineStore.getState().addClip(0, { id: 'c1', sampleId: 'dog', startBeat: 0 }, [dog]);
    useAppStore.setState({ compositionTitle: 'Boerderij van Sem' });
    const save = vi.spyOn(storageService, 'saveComposition').mockReturnValue(null);

    setWorkAside();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBe('Boerderij van Sem');
    expect(save.mock.calls[0][1].tracks.flatMap((t) => t.clips)).toHaveLength(1);
    expect(useTimelineStore.getState().selectHasClips()).toBe(false);
    expect(useLibraryStore.getState().librarySamples).toHaveLength(0);
    expect(sessionStorage.getItem('soundscout:sitting')).toBe('1');
  });

  it('werkt een al bewaarde soundscape bij in plaats van een tweede te maken', () => {
    useTimelineStore.getState().addClip(0, { id: 'c1', sampleId: 'dog', startBeat: 0 }, [dog]);
    useAppStore.setState({ currentCompositionId: 'comp-1' });
    vi.spyOn(storageService, 'getCompositionById').mockReturnValue({ id: 'comp-1' } as never);
    const update = vi.spyOn(storageService, 'updateComposition').mockReturnValue(null);
    const save = vi.spyOn(storageService, 'saveComposition').mockReturnValue(null);

    setWorkAside();

    expect(update).toHaveBeenCalledWith('comp-1', expect.objectContaining({ samples: [dog] }));
    expect(save).not.toHaveBeenCalled();
  });

  it('alleen verzamelde geluiden (geen soundscape) worden niet bewaard', () => {
    const save = vi.spyOn(storageService, 'saveComposition').mockReturnValue(null);
    setWorkAside();
    expect(save).not.toHaveBeenCalled();
    expect(useLibraryStore.getState().librarySamples).toHaveLength(0);
  });
});
