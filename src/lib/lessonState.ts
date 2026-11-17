/**
 * "Les afronden" (designronde nov 2026, mockup B3 deel 2; migratie 045).
 *
 * De docent rondt de les af (`endLesson`); elk apparaat van die klas ruimt
 * daarna bij het eerstvolgende openen of terugkomen zijn werkblad op
 * (`syncLessonState`). Het werk gaat niet weg: ingeleverd en bewaard werk
 * staat bij de docent, en een soundscape die alleen lokaal bestond komt op
 * dat apparaat bij "Mijn soundscapes" (`setWorkAside`).
 *
 * Het apparaat onthoudt welk afrond-tijdstip het al kent en vergelijkt alleen
 * "is dit anders dan toen ik begon". Er wordt niets met de klok van het
 * apparaat vergeleken, en er gaat niets over de leerling naar de server.
 */

import { getSupabase } from './supabase';
import { useAppStore } from '../stores/appStore';
import { setWorkAside } from '../utils/finishSession';
import { logger } from '../utils/logger';
import i18n from '../i18n';

const SEEN_KEY = 'soundscout:lesson-seen';

interface Seen { code: string; ended: number | null }

function readSeen(): Seen | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Seen>;
    return typeof v.code === 'string' && (v.ended === null || typeof v.ended === 'number') ? { code: v.code, ended: v.ended } : null;
  } catch {
    return null;
  }
}

function writeSeen(seen: Seen): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // opslag vol of geblokkeerd: dan vragen we het de volgende keer opnieuw
  }
}

const toTime = (iso: string | null): number | null => {
  if (!iso) return null;
  const n = Date.parse(iso);
  return Number.isNaN(n) ? null : n;
};

/** Docent: rond de les van deze klas af. Geeft het tijdstip terug. */
export async function endLesson(classId: string): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('end_lesson', { p_class_id: classId });
  if (error || !data) {
    logger.error('end_lesson mislukt:', error?.message);
    throw new Error(i18n.t('teacher.classPage.live.endLesson.error'));
  }
  return data as string;
}

/** Leerlingapparaat: wanneer is de les van deze klas voor het laatst afgerond? */
export async function fetchLessonState(classCode: string): Promise<string | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('get_lesson_state', { p_class_code: classCode });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

// --- Eenmalige melding op het startscherm ---

let lessonEndedNotice = false;

/** True (één keer) als dit apparaat net is opgeruimd omdat de les is afgerond. */
export function consumeLessonEndedNotice(): boolean {
  const v = lessonEndedNotice;
  lessonEndedNotice = false;
  return v;
}

export type LessonSyncResult = 'baseline' | 'unchanged' | 'ended' | 'skipped';

/**
 * Controleer of de docent de les heeft afgerond sinds dit kind begon. Zo ja:
 * werkblad leeg (werk opzij), terug naar het startscherm. Faalt geruisloos
 * (offline, migratie 045 nog niet gedraaid): dan gebeurt er niets.
 */
export async function syncLessonState(): Promise<LessonSyncResult> {
  const session = useAppStore.getState().classSession;
  if (!session?.classCode) return 'skipped';
  const code = session.classCode;

  let server: number | null;
  try {
    server = toTime(await fetchLessonState(code));
  } catch (err) {
    logger.debug('lesstatus niet opgehaald:', err);
    return 'skipped';
  }

  const seen = readSeen();
  if (!seen || seen.code !== code) {
    // Eerste keer met deze klas op dit apparaat: dit is het beginpunt
    writeSeen({ code, ended: server });
    return 'baseline';
  }
  if (server === null || server === seen.ended) return 'unchanged';

  // Het kind is intussen misschien van klas gewisseld terwijl we wachtten
  if (useAppStore.getState().classSession?.classCode !== code) return 'skipped';

  writeSeen({ code, ended: server });
  setWorkAside();
  lessonEndedNotice = true;
  useAppStore.getState().goToStart();
  logger.info('[lessonState] les afgerond door de docent: werkblad opgeruimd');
  return 'ended';
}
