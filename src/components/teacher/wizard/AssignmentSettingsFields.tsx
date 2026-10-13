/**
 * AssignmentSettingsFields — de instellingen in wizard-stap 2
 * ("Controleer & pas aan"). Gecontroleerd: de wizard bewaart de waarden en
 * zet ze na het klaarzetten door (wizardActivation). Geen emoji's; een
 * kort zinnetje uitleg waar nodig (wens Bert 14-10).
 */

import { useTranslation } from 'react-i18next';
import type { AssignmentType } from '../../../lib/assignments';
import type { WizardSettings } from '../../../lib/wizardActivation';
import type { Opdrachtkaart } from '../../../types';
import type { ThemeConfig } from '../../../data/themes';
import { cn } from '../../../utils/cn';

interface AssignmentSettingsFieldsProps {
  type: AssignmentType;
  values: WizardSettings;
  onChange: (next: WizardSettings) => void;
  ownCards: Opdrachtkaart[];
  themes: ThemeConfig[];
  /** true = kant-en-klare les: de les levert zelf de uitleg */
  fromLesson: boolean;
}

const fieldRow = 'grid sm:grid-cols-[220px_1fr] gap-2 sm:gap-4 items-center py-3 border-t border-border-subtle';
const inputCls = 'w-full max-w-sm px-3 py-2 text-sm border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none bg-bg-surface text-text-main';

export function AssignmentSettingsFields({ type, values, onChange, ownCards, themes, fromLesson }: AssignmentSettingsFieldsProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<WizardSettings>) => onChange({ ...values, ...patch });

  return (
    <div>
      {/* Uitleg voor leerlingen (opdrachtkaart) */}
      <div className={fieldRow}>
        <label htmlFor="wz-card" className="text-sm font-semibold text-text-main">{t('teacher.wizard.settings.card')}</label>
        <select
          id="wz-card"
          className={inputCls}
          value={values.cardId ?? ''}
          onChange={(e) => set({ cardId: e.target.value || null, cardTouched: true })}
        >
          <option value="">
            {fromLesson ? t('teacher.wizard.settings.cardFromLesson') : t('teacher.wizard.settings.cardDefault')}
          </option>
          {ownCards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {/* Geluiden uit thema — alleen bij een praatplaat */}
      {type === 'praatplaat' && (
        <div className={fieldRow}>
          <label htmlFor="wz-theme" className="text-sm font-semibold text-text-main">{t('teacher.wizard.settings.theme')}</label>
          <select
            id="wz-theme"
            className={inputCls}
            value={values.praatplaatThemeId ?? ''}
            onChange={(e) => set({ praatplaatThemeId: e.target.value })}
          >
            {themes.map((th) => <option key={th.id} value={th.id}>{t(th.name)}</option>)}
          </select>
        </div>
      )}

      {/* Duur */}
      <div className={fieldRow}>
        <label htmlFor="wz-duration" className="text-sm font-semibold text-text-main">
          {t('teacher.wizard.settings.duration')}{' '}
          <span className="font-normal text-text-muted text-xs">({t('teacher.wizard.settings.durationHint')})</span>
        </label>
        <input
          id="wz-duration"
          type="text"
          maxLength={60}
          className={inputCls}
          value={values.durationLabel}
          placeholder={t('teacher.wizard.settings.durationPlaceholder')}
          onChange={(e) => set({ durationLabel: e.target.value })}
        />
      </div>

      {/* Klasgenoten laten luisteren (peer-feedback) */}
      <div className={fieldRow}>
        <div>
          <p className="text-sm font-semibold text-text-main">{t('teacher.wizard.settings.peer')}</p>
          <p className="text-xs text-text-muted">{t('teacher.wizard.settings.peerHint')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={values.peerEnabled}
            aria-label={t('teacher.wizard.settings.peer')}
            onClick={() => set({ peerEnabled: !values.peerEnabled })}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors shrink-0',
              values.peerEnabled ? 'bg-accent-400' : 'bg-neutral-300',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                values.peerEnabled ? 'left-[22px]' : 'left-0.5',
              )}
            />
          </button>
          <span className="text-xs text-text-muted">
            {values.peerEnabled ? t('teacher.wizard.settings.peerOn') : t('teacher.wizard.settings.peerOff')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AssignmentSettingsFields;
