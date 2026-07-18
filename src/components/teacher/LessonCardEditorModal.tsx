/**
 * LessonCardEditorModal - Leskaart samenstellen of bewerken
 *
 * Eén formulier in vier delen: opdracht-type → resource → opdrachtkaart →
 * presentatie (titel, niveau, lesdoel, fasen, pdf). De docent stelt zo een
 * herbruikbaar "pakket" samen. Bij opslaan wordt een `LessonCardInput`
 * opgebouwd; de cover-afbeelding volgt automatisch uit de gekozen resource.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { useAssignmentCards } from '../../hooks/useAssignmentCards';
import { getPraatplaatCatalog } from '../../data/praatplaatCatalog';
import { getAllMultiImageStoryboards, getTeacherThemes, getThemeSeasonInfo } from '../../data/themes';
import { MAX_CARD_BULLETS } from '../../lib/assignmentCards';
import type { AssignmentType } from '../../lib/assignments';
import { normalizeLevelToBuckets, LEVEL_BUCKETS, type LessonCard, type LessonCardInput, type LessonPhase } from '../../lib/lessonCards';
import type { OpdrachtkaartContent } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface LessonCardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Bestaande leskaart om te bewerken, of null voor een nieuwe. */
  card: LessonCard | null;
  onSave: (input: LessonCardInput) => Promise<void>;
  /**
   * Voorinvulling voor een níeuwe leskaart ("Bewaar als leskaart", M4):
   * bv. type template + template-id + titelsuggestie. Genegeerd bij bewerken.
   */
  prefill?: { assignmentType: AssignmentType; templateId?: string; title?: string } | null;
}

const TYPES: AssignmentType[] = ['praatplaat', 'storyboard', 'free', 'template'];

const praatplaatCatalog = getPraatplaatCatalog();
const storyboards = getAllMultiImageStoryboards();
// Docent-kiezer: óók buiten-seizoen thema's, met tekst-suffix (seizoensregel 17-7)
const assignableThemes = getTeacherThemes();

export function LessonCardEditorModal({ isOpen, onClose, card, onSave, prefill = null }: LessonCardEditorModalProps) {
  const { t } = useTranslation();
  const { templates } = useTemplates();
  const { cards: assignmentCards, create: createOpdrachtkaart } = useAssignmentCards();
  const activeTemplates = useMemo(() => templates.filter((tmpl) => tmpl.isActive), [templates]);

  const [assignmentType, setAssignmentType] = useState<AssignmentType>('praatplaat');
  // Resource-referentie per type (één van deze is relevant, afhankelijk van type)
  const [templateId, setTemplateId] = useState('');
  const [praatplaatRef, setPraatplaatRef] = useState('');
  const [storyboardRef, setStoryboardRef] = useState('');
  const [freeThemeId, setFreeThemeId] = useState('');
  // Opdrachtkaart (leerling-tekst): geen / kies bestaande / zelf maken
  const [cardMode, setCardMode] = useState<'none' | 'existing' | 'inline'>('none');
  const [cardId, setCardId] = useState('');
  const [inlineCardTitle, setInlineCardTitle] = useState('');
  const [inlineBullets, setInlineBullets] = useState<string[]>(['']);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('');
  const [lessonGoal, setLessonGoal] = useState('');
  const [phases, setPhases] = useState<LessonPhase[]>([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (Her)initialiseer bij openen
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSaving(false);
    if (card) {
      setAssignmentType(card.assignmentType);
      setTemplateId(card.templateId ?? '');
      setPraatplaatRef(card.praatplaatRef ?? '');
      setStoryboardRef(card.storyboardRef ?? '');
      setFreeThemeId(card.freeThemeId ?? '');
      setCardId(card.cardId ?? '');
      // Opdrachtkaart-modus afleiden uit de bestaande leskaart
      if (card.cardId) {
        setCardMode('existing');
        setInlineCardTitle('');
        setInlineBullets(['']);
      } else if (card.cardInline) {
        setCardMode('inline');
        setInlineCardTitle(card.cardInline.title);
        setInlineBullets(card.cardInline.bullets.length > 0 ? [...card.cardInline.bullets] : ['']);
      } else {
        setCardMode('none');
        setInlineCardTitle('');
        setInlineBullets(['']);
      }
      setSaveToLibrary(false);
      setTitle(card.title);
      setLevel(card.level ?? '');
      setLessonGoal(card.lessonGoal ?? '');
      setPhases(card.phases.length > 0 ? card.phases : []);
      setPdfUrl(card.pdfUrl ?? '');
    } else {
      // Nieuwe kaart — met optionele voorinvulling ("Bewaar als leskaart", M4)
      setAssignmentType(prefill?.assignmentType ?? 'praatplaat');
      setTemplateId(prefill?.templateId ?? '');
      setPraatplaatRef('');
      setStoryboardRef('');
      setFreeThemeId('');
      setCardId('');
      setCardMode('none');
      setInlineCardTitle('');
      setInlineBullets(['']);
      setSaveToLibrary(false);
      setTitle(prefill?.title ?? '');
      setLevel('');
      setLessonGoal('');
      setPhases([]);
      setPdfUrl('');
    }
  }, [isOpen, card, prefill]);

  // Titel voorvullen op basis van de gekozen resource (alleen als leeg)
  const prefillTitle = (name: string) => {
    setTitle((prev) => (prev.trim() ? prev : name));
  };

  const addPhase = () => setPhases((prev) => [...prev, { name: '', text: '' }]);
  const updatePhase = (i: number, field: keyof LessonPhase, value: string) =>
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  const removePhase = (i: number) => setPhases((prev) => prev.filter((_, idx) => idx !== i));

  // Bullets van de inline opdrachtkaart (leerling-tekst)
  const updateBullet = (i: number, value: string) =>
    setInlineBullets((prev) => prev.map((b, idx) => (idx === i ? value : b)));
  const addBullet = () =>
    setInlineBullets((prev) => (prev.length >= MAX_CARD_BULLETS ? prev : [...prev, '']));
  const removeBullet = (i: number) =>
    setInlineBullets((prev) => (prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i)));

  /** Bouw de LessonCardInput; retourneert null bij ontbrekende verplichte velden. */
  const buildInput = (
    resolvedCardId: string | null,
    resolvedCardInline: OpdrachtkaartContent | null,
  ): LessonCardInput | null => {
    if (!title.trim()) {
      setError(t('lessonCards.editor.titleRequired'));
      return null;
    }
    const base = {
      assignmentType,
      cardId: resolvedCardId,
      cardInline: resolvedCardInline,
      title: title.trim(),
      level: level.trim() || null,
      lessonGoal: lessonGoal.trim() || null,
      phases: phases.map((p) => ({ name: p.name.trim(), text: p.text.trim() })).filter((p) => p.name || p.text),
      pdfUrl: pdfUrl.trim() || null,
    };

    if (assignmentType === 'template') {
      if (!templateId) { setError(t('lessonCards.editor.resourceRequired')); return null; }
      return { ...base, templateId, coverImage: null };
    }
    if (assignmentType === 'praatplaat') {
      const entry = praatplaatCatalog.find((e) => e.ref === praatplaatRef);
      if (!entry) { setError(t('lessonCards.editor.resourceRequired')); return null; }
      return {
        ...base,
        praatplaatRef: entry.ref,
        ppThemeId: entry.themeId,
        ppLocationId: entry.locationId,
        ppImageUrl: entry.imageUrl,
        coverImage: entry.imageUrl,
      };
    }
    if (assignmentType === 'storyboard') {
      const sb = storyboards.find((s) => s.storyboard.id === storyboardRef);
      if (!sb) { setError(t('lessonCards.editor.resourceRequired')); return null; }
      return { ...base, storyboardRef: sb.storyboard.id, coverImage: sb.storyboard.coverImage };
    }
    // free
    const theme = assignableThemes.find((th) => th.id === freeThemeId);
    if (!theme) { setError(t('lessonCards.editor.resourceRequired')); return null; }
    return { ...base, freeThemeId: theme.id, coverImage: theme.map.backgroundImage };
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      // Opdrachtkaart (leerling-tekst) oplossen op basis van de gekozen modus
      let resolvedCardId: string | null = null;
      let resolvedCardInline: OpdrachtkaartContent | null = null;
      if (cardMode === 'existing') {
        resolvedCardId = cardId || null;
      } else if (cardMode === 'inline') {
        const cardTitle = inlineCardTitle.trim();
        const bullets = inlineBullets.map((b) => b.trim()).filter((b) => b.length > 0);
        if (!cardTitle) {
          setError(t('lessonCards.editor.inlineCardTitleRequired'));
          setSaving(false);
          return;
        }
        if (saveToLibrary) {
          // Herbruikbare opdrachtkaart aanmaken in de bibliotheek → koppel via id
          const created = await createOpdrachtkaart({ title: cardTitle, bullets });
          resolvedCardId = created.id;
        } else {
          // Alleen aan deze leskaart gebonden (card_inline)
          resolvedCardInline = { title: cardTitle, bullets };
        }
      }

      const input = buildInput(resolvedCardId, resolvedCardInline);
      if (!input) {
        setSaving(false);
        return;
      }
      await onSave(input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lessonCards.editor.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5';
  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-border-subtle bg-white text-text-main text-sm focus:outline-none focus:border-accent-400';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={card ? t('lessonCards.editor.editTitle') : t('lessonCards.editor.newTitle')}
      size="xl"
    >
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* 1. Type */}
        <div>
          <label className={labelCls}>{t('lessonCards.editor.typeLabel')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAssignmentType(type)}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  assignmentType === type
                    ? 'border-accent-500 bg-accent-50 text-text-main'
                    : 'border-border-subtle bg-white text-text-muted hover:border-accent-300'
                }`}
              >
                {t(`assignments.types.${type}.title`)}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Resource (per type) */}
        <div>
          <label className={labelCls}>{t('lessonCards.editor.resourceLabel')}</label>
          {assignmentType === 'template' && (
            <select
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                const tmpl = activeTemplates.find((x) => x.id === e.target.value);
                if (tmpl) prefillTitle(tmpl.name);
              }}
              className={inputCls}
            >
              <option value="">{t('lessonCards.editor.resourcePlaceholder')}</option>
              {activeTemplates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
              ))}
            </select>
          )}
          {assignmentType === 'praatplaat' && (
            <select
              value={praatplaatRef}
              onChange={(e) => {
                setPraatplaatRef(e.target.value);
                const entry = praatplaatCatalog.find((x) => x.ref === e.target.value);
                if (entry) prefillTitle(t(entry.nameKey));
              }}
              className={inputCls}
            >
              <option value="">{t('lessonCards.editor.resourcePlaceholder')}</option>
              {praatplaatCatalog.map((entry) => (
                <option key={entry.ref} value={entry.ref}>{t(entry.nameKey)}</option>
              ))}
            </select>
          )}
          {assignmentType === 'storyboard' && (
            <select
              value={storyboardRef}
              onChange={(e) => {
                setStoryboardRef(e.target.value);
                const sb = storyboards.find((x) => x.storyboard.id === e.target.value);
                if (sb) prefillTitle(t(sb.storyboard.name));
              }}
              className={inputCls}
            >
              <option value="">{t('lessonCards.editor.resourcePlaceholder')}</option>
              {storyboards.map((sb) => (
                <option key={sb.storyboard.id} value={sb.storyboard.id}>{t(sb.storyboard.name)}</option>
              ))}
            </select>
          )}
          {assignmentType === 'free' && (
            <select
              value={freeThemeId}
              onChange={(e) => {
                setFreeThemeId(e.target.value);
                const theme = assignableThemes.find((x) => x.id === e.target.value);
                if (theme) prefillTitle(t(theme.name));
              }}
              className={inputCls}
            >
              <option value="">{t('lessonCards.editor.resourcePlaceholder')}</option>
              {assignableThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {t(theme.name)}{!getThemeSeasonInfo(theme.id).inSeason ? ` ${t('themes.seasonSuffix')}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 3. Opdrachtkaart (leerling-tekst) */}
        <div>
          <label className={labelCls}>{t('lessonCards.editor.cardLabel')}</label>
          <p className="text-xs text-text-muted -mt-1 mb-2">{t('lessonCards.editor.cardStudentHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['none', 'existing', 'inline'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCardMode(mode)}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  cardMode === mode
                    ? 'border-accent-500 bg-accent-50 text-text-main'
                    : 'border-border-subtle bg-white text-text-muted hover:border-accent-300'
                }`}
              >
                {t(`lessonCards.editor.cardMode.${mode}`)}
              </button>
            ))}
          </div>

          {cardMode === 'existing' && (
            <div className="mt-3">
              {assignmentCards.length > 0 ? (
                <select value={cardId} onChange={(e) => setCardId(e.target.value)} className={inputCls}>
                  <option value="">{t('assignments.cardNone')}</option>
                  {assignmentCards.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-text-muted">{t('lessonCards.editor.cardNoLibrary')}</p>
              )}
            </div>
          )}

          {cardMode === 'inline' && (
            <div className="mt-3 space-y-3 rounded-xl border border-border-subtle bg-bg-app/40 p-3">
              <div>
                <label className={labelCls}>{t('lessonCards.editor.inlineCardTitleLabel')}</label>
                <input
                  type="text"
                  value={inlineCardTitle}
                  onChange={(e) => setInlineCardTitle(e.target.value)}
                  placeholder={t('lessonCards.editor.inlineCardTitlePlaceholder')}
                  maxLength={120}
                  className={inputCls}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls + ' mb-0'}>{t('lessonCards.editor.inlineBulletsLabel')}</label>
                  <span className="text-xs text-text-muted">
                    {inlineBullets.filter((b) => b.trim()).length}/{MAX_CARD_BULLETS}
                  </span>
                </div>
                <div className="space-y-2">
                  {inlineBullets.map((bullet, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-text-muted text-sm shrink-0 w-4 text-center">•</span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => updateBullet(index, e.target.value)}
                        maxLength={200}
                        placeholder={t('lessonCards.editor.inlineBulletPlaceholder')}
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => removeBullet(index)}
                        className="text-text-muted hover:text-error-500 p-1.5 transition-colors shrink-0"
                        title={t('assignmentCards.removeBullet')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {inlineBullets.length < MAX_CARD_BULLETS && (
                  <button
                    type="button"
                    onClick={addBullet}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    {t('assignmentCards.addBullet')}
                  </button>
                )}
              </div>
              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-accent-500 cursor-pointer"
                />
                <span className="text-sm text-text-main">
                  {t('lessonCards.editor.saveToLibraryLabel')}
                  <span className="block text-xs text-text-muted">{t('lessonCards.editor.saveToLibraryHint')}</span>
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 4. Presentatie (docent-facing) */}
        <div className="border-t border-border-subtle pt-5 space-y-4">
          <p className="text-xs text-text-muted -mt-1">{t('lessonCards.editor.presentationHint')}</p>
          <div>
            <label className={labelCls}>{t('lessonCards.editor.titleLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('lessonCards.editor.titlePlaceholder')}
              maxLength={160}
              className={inputCls}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('lessonCards.editor.levelLabel')}</label>
              {/* Vaste niveau-buckets (G3): NL groepen, EN leeftijden — één datamodel */}
              <select
                value={normalizeLevelToBuckets(level)[0] ?? 'all'}
                onChange={(e) => setLevel(e.target.value)}
                className={inputCls}
              >
                {LEVEL_BUCKETS.map((b) => (
                  <option key={b} value={b}>{t(`lessonCards.levels.${b}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('lessonCards.editor.pdfLabel')}</label>
              <input
                type="text"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder={t('lessonCards.editor.pdfPlaceholder')}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('lessonCards.editor.goalLabel')}</label>
            <textarea
              value={lessonGoal}
              onChange={(e) => setLessonGoal(e.target.value)}
              placeholder={t('lessonCards.editor.goalPlaceholder')}
              rows={2}
              className={`${inputCls} resize-y`}
            />
          </div>

          {/* Fasen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                {t('lessonCards.editor.phasesLabel')}
              </label>
              <button
                type="button"
                onClick={addPhase}
                className="text-xs text-accent-600 hover:text-accent-700 font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('lessonCards.editor.addPhase')}
              </button>
            </div>
            {phases.length === 0 ? (
              <p className="text-text-muted/70 text-xs italic">{t('lessonCards.editor.noPhases')}</p>
            ) : (
              <div className="space-y-2">
                {phases.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePhase(i, 'name', e.target.value)}
                      placeholder={t('lessonCards.editor.phaseNamePlaceholder')}
                      className={`${inputCls} sm:w-40 shrink-0`}
                    />
                    <input
                      type="text"
                      value={p.text}
                      onChange={(e) => updatePhase(i, 'text', e.target.value)}
                      placeholder={t('lessonCards.editor.phaseTextPlaceholder')}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => removePhase(i)}
                      className="text-text-muted hover:text-error-500 p-2 transition-colors shrink-0"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
        <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
}

export default LessonCardEditorModal;
