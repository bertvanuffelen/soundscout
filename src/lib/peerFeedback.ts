/**
 * peerFeedback - Supabase-client voor peer-feedback (migratie 027)
 *
 * Leerlingen beluisteren en complimenteren elkaars werk anoniem via
 * docent-instelbare feedbackkaarten. Alle leerling-toegang loopt via
 * SECURITY DEFINER RPC's; docent-kaarten via RLS.
 */

import { getSupabase } from './supabase';
import { withTimeout } from '../utils/withTimeout';
import { parseCompositionData } from '../utils/schemas';
import { matchesError, ERR_RATE_LIMIT } from './supabaseErrors';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import type { CompositionData } from '../types';

// --- Leerling: batch beluisteren + complimenten geven ---

export interface PeerReviewItem {
  submissionId: string;
  compositionName: string;
  compositionData: CompositionData;
}

/**
 * Haal 3 willekeurige, nog niet beoordeelde, anonieme klasgenoot-inzendingen op.
 * De eigen submission-UUID geldt als inleverbewijs (consistent met het code-model).
 */
export async function getPeerReviewBatch(
  classCode: string,
  ownSubmissionId: string,
): Promise<PeerReviewItem[]> {
  const supabase = await getSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc('get_peer_review_batch', {
      p_class_code: classCode.trim(),
      p_own_submission_id: ownSubmissionId,
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('get_peer_review_batch error:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('peerReview.loadError'));
  }

  const items: PeerReviewItem[] = [];
  for (const row of (data ?? []) as { submission_id: string; composition_name: string; composition_data: unknown }[]) {
    const compositionData = parseCompositionData(row.composition_data);
    if (!compositionData) {
      logger.warn('Peer-review batch: ongeldige composition_data overgeslagen', { id: row.submission_id });
      continue;
    }
    items.push({
      submissionId: row.submission_id,
      compositionName: row.composition_name,
      compositionData,
    });
  }
  return items;
}

/** Geef 1-3 complimenten-chips aan een klasgenoot-inzending. */
export async function submitPeerFeedback(
  fromSubmissionId: string,
  targetSubmissionId: string,
  chips: string[],
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.rpc('submit_peer_feedback', {
      p_from_submission_id: fromSubmissionId,
      p_target_submission_id: targetSubmissionId,
      p_chips: chips,
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('submit_peer_feedback error:', sanitizeError(error));
    if (matchesError(error, ERR_RATE_LIMIT)) {
      throw new Error(i18n.t('submissions.rateLimitError'));
    }
    throw new Error(i18n.t('peerReview.submitError'));
  }
}

/** Ontvangen compliment + hoe vaak (anoniem geaggregeerd). */
export interface PeerCompliment {
  chip: string;
  count: number;
}

/**
 * Haal de ontvangen complimenten op via de bewaarcode.
 * Fire-and-forget-vriendelijk: geeft [] terug bij elke fout (nice-to-have).
 */
export async function getPeerCompliments(saveCode: string): Promise<PeerCompliment[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('get_peer_compliments', {
      p_save_code: saveCode.toUpperCase().trim(),
    });
    if (error) {
      logger.warn('get_peer_compliments mislukt:', sanitizeError(error));
      return [];
    }
    return ((data ?? []) as { chip: string; chip_count: number }[])
      .map((row) => ({ chip: row.chip, count: Number(row.chip_count) }));
  } catch (err) {
    logger.warn('get_peer_compliments mislukt:', sanitizeError(err));
    return [];
  }
}

// --- Docent: feedbackkaarten + peer-review-instelling ---

export interface FeedbackCard {
  id: string;
  /** null = ingebouwde kaart */
  teacherId: string | null;
  builtinKey: string | null;
  title: string;
  chips: string[];
}

/** Alle beschikbare feedbackkaarten (ingebouwd + eigen), ingebouwde eerst. */
export async function listFeedbackCards(): Promise<FeedbackCard[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('feedback_cards')
    .select('*')
    .order('teacher_id', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('listFeedbackCards error:', sanitizeError(error));
    throw new Error(i18n.t('teacher.peerReview.loadCardsError'));
  }

  return ((data ?? []) as { id: string; teacher_id: string | null; builtin_key: string | null; title: string; chips: string[] }[])
    .map((row) => ({
      id: row.id,
      teacherId: row.teacher_id,
      builtinKey: row.builtin_key,
      title: row.title,
      chips: row.chips ?? [],
    }));
}

/** Maak een eigen feedbackkaart (2-8 chips). */
export async function createFeedbackCard(title: string, chips: string[]): Promise<FeedbackCard> {
  const supabase = await getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('feedback_cards')
    .insert({ teacher_id: userData?.user?.id, title: title.trim(), chips })
    .select()
    .single();

  if (error) {
    logger.error('createFeedbackCard error:', sanitizeError(error));
    throw new Error(i18n.t('teacher.peerReview.saveCardError'));
  }
  return {
    id: data.id,
    teacherId: data.teacher_id,
    builtinKey: data.builtin_key,
    title: data.title,
    chips: data.chips ?? [],
  };
}

/** Verwijder een eigen feedbackkaart (RLS beschermt ingebouwde kaarten). */
export async function deleteFeedbackCard(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('feedback_cards').delete().eq('id', id);
  if (error) {
    logger.error('deleteFeedbackCard error:', sanitizeError(error));
    throw new Error(i18n.t('teacher.peerReview.deleteCardError'));
  }
}

/** Zet "klasgenoten luisteren" aan/uit voor een opdracht (met kaartkeuze). */
export async function setAssignmentPeerReview(
  assignmentId: string,
  enabled: boolean,
  feedbackCardId: string | null,
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await withTimeout(
    supabase.rpc('set_assignment_peer_review', {
      p_assignment_id: assignmentId,
      p_enabled: enabled,
      p_feedback_card_id: feedbackCardId,
    }),
    15_000,
    'errors.networkTimeout'
  );

  if (error) {
    logger.error('set_assignment_peer_review error:', sanitizeError(error));
    throw new Error(i18n.t('teacher.peerReview.settingError'));
  }
}
