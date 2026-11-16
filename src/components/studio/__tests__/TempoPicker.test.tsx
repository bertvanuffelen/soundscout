/**
 * V2 Fase 4 — tempo-keuze: roept setBpm aan, ligt vast bij een opdracht met
 * vergrendelde clips.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../../i18n';
import { TempoPicker } from '../TempoPicker';
import { useTimelineStore } from '../../../stores/timelineStore';
import { useAppStore } from '../../../stores/appStore';
import type { Template } from '../../../types';

describe('TempoPicker', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetTimeline();
    useAppStore.getState().clearTemplate();
  });

  it('toont het tempo en zet een nieuw tempo met setBpm', () => {
    render(<TempoPicker />);
    const button = screen.getByTestId('tempo-button');
    expect(button).toHaveTextContent('120');
    fireEvent.click(button);
    const options = screen.getAllByRole('menuitemradio');
    expect(options).toHaveLength(4);
    expect(options[2]).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(options[0]); // traag · 90
    expect(useTimelineStore.getState().bpm).toBe(90);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByTestId('tempo-button')).toHaveTextContent('90');
  });

  it('ligt vast bij een opdracht met vergrendelde opdracht-clips', () => {
    useAppStore.getState().loadTemplate({
      id: 't', name: 'Opdracht', code: 'X',
      lockOptions: { clipsLocked: true, sectionsLocked: false, libraryLocked: false, allowNewClips: true },
    } as unknown as Template);
    useTimelineStore.setState((s) => ({
      tracks: s.tracks.map((t, i) => (i === 0 ? { ...t, clips: [{ id: 'c', sampleId: 's', startBeat: 0, fromTemplate: true }] } : t)),
    }));
    render(<TempoPicker />);
    expect(screen.getByTestId('tempo-button')).toBeDisabled();
  });

  it('is vrij bij een opdracht zonder vergrendelde clips', () => {
    useAppStore.getState().loadTemplate({
      id: 't', name: 'Opdracht', code: 'X',
      lockOptions: { clipsLocked: false, sectionsLocked: false, libraryLocked: false, allowNewClips: true },
    } as unknown as Template);
    render(<TempoPicker />);
    expect(screen.getByTestId('tempo-button')).not.toBeDisabled();
  });
});
