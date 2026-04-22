/**
 * ActivateAssignmentModal - Modal om een opdracht te activeren voor een klas
 *
 * Toont alle beschikbare templates en praatplaten van de docent.
 * De docent selecteert er één en bevestigt → activateAssignment().
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, MapPin, Check, Loader2 } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { usePraatplaten } from '../../hooks/usePraatplaten';
import type { TeacherTemplate } from '../../lib/templates';
import type { PraatplaatRow } from '../../lib/praatplaat';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ActivateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateTemplate: (templateId: string) => Promise<void>;
  onActivatePraatplaat: (praatplaatId: string) => Promise<void>;
}

type Selection = { type: 'template'; id: string } | { type: 'praatplaat'; id: string } | null;

export function ActivateAssignmentModal({
  isOpen,
  onClose,
  onActivateTemplate,
  onActivatePraatplaat,
}: ActivateAssignmentModalProps) {
  const { t } = useTranslation();
  const { templates, loading: templatesLoading } = useTemplates();
  const { praatplaten, loading: praatplatenLoading } = usePraatplaten();

  const [selected, setSelected] = useState<Selection>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = templatesLoading || praatplatenLoading;
  const activeTemplates = templates.filter((t) => t.isActive);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      if (selected.type === 'template') {
        await onActivateTemplate(selected.id);
      } else {
        await onActivatePraatplaat(selected.id);
      }
      setSelected(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignments.activateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('assignments.chooseTitle')} size="md">
      <p className="text-text-muted text-sm mb-4">
        {t('assignments.chooseDescription')}
      </p>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto space-y-2">
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
          </div>
        )}

        {!loading && activeTemplates.length === 0 && praatplaten.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">
              {t('assignments.noAssignments')}
            </p>
          </div>
        )}

        {/* Templates */}
        {!loading && activeTemplates.length > 0 && (
          <>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1">
              {t('templates.typeTemplate')}
            </p>
            {activeTemplates.map((tmpl) => (
              <TemplateOption
                key={tmpl.id}
                template={tmpl}
                isSelected={selected?.type === 'template' && selected.id === tmpl.id}
                onSelect={() => setSelected({ type: 'template', id: tmpl.id })}
              />
            ))}
          </>
        )}

        {/* Praatplaten */}
        {!loading && praatplaten.length > 0 && (
          <>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1 mt-3">
              {t('templates.typePraatplaat')}
            </p>
            {praatplaten.map((pp) => (
              <PraatplaatOption
                key={pp.id}
                praatplaat={pp}
                isSelected={selected?.type === 'praatplaat' && selected.id === pp.id}
                onSelect={() => setSelected({ type: 'praatplaat', id: pp.id })}
              />
            ))}
          </>
        )}
      </div>

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
          ? 'border-primary-500 bg-primary-50'
          : 'border-border-subtle bg-white hover:border-primary-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-primary-500 text-white' : 'bg-amber-100 text-amber-700'
        }`}>
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-main text-sm truncate">{template.name}</p>
          {template.description && (
            <p className="text-text-muted text-xs truncate">{template.description}</p>
          )}
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary-500 shrink-0" />}
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
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-border-subtle bg-white hover:border-primary-300'
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
            Praatplaat
          </p>
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary-500 shrink-0" />}
      </div>
    </button>
  );
}

export default ActivateAssignmentModal;
