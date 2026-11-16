/**
 * Besluit 2 (lanceerstrategie): de vrije naamvelden blijven, met een eerlijke
 * hint eronder; leeg laten = een schuilnaam.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../../i18n';
import i18n from '../../../i18n';

const saveCompositionOnline = vi.fn().mockResolvedValue({ saveCode: 'ABC234', saveSecret: 'x' });
vi.mock('../../../lib/submissions', () => ({
  saveCompositionOnline: (...args: unknown[]) => saveCompositionOnline(...args),
}));

import { SaveOnlineModal } from '../SaveOnlineModal';
import type { CompositionData } from '../../../types';

const data = { tracks: [], bpm: 120, totalBeats: 128, isLooping: false, samples: [] } as unknown as CompositionData;

describe('SaveOnlineModal naamveld', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('nl');
    saveCompositionOnline.mockClear();
  });

  it('toont de privacy-hint onder het naamveld', () => {
    render(<SaveOnlineModal compositionName="Robotdans" compositionData={data} onClose={() => {}} />);
    const input = screen.getByLabelText(/Jouw naam/);
    expect(input).toHaveAccessibleDescription('Alleen je voornaam, of laat leeg voor een schuilnaam.');
  });

  it('leeg laten bewaart met een schuilnaam', async () => {
    render(<SaveOnlineModal compositionName="Robotdans" compositionData={data} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Bewaar/ }));
    await waitFor(() => expect(saveCompositionOnline).toHaveBeenCalledTimes(1));
    const { studentName } = saveCompositionOnline.mock.calls[0][0] as { studentName: string };
    expect(studentName.trim().length).toBeGreaterThan(0);
  });
});
