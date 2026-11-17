/**
 * V2-startscherm: elke functie van het oude startscherm moet blijven werken
 * in de nieuwe indeling (hoofdknoppen, wereldkiezer, verder-werken-strook,
 * seizoensknop, code-venster via link/doorverwijzing, waarschuwing bij werk).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import '../../i18n';
import i18n from '../../i18n';

// --- Mocks ---

const initializeNewComposition = vi.fn().mockResolvedValue(undefined);
vi.mock('../../utils/compositionInit', () => ({
  initializeNewComposition: (...args: unknown[]) => initializeNewComposition(...args),
  initializeCompositionFromStoryboard: vi.fn().mockResolvedValue(undefined),
  startAnotherForCurrentAssignment: vi.fn().mockResolvedValue('ok'),
  openSavedComposition: vi.fn().mockResolvedValue(undefined),
}));

// Wizard: zware animatie, hier een stub die dezelfde start-callback aanroept
vi.mock('../start/NewCompositionWizard', () => ({
  default: ({ onStartFree }: { onStartFree: (id: string) => void }) => (
    <div role="dialog" aria-label="wizard">
      <button type="button" onClick={() => onStartFree('basis')}>wizard-start</button>
    </div>
  ),
}));

vi.mock('../share', () => ({
  ShareCodeModal: ({ isOpen, initialCode }: { isOpen: boolean; initialCode?: string | null }): ReactNode =>
    isOpen ? <div role="dialog" aria-label="codevenster">{initialCode ?? ''}</div> : null,
}));

let withSeasonal = false;
vi.mock('../../data/themes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/themes')>();
  return {
    ...actual,
    getPublicThemes: () => {
      const list = actual.getPublicThemes();
      if (!withSeasonal) return list;
      return [...list, { ...list[0], id: 'seizoen', name: 'Winterwonderland', activeFrom: '12-01', activeUntil: '02-28' }];
    },
  };
});

import { StartScreen } from '../StartScreen';
import { useAppStore } from '../../stores/appStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { storageService } from '../../services/StorageService';
import { markFirstRunSeen } from '../../utils/firstRun';
import type { Sample, SavedComposition } from '../../types';

const fakeSample = { id: 's1', name: 'x', audioUrl: '/a.mp3', duration: 1, icon: 'Dog', color: '#000' } as unknown as Sample;

function withWork() {
  useLibraryStore.setState({ librarySamples: [fakeSample] });
}

describe('StartScreen (V2)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('nl');
    withSeasonal = false;
    initializeNewComposition.mockClear();
    markFirstRunSeen('onboarding-intro');
    vi.spyOn(storageService, 'getCompositions').mockReturnValue([]);
    vi.spyOn(storageService, 'getClassFeedbackCode').mockReturnValue(null);
    useLibraryStore.setState({ librarySamples: [] });
    useTimelineStore.getState().clearAllTracks?.();
    useAppStore.setState({
      currentScreen: 'start',
      classSession: null,
      pendingSaveCode: null,
      pendingStartAction: null,
    });
  });

  it('toont de primaire en secundaire actie, code en docenten rechtsboven', () => {
    render(<StartScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Maak je eigen soundscape' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Nieuwe soundscape' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kies een wereld' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ik heb een code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voor docenten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoe werkt het?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Over SoundScout/ })).toHaveAttribute('href', '/over');
    expect(screen.getByAltText(/kinderboerderij/i)).toBeInTheDocument();
  });

  it('zonder werk of composities: geen verder-werken-strook', () => {
    render(<StartScreen />);
    expect(screen.queryByRole('group', { name: 'Verder waar je was' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ga verder/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mijn soundscapes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nieuw thema/ })).not.toBeInTheDocument();
  });

  it('"Nieuwe soundscape" opent de wizard', async () => {
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe soundscape' }));
    expect(await screen.findByRole('dialog', { name: 'wizard' })).toBeInTheDocument();
  });

  it('"Kies een wereld" opent de wereldkiezer en start dezelfde init als de wizard', async () => {
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Kies een wereld' }));
    expect(await screen.findByRole('dialog', { name: 'Kies je wereld' })).toBeInTheDocument();
    const world = await screen.findByRole('button', { name: /De Stad/ });
    fireEvent.click(world);
    await waitFor(() => expect(initializeNewComposition).toHaveBeenCalledWith({ themeId: 'basis' }));
    expect(useAppStore.getState().composeMode).toBe('free');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Kies je wereld' })).not.toBeInTheDocument());
  });

  it('de wizard start via dezelfde handler (vrij componeren, thema)', async () => {
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe soundscape' }));
    fireEvent.click(await screen.findByRole('button', { name: 'wizard-start' }));
    await waitFor(() => expect(initializeNewComposition).toHaveBeenCalledWith({ themeId: 'basis' }));
  });

  it('met werk: "Ga verder" is de primaire knop; "Kies een wereld" verdwijnt', () => {
    withWork();
    render(<StartScreen />);
    const buttons = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    // Volgorde in de DOM: Ga verder vóór Nieuwe soundscape
    expect(buttons.findIndex((b) => b.startsWith('Ga verder'))).toBeLessThan(buttons.indexOf('Nieuwe soundscape'));
    expect(screen.queryByRole('button', { name: 'Kies een wereld' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Ga verder/ }));
    expect(useAppStore.getState().currentScreen).toBe('studio');
  });

  it('met werk: waarschuwing met veilige primaire knop; opnieuw beginnen opent de wizard', async () => {
    withWork();
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe soundscape' }));
    expect(screen.getByText(/Je werkt al aan een soundscape/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'wizard' })).not.toBeInTheDocument();

    // Ga verder met je soundscape = terug naar de studio, niets gewist
    fireEvent.click(screen.getByRole('button', { name: 'Ga verder met je soundscape' }));
    expect(useAppStore.getState().currentScreen).toBe('studio');
    expect(screen.queryByText(/Je werkt al aan een soundscape/)).not.toBeInTheDocument();

    useAppStore.setState({ currentScreen: 'start' });
    fireEvent.click(screen.getByRole('button', { name: 'Nieuwe soundscape' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw beginnen' }));
    expect(await screen.findByRole('dialog', { name: 'wizard' })).toBeInTheDocument();
  });

  it('in een klas met werk: ook het podium staat in de strook', () => {
    withWork();
    useAppStore.setState({
      classSession: { classCode: '1234', className: 'Groep 6a', assignmentType: 'free' } as never,
    });
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Naar het podium' }));
    expect(useAppStore.getState().currentScreen).toBe('stage');
  });

  it('"Mijn soundscapes" alleen met bewaarde composities', () => {
    vi.spyOn(storageService, 'getCompositions').mockReturnValue([{ id: 'c1' } as SavedComposition]);
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Mijn soundscapes' }));
    expect(useAppStore.getState().currentScreen).toBe('compositions');
  });

  it('seizoensknop alleen in het seizoen; klik start dat thema', async () => {
    withSeasonal = true;
    render(<StartScreen />);
    const chip = screen.getByRole('button', { name: /Nieuw thema/ });
    fireEvent.click(chip);
    await waitFor(() => expect(initializeNewComposition).toHaveBeenCalledWith({ themeId: 'seizoen' }));
  });

  it('seizoensknop met werk: eerst de waarschuwing, dan het seizoensthema (niet de wizard)', async () => {
    withSeasonal = true;
    withWork();
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Nieuw thema/ }));
    expect(initializeNewComposition).not.toHaveBeenCalled();
    // De titel van de waarschuwing noemt wat je wilde starten
    expect(screen.getByRole('dialog', { name: /Nieuw thema/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw beginnen' }));
    await waitFor(() => expect(initializeNewComposition).toHaveBeenCalledWith({ themeId: 'seizoen' }));
    expect(screen.queryByRole('dialog', { name: 'wizard' })).not.toBeInTheDocument();
  });

  it('"Ik heb een code" opent het codevenster', () => {
    render(<StartScreen />);
    expect(screen.queryByRole('dialog', { name: 'codevenster' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ik heb een code' }));
    expect(screen.getByRole('dialog', { name: 'codevenster' })).toBeInTheDocument();
  });

  it('codevenster opent vanzelf met een bewaarcode uit een link', () => {
    useAppStore.setState({ pendingSaveCode: 'ABC234' });
    render(<StartScreen />);
    expect(screen.getByRole('dialog', { name: 'codevenster' })).toHaveTextContent('ABC234');
  });

  it('codevenster opent vanzelf bij doorverwijzing "code"', async () => {
    useAppStore.setState({ pendingStartAction: 'code' });
    render(<StartScreen />);
    expect(await screen.findByRole('dialog', { name: 'codevenster' })).toBeInTheDocument();
    expect(useAppStore.getState().pendingStartAction).toBeNull();
  });

  it('doorverwijzing "new" opent de wizard', async () => {
    useAppStore.setState({ pendingStartAction: 'new' });
    render(<StartScreen />);
    expect(await screen.findByRole('dialog', { name: 'wizard' })).toBeInTheDocument();
  });

  it('taalknop schakelt naar Engels', async () => {
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByRole('button', { name: 'New soundscape' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    await i18n.changeLanguage('nl');
  });

  it('de stippen in het beeld zijn knoppen die een voorproefje spelen', () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audios: Array<{ src: string }> = [];
    class FakeAudio {
      volume = 1;
      preload = '';
      play = play;
      pause = pause;
      src: string;
      constructor(src: string) { this.src = src; audios.push(this); }
    }
    vi.stubGlobal('Audio', FakeAudio);
    render(<StartScreen />);
    const dot = screen.getByRole('button', { name: 'Luister: Hond' });
    fireEvent.click(dot);
    expect(audios[0].src).toContain('hond.mp3');
    expect(play).toHaveBeenCalled();
    expect(dot).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(dot);
    expect(pause).toHaveBeenCalled();
    expect(dot).toHaveAttribute('aria-pressed', 'false');
    vi.unstubAllGlobals();
  });
});
