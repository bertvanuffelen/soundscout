/**
 * QuickStickers — feedback met één tik tijdens het presenteren (designronde
 * nov 2026, mockup C2).
 *
 * De volledige docent-feedback (FeedbackPanel: sticker, sterren, tekst) zat
 * achter een knopje dat standaard uit stond; in 90 dagen kreeg 1 van de 98
 * inzendingen feedback. Deze smalle rij staat in de presentatie gewoon in
 * beeld: een tik op een sticker bewaart hem meteen, terwijl de klas luistert.
 * Sterren en tekst die er al waren blijven staan; wie meer wil schrijven
 * opent het volledige paneel met de bestaande knop.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import type { Submission } from '../../hooks/useSubmissions';
import type { FeedbackSticker } from '../../lib/submissions';
import { STICKER_ICONS, STICKER_KEYS } from '../../utils/stickerMap';
import { cn } from '../../utils/cn';

interface QuickStickersProps {
  submission: Submission;
  onSave: (feedback: { sticker: FeedbackSticker | null; level: number | null; text: string | null }) => Promise<void>;
}

export function QuickStickers({ submission, onSave }: QuickStickersProps) {
  const { t } = useTranslation();
  const [sticker, setSticker] = useState<FeedbackSticker | null>(submission.feedback_sticker ?? null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const choose = async (key: FeedbackSticker) => {
    const previous = sticker;
    const next = sticker === key ? null : key;
    setSticker(next);
    setState('saving');
    try {
      await onSave({ sticker: next, level: submission.feedback_level ?? null, text: submission.feedback_text ?? null });
      setState('saved');
    } catch {
      // Eerlijk blijven: de sticker is niet bewaard, dus ook niet gekozen
      setSticker(previous);
      setState('error');
    }
  };

  return (
    <div className="mx-3 mt-2 flex flex-wrap items-center justify-center gap-2" data-testid="quick-stickers">
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t('teacher.feedback.stickerLabel')}>
        {STICKER_KEYS.map((key) => {
          const Icon = STICKER_ICONS[key];
          const label = t(`teacher.feedback.stickers.${key}`);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={sticker === key}
              aria-label={label}
              title={label}
              disabled={state === 'saving'}
              onClick={() => choose(key)}
              className={cn(
                'inline-flex items-center gap-1.5 min-h-11 min-w-11 justify-center px-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-60',
                sticker === key
                  ? 'bg-accent-400 text-accent-900'
                  : 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">{label}</span>
            </button>
          );
        })}
      </div>
      <p role="status" className="min-h-5 text-sm font-semibold text-brand-200 inline-flex items-center gap-1.5">
        {state === 'saving' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {state === 'saved' && (
          <>
            <Check className="w-4 h-4 text-success-500" aria-hidden="true" />
            {sticker
              ? t('teacher.presentation.stickerSaved', { name: submission.student_name })
              : t('teacher.presentation.stickerRemoved', { name: submission.student_name })}
          </>
        )}
        {state === 'error' && <span className="text-error-400">{t('teacher.feedback.saveError')}</span>}
      </p>
    </div>
  );
}
