/**
 * wizardActivation — zet de keuze uit de opdracht-wizard klaar voor een klas.
 *
 * Geen nieuwe RPC's of migraties: eerst activeren met de bestaande functies
 * (activate_assignment / activate_praatplaat_from_catalog / activate_lesson_card),
 * daarna de instellingen uit stap 2 doorzetten op de nieuwe actieve opdracht
 * (duur, opdrachtkaart, geluidenthema, klasgenoten laten luisteren).
 *
 * De afhankelijkheden worden geïnjecteerd, zodat de volgorde en de
 * foutafhandeling zonder netwerk te testen zijn.
 */

import type { AssignmentType, ClassAssignmentRow } from './assignments';

export interface PraatplaatEntry {
  name: string;
  themeId: string;
  locationId: string;
  imageUrl: string;
}

export type WizardChoice =
  | { kind: 'lesson'; lessonCardId: string; type: AssignmentType }
  | { kind: 'template'; templateId: string }
  | { kind: 'praatplaat'; entry: PraatplaatEntry }
  | { kind: 'storyboard'; storyboardRef: string }
  | { kind: 'free'; themeId: string };

export interface WizardSettings {
  /** Gekozen eigen opdrachtkaart; null = standaarduitleg (of die van de les) */
  cardId: string | null;
  /** true als de docent de uitleg-keuze bewust heeft aangepast */
  cardTouched: boolean;
  /** Tijdsduur-vermelding voor leerlingen; leeg = geen */
  durationLabel: string;
  /** Klasgenoten laten luisteren (peer-feedback) aan */
  peerEnabled: boolean;
  /** Geluidenthema bij een praatplaat; null = thema van de plaat zelf */
  praatplaatThemeId: string | null;
}

export interface ActivationDeps {
  activateAssignment: (
    classId: string,
    ref: { templateId?: string; storyboardRef?: string; freeThemeId?: string; cardId?: string | null },
  ) => Promise<unknown>;
  activatePraatplaatFromCatalog: (classId: string, entry: PraatplaatEntry, cardId?: string | null) => Promise<unknown>;
  activateLessonCard: (lessonCardId: string, classId: string) => Promise<unknown>;
  fetchClassAssignment: (classId: string) => Promise<ClassAssignmentRow | null>;
  updateAssignmentDuration: (assignmentId: string, label: string | null) => Promise<void>;
  updateAssignmentCard: (assignmentId: string, cardId: string | null) => Promise<void>;
  updatePraatplaatTheme: (praatplaatId: string, themeId: string) => Promise<void>;
  setAssignmentPeerReview: (assignmentId: string, enabled: boolean, feedbackCardId: string | null) => Promise<void>;
}

export interface ActivationResult {
  assignment: ClassAssignmentRow;
  /** Instellingen die niet doorgezet konden worden (de opdracht staat wél klaar) */
  failedSettings: Array<'duration' | 'card' | 'theme' | 'peer'>;
}

/** Vorm van een wizard-keuze (voor kleur, icoon en welke instellingen gelden). */
export function choiceType(choice: WizardChoice): AssignmentType {
  switch (choice.kind) {
    case 'lesson': return choice.type;
    case 'template': return 'template';
    case 'praatplaat': return 'praatplaat';
    case 'storyboard': return 'storyboard';
    case 'free': return 'free';
  }
}

export async function activateFromWizard(
  classId: string,
  choice: WizardChoice,
  settings: WizardSettings,
  deps: ActivationDeps,
): Promise<ActivationResult> {
  // Bij een leskaart levert de les zelf de uitleg; anders gaat de kaartkeuze
  // direct mee met de activatie.
  const cardId = settings.cardId;

  // 1. Activeren (fouten hier zijn echte fouten: er staat dan niets klaar)
  switch (choice.kind) {
    case 'lesson':
      await deps.activateLessonCard(choice.lessonCardId, classId);
      break;
    case 'template':
      await deps.activateAssignment(classId, { templateId: choice.templateId, cardId });
      break;
    case 'storyboard':
      await deps.activateAssignment(classId, { storyboardRef: choice.storyboardRef, cardId });
      break;
    case 'free':
      await deps.activateAssignment(classId, { freeThemeId: choice.themeId, cardId });
      break;
    case 'praatplaat':
      await deps.activatePraatplaatFromCatalog(
        classId,
        { ...choice.entry, themeId: settings.praatplaatThemeId ?? choice.entry.themeId },
        cardId,
      );
      break;
  }

  let assignment = await deps.fetchClassAssignment(classId);
  if (!assignment) throw new Error('activateFromWizard: geen actieve opdracht na activeren');

  // 2. Instellingen doorzetten — een mislukte instelling blokkeert niets
  const failedSettings: ActivationResult['failedSettings'] = [];
  const tryStep = async (name: ActivationResult['failedSettings'][number], fn: () => Promise<void>) => {
    try {
      await fn();
    } catch {
      failedSettings.push(name);
    }
  };
  const id = assignment.id;
  let changed = false;

  if (choice.kind === 'lesson' && settings.cardTouched) {
    await tryStep('card', () => deps.updateAssignmentCard(id, settings.cardId));
    changed = true;
  }
  if (
    choice.kind === 'lesson'
    && choiceType(choice) === 'praatplaat'
    && settings.praatplaatThemeId
    && assignment.praatplaatId
    && assignment.praatplaatThemeId !== settings.praatplaatThemeId
  ) {
    const ppId = assignment.praatplaatId;
    const themeId = settings.praatplaatThemeId;
    await tryStep('theme', () => deps.updatePraatplaatTheme(ppId, themeId));
    changed = true;
  }
  const duration = settings.durationLabel.trim();
  if (duration) {
    await tryStep('duration', () => deps.updateAssignmentDuration(id, duration));
    changed = true;
  }
  if (settings.peerEnabled) {
    // null = de server kiest de ingebouwde standaardkaart (migratie 028)
    await tryStep('peer', () => deps.setAssignmentPeerReview(id, true, null));
    changed = true;
  }

  if (changed) {
    assignment = (await deps.fetchClassAssignment(classId)) ?? assignment;
  }
  return { assignment, failedSettings };
}
