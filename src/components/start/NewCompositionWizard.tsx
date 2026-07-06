/**
 * NewCompositionWizard — begeleide "Nieuwe compositie"-flow voor de leerling.
 *
 * Vervangt de vroegere keten ComposeModeModal → ThemeSelectionModal /
 * StoryboardPickerModal (twee losse modals) door één rustige wizard op het
 * gedeelde <Modal> (focus-trap/Escape/aria):
 *
 *   Stap 1 — modus kiezen: geanimeerd voorbeeld per vorm (ComposePreview) +
 *            drie warme kaarten (afbeelding = rose, storyboard = oranje, vrij =
 *            amber). Kies een kaart → animatie + highlight → knop "Volgende".
 *            Geen doorschieten meer bij één klik.
 *   Stap 2 — de bijpassende keuze (thema / afbeelding / storyboard) met een
 *            terug-knop. Een kaart kiezen = starten.
 *
 * StartScreen mount deze component alleen wanneer de flow open is (verse state).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, Image as ImageIcon, Film, ArrowRight, ArrowLeft, KeyRound, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { ComposePreview } from '../compose/ComposePreview';
import type { ComposeVariant } from '../compose/composeVariants';
import { ThemePicker } from './ThemePicker';
import { StoryboardPicker } from './StoryboardPicker';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { ComposeMode, Storyboard } from '../../types';

interface NewCompositionWizardProps {
  onClose: () => void;
  /** Vrij componeren: gekozen thema → start (StartScreen.handleSelectTheme). */
  onStartFree: (themeId: string) => void;
  /** Bij afbeelding/storyboard: gekozen storyboard → start (StartScreen.handleSelectStoryboard). */
  onStartStoryboard: (storyboard: Storyboard) => void;
  /** "Ik heb een code" — sluit de wizard en opent de klascode/deelcode-invoer. */
  onHaveCode: () => void;
  isLoading?: boolean;
}

interface ModeConfig {
  mode: ComposeMode;
  /** Welke ComposePreview-animatie hoort bij deze modus. */
  variant: ComposeVariant;
  Icon: LucideIcon;
  /** Warme kaart-accenten (alleen de geselecteerde kaart kleurt). */
  active: string;
  icon: string;
}

// Volgorde + warme kleuren gelijk aan de docentenlanding (rose/oranje/amber).
const MODES: ModeConfig[] = [
  { mode: 'free', variant: 'vrij', Icon: Music, active: 'border-accent-400 bg-accent-50', icon: 'text-accent-500' },
  { mode: 'image', variant: 'praatplaat', Icon: ImageIcon, active: 'border-rose-400 bg-rose-50', icon: 'text-rose-500' },
  { mode: 'storyboard', variant: 'storyboard', Icon: Film, active: 'border-orange-400 bg-orange-50', icon: 'text-orange-500' },
];

export function NewCompositionWizard({ onClose, onStartFree, onStartStoryboard, onHaveCode, isLoading = false }: NewCompositionWizardProps) {
  const { t } = useTranslation();
  const setComposeMode = useAppStore((s) => s.setComposeMode);

  const [step, setStep] = useState<'mode' | 'pick'>('mode');
  const [mode, setMode] = useState<ComposeMode>('free');

  const activeMode = MODES.find((m) => m.mode === mode) ?? MODES[0];

  const handleNext = () => {
    setComposeMode(mode);
    setStep('pick');
  };

  const step2TitleKey =
    mode === 'free' ? 'themeSelection.title' : mode === 'image' ? 'composeMode.pickImage' : 'composeMode.pickStoryboard';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={step === 'mode' ? t('composeMode.title') : t(step2TitleKey)}
      size="xl"
    >
      {step === 'mode' ? (
        <div className="flex flex-col gap-5">
          <p className="text-text-muted -mt-1">{t('composeMode.subtitle')}</p>

          {/* Geanimeerd voorbeeld van de gekozen modus */}
          <div className="max-w-md mx-auto w-full">
            <ComposePreview variant={activeMode.variant} />
          </div>

          {/* Drie modus-kaarten — alleen de geselecteerde kleurt (warm) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {MODES.map(({ mode: m, Icon, active, icon }) => {
              const selected = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMode(m)}
                  className={cn(
                    'group flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl border-2 bg-white',
                    'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
                    selected ? cn(active, 'shadow-sm') : 'border-border-subtle hover:border-neutral-300',
                  )}
                >
                  <span className={cn('mb-2', selected ? icon : 'text-text-muted')}>
                    <Icon size={26} />
                  </span>
                  <h3 className="text-base font-bold text-text-main mb-0.5">
                    {t(`composeMode.${m}`)}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {t(`composeMode.${m}Description`)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Footer: "Ik heb een code" (secundair) + bevestigen */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onHaveCode}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text-main transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              {t('start.haveCode')}
            </button>
            <Button variant="primary" size="lg" onClick={handleNext} className="inline-flex items-center justify-center gap-1.5">
              {t('composeMode.next')}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Terug naar modus-keuze */}
          <button
            type="button"
            onClick={() => setStep('mode')}
            className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-text-muted hover:text-text-main transition-colors -mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('composeMode.back')}
          </button>

          {mode === 'free' ? (
            <ThemePicker onSelectTheme={onStartFree} isLoading={isLoading} />
          ) : (
            <StoryboardPicker
              variant={mode === 'image' ? 'image' : 'storyboard'}
              onSelect={onStartStoryboard}
              isLoading={isLoading}
            />
          )}
        </div>
      )}
    </Modal>
  );
}

export default NewCompositionWizard;
