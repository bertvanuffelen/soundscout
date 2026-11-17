import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../../i18n';
import { ActivateLessonCardModal } from '../ActivateLessonCardModal';
import type { TeacherClass } from '../../../hooks/useClasses';
import type { LessonCard } from '../../../lib/lessonCards';

const card = { id: 'les-1', isBuiltin: false, builtinKey: null, assignmentType: 'free', title: 'Geluiden van de boerderij', freeThemeId: 'basis' } as unknown as LessonCard;
const klas = { id: 'k1', name: 'Groep 6a', code: '4827' } as unknown as TeacherClass;

describe('ActivateLessonCardModal (snelle weg, mockup C1)', () => {
  beforeEach(async () => { await i18n.changeLanguage('nl'); });

  it('"Zet de code op het bord" gaat de snelle weg in', async () => {
    const onContinue = vi.fn();
    render(<ActivateLessonCardModal isOpen onClose={() => {}} lessonCard={card} classes={[klas]} onCreateClass={vi.fn()} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: /Zet de code op het bord/ }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(klas, card, true));
  });

  it('"Eerst aanpassen" opent de wizard op de controlestap', async () => {
    const onContinue = vi.fn();
    render(<ActivateLessonCardModal isOpen onClose={() => {}} lessonCard={card} classes={[klas]} onCreateClass={vi.fn()} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eerst aanpassen' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(klas, card, false));
  });

  it('zonder klassen: één vraag (de naam), dan meteen door', async () => {
    const onContinue = vi.fn();
    const created = { id: 'k2', name: 'Groep 5b', code: '1111' } as unknown as TeacherClass;
    const onCreateClass = vi.fn().mockResolvedValue(created);
    render(<ActivateLessonCardModal isOpen onClose={() => {}} lessonCard={card} classes={[]} onCreateClass={onCreateClass} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: /Zet de code op het bord/ }));
    expect(await screen.findByText('Geef de nieuwe klas een naam.')).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Naam van de klas'), { target: { value: 'Groep 5b' } });
    fireEvent.click(screen.getByRole('button', { name: /Zet de code op het bord/ }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(created, card, true));
    expect(onCreateClass).toHaveBeenCalledWith('Groep 5b');
  });
});
