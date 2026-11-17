import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../../i18n';
import { QuickStickers } from '../QuickStickers';
import type { Submission } from '../../../hooks/useSubmissions';

const submission = (extra: Partial<Submission> = {}): Submission => ({
  id: 's1', student_name: 'Yara', composition_name: 'Boerderij', created_at: '2026-11-17T09:00:00Z', ...extra,
} as unknown as Submission);

describe('QuickStickers (feedback met één tik, mockup C2)', () => {
  beforeEach(async () => { await i18n.changeLanguage('nl'); });

  it('één tik bewaart de sticker en laat sterren en tekst staan', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<QuickStickers submission={submission({ feedback_level: 2, feedback_text: 'Mooi!' })} onSave={onSave} />);
    const build = screen.getByRole('button', { name: 'Mooie opbouw!' });
    fireEvent.click(build);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ sticker: 'build', level: 2, text: 'Mooi!' }));
    expect(await screen.findByText('Bewaard bij Yara')).toBeInTheDocument();
    expect(build).toHaveAttribute('aria-pressed', 'true');
  });

  it('nog een tik op dezelfde sticker haalt hem weg', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<QuickStickers submission={submission({ feedback_sticker: 'build' })} onSave={onSave} />);
    const build = screen.getByRole('button', { name: 'Mooie opbouw!' });
    expect(build).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(build);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ sticker: null, level: null, text: null }));
    expect(await screen.findByText('Sticker weg bij Yara')).toBeInTheDocument();
    expect(build).toHaveAttribute('aria-pressed', 'false');
  });

  it('mislukt het bewaren, dan blijft de sticker niet gekozen en staat er een eerlijke melding', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    render(<QuickStickers submission={submission()} onSave={onSave} />);
    const build = screen.getByRole('button', { name: 'Mooie opbouw!' });
    fireEvent.click(build);
    await waitFor(() => expect(build).toHaveAttribute('aria-pressed', 'false'));
    await waitFor(() => expect(screen.getByRole('status').textContent).not.toBe(''));
    expect(screen.getByRole('status')).not.toHaveTextContent('Bewaard');
  });

  it('toont alle zes stickers als knoppen van minstens 44 px', () => {
    render(<QuickStickers submission={submission()} onSave={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    buttons.forEach((b) => expect(b.className).toContain('min-h-11'));
  });
});
