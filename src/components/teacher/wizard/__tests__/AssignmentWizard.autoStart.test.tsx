/**
 * Snelle weg in de wizard (mockup C1): meteen klaarzetten en de code tonen,
 * maar nooit blind een lopende opdracht vervangen.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import i18n from '../../../../i18n';
import type { TeacherClass } from '../../../../hooks/useClasses';

const lesson = {
  id: 'les-1', isBuiltin: false, builtinKey: null, assignmentType: 'free', freeThemeId: 'basis',
  templateId: null, praatplaatRef: null, ppThemeId: null, ppLocationId: null, ppImageUrl: null, storyboardRef: null,
  cardId: null, cardInline: null, title: 'Geluiden van de boerderij', level: null, lessonGoal: null, phases: [], coverImage: null, pdfUrl: null, createdAt: '',
};
const fetchClassAssignment = vi.fn();
const activateFromWizard = vi.fn();

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('../../../../query/cache', () => ({ useTeacherId: () => 'teacher-1' }));
vi.mock('../../../../hooks/useTemplates', () => ({ useTemplates: () => ({ templates: [] }) }));
vi.mock('../../../../hooks/useAssignmentCards', () => ({ useAssignmentCards: () => ({ cards: [] }) }));
vi.mock('../../../../hooks/useLessonCards', () => ({ useLessonCards: () => ({ cards: [lesson], loading: false }) }));
vi.mock('../useAssignmentSources', () => ({ useAssignmentSources: () => ({ sourcesFor: () => [], templatesLoading: false }) }));
vi.mock('../../../../lib/assignments', async (orig) => ({ ...(await orig<object>()), fetchClassAssignment: (...a: unknown[]) => fetchClassAssignment(...a) }));
vi.mock('../../../../lib/wizardActivation', async (orig) => ({ ...(await orig<object>()), activateFromWizard: (...a: unknown[]) => activateFromWizard(...a) }));
vi.mock('../../ClassCodeBoard', () => ({ ClassCodeBoard: () => <div data-testid="code-board" /> }));
vi.mock('../StudentPreview', () => ({ StudentPreview: () => null }));
vi.mock('../AssignmentSettingsFields', () => ({ AssignmentSettingsFields: () => null }));

import { AssignmentWizard } from '../AssignmentWizard';

const klas = { id: 'k1', name: 'Groep 6a', code: '4827' } as unknown as TeacherClass;
const row = { id: 'a1', assignmentName: 'Oude opdracht' };
const props = { classData: klas, initialLessonCardId: 'les-1', onCancel: () => {}, onToClass: () => {} };

describe('AssignmentWizard — snelle weg', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('nl');
    fetchClassAssignment.mockReset();
    activateFromWizard.mockReset();
  });

  it('geen lopende opdracht: zet meteen klaar en toont de code op het bord', async () => {
    fetchClassAssignment.mockResolvedValue(null);
    activateFromWizard.mockResolvedValue({ assignment: row, failedSettings: [] });
    render(<AssignmentWizard {...props} autoStart />);
    expect(screen.getByTestId('wizard-autostart')).toBeInTheDocument();
    expect(await screen.findByTestId('code-board')).toBeInTheDocument();
    expect(activateFromWizard).toHaveBeenCalledTimes(1);
    expect(activateFromWizard.mock.calls[0][0]).toBe('k1');
    expect(activateFromWizard.mock.calls[0][1]).toMatchObject({ kind: 'lesson', lessonCardId: 'les-1' });
  });

  it('er staat al een opdracht klaar: niet vervangen, wel de waarschuwing op stap 2', async () => {
    fetchClassAssignment.mockResolvedValue(row);
    render(<AssignmentWizard {...props} autoStart />);
    expect(await screen.findByText(/Oude opdracht/)).toBeInTheDocument();
    expect(activateFromWizard).not.toHaveBeenCalled();
    expect(screen.queryByTestId('wizard-autostart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('code-board')).not.toBeInTheDocument();
  });

  it('klaarzetten mislukt: de docent blijft op stap 2 met de foutmelding, geen tweede poging', async () => {
    fetchClassAssignment.mockResolvedValue(null);
    activateFromWizard.mockRejectedValue(new Error('offline'));
    render(<AssignmentWizard {...props} autoStart />);
    await waitFor(() => expect(activateFromWizard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByTestId('wizard-autostart')).not.toBeInTheDocument());
    expect(screen.queryByTestId('code-board')).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 30));
    expect(activateFromWizard).toHaveBeenCalledTimes(1);
  });

  it('zonder snelle weg gebeurt er niets vanzelf', async () => {
    fetchClassAssignment.mockResolvedValue(null);
    render(<AssignmentWizard {...props} />);
    await waitFor(() => expect(fetchClassAssignment).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(activateFromWizard).not.toHaveBeenCalled();
    expect(screen.queryByTestId('wizard-autostart')).not.toBeInTheDocument();
  });
});
