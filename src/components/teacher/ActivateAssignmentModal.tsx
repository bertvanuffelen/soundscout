/**
 * ActivateAssignmentModal - Modal om een opdracht te activeren voor een klas
 *
 * Toont alle beschikbare templates en praatplaten van de docent.
 * De docent selecteert er één en bevestigt → activateAssignment().
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, MapPin, Clapperboard, Plus, Check, Loader2 } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { usePraatplaten } from '../../hooks/usePraatplaten';
import { useAssignmentCards } from '../../hooks/useAssignmentCards';
import { getAllMultiImageStoryboards, type StoryboardWithTheme } from '../../data/themes';
import type { AssignmentType } from '../../lib/assignments';
import type { TeacherTemplate } from '../../lib/templates';
import type { PraatplaatRow } from '../../lib/praatplaat';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ActivateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateTemplate: (templateId: string, cardId?: string | null) => Promise<void>;
  onActivatePraatplaat: (praatplaatId: string, cardId?: string | null) => Promise<void>;
  onActivateStoryboard: (storyboardRef: string, cardId?: string | null) => Promise<void>;
  /** Beperk de modal tot één opdracht-type. Undefined = alle types (legacy). */
  typeFilter?: AssignmentType;
  /** Optioneel: maak in-place een nieuwe praatplaat voor deze klas aan (sluit deze
   *  modal, opent de create-modal). */
  onCreatePraatplaat?: () => void;
}

type Selection =
  | { type: 'template'; id: string }
  | { type: 'praatplaat'; id: string }
  | { type: 'storyboard'; id: string }
  | null;

// Storyboards zijn app-content (registry) — voor elke docent hetzelfde, geen hook nodig.
const storyboards: StoryboardWithTheme[] = getAllMultiImageStoryboards();

export function ActivateAssignmentModal({
  isOpen,
  onClose,
  onActivateTemplate,
  onActivatePraatplaat,
  onActivateStoryboard,
  typeFilter,
  onCreatePraatplaat,
}: ActivateAssignmentModalProps) {
  const { t } = useTranslation();
  const { templates, loading: templatesLoading } = useTemplates();
  const { praatplaten, loading: praatplatenLoading } = usePraatplaten();
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

  const loading = templatesLoading || praatplatenLoading;
  const activeTemplates = templates.filter((t) => t.isActive);

  // Type-scoping: undefined = toon alles (legacy); anders alleen dat type.
  const showTemplates = !typeFilter || typeFilter === 'template';
  const showPraatplaten = !typeFilter || typeFilter === 'praatplaat';
  const showStoryboards = !typeFilter || typeFilter === 'storyboard';
  const scoped = !!typeFilter;
  const modalTitle = typeFilter ? t(`assignments.types.${typeFilter}.pickTitle`) : t('assignments.chooseTitle');

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const cardId = selectedCardId || null;
    try {
      if (selected.type === 'template') {
        await onActivateTemplate(selected.id, cardId);
      } else if (selected.type === 'praatplaat') {
        await onActivatePraatplaat(selected.id, cardId);
      } else {
        await onActivateStoryboard(selected.id, cardId);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
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

      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto space-y-2">
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto" />
          </div>
        )}

        {/* Lege staat (alleen ongescooped): geen enkele resource */}
        {!loading && !scoped && activeTemplates.length === 0 && praatplaten.length === 0 && storyboards.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm mb-4">
              {t('assignments.noAssignments')}
            </p>
            {onCreatePraatplaat && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  onClose();
                  onCreatePraatplaat();
                }}
              >
                {t('assignments.createPraatplaatForClass')}
              </Button>
            )}
          </div>
        )}

        {/* Templates */}
        {!loading && showTemplates && (
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

        {/* Praatplaten */}
        {!loading && showPraatplaten && (
          <>
            {!scoped && praatplaten.length > 0 && (
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1 mt-3">
                {t('templates.typePraatplaat')}
              </p>
            )}
            {praatplaten.map((pp) => (
              <PraatplaatOption
                key={pp.id}
                praatplaat={pp}
                isSelected={selected?.type === 'praatplaat' && selected.id === pp.id}
                onSelect={() => setSelected({ type: 'praatplaat', id: pp.id })}
              />
            ))}
            {/* In praatplaat-scope altijd de create-actie tonen */}
            {scoped && onCreatePraatplaat && (
              <button
                onClick={() => { onClose(); onCreatePraatplaat(); }}
                className="w-full text-left px-3 py-3 rounded-xl border border-dashed border-border-subtle bg-white hover:border-accent-300 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-accent-100 text-accent-700">
                  <Plus className="w-4 h-4" />
                </div>
                <p className="font-medium text-text-main text-sm">{t('assignments.createPraatplaatForClass')}</p>
              </button>
            )}
          </>
        )}

        {/* Storyboards (app-content) */}
        {!loading && showStoryboards && (
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
      </div>

      {/* Opdrachtkaart-keuze (vorm-onafhankelijk) */}
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

function PraatplaatOption({
  praatplaat,
  isSelected,
  onSelect,
}: {
  praatplaat: PraatplaatRow;
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
          <img src={praatplaat.image_url} alt={praatplaat.name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-main text-sm truncate">{praatplaat.name}</p>
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

export default ActivateAssignmentModal;
