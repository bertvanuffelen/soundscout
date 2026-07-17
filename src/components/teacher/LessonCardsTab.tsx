/**
 * LessonCardsTab - Leskaart-bibliotheek in het docentendashboard
 *
 * Master-detail (in lijn met de landingspagina): links een selecteerbare lijst
 * met leskaarten (ingebouwd + eigen), rechts het detail met lesdoel, fasen,
 * "Download pdf" en "Activeer in klas". Docenten maken eigen leskaarten via de
 * editor; ingebouwde kaarten zijn alleen-lezen.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Download, Play, FileText, Pencil, Trash2, Clock } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useLessonCards } from '../../hooks/useLessonCards';
import { localizeLessonCard, getLessonCardThemeId, type LessonCard, type LessonCardInput } from '../../lib/lessonCards';
import { getTeacherThemes, getThemeSeasonInfo } from '../../data/themes';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SectionTitle, GuideLink } from './common';
import { TYPE_META } from './assignmentTypeMeta';
import { ThemeSeasonBadge } from './ThemeSeasonBadge';
import { ActivateLessonCardModal } from './ActivateLessonCardModal';
import { LessonCardEditorModal } from './LessonCardEditorModal';
import { cn } from '../../utils/cn';

interface LessonCardsTabProps {
  classes: TeacherClass[];
  onCreateClass: (name: string) => Promise<TeacherClass>;
  /** builtin_key van een leskaart om standaard te selecteren (landing-deeplink). */
  initialSelectKey?: string | null;
}


export function LessonCardsTab({ classes, onCreateClass, initialSelectKey }: LessonCardsTabProps) {
  const { t } = useTranslation();
  const { cards, loading, error, create, update, remove, refetch } = useLessonCards();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activateCard, setActivateCard] = useState<LessonCard | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editCard, setEditCard] = useState<LessonCard | null>(null);
  const [deleteCard, setDeleteCard] = useState<LessonCard | null>(null);
  // Seizoensregel (17-7): activeren van een buiten-seizoen-leskaart vraagt
  // één zachte bevestiging — nooit blokkeren of verbergen
  const [seasonConfirmCard, setSeasonConfirmCard] = useState<LessonCard | null>(null);

  // Filters (opdrachten-model 17-7): thema is een kenmerk dwars door alles
  // heen (afgeleid uit de inhoud), niveau komt uit het level-veld
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const cardTheme = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of cards) map.set(c.id, getLessonCardThemeId(c));
    return map;
  }, [cards]);

  // Alleen chips voor thema's die daadwerkelijk leskaarten hebben
  // (+ "algemeen" voor niet-thematische kaarten zoals templates)
  const themeChips = useMemo(() => {
    const present = new Set(cardTheme.values());
    const chips = getTeacherThemes().filter((th) => present.has(th.id));
    return { chips, hasGeneral: present.has(null) };
  }, [cardTheme]);

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) {
      const lvl = localizeLessonCard(t, c).level;
      if (lvl) set.add(lvl);
    }
    return [...set].sort();
  }, [cards, t]);

  const filteredCards = useMemo(() => cards.filter((c) => {
    if (themeFilter !== 'all') {
      const th = cardTheme.get(c.id) ?? null;
      if (themeFilter === 'general' ? th !== null : th !== themeFilter) return false;
    }
    if (levelFilter !== 'all' && localizeLessonCard(t, c).level !== levelFilter) return false;
    return true;
  }), [cards, themeFilter, levelFilter, cardTheme, t]);

  // Geen effect nodig: `selected` valt terug op de deeplink-kaart (indien nog
  // niets expliciet gekozen), anders op de eerste zichtbare kaart.
  const selected = useMemo(() => {
    if (selectedId) return cards.find((c) => c.id === selectedId) ?? filteredCards[0] ?? null;
    if (initialSelectKey) {
      const match = cards.find((c) => c.builtinKey === initialSelectKey);
      if (match) return match;
    }
    return filteredCards[0] ?? null;
  }, [cards, filteredCards, selectedId, initialSelectKey]);

  // Zachte seizoensbevestiging vóór het activeren
  const handleActivateRequest = (card: LessonCard) => {
    const info = getThemeSeasonInfo(cardTheme.get(card.id) ?? null);
    if (!info.inSeason) {
      setSeasonConfirmCard(card);
    } else {
      setActivateCard(card);
    }
  };

  const handleSave = async (input: LessonCardInput) => {
    if (editCard) {
      const updated = await update(editCard.id, input);
      setSelectedId(updated.id);
    } else {
      const created = await create(input);
      setSelectedId(created.id);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCard) return;
    await remove(deleteCard.id);
    if (selectedId === deleteCard.id) setSelectedId(null);
    setDeleteCard(null);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-1 min-w-0">
          <SectionTitle as="h3" size="md" className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-600" />
            {t('lessonCards.tabTitle')}
          </SectionTitle>
          <GuideLink sectionId="lesson-cards" />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setEditCard(null); setShowEditor(true); }}
          className="inline-flex items-center gap-1 rounded-full flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('lessonCards.newButton')}
        </Button>
      </div>
      <p className="text-text-muted text-sm mb-4">{t('lessonCards.sectionSubtitle')}</p>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
          {error}
          <button onClick={() => refetch()} className="ml-2 underline">{t('common.retry')}</button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto" />
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <FilterChip label={t('lessonCards.filterAll')} active={themeFilter === 'all'} onClick={() => setThemeFilter('all')} />
          {themeChips.chips.map((th) => (
            <FilterChip
              key={th.id}
              label={t(th.name)}
              active={themeFilter === th.id}
              onClick={() => setThemeFilter(th.id)}
              outOfSeason={!getThemeSeasonInfo(th.id).inSeason}
            />
          ))}
          {themeChips.hasGeneral && (
            <FilterChip label={t('lessonCards.filterGeneral')} active={themeFilter === 'general'} onClick={() => setThemeFilter('general')} />
          )}
          {levels.length > 1 && (
            <>
              <span className="w-px h-4 bg-border-subtle mx-1" aria-hidden="true" />
              {levels.map((lvl) => (
                <FilterChip
                  key={lvl}
                  label={lvl}
                  active={levelFilter === lvl}
                  onClick={() => setLevelFilter(levelFilter === lvl ? 'all' : lvl)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
          {/* Master: lijst (gefilterd) */}
          <div className="space-y-2">
            {filteredCards.length === 0 && (
              <p className="text-text-muted text-sm p-3">{t('lessonCards.filterEmpty')}</p>
            )}
            {filteredCards.map((c) => {
              const meta = TYPE_META[c.assignmentType];
              const active = selected?.id === c.id;
              const loc = localizeLessonCard(t, c);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                    active
                      ? 'border-accent-400 bg-accent-50 shadow-sm'
                      : 'border-border-subtle bg-bg-surface hover:border-accent-300'
                  }`}
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
                      <ThemeSeasonBadge themeId={cardTheme.get(c.id)} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selected ? (
            <LessonDetail
              card={selected}
              themeId={cardTheme.get(selected.id) ?? null}
              onActivate={() => handleActivateRequest(selected)}
              onEdit={() => { setEditCard(selected); setShowEditor(true); }}
              onDelete={() => setDeleteCard(selected)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-neutral-50 flex items-center justify-center p-10 text-center">
              <p className="text-text-muted text-sm">{t('lessonCards.empty')}</p>
            </div>
          )}
        </div>
      )}

      {/* Activeren */}
      <ActivateLessonCardModal
        isOpen={!!activateCard}
        onClose={() => setActivateCard(null)}
        lessonCard={activateCard}
        classes={classes}
        onCreateClass={onCreateClass}
      />

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
            onClick={() => { setActivateCard(seasonConfirmCard); setSeasonConfirmCard(null); }}
            className="flex-1"
          >
            {t('lessonCards.seasonConfirmButton')}
          </Button>
        </div>
      </Modal>

      {/* Editor */}
      <LessonCardEditorModal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        card={editCard}
        onSave={handleSave}
      />

      {/* Verwijder-bevestiging */}
      <Modal
        isOpen={!!deleteCard}
        onClose={() => setDeleteCard(null)}
        title={t('lessonCards.deleteTitle')}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed whitespace-pre-line text-center">
          {t('lessonCards.deleteConfirm')}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteCard(null)} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// --- Filterchip (thema/niveau) ---

function FilterChip({
  label,
  active,
  onClick,
  outOfSeason = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  outOfSeason?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border transition-colors',
        active
          ? 'bg-accent-100 border-accent-300 text-accent-800'
          : 'bg-bg-surface border-border-subtle text-text-muted hover:text-text-main hover:border-accent-300',
        outOfSeason && !active && 'text-text-muted/70',
      )}
    >
      {label}
      {outOfSeason && <Clock className="w-3 h-3 text-warning-500" aria-hidden="true" />}
    </button>
  );
}

// --- Detail-paneel ---

function LessonDetail({
  card,
  themeId,
  onActivate,
  onEdit,
  onDelete,
}: {
  card: LessonCard;
  themeId: string | null;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const meta = TYPE_META[card.assignmentType];
  const loc = localizeLessonCard(t, card);

  return (
    <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5 sm:p-6">
      {/* Cover */}
      {card.coverImage && (
        <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-video mb-4">
          <img src={card.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Type + niveau + ingebouwd-badge */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 rounded-full text-xs font-bold px-2.5 py-0.5 ${meta.badge}`}>
          <meta.Icon className="w-3.5 h-3.5" />
          {t(meta.labelKey)}
        </span>
        {loc.level && <span className="text-sm text-text-muted">{loc.level}</span>}
        <ThemeSeasonBadge themeId={themeId} />
        {card.isBuiltin && (
          <span className="inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-text-muted uppercase tracking-wide">
            {t('lessonCards.builtinBadge')}
          </span>
        )}
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight text-text-main mb-3">{loc.title}</h2>

      {loc.lessonGoal && (
        <p className="text-sm text-text-main mb-4 leading-relaxed">
          <span className="font-bold">{t('lessonCards.goalLabel')} </span>
          {loc.lessonGoal}
        </p>
      )}

      {loc.phases.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-text-main mb-2">{t('lessonCards.phasesTitle')}</h3>
          <ul className="space-y-2">
            {loc.phases.map((p, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                <p className="text-sm text-text-muted">
                  <span className="font-semibold text-text-main">{p.name}</span>
                  {p.name && p.text ? ' — ' : ''}
                  {p.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Acties */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          variant="primary"
          onClick={onActivate}
          className="inline-flex items-center gap-1.5 rounded-full"
        >
          <Play className="w-4 h-4" />
          {t('lessonCards.activate')}
        </Button>
        {card.pdfUrl && (
          <a
            href={card.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold border border-border-subtle text-text-main hover:bg-neutral-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('lessonCards.download')}
          </a>
        )}
        {!card.isBuiltin && (
          <>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
            >
              <Pencil className="w-4 h-4" />
              {t('common.edit')}
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-text-muted hover:text-error-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default LessonCardsTab;
