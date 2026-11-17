/**
 * Melodie-tab (V2 Fase 4) — component-tests: tabs + wisselregel, raster
 * (rij-mapping, octaven), stemkeuze (synth vs. bibliotheek), swing en
 * sterkte-kwast.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../../../services/SequencerEngine', () => ({
  sequencerEngine: {
    isPlaying: false,
    getCurrentStep: () => 0,
    previewNote: vi.fn().mockResolvedValue(undefined),
    previewVoice: vi.fn().mockResolvedValue(undefined),
    previewSample: vi.fn().mockResolvedValue(undefined),
    stopPreview: vi.fn(),
    ensureBuffer: vi.fn().mockResolvedValue(undefined),
    prepare: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

import i18n from '../../../i18n';
import { sequencerEngine } from '../../../services/SequencerEngine';
import { useSequencerStore } from '../../../stores/sequencerStore';
import { createDefaultMelodySequence, createDefaultSequence } from '../../../utils/sequencer';
import type { Sample } from '../../../types';
import type { SequencerSequence } from '../../../types/sequencer';
import MelodyEditor from '../MelodyEditor';
import SequenceKindTabs from '../SequenceKindTabs';

const library: Sample[] = [
  { id: 'bib-fluit', name: 'Fluitje', locationId: 'loc', audioUrl: '/a.mp3', duration: 1, icon: 'Music', color: '#123456' },
];

function setActive(seq: SequencerSequence) {
  useSequencerStore.setState({
    sequences: [seq],
    activeSequenceId: seq.id,
    openSequenceId: seq.id,
    isPlaying: false,
    hasHydrated: true,
    mode: 'lab',
  });
}
const active = () => useSequencerStore.getState().activeSequence()!;

beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  await i18n.changeLanguage('nl');
});

describe('SequenceKindTabs', () => {
  function Harness() {
    const seq = useSequencerStore((s) => s.sequences.find((x) => x.id === s.activeSequenceId));
    return seq ? <SequenceKindTabs sequence={seq} /> : null;
  }

  it('lege sequence: tab Melodie zet het soort direct om', () => {
    setActive(createDefaultSequence('Seq'));
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Ritme' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Melodie' }));
    expect(active().kind).toBe('melody');
    expect(screen.getByRole('tab', { name: 'Melodie' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('niet-lege sequence: bevestiging, daarna een NIEUWE melodie; het ritme blijft', () => {
    const rhythm = createDefaultSequence('Beat');
    rhythm.tracks[0].steps[0] = true;
    setActive(rhythm);
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: 'Melodie' }));
    expect(active().kind ?? 'rhythm').toBe('rhythm');
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Nieuwe melodie' }));
    const { sequences } = useSequencerStore.getState();
    expect(sequences).toHaveLength(2);
    expect(sequences[0].tracks[0].steps[0]).toBe(true);
    expect(active().kind).toBe('melody');
  });

  it('annuleren laat alles zoals het was', () => {
    const rhythm = createDefaultSequence('Beat');
    rhythm.tracks[0].steps[0] = true;
    setActive(rhythm);
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: 'Melodie' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuleren' }));
    expect(useSequencerStore.getState().sequences).toHaveLength(1);
  });
});

describe('MelodyEditor', () => {
  beforeEach(() => setActive(createDefaultMelodySequence('Mel')));

  it('rijen van hoog naar laag; tik zet de noot op de juiste rij en laat hem horen', () => {
    render(<MelodyEditor samples={library} />);
    const cells = screen.getAllByRole('button', { name: /, tel 1$/ });
    // 2 octaven diatonisch (C D E F G A B) = 14 rijen, hoogste (B5) bovenaan
    expect(cells).toHaveLength(14);
    expect(cells[0]).toHaveAccessibleName('B5, tel 1');
    expect(cells[13]).toHaveAccessibleName('C4, tel 1');
    expect(screen.getByRole('button', { name: 'F4, tel 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A5, tel 3' }));
    expect(active().melody!.notes).toEqual([{ step: 2, row: 12 }]);
    expect(screen.getByRole('button', { name: 'A5, tel 3, Hard' })).toHaveAttribute('aria-pressed', 'true');
    expect(sequencerEngine.previewNote).toHaveBeenCalledWith(expect.objectContaining({ id: active().id }), 12, 1);

    fireEvent.click(screen.getByRole('button', { name: 'C4, tel 1' }));
    expect(active().melody!.notes).toContainEqual({ step: 0, row: 0 });
  });

  it('noot uitzetten speelt niets af', () => {
    render(<MelodyEditor samples={library} />);
    fireEvent.click(screen.getByRole('button', { name: 'E4, tel 2' }));
    vi.mocked(sequencerEngine.previewNote).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'E4, tel 2, Hard' }));
    expect(active().melody!.notes).toEqual([]);
    expect(sequencerEngine.previewNote).not.toHaveBeenCalled();
  });

  it('octaaf erbij geeft 21 rijen (bovenste = B6 = rij 20)', () => {
    render(<MelodyEditor samples={library} />);
    fireEvent.click(screen.getByRole('button', { name: 'Octaaf erbij' }));
    expect(active().melody!.octaves).toBe(3);
    const cells = screen.getAllByRole('button', { name: /, tel 1$/ });
    expect(cells).toHaveLength(21);
    expect(cells[0]).toHaveAccessibleName('B6, tel 1');
    fireEvent.click(cells[0]);
    expect(active().melody!.notes).toEqual([{ step: 0, row: 20 }]);
    expect(screen.getByRole('button', { name: 'Octaaf erbij' })).toBeDisabled();
  });

  it('sterkte-kwast: zacht zetten, dan hard maakt de noot hard', () => {
    render(<MelodyEditor samples={library} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zacht' }));
    expect(screen.getByRole('button', { name: 'Zacht' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'D4, tel 1' }));
    expect(active().melody!.notes).toEqual([{ step: 0, row: 1, velocity: 0.4 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Hard' }));
    fireEvent.click(screen.getByRole('button', { name: 'D4, tel 1, Zacht' }));
    expect(active().melody!.notes).toEqual([{ step: 0, row: 1 }]);
  });

  it('swing-schuif zet sequence.swing', () => {
    render(<MelodyEditor samples={library} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.25' } });
    expect(active().swing).toBe(0.25);
  });

  it('stem: synthklank kiezen', () => {
    render(<MelodyEditor samples={library} />);
    fireEvent.click(screen.getByRole('button', { name: 'Klank: Warm' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Luister naar Tokkel' }));
    expect(sequencerEngine.previewVoice).toHaveBeenCalledWith(expect.anything(), { type: 'synth', preset: 'pluck' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tokkel' }));
    expect(active().melody!.voice).toEqual({ type: 'synth', preset: 'pluck' });
  });

  it('stem: alleen geluiden uit de eigen bibliotheek, buffer wordt geladen', () => {
    render(<MelodyEditor samples={library} />);
    fireEvent.click(screen.getByRole('button', { name: 'Klank: Warm' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Geluid uit je bibliotheek' }));
    const picker = screen.getByRole('dialog');
    // Precies de meegegeven bibliotheek — niets anders
    expect(within(picker).getAllByRole('button', { name: 'Kiezen' })).toHaveLength(1);
    fireEvent.click(within(picker).getByRole('button', { name: 'Kiezen' }));
    expect(active().melody!.voice).toEqual({ type: 'sample', sampleId: 'bib-fluit' });
    expect(sequencerEngine.ensureBuffer).toHaveBeenCalledWith(library[0]);
    expect(screen.getByRole('button', { name: 'Klank: Fluitje' })).toBeInTheDocument();
  });

  it('lege bibliotheek: bibliotheekknop is uitgeschakeld', () => {
    render(<MelodyEditor samples={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Klank: Warm' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Geluid uit je bibliotheek' })).toBeDisabled();
  });
});
