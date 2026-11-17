import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../../../i18n';
import { ClassLiveTab } from '../ClassLiveTab';
import type { Submission } from '../../../../hooks/useSubmissions';

const sub = (id: string, submitted: boolean): Submission => ({
  id, student_name: `Leerling ${id}`, composition_name: 'Soundscape', created_at: '2026-11-17T09:00:00Z',
  submitted_at: submitted ? '2026-11-17T09:30:00Z' : null, save_code: 'ABC123',
} as unknown as Submission);

const base = { newCount: 0, activeName: 'Vrij', classCode: '4827', onOpen: () => {} };

describe('ClassLiveTab — Les afronden', () => {
  beforeEach(async () => { await i18n.changeLanguage('nl'); });

  it('zonder handler staat de knop er niet', () => {
    render(<ClassLiveTab {...base} submitted={[]} workInProgress={[]} />);
    expect(screen.queryByRole('button', { name: 'Les afronden' })).not.toBeInTheDocument();
  });

  it('vraagt eerst om bevestiging met de telling, en rondt dan af', async () => {
    const onEndLesson = vi.fn().mockResolvedValue(undefined);
    render(<ClassLiveTab {...base} submitted={[sub('1', true), sub('2', true)]} workInProgress={[sub('3', false)]} onEndLesson={onEndLesson} />);
    fireEvent.click(screen.getByRole('button', { name: 'Les afronden' }));
    const dialog = screen.getByRole('dialog', { name: 'Les afronden?' });
    expect(dialog).toHaveTextContent('2 van 3 hebben ingeleverd');
    expect(onEndLesson).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Les afronden' }).find((b) => dialog.contains(b))!);
    await waitFor(() => expect(onEndLesson).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('De les is afgerond');
    expect(screen.queryByRole('dialog', { name: 'Les afronden?' })).not.toBeInTheDocument();
  });

  it('toont de fout en laat het venster open als afronden mislukt', async () => {
    const onEndLesson = vi.fn().mockRejectedValue(new Error('De les afronden lukte niet. Probeer het opnieuw.'));
    render(<ClassLiveTab {...base} submitted={[]} workInProgress={[]} onEndLesson={onEndLesson} />);
    fireEvent.click(screen.getByRole('button', { name: 'Les afronden' }));
    const dialog = screen.getByRole('dialog', { name: 'Les afronden?' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Les afronden' }).find((b) => dialog.contains(b))!);
    expect(await screen.findByRole('alert')).toHaveTextContent('lukte niet');
    expect(screen.getByRole('dialog', { name: 'Les afronden?' })).toBeInTheDocument();
  });
});
