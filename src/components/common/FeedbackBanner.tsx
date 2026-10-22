/**
 * FeedbackBanner - Toont docent-feedback aan de leerling (migratie 026)
 *
 * Warme, kindvriendelijke banner in de studio wanneer een compositie via
 * een bewaarcode is geladen en de juf/meester feedback heeft gegeven.
 */

import { useTranslation } from 'react-i18next';
import { X, Star } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { StickerIcon } from '../../utils/stickerMap';
import { peerChipLabel } from '../../utils/peerChipLabel';

export function FeedbackBanner() {
  const { t, i18n } = useTranslation();
  const feedback = useAppStore((s) => s.receivedFeedback);
  const setReceivedFeedback = useAppStore((s) => s.setReceivedFeedback);

  if (!feedback) return null;

  return (
    <div
      role="status"
      /* w-full + min-w-0 (B1): in de gecentreerde podiumkaart groeide de
         banner anders mee met zijn tekst en liep hij op mobiel buiten beeld */
      className="w-full min-w-0 mt-2 flex items-start gap-3 rounded-2xl border-2 border-accent-200 bg-accent-50 px-4 py-3 shadow-sm"
    >
      <StickerIcon sticker={feedback.sticker} fallback size={28} className="shrink-0" />
      <div className="flex-1 min-w-0">
        {(feedback.sticker || feedback.level != null || feedback.text) && (
          <p className="font-bold text-text-main text-sm sm:text-base">
            {t('studentFeedback.bannerTitle')}
            {feedback.sticker && (
              <span className="ml-1.5 font-extrabold">
                {t(`teacher.feedback.stickers.${feedback.sticker}`)}
              </span>
            )}
            {feedback.level != null && (
              <span className="inline-flex items-center ml-2 align-text-bottom">
                {Array.from({ length: feedback.level }, (_, i) => (
                  <Star key={i} className="w-4 h-4 text-accent-500 fill-accent-500" />
                ))}
              </span>
            )}
          </p>
        )}
        {feedback.text && (
          <p className="text-text-muted text-sm whitespace-normal break-words">
            &ldquo;{feedback.text}&rdquo;
          </p>
        )}
        {/* Klasgenoot-beoordelingen (anoniem geaggregeerd, migratie 028):
            gemiddelde sterren per criterium + aantal beoordelaars */}
        {feedback.compliments && feedback.compliments.length > 0 && (
          <div className="text-text-muted text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-text-main">{t('studentFeedback.complimentsTitle')}</span>
            {feedback.compliments.map((c) => (
              <span key={c.chip} className="inline-flex items-center gap-1">
                {peerChipLabel(c.chip, i18n.language)}
                {c.avgStars != null && (
                  <span className="inline-flex items-center" aria-label={t('studentFeedback.avgStars', { stars: c.avgStars })}>
                    {Array.from({ length: Math.max(1, Math.round(c.avgStars)) }, (_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-accent-500 fill-accent-500" aria-hidden="true" />
                    ))}
                  </span>
                )}
                <span className="text-xs">({c.count})</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setReceivedFeedback(null)}
        aria-label={t('common.close')}
        className="p-1.5 text-text-muted hover:text-text-main rounded-full hover:bg-accent-100 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default FeedbackBanner;
