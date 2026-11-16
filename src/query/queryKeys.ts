/**
 * Query keys — één getypeerde fabriek voor alle server-state (V2 Fase 2).
 *
 * Opbouw:
 *   ['teacher', <userId>, …]   alles wat bij één ingelogde docent hoort
 *   ['student', …]             klas-brede, niet-persoonlijke leerlingdata
 *
 * De docent-id staat in élke docent-sleutel. Daardoor kan de cache op een
 * gedeelde computer nooit de data van docent A aan docent B tonen: B leest
 * simpelweg andere sleutels. `QueryAuthSync` ruimt daarnaast de sleutels van
 * de vorige docent op bij uitloggen of wisselen.
 */

const teacherRoot = (userId: string) => ['teacher', userId] as const;
const teacherClass = (userId: string, classId: string) =>
  [...teacherRoot(userId), 'class', classId] as const;

export const queryKeys = {
  teacher: {
    /** Alles van alle docenten (alleen voor opruimen/tests) */
    all: ['teacher'] as const,
    /** Alles van één docent — prefix voor removeQueries bij uitloggen */
    user: teacherRoot,
    classes: (userId: string) => [...teacherRoot(userId), 'classes'] as const,
    templates: (userId: string) => [...teacherRoot(userId), 'templates'] as const,
    assignmentCards: (userId: string) => [...teacherRoot(userId), 'assignment-cards'] as const,
    lessonCards: (userId: string) => [...teacherRoot(userId), 'lesson-cards'] as const,
    /** Praatplaten van één klas, of ('all') de hele bibliotheek */
    praatplaten: (userId: string, classId?: string) =>
      [...teacherRoot(userId), 'praatplaten', classId ?? 'all'] as const,
    /** Alles van één klas — prefix */
    class: teacherClass,
    submissions: (userId: string, classId: string) =>
      [...teacherClass(userId, classId), 'submissions'] as const,
    /** Actieve opdracht + eerdere opdrachten van een klas (één fetch) */
    classAssignment: (userId: string, classId: string) =>
      [...teacherClass(userId, classId), 'assignment'] as const,
  },
  student: {
    /** Wat de docent nu actief heeft staan voor deze klascode (geen leerlingwerk) */
    liveAssignment: (classCode: string) => ['student', 'live-assignment', classCode] as const,
  },
} as const;
