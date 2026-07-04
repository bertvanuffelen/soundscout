/**
 * ActivateAssignmentModal - Modal om een opdracht te activeren voor een klas
 *
 * Toont de beschikbare templates, praatplaat-catalogus en storyboards. De docent
 * selecteert er één (+ optionele opdrachtkaart) en bevestigt → activeren.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, MapPin, Clapperboard, Music, Check, Loader2 } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { useAssignmentCards } from '../../hooks/useAssignmentCards';
import { getAllMultiImageStoryboards, getAssignableThemes, type StoryboardWithTheme } from '../../data/themes';
import type { ThemeConfig } from '../../data/themes';
import { getPraatplaatCatalog, type PraatplaatCatalogEntry } from '../../data/praatplaatCatalog';
import type { AssignmentType } from '../../lib/assignments';
import type { TeacherTemplate } from '../../lib/templates';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ActivateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateTemplate: (templateId: string, cardId?: string | null) => Promise<void>;
  onActivatePraatplaatFromCatalog: (
    entry: { name: string; themeId: string; locationId: string; imageUrl: string },
    cardId?: string | null,
  ) => Promise<void>;
  onActivateStoryboard: (storyboardRef: string, cardId?: string | null) => Promise<void>;
  /** Activeer een vrije-compositie-opdracht binnen het gekozen thema. */
  onActivateFree: (themeId: string, cardId?: string | null) => Promise<void>;
  /** Beperk de modal tot één opdracht-type. Undefined = alle types (legacy). */
  typeFilter?: AssignmentType;
}

type Selection =
  | { type: 'template'; id: string }
  | { type: 'praatplaat'; id: string }
  | { type: 'storyboard'; id: string }
  | { type: 'free'; id: string }
  | null;

// App-content (registry/catalogus) — voor elke docent hetzelfde, geen hook nodig.
const storyboards: StoryboardWithTheme[] = getAllMultiImageStoryboards();
const praatplaatCatalog: PraatplaatCatalogEntry[] = getPraatplaatCatalog();
const assignableThemes: ThemeConfig[] = getAssignableThemes();

export function ActivateAssignmentModal({
  isOpen,
  onClose,
  onActivateTemplate,
  onActivatePraatplaatFromCatalog,
  onActivateStoryboard,
  onActivateFree,
  typeFilter,
}: ActivateAssignmentModalProps) {
  const { t } = useTranslation();
  const { templates, loading } = useTemplates();
  const { cards } = useAssignmentCards();

  const [selected, setSelected] = useState<Selection>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>(''); // '' = standaard uitleg
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset keuze bij (her)openen of wisselen van type-scope, zodat een selectie
  // van een vorig type niet blijft hangen.
  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setSelectedCardId('');
    setError(null);
  }, [isOpen, typeFilter]);

  const activeTemplates = templates.filter((tmpl) => tmpl.isActive);

  // Type-scoping: undefined = toon alles (legacy); anders alleen dat type.
  const showTemplates = !typeFilter || typeFilter === 'template';
  const showPraatplaten = !typeFilter || typeFilter === 'praatplaat';
  const showStoryboards = !typeFilter || typeFilter === 'storyboard';
  const showFree = !typeFilter || typeFilter === 'free';
  const scoped = !!typeFilter;
  const modalTitle = typeFilter ? t(`assignments.types.${typeFilter}.pickTitle`) : t('assignments.chooseTitle');

  // Voorbeeldpaneel: grote weergave van het geselecteerde item.
  const selectedPraatplaat = selected?.type === 'praatplaat'
    ? praatplaatCatalog.find((e) => e.ref === selected.id) ?? null
    : null;
  const selectedStoryboard = selected?.type === 'storyboard'
    ? storyboards.find((s) => s.storyboard.id === selected.id)?.storyboard ?? null
    : null;
  const selectedFreeTheme = selected?.type === 'free'
    ? assignableThemes.find((th) => th.id === selected.id) ?? null
    : null;
  const previewImage =
    selectedPraatplaat?.imageUrl ??
    selectedStoryboard?.coverImage ??
    selectedFreeTheme?.map.backgroundImage ??
    null;

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const cardId = selectedCardId || null;
    try {
      if (selected.type === 'template') {
        await onActivateTemplate(selected.id, cardId);
      } else if (selected.type === 'praatplaat') {
        const entry = praatplaatCatalog.find((e) => e.ref === selected.id);
        if (entry) {
          await onActivatePraatplaatFromCatalog(
            { name: t(entry.nameKey), themeId: entry.themeId, locationId: entry.locationId, imageUrl: entry.imageUrl },
            cardId,
          );
        }
      } else if (selected.type === 'storyboard') {
        await onActivateStoryboard(selected.id, cardId);
      } else {
        await onActivateFree(selected.id, cardId);
      }
      setSelected(null);
      setSelectedCardId('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignments.activateError'));
    } finally {
      setSaving(false);
    }
  };

  // Lijst met keuze-opties (links). Eén type per keer in de type-first flow;
  // de sectiekopjes tonen alleen in de legacy "alles"-weergave.
  const optionList = (
    <>
      {/* Templates */}
      {showTemplates && (
        <>
          {!scoped && activeTemplates.length > 0 && (
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1">
              {t('templates.typeTemplate')}
            </p>
          )}
          {activeTemplates.map((tmpl) => (
            <TemplateOption
              key={tmpl.id}
              template={tmpl}
              isSelected={selected?.type === 'template' && selected.id === tmpl.id}
              onSelect={() => setSelected({ type: 'template', id: tmpl.id })}
            />
          ))}
          {scoped && activeTemplates.length === 0 && (
            <p className="text-text-muted text-sm text-center py-6">
              {t('templates.templatesEmpty')}
            </p>
          )}
        </>
      )}

      {/* Praatplaat-catalogus */}
      {showPraatplaten && (
        <>
          {!scoped && praatplaatCatalog.length > 0 && (
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1 mt-3">
              {t('templates.typePraatplaat')}
            </p>
          )}
          {praatplaatCatalog.map((entry) => (
            <PraatplaatCatalogOption
              key={entry.ref}
              entry={entry}
              isSelected={selected?.type === 'praatplaat' && selected.id === entry.ref}
              onSelect={() => setSelected({ type: 'praatplaat', id: entry.ref })}
            />
          ))}
        </>
      )}

      {/* Storyboards (app-content) */}
      {showStoryboards && (
        <>
          {!scoped && storyboards.length > 0 && (
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1 mt-3">
              {t('templates.typeStoryboard')}
            </p>
          )}
          {storyboards.map((sb) => (
            <StoryboardOption
              key={sb.storyboard.id}
              storyboard={sb}
              isSelected={selected?.type === 'storyboard' && selected.id === sb.storyboard.id}
              onSelect={() => setSelected({ type: 'storyboard', id: sb.storyboard.id })}
            />
          ))}
        </>
      )}

      {/* Vrije compositie — thema-keuze */}
      {showFree && (
        <>
          {!scoped && assignableThemes.length > 0 && (
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1 mt-3">
              {t('templates.typeFree')}
            </p>
          )}
          {assignableThemes.map((theme) => (
            <FreeThemeOption
              key={theme.id}
              theme={theme}
              isSelected={selected?.type === 'free' && selected.id === theme.id}
              onSelect={() => setSelected({ type: 'free', id: theme.id })}
            />
          ))}
        </>
      )}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
      {!scoped && (
        <p className="text-text-muted text-sm mb-4">
          {t('assignments.chooseDescription')}
        </p>
      )}

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto" />
        </div>
      )}

      {/* Twee kolommen: links de scrollbare keuzelijst, rechts het voorbeeld.
          Op mobiel stapelt de lijst boven, met het voorbeeld eronder. */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Kolom 1 — scrollbare optielijst (eigen scroll-container) */}
          <div className="space-y-2 max-h-[30dvh] md:max-h-[48dvh] overflow-y-auto pr-1 -mr-1">
            {optionList}
          </div>

          {/* Kolom 2 — voorbeeldpaneel (alleen desktop; mobiel hieronder) */}
          <div className="hidden md:block">
            <div className="sticky top-0">
              {previewImage ? (
                <PreviewPanel previewImage={previewImage} storyboard={selectedStoryboard} />
              ) : (
                <div className="rounded-xl border border-dashed border-border-subtle bg-neutral-50 aspect-video flex items-center justify-center px-6 text-center">
                  <p className="text-text-muted text-sm">{t('assignments.previewEmpty')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voorbeeld op mobiel: onder de lijst, alleen bij selectie */}
      {!loading && previewImage && (
        <div className="md:hidden mt-4 pt-4 border-t border-border-subtle">
          <PreviewPanel previewImage={previewImage} storyboard={selectedStoryboard} />
        </div>
      )}

      {/* Opdrachtkaart-keuze (vorm-onafhankelijk) — volle breedte */}
      {!loading && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
            {t('assignments.cardLabel')}
          </label>
          <select
            value={selectedCardId}
            onChange={(e) => setSelectedCardId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-white text-text-main text-sm focus:outline-none focus:border-accent-400"
          >
            <option value="">{t('assignments.cardNone')}</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>{card.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-border-subtle">
        <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="flex-1 inline-flex items-center justify-center gap-1"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {t('assignments.activate')}
        </Button>
      </div>
    </Modal>
  );
}

// --- Voorbeeldpaneel ---

function PreviewPanel({
  previewImage,
  storyboard,
}: {
  previewImage: string;
  storyboard: { images: { id: string; url: string }[] } | null;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
        {t('assignments.previewLabel')}
      </label>
      <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-video border border-border-subtle">
        <img src={previewImage} alt="" className="w-full h-full object-cover" />
      </div>
      {storyboard && storyboard.images.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {storyboard.images.map((img) => (
            <img
              key={img.id}
              src={img.url}
              alt=""
              className="w-16 h-12 rounded-md object-cover shrink-0 border border-border-subtle"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function TemplateOption({
  template,
  isSelected,
  onSelect,
}: {
  template: TeacherTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
        isSelected
          ? 'border-accent-500 bg-accent-50'
          : 'border-border-subtle bg-white hover:border-accent-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-accent-500 text-white' : 'bg-accent-100 text-accent-700'
        }`}>
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-main text-sm truncate">{template.name}</p>
          {template.description && (
            <p className="text-text-muted text-xs truncate">{template.description}</p>
          )}
        </div>
        {isSelected && <Check className="w-4 h-4 text-accent-500 shrink-0" />}
      </div>
    </button>
  );
}

function PraatplaatCatalogOption({
  entry,
  isSelected,
  onSelect,
}: {
  entry: PraatplaatCatalogEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
        isSelected
          ? 'border-accent-500 bg-accent-50'
          : 'border-border-subtle bg-white hover:border-accent-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <img src={entry.imageUrl} alt={t(entry.nameKey)} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-main text-sm truncate">{t(entry.nameKey)}</p>
          <p className="text-text-muted text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {t('templates.typePraatplaat')}
          </p>
        </div>
        {isSelected && <Check className="w-4 h-4 text-accent-500 shrink-0" />}
      </div>
    </button>
  );
}

function StoryboardOption({
  storyboard,
  isSelected,
  onSelect,
}: {
  storyboard: StoryboardWithTheme;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const sb = storyboard.storyboard;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
        isSelected
          ? 'border-accent-500 bg-accent-50'
          : 'border-border-subtle bg-white hover:border-accent-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <img src={sb.coverImage} alt={t(sb.name)} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-main text-sm truncate">{t(sb.name)}</p>
          <p className="text-text-muted text-xs flex items-center gap-1">
            <Clapperboard className="w-3 h-3" />
            {t('assignmentLanding.template.storyboardCount', { count: sb.images.length })}
          </p>
        </div>
        {isSelected && <Check className="w-4 h-4 text-accent-500 shrink-0" />}
      </div>
    </button>
  );
}

function FreeThemeOption({
  theme,
  isSelected,
  onSelect,
}: {
  theme: ThemeConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
        isSelected
          ? 'border-accent-500 bg-accent-50'
          : 'border-border-subtle bg-white hover:border-accent-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <img src={theme.map.backgroundImage} alt={t(theme.name)} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-main text-sm truncate">{t(theme.name)}</p>
          <p className="text-text-muted text-xs flex items-center gap-1">
            <Music className="w-3 h-3" />
            {t('templates.typeFree')}
          </p>
        </div>
        {isSelected && <Check className="w-4 h-4 text-accent-500 shrink-0" />}
      </div>
    </button>
  );
}

export default ActivateAssignmentModal;
