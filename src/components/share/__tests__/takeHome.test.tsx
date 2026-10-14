/**
 * "Mee naar huis" (besluit Bert 14-10): bewaarcode als link (#code=…),
 * kopiëren/mailen/QR, en het codevenster dat een code uit de link direct opzoekt.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const rpc = vi.fn();
vi.mock('../../../lib/supabase', () => ({
  getSupabase: () => Promise.resolve({ rpc }),
}));
const copy = vi.fn().mockResolvedValue(true);
vi.mock('../../../utils/copyToClipboard', () => ({ copyToClipboard: (text: string) => copy(text) }));

import { buildSaveCodeLink, readSaveCodeFromHash } from '../../../utils/saveCodeLink';
import { SaveCodeTakeHome } from '../SaveCodeTakeHome';
import { ShareCodeInput } from '../ShareCodeInput';

describe('saveCodeLink', () => {
  it('zet de code in de hash, niet in de query', () => {
    expect(buildSaveCodeLink('ABC234', 'https://soundscout.nl')).toBe('https://soundscout.nl/#code=ABC234');
  });

  it('leest alleen een geldige 6-tekens code uit de hash', () => {
    expect(readSaveCodeFromHash('#code=abc234')).toBe('ABC234');
    expect(readSaveCodeFromHash('#code=ABC23')).toBeNull();
    expect(readSaveCodeFromHash('#code=ABC2345')).toBeNull();
    expect(readSaveCodeFromHash('#access_token=xyz&type=recovery')).toBeNull();
    expect(readSaveCodeFromHash('')).toBeNull();
  });
});

describe('SaveCodeTakeHome', () => {
  beforeEach(() => copy.mockClear());

  it('kopieert de code en de link, en waarschuwt om alleen thuis te delen', async () => {
    render(<SaveCodeTakeHome code="ABC234" compositionName="Robotdans" />);
    fireEvent.click(screen.getByRole('button', { name: /Kopieer code|Copy code/i }));
    await waitFor(() => expect(copy).toHaveBeenCalledWith('ABC234'));
    fireEvent.click(screen.getByRole('button', { name: /Kopieer link|Copy link/i }));
    await waitFor(() => expect(copy).toHaveBeenCalledWith(`${window.location.origin}/#code=ABC234`));
    expect(screen.getByText(/alleen thuis|only share/i)).toBeInTheDocument();
  });
});

describe('ShareCodeInput met code uit een link', () => {
  beforeEach(() => rpc.mockReset());

  it('zoekt de code direct op en toont het keuzescherm Studio/Podium', async () => {
    rpc.mockResolvedValue({
      data: [{ id: 's1', student_name: 'AUDIT', composition_name: 'Robotdans', composition_data: { tracks: [], bpm: 120, totalBeats: 128, isLooping: false, samples: [] }, last_updated_at: null, student_email: null }],
      error: null,
    });
    render(<ShareCodeInput initialCode="ABC234" />);
    await waitFor(() => expect(screen.getByText('Robotdans')).toBeInTheDocument());
    expect(rpc).toHaveBeenCalledWith('load_saved_composition', { p_save_code: 'ABC234' });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
