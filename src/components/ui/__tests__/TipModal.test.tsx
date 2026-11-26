import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import i18n from '../../../i18n';
import TipModal from '../TipModal';

describe('TipModal', () => {
  beforeEach(async () => { await i18n.changeLanguage('nl'); });

  it('toont een korte tip met het lampje en sluit met de knop', () => {
    const onDismiss = vi.fn();
    render(<TipModal isOpen onDismiss={onDismiss} text="Tik op een plek en verzamel geluiden." />);
    expect(screen.getByText('Tik op een plek en verzamel geluiden.')).toBeInTheDocument();
    expect(screen.queryByTestId('tip-animation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aan de slag!' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('met een animatie: de animatie legt uit, de tekst is één regel (mockup B4)', () => {
    render(<TipModal isOpen onDismiss={() => {}} text="Zo maak je een ritme of een melodie." animation="sequencer-ritme-melodie" />);
    const frame = screen.getByTestId('tip-animation').querySelector('iframe');
    expect(frame?.getAttribute('src')).toBe('/animaties/sequencer-ritme-melodie.html?lang=nl');
    expect(frame?.getAttribute('title')).toBe('Zo maak je een ritme of een melodie.');
    expect(screen.getByText('Zo maak je een ritme of een melodie.')).toBeInTheDocument();
  });
});

describe('leerlingteksten blijven kort (mockup B4)', () => {
  // De langste uitleg voor leerlingen was 55 woorden. Deze teksten staan in
  // vensters die een kind moet wegklikken: houd ze onder de 12 woorden.
  const KEYS = [
    'sequencer.studio.firstRunHint', 'map.firstVisitHint', 'studio.clipToolsHint',
    'podium.finish.text', 'landscapeHint.message', 'saveOnline.description', 'start.discard.title',
  ];
  it.each(['nl', 'en'])('%s: hooguit 12 woorden', async (lang) => {
    await i18n.changeLanguage(lang);
    for (const key of KEYS) {
      const text = i18n.t(key);
      expect(text, key).not.toBe(key);
      expect(text.split(/\s+/).length, `${key}: "${text}"`).toBeLessThanOrEqual(12);
    }
  });
});
