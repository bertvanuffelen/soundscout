/**
 * LiveAssignmentSettings — instellingen van de actieve opdracht, die direct
 * worden opgeslagen. Eén onderdeel voor twee plekken (ontwerp ronde 3b):
 * het instellingenpaneel op het codescherm (wizard stap 3) en "Meer opties"
 * op de klaspagina. Gebruikt alleen bestaande functies (geen migratie):
 * updateAssignmentCard / updateAssignmentDuration / updatePraatplaatTheme /
 * PeerReviewSettings (set_assignment_peer_review).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { ClassAssignmentRow } from '../../lib/assignments';
import { updateAssignmentCard, updateAssignmentDuration } from '../../lib/assignments';
import { updatePraatplaatTheme } from '../../lib/praatplaat';
import { useAssignmentCards } from '../../hooks/useAssignmentCards';
import { getTeacherThemes } from '../../data/themes';
import { PeerReviewSettings } from './PeerReviewSettings';
import { logger } from '../../utils/logger';

const assignableThemes = getTeacherThemes();

interface LiveAssignmentSettingsProps {
  assignment: ClassAssignmentRow;
  /** Na een opgeslagen wijziging (bv. om de actieve opdracht te herladen) */
  onChanged?: () => void;
  /** Smalle weergave (paneel): labels boven de velden */
  compact?: boolean;
}

type Field = 'card' | 'theme' | 'duration';

const inputCls = 'w-full px-3 py-2 text-sm border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none bg-bg-surface text-text-main';

export function LiveAssignmentSettings({ assignment, onChanged, compact = false }: LiveAssignmentSettingsProps) {
  const { t } = useTranslation();
  const { cards } = useAssignmentCards();
  const [saved, setSaved] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Concept-waarde voor de duur; opslaan bij verlaten van het veld
  const [durationDraft, setDurationDraft] = useState(assignment.durationLabel ?? '');
  // Optimistisch getoonde waarden (de bron herlaadt via onChanged)
  const [cardId, setCardId] = useState(assignment.cardId ?? '');
  const [themeId, setThemeId] = useState(assignment.praatplaatThemeId ?? '');

  const save = async (field: Field, fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      setSaved(field);
      onChanged?.();
    } catch (err) {
      logger.error('LiveAssignmentSettings: opslaan mislukt', err);
      setError(t('teacher.liveSettings.error'));
    }
  };

  const row = compact
    ? 'flex flex-col gap-1.5 py-3 border-t border-border-subtle'
    : 'grid sm:grid-cols-[220px_1fr] gap-2 sm:gap-4 items-center py-3 border-t border-border-subtle';

  const savedTick = (field: Field) => saved === field && (
    <span className="text-xs text-success-600 inline-flex items-center gap-1">
      <Check className="w-3.5 h-3.5" aria-hidden="true" /> {t('teacher.liveSettings.saved')}
    </span>
  );

  return (
    <div>
      <div className={row}>
        <label htmlFor={`ls-card-${assignment.id}`} className="text-sm font-semibold text-text-main">
          {t('teacher.wizard.settings.card')}
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            id={`ls-card-${assignment.id}`}
            className={`${inputCls} max-w-sm`}
            value={cardId}
            onChange={(e) => {
              const v = e.target.value;
              setCardId(v);
              void save('card', () => updateAssignmentCard(assignment.id, v || null));
            }}
          >
            <option value="">{t('teacher.wizard.settings.cardDefault')}</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {savedTick('card')}
        </div>
      </div>

      {assignment.type === 'praatplaat' && assignment.praatplaatId && (
        <div className={row}>
          <label htmlFor={`ls-theme-${assignment.id}`} className="text-sm font-semibold text-text-main">
            {t('teacher.wizard.settings.theme')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              id={`ls-theme-${assignment.id}`}
              className={`${inputCls} max-w-sm`}
              value={themeId}
              onChange={(e) => {
                const v = e.target.value;
                setThemeId(v);
                const ppId = assignment.praatplaatId!;
                void save('theme', () => updatePraatplaatTheme(ppId, v));
              }}
            >
              {assignableThemes.map((th) => <option key={th.id} value={th.id}>{t(th.name)}</option>)}
            </select>
            {savedTick('theme')}
          </div>
        </div>
      )}

      <div className={row}>
        <label htmlFor={`ls-duration-${assignment.id}`} className="text-sm font-semibold text-text-main">
          {t('teacher.wizard.settings.duration')}{' '}
          <span className="font-normal text-text-muted text-xs">({t('teacher.wizard.settings.durationHint')})</span>
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            id={`ls-duration-${assignment.id}`}
            type="text"
            maxLength={60}
            className={`${inputCls} max-w-sm`}
            value={durationDraft}
            placeholder={t('teacher.wizard.settings.durationPlaceholder')}
            onChange={(e) => setDurationDraft(e.target.value)}
            onBlur={() => {
              const v = durationDraft.trim();
              if (v === (assignment.durationLabel ?? '')) return;
              void save('duration', () => updateAssignmentDuration(assignment.id, v || null));
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
          {savedTick('duration')}
        </div>
      </div>

      <div className="py-3 border-t border-border-subtle">
        <PeerReviewSettings assignmentId={assignment.id} bare />
      </div>

      {error && <p role="alert" className="text-error-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default LiveAssignmentSettings;
