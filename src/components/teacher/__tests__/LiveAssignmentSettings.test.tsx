/**
 * Docentenportaal in V2: de instelling "Leerlingen typen zelf een titel"
 * (migratie 037) staat in LiveAssignmentSettings — dus zowel onder
 * "Meer opties" op de klaspagina als op het codescherm van de wizard.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../../i18n';
import i18n from '../../../i18n';
import type { ClassAssignmentRow } from '../../../lib/assignments';

const fetchStudentsTypeTitle = vi.fn();
const updateStudentsTypeTitle = vi.fn();
vi.mock('../../../lib/assignments', () => ({
  fetchStudentsTypeTitle: (...a: unknown[]) => fetchStudentsTypeTitle(...a),
  updateStudentsTypeTitle: (...a: unknown[]) => updateStudentsTypeTitle(...a),
  updateAssignmentCard: vi.fn(),
  updateAssignmentDuration: vi.fn(),
}));
vi.mock('../../../hooks/useAssignmentCards', () => ({ useAssignmentCards: () => ({ cards: [] }) }));
vi.mock('../PeerReviewSettings', () => ({ PeerReviewSettings: () => null }));

import { LiveAssignmentSettings } from '../LiveAssignmentSettings';

const assignment = { id: 'a-1', type: 'free', assignmentName: 'Vrij', activatedAt: '2026-11-16T10:00:00Z' } as unknown as ClassAssignmentRow;

describe('LiveAssignmentSettings: titelinstelling', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('nl');
    fetchStudentsTypeTitle.mockReset();
    updateStudentsTypeTitle.mockReset();
  });

  it('toont de schakelaar en slaat een wijziging op', async () => {
    fetchStudentsTypeTitle.mockResolvedValue(true);
    updateStudentsTypeTitle.mockResolvedValue(undefined);
    render(<LiveAssignmentSettings assignment={assignment} />);

    const toggle = await screen.findByRole('switch', { name: 'Leerlingen typen zelf een titel' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);
    await waitFor(() => expect(updateStudentsTypeTitle).toHaveBeenCalledWith('a-1', false));
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('zet de schakelaar terug als opslaan mislukt', async () => {
    fetchStudentsTypeTitle.mockResolvedValue(false);
    updateStudentsTypeTitle.mockRejectedValue(new Error('geweigerd'));
    render(<LiveAssignmentSettings assignment={assignment} />);

    const toggle = await screen.findByRole('switch', { name: 'Leerlingen typen zelf een titel' });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('verbergt de schakelaar als de kolom (migratie 037) nog niet bestaat', async () => {
    fetchStudentsTypeTitle.mockResolvedValue(null);
    render(<LiveAssignmentSettings assignment={assignment} />);
    await waitFor(() => expect(fetchStudentsTypeTitle).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
