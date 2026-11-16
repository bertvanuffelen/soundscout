/**
 * SourceGrid — raster met bronnen (beeld + naam + seizoensbadge) voor één
 * opdrachtvorm. Gedeeld door de opdracht-wizard en de leskaart-editor.
 */

import { useTranslation } from 'react-i18next';
import { Loader2, Info } from 'lucide-react';
import type { AssignmentType } from '../../../lib/assignments';
import { TYPE_META } from '../assignmentTypeMeta';
import { ThemeSeasonBadge } from '../ThemeSeasonBadge';
import { cn } from '../../../utils/cn';
import type { SourceItem } from './useAssignmentSources';

interface SourceGridProps {
  type: AssignmentType;
  sources: SourceItem[];
  loading?: boolean;
  selectedId: string | null;
  onSelect: (item: SourceItem) => void;
  className?: string;
}

export function SourceGrid({ type, sources, loading = false, selectedId, onSelect, className }: SourceGridProps) {
  const { t } = useTranslation();
  const meta = TYPE_META[type];

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto" aria-hidden="true" /></div>;
  }
  if (sources.length === 0) {
    return (
      <p className="rounded-xl bg-bg-surface border border-border-subtle text-sm text-text-muted px-4 py-3 inline-flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {t('teacher.wizard.noTemplates')}
      </p>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-3 gap-3', className)}>
      {sources.map((item) => {
        const selected = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            aria-pressed={selected}
            className={cn(
              'text-left rounded-2xl border-2 bg-bg-surface p-2.5 transition-all',
              selected ? 'border-accent-400 bg-accent-50' : 'border-border-subtle hover:border-accent-300',
            )}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-full aspect-video object-cover rounded-xl" />
            ) : (
              <span className={cn('w-full aspect-video rounded-xl flex items-center justify-center', meta.tone.tile)}>
                <meta.Icon className="w-8 h-8" aria-hidden="true" />
              </span>
            )}
            <span className="block font-extrabold text-sm text-text-main mt-2 truncate">{item.name}</span>
            {item.sub && <span className="block text-xs text-text-muted truncate">{item.sub}</span>}
            {item.themeId && <ThemeSeasonBadge themeId={item.themeId} className="mt-1" />}
          </button>
        );
      })}
    </div>
  );
}

export default SourceGrid;
