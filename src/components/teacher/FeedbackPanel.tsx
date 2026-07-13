/**
 * FeedbackPanel - Docent-feedback op een inzending (migratie 026)
 *
 * Sticker (vaste set) + niveau (1-3 sterren) + kort persoonlijk tekstje.
 * Wordt getoond in de SubmissionPlayer; groot genoeg om ook op het digibord
 * klassikaal leesbaar te zijn.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Send, Check, Loader2 } from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';
import type { FeedbackSticker } from '../../lib/submissions';
import { cn } from '../../utils/cn';

/** Vaste stickerset — keys matchen de CHECK-constraint in migratie 026 */
export const FEEDBACK_STICKERS: { key: FeedbackSticker; emoji: string }[] = [
  { key: 'star', emoji: '⭐' },
  { key: 'rhythm', emoji: '🎵' },
  { key: 'build', emoji: '🔊' },
  { key: 'teamwork', emoji: '👏' },
  { key: 'surprise', emoji: '💡' },
  { key: 'target', emoji: '🎯' },
];

export function getStickerEmoji(key: string | null | undefined): string | null {
  return FEEDBACK_STICKERS.find((s) => s.key === key)?.emoji ?? null;
}

interface FeedbackPanelProps {
  submission: Submission;
  onSave: (feedback: {
    sticker: FeedbackSticker | null;
    level: number | null;
    text: string | null;
  }) => Promise<void>;
}

export function FeedbackPanel({ submission, onSave }: FeedbackPanelProps) {
  const { t } = useTranslation();
  const [sticker, setSticker] = useState<FeedbackSticker | null>(
    submission.feedback_sticker ?? null
  );
  const [level, setLevel] = useState<number | null>(submission.feedback_level ?? null);
  const [text, setText] = useState(submission.feedback_text ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    submission.feedback_at ? 'saved' : 'idle'
  );

  const markDirty = () => {
    if (state === 'saved' || state === 'error') setState('idle');
  };

  const handleSave = async () => {
    try {
      setState('saving');
      await onSave({ sticker, level, text: text.trim() || null });
      setState('saved');
    } catch {
      setState('error');
    }
  };

  const hasContent = !!sticker || !!level || !!text.trim();

  return (
    <div className="px-4 sm:px-6 py-3 border-t border-border-subtle bg-bg-surface shrink-0">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Stickers */}
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label={t('teacher.feedback.stickerLabel')}>
          {FEEDBACK_STICKERS.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={sticker === key}
              onClick={() => { setSticker(sticker === key ? null : key); markDirty(); }}
              title={t(`teacher.feedback.stickers.${key}`)}
              className={cn(
                'w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-xl sm:text-2xl flex items-center justify-center transition-all',
                sticker === key
                  ? 'bg-accent-100 ring-2 ring-accent-400 scale-110'
                  : 'bg-neutral-100 hover:bg-neutral-200 opacity-70 hover:opacity-100'
              )}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Niveau: 1-3 sterren */}
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label={t('teacher.feedback.levelLabel')}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={level === n}
              onClick={() => { setLevel(level === n ? null : n); markDirty(); }}
              title={t('teacher.feedback.levelTitle', { level: n })}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'w-7 h-7 sm:w-8 sm:h-8 transition-colors',
                  level != null && n <= level
                    ? 'text-accent-400 fill-accent-400'
                    : 'text-neutral-300'
                )}
              />
            </button>
          ))}
        </div>

        {/* Tekst + versturen */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <input
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value.slice(0, 300)); markDirty(); }}
            placeholder={t('teacher.feedback.textPlaceholder')}
            maxLength={300}
            className="flex-1 px-3 py-2 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-all text-sm text-text-main placeholder:text-text-muted/50 bg-neutral-50"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={state === 'saving' || (!hasContent && !submission.feedback_at)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors shrink-0',
              state === 'saved'
                ? 'bg-success-100 text-success-700'
                : 'bg-accent-400 hover:bg-accent-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {state === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
            {state === 'saved' && <Check className="w-4 h-4" />}
            {(state === 'idle' || state === 'error') && <Send className="w-4 h-4" />}
            {state === 'saved'
              ? t('teacher.feedback.saved')
              : t('teacher.feedback.send')}
          </button>
        </div>
      </div>

      {state === 'error' && (
        <p className="text-error-600 text-xs mt-2">{t('teacher.feedback.saveError')}</p>
      )}
    </div>
  );
}

export default FeedbackPanel;
