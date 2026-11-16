/**
 * V2 Fase 4 — Vervormen-modal: begint bij de clip, Toepassen alleen bij een
 * wijziging en met precies de gewijzigde velden, voorbeeld met tempo + soort.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../../i18n';

const playSampleWithEffects = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../services/AudioService', () => ({
  audioService: {
    getWaveform: () => ({ peaks: new Array(50).fill(0.5), duration: 2 }),
    playSampleWithEffects: (...args: unknown[]) => playSampleWithEffects(...args),
    stopPreviewWithEffects: vi.fn(),
  },
}));

import { EffectsModal } from '../EffectsModal';
import type { Clip, Sample } from '../../../types';

const sample: Sample = {
  id: 'fx', name: 'Plons', locationId: 'l', audioUrl: '', duration: 2, icon: 'music', color: '#336699', kind: 'sfx',
};
const clip: Clip = {
  id: 'c1', sampleId: 'fx', startBeat: 0,
  effects: { volume: 0, pitch: 3, reverb: 20, fadeIn: 0.5, fadeOut: 0 },
};

function setup(overrides: Partial<Clip> = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <EffectsModal clip={{ ...clip, ...overrides }} sample={sample} bpm={105} isOpen onClose={onClose} onApply={onApply} />,
  );
  return { onApply, onClose };
}

const applyButton = () => screen.getByRole('button', { name: /^(Toepassen|Apply)$/ });

describe('EffectsModal (Vervormen)', () => {
  beforeEach(() => playSampleWithEffects.mockClear());

  it('begint met de waarden van de clip en Toepassen staat uit', () => {
    setup();
    expect(screen.getByRole('slider', { name: /Toonhoogte|Pitch/ })).toHaveValue('3');
    expect(screen.getByRole('slider', { name: /Galm|Reverb/ })).toHaveValue('20');
    expect(screen.getByRole('button', { name: /Snelheid 1×|Speed 1×/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Achterstevoren|Backwards/ })).toHaveAttribute('aria-pressed', 'false');
    expect(applyButton()).toBeDisabled();
  });

  it('een wijziging zet Toepassen aan en geeft precies de gewijzigde velden door', () => {
    const { onApply, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Snelheid 2×|Speed 2×/ }));
    fireEvent.click(screen.getByRole('button', { name: /Achterstevoren|Backwards/ }));
    fireEvent.change(screen.getByRole('slider', { name: /Echo/ }), { target: { value: '40' } });
    expect(applyButton()).not.toBeDisabled();
    fireEvent.click(applyButton());
    // 2 s sfx op 2× = 1 s: fade in 0,5 s past nog, dus geen fade-wijziging
    expect(onApply).toHaveBeenCalledWith({ speed: 2, reverse: true, echo: 40 });
    expect(onClose).toHaveBeenCalled();
  });

  it('een snellere snelheid klemt fades die niet meer passen', () => {
    const { onApply } = setup({ effects: { volume: 0, pitch: 0, reverb: 0, fadeIn: 1.5, fadeOut: 0.5 } });
    fireEvent.click(screen.getByRole('button', { name: /Snelheid 2×|Speed 2×/ }));
    fireEvent.click(applyButton());
    const patch = onApply.mock.calls[0][0];
    expect(patch.speed).toBe(2);
    expect(patch.fadeIn + patch.fadeOut).toBeLessThanOrEqual(1);
  });

  it('terugzetten: alles neutraal; terug naar de beginwaarden zet Toepassen weer uit', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Alles terugzetten|Reset everything/ }));
    expect(screen.getByRole('slider', { name: /Toonhoogte|Pitch/ })).toHaveValue('0');
    expect(applyButton()).not.toBeDisabled();
  });

  it('toont de lengte zoals gehoord', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Snelheid ½×|Speed ½×/ }));
    expect(screen.getByTestId('vervormen-duration')).toHaveTextContent(/4[.,]0 s/);
  });

  it('voorbeeld geeft bpm en kind door aan de motor', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Achterstevoren|Backwards/ }));
    fireEvent.click(screen.getByRole('button', { name: /Voorbeeld|Preview/ }));
    expect(playSampleWithEffects).toHaveBeenCalledWith(
      'fx', 0, 2,
      expect.objectContaining({ pitch: 3, reverb: 20, reverse: true, speed: 1, echo: 0, filter: 0 }),
      { bpm: 105, kind: 'sfx' },
    );
  });
});
