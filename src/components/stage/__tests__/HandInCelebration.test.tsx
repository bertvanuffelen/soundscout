import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../../i18n';
import { HandInCelebration } from '../HandInCelebration';

describe('HandInCelebration', () => {
  beforeEach(async () => { await i18n.changeLanguage('nl'); });

  it('toont één woord en de eigen geluidskleuren, zonder klikken tegen te houden', () => {
    render(<HandInCelebration colors={['#FFC107', '#E74C3C']} />);
    const root = screen.getByTestId('handin-celebration');
    expect(root).toHaveTextContent('Ingeleverd!');
    expect(root.className).toContain('pointer-events-none');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.querySelectorAll('.handin-bar')).toHaveLength(2);
  });

  it('toont hooguit zes blokken en valt terug op vaste kleuren zonder geluiden', () => {
    const { rerender } = render(<HandInCelebration colors={Array.from({ length: 9 }, (_, i) => `#00000${i}`)} />);
    expect(screen.getByTestId('handin-celebration').querySelectorAll('.handin-bar')).toHaveLength(6);
    rerender(<HandInCelebration colors={[]} />);
    expect(screen.getByTestId('handin-celebration').querySelectorAll('.handin-bar')).toHaveLength(4);
  });
});
