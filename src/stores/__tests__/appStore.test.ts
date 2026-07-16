/**
 * appStore — navigatie vs. compositie-context (testronde 3)
 *
 * Bug: terug naar start wiste de storyboard/praatplaat/klas-context terwijl
 * de clips bleven staan → "Verder werken" werd stiekem een vrije compositie.
 * Sinds testronde 3: goToStart = puur navigatie; resetCompositionContext =
 * de bewuste schone lei.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';
import type { Storyboard, ClassSession } from '../../types';

const storyboard: Storyboard = {
  id: 'sb-test',
  themeId: 'basis',
  coverImage: '/x.png',
  images: [
    { url: '/a.png', label: 'a' },
    { url: '/b.png', label: 'b' },
  ],
} as Storyboard;

const session: ClassSession = {
  classCode: '1234',
  classId: 'class-1',
  className: 'Testklas',
  assignmentType: 'storyboard',
  assignmentId: 'a-1',
  assignmentName: 'Verhaal',
} as ClassSession;

describe('appStore — goToStart vs resetCompositionContext', () => {
  beforeEach(() => {
    useAppStore.getState().resetCompositionContext();
    useAppStore.setState({ composeMode: 'free', currentScreen: 'start' });
  });

  it('goToStart behoudt de compositie-context (storyboard, klas-sessie, mode)', () => {
    const s = useAppStore.getState();
    s.setComposeMode('storyboard');
    s.setActiveStoryboard(storyboard);
    s.setClassSession(session);
    useAppStore.getState().setSubmissionId('sub-1');
    useAppStore.getState().setSubmissionSynced(true);

    useAppStore.getState().goToStart();

    const after = useAppStore.getState();
    expect(after.currentScreen).toBe('start');
    expect(after.composeMode).toBe('storyboard');
    expect(after.activeStoryboard?.id).toBe('sb-test');
    expect(after.classSession?.classCode).toBe('1234');
    expect(after.submissionId).toBe('sub-1');
    expect(after.submissionSynced).toBe(true);
  });

  it('goToStart ruimt wél scherm-transients op (pendingAssignment e.d.)', () => {
    useAppStore.setState({
      pendingAssignment: { classCode: '1234', assignment: null },
      currentLocationId: 'boerderij',
      isSubmitting: true,
    });

    useAppStore.getState().goToStart();

    const after = useAppStore.getState();
    expect(after.pendingAssignment).toBeNull();
    expect(after.currentLocationId).toBeNull();
    expect(after.isSubmitting).toBe(false);
  });

  it('resetCompositionContext wist de volledige compositie-context', () => {
    const s = useAppStore.getState();
    s.setComposeMode('storyboard');
    s.setActiveStoryboard(storyboard);
    s.setClassSession(session);
    useAppStore.getState().setSubmissionId('sub-1');

    useAppStore.getState().resetCompositionContext();

    const after = useAppStore.getState();
    expect(after.activeStoryboard).toBeNull();
    expect(after.classSession).toBeNull();
    expect(after.submissionId).toBeNull();
    expect(after.submissionSynced).toBe(false);
    expect(after.activePraatplaat).toBeNull();
    expect(after.receivedFeedback).toBeNull();
    // composeMode blijft bewust staan: de wizard/flow zet die zelf
    expect(after.composeMode).toBe('storyboard');
  });
});
