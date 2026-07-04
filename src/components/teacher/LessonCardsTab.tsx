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
import { Loader2, Plus, Download, Play, FileText, MapPin, Clapperboard, Music, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useLessonCards } from '../../hooks/useLessonCards';
import type { LessonCard, LessonCardInput } from '../../lib/lessonCards';
import type { AssignmentType } from '../../lib/assignments';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SectionTitle } from './common';
import { ActivateLessonCardModal } from './ActivateLessonCardModal';
import { LessonCardEditorModal } from './LessonCardEditorModal';

interface LessonCardsTabProps {
  classes: TeacherClass[];
  onCreateClass: (name: string) => Promise<TeacherClass>;
}

const TYPE_META: Record<AssignmentType, { Icon: LucideIcon; badge: string; labelKey: string }> = {
  template: { Icon: FileText, badge: 'bg-accent-100 text-accent-800', labelKey: 'templates.typeTemplate' },
  praatplaat: { Icon: MapPin, badge: 'bg-teal-100 text-teal-700', labelKey: 'templates.typePraatplaat' },
  storyboard: { Icon: Clapperboard, badge: 'bg-purple-100 text-purple-700', labelKey: 'templates.typeStoryboard' },
  free: { Icon: Music, badge: 'bg-rose-100 text-rose-700', labelKey: 'templates.typeFree' },
};

export function LessonCardsTab({ classes, onCreateClass }: LessonCardsTabProps) {
  const { t } = useTranslation();
  const { cards, loading, error, create, update, remove, refetch } = useLessonCards();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activateCard, setActivateCard] = useState<LessonCard | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editCard, setEditCard] = useState<LessonCard | null>(null);
  const [deleteCard, setDeleteCard] = useState<LessonCard | null>(null);

  // Geen effect nodig: `selected` valt terug op de eerste kaart zolang er niets
  // expliciet gekozen is (de lijst-highlight volgt `selected`).
  const selected = useMemo(
    () => cards.find((c) => c.id === selectedId) ?? cards[0] ?? null,
    [cards, selectedId],
  );

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
        <SectionTitle as="h3" size="md" className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent-600" />
          {t('lessonCards.tabTitle')}
        </SectionTitle>
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

      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
          {/* Master: lijst */}
          <div className="space-y-2">
            {cards.map((c) => {
              const meta = TYPE_META[c.assignmentType];
              const active = selected?.id === c.id;
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
                    <p className="font-semibold text-text-main text-sm truncate">{c.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5 ${meta.badge}`}>
                        {t(meta.labelKey)}
                      </span>
                      {c.level && <span className="text-xs text-text-muted truncate">{c.level}</span>}
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
              onActivate={() => setActivateCard(selected)}
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

// --- Detail-paneel ---

function LessonDetail({
  card,
  onActivate,
  onEdit,
  onDelete,
}: {
  card: LessonCard;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const meta = TYPE_META[card.assignmentType];

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
        {card.level && <span className="text-sm text-text-muted">{card.level}</span>}
        {card.isBuiltin && (
          <span className="inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-text-muted uppercase tracking-wide">
            {t('lessonCards.builtinBadge')}
          </span>
        )}
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight text-text-main mb-3">{card.title}</h2>

      {card.lessonGoal && (
        <p className="text-sm text-text-main mb-4 leading-relaxed">
          <span className="font-bold">{t('lessonCards.goalLabel')} </span>
          {card.lessonGoal}
        </p>
      )}

      {card.phases.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-text-main mb-2">{t('lessonCards.phasesTitle')}</h3>
          <ul className="space-y-2">
            {card.phases.map((p, i) => (
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
