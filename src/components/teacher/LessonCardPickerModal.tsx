/**
 * LessonCardPickerModal — leskaart kiezen en direct activeren voor één klas.
 *
 * Onderdeel van de startkeuze in het klaslokaal (opdrachten-model 17-7):
 * "Gebruik een leskaart" opent deze picker; de klas staat al vast, dus
 * activeren is één klik (anders dan ActivateLessonCardModal, die eerst een
 * klas laat kiezen). Seizoensregel: buiten-seizoen kaarten tonen een badge
 * en vragen één zachte bevestiging — nooit blokkeren.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Play } from 'lucide-react';
import { useLessonCards } from '../../hooks/useLessonCards';
import { localizeLessonCard, getLessonCardThemeId, activateLessonCard, type LessonCard } from '../../lib/lessonCards';
import { getThemeSeasonInfo } from '../../data/themes';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ThemeSeasonBadge } from './ThemeSeasonBadge';
import { TYPE_META } from './assignmentTypeMeta';
import { logger } from '../../utils/logger';

interface LessonCardPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  classCode: string;
  /** true = er is al een actieve opdracht; activeren vervangt die */
  hasActiveAssignment: boolean;
  /** Na een geslaagde activatie (voor refetch van de actieve opdracht) */
  onActivated: () => void;
}

export function LessonCardPickerModal({
  isOpen,
  onClose,
  classId,
  classCode,
  hasActiveAssignment,
  onActivated,
}: LessonCardPickerModalProps) {
  const { t } = useTranslation();
  const { cards, loading, error: loadError, refetch } = useLessonCards();

  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [seasonConfirmCard, setSeasonConfirmCard] = useState<LessonCard | null>(null);
  const [activatedCard, setActivatedCard] = useState<LessonCard | null>(null);

  const runActivate = async (card: LessonCard) => {
    setActivatingId(card.id);
    setActivateError(null);
    try {
      await activateLessonCard(card.id, classId);
      setActivatedCard(card);
      onActivated();
    } catch (err) {
      logger.error('Leskaart activeren mislukt:', err);
      setActivateError(err instanceof Error ? err.message : t('assignments.activateError'));
    }
    setActivatingId(null);
  };

  const handlePick = (card: LessonCard) => {
    if (activatingId) return;
    const info = getThemeSeasonInfo(getLessonCardThemeId(card));
    if (!info.inSeason) {
      setSeasonConfirmCard(card);
    } else {
      void runActivate(card);
    }
  };

  const handleClose = () => {
    setActivatedCard(null);
    setActivateError(null);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={t('lessonCards.pickerTitle')} size="lg">
        {/* Succes: leskaart actief → klascode groot in beeld */}
        {activatedCard ? (
          <div className="text-center py-4">
            <p className="text-text-main font-semibold mb-1">
              {t('lessonCards.pickerActivated', { title: localizeLessonCard(t, activatedCard).title })}
            </p>
            <p className="text-text-muted text-sm mb-5">{t('lessonCards.pickerCodeHint')}</p>
            <p className="font-mono font-extrabold tracking-[0.3em] text-4xl text-text-main mb-6">{classCode}</p>
            <Button variant="primary" onClick={handleClose} className="w-full sm:w-auto sm:min-w-[200px]">
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <>
            {hasActiveAssignment && (
              <p className="text-sm text-warning-600 bg-warning-50 border border-warning-100 rounded-xl px-3 py-2 mb-4">
                {t('lessonCards.pickerReplaceWarning')}
              </p>
            )}

            {loadError && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
                {loadError}
                <button onClick={() => refetch()} className="ml-2 underline">{t('common.retry')}</button>
              </div>
            )}
            {activateError && (
              <p role="alert" className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
                {activateError}
              </p>
            )}

            {loading && (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto" />
              </div>
            )}

            {!loading && !loadError && (
              <div className="space-y-2 max-h-[55dvh] overflow-y-auto pr-1">
                {cards.map((c) => {
                  const meta = TYPE_META[c.assignmentType];
                  const loc = localizeLessonCard(t, c);
                  const busy = activatingId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!!activatingId}
                      onClick={() => handlePick(c)}
                      className="w-full text-left p-3 rounded-2xl border-2 border-border-subtle bg-bg-surface hover:border-accent-300 transition-all flex items-center gap-3 disabled:opacity-60"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0 flex items-center justify-center">
                        {c.coverImage ? (
                          <img src={c.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <meta.Icon className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text-main text-sm truncate">{loc.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5 ${meta.badge}`}>
                            {t(meta.labelKey)}
                          </span>
                          {loc.level && <span className="text-xs text-text-muted truncate">{loc.level}</span>}
                          <ThemeSeasonBadge themeId={getLessonCardThemeId(c)} />
                        </div>
                      </div>
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin text-accent-500 shrink-0" aria-hidden="true" />
                      ) : (
                        <Play className="w-4 h-4 text-accent-500 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
                {cards.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-6">{t('lessonCards.empty')}</p>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Zachte seizoensbevestiging (nooit blokkeren) */}
      <Modal
        isOpen={!!seasonConfirmCard}
        onClose={() => setSeasonConfirmCard(null)}
        title={t('lessonCards.seasonConfirmTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">
          {t('lessonCards.seasonConfirmBody')}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setSeasonConfirmCard(null)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const card = seasonConfirmCard;
              setSeasonConfirmCard(null);
              if (card) void runActivate(card);
            }}
            className="flex-1"
          >
            {t('lessonCards.seasonConfirmButton')}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default LessonCardPickerModal;
