/**
 * V2Mockup — klikbare mockup van SoundScout V2 (/v2-mockup, dev-only), nu als
 * ÉÉN doorlopende reis (Berts review van de eerste mockup):
 *
 *   Landingspagina → keuzeflow (bestaande wizard) → kaart → locatie →
 *   studio (sequencer-paneel Ritme/Melodie · Vervormen) → podium met
 *   Luisterspiegel → ingeleverd
 *
 * Kaart, locatie en studio volgen de PRODUCTIE-layout; de keuzeflow is de
 * echte productiecomponent (NewCompositionWizard). Het beheerdersdashboard is
 * bereikbaar via het mockup-paneel aan de rechterrand.
 *
 * Volledig geïsoleerd van de app: eigen lichte audiomotor (geen Tone.js), geen
 * stores, geen Supabase, niets wordt opgeslagen. Niets hiervan is productiecode.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, RotateCcw, Settings, SlidersHorizontal, X } from 'lucide-react';
import { getTheme, loadTheme, DEFAULT_THEME_ID, type ThemeConfig } from '../data/themes';
import type { Storyboard } from '../types';
import { NewCompositionWizard } from '../components/start/NewCompositionWizard';
import { ThemePicker } from '../components/start/ThemePicker';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import Landing from './v2-mockup/Landing';
import { MapScreen, LocationScreen } from './v2-mockup/Explore';
import Studio, { type StagePayload, type StudioClip } from './v2-mockup/Studio';
import Podium from './v2-mockup/Podium';
import AdminDemo from './v2-mockup/AdminDemo';
import { sampleToSound, type MockSound } from './v2-mockup/shared';
import { DEFAULT_QUESTIONS, type MirrorQuestion, type MockSequence } from './v2-mockup/engine';

type Screen = 'landing' | 'map' | 'location' | 'studio' | 'stage' | 'admin';

const STEPS: Array<[Screen, string]> = [
  ['landing', '1 · Landingspagina'],
  ['map', '2 · Kaart'],
  ['location', '3 · Locatie'],
  ['studio', '4 · Studio'],
  ['stage', '5 · Podium + Luisterspiegel'],
];

const KEYFRAMES = `
@keyframes mock-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
@keyframes mock-slide-up { 0% { transform: translateY(60%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes mock-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { [class*="animate-[mock-"] { animation: none !important; } }
`;

export default function V2Mockup() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>('landing');
  const [theme, setTheme] = useState<ThemeConfig>(() => getTheme(DEFAULT_THEME_ID)!);
  const [locationId, setLocationId] = useState(theme.locations[0].id);
  const [bag, setBag] = useState<MockSound[]>([]);
  const [clips, setClips] = useState<StudioClip[]>([]);
  const [sequences, setSequences] = useState<MockSequence[]>([]);
  const [stagePayload, setStagePayload] = useState<StagePayload | null>(null);
  const [questions, setQuestions] = useState<MirrorQuestion[]>(DEFAULT_QUESTIONS);
  // Docentinstelling per opdracht + ontwerpkeuze voor Bert
  const [mirrorEnabled, setMirrorEnabled] = useState(true);
  const [dark, setDark] = useState(false);
  // Modals op de landingspagina
  const [wizardOpen, setWizardOpen] = useState(false);
  const [worldsOpen, setWorldsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);

  const sounds = useMemo(() => {
    const map = new Map<string, MockSound>();
    for (const s of theme.samples) map.set(s.id, sampleToSound(s, t(s.name)));
    return map;
  }, [theme, t]);

  const location = theme.locations.find((l) => l.id === locationId) ?? theme.locations[0];

  const startWith = async (themeId: string) => {
    const next = (await loadTheme(themeId)) ?? getTheme(DEFAULT_THEME_ID)!;
    setTheme(next);
    setLocationId(next.locations[0].id);
    setBag([]);
    setClips([]);
    setSequences([]);
    setWizardOpen(false);
    setWorldsOpen(false);
    setCodeOpen(false);
    setScreen('map');
  };

  const restart = () => {
    setBag([]);
    setClips([]);
    setSequences([]);
    setScreen('landing');
    setPanelOpen(false);
  };

  return (
    <div className="min-h-dvh bg-brand-900">
      <style>{KEYFRAMES}</style>

      <div key={screen}>
        {screen === 'landing' && (
          <Landing
            onStart={() => setWizardOpen(true)}
            onWorlds={() => setWorldsOpen(true)}
            onCode={() => setCodeOpen(true)}
            onTeachers={() => setScreen('admin')}
          />
        )}

        {screen === 'map' && (
          <MapScreen
            theme={theme}
            bag={bag}
            dark={dark}
            onBack={() => setScreen('landing')}
            onOpenLocation={(id) => { setLocationId(id); setScreen('location'); }}
            onStudio={() => setScreen('studio')}
          />
        )}

        {screen === 'location' && (
          <LocationScreen
            location={location}
            sounds={sounds}
            bag={bag}
            setBag={setBag}
            onBack={() => setScreen('map')}
            onStudio={() => setScreen('studio')}
          />
        )}

        {screen === 'studio' && (
          <Studio
            bag={bag}
            clips={clips}
            setClips={setClips}
            sequences={sequences}
            setSequences={setSequences}
            questions={questions}
            dark={dark}
            onBack={() => setScreen('map')}
            onToStage={(payload) => { setStagePayload(payload); setScreen('stage'); }}
          />
        )}

        {screen === 'stage' && (
          <Podium
            payload={stagePayload ?? { loopClips: [], liteSounds: [], loopBeats: 16, mirrorClips: [], tracks: [], sounds: {} }}
            questions={questions}
            mirrorEnabled={mirrorEnabled}
            onBack={() => setScreen('studio')}
            onRestart={restart}
          />
        )}

        {screen === 'admin' && <AdminDemo questions={questions} setQuestions={setQuestions} />}
      </div>

      {/* --- Keuzeflow: de ECHTE productiecomponent --- */}
      {wizardOpen && (
        <NewCompositionWizard
          onClose={() => setWizardOpen(false)}
          onStartFree={startWith}
          onStartStoryboard={(storyboard: Storyboard) => startWith(storyboard.themeId)}
        />
      )}

      <Modal isOpen={worldsOpen} onClose={() => setWorldsOpen(false)} title={t('themeSelection.title', 'Kies je wereld')} size="xl">
        <ThemePicker onSelectTheme={startWith} />
      </Modal>

      <Modal isOpen={codeOpen} onClose={() => setCodeOpen(false)} title="Ik heb een code" size="sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length >= 4) startWith(DEFAULT_THEME_ID);
          }}
        >
          <p className="text-sm text-text-muted">Met een klascode sla je de keuzes over: je docent heeft al gekozen.</p>
          <div className="flex items-center gap-2">
            <KeyRound className="text-text-muted shrink-0" size={20} />
            <input
              autoFocus
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="1234"
              aria-label="Code"
              className="flex-1 h-14 px-4 rounded-xl border-2 border-border-subtle text-2xl font-extrabold tracking-[0.3em] text-center text-text-main focus:border-accent-400 outline-none"
            />
          </div>
          <Button type="submit" variant="primary" disabled={code.length < 4} className="w-full">Starten</Button>
          <p className="text-xs text-text-muted">Mockup: elke code van 4 tekens werkt.</p>
        </form>
      </Modal>

      {/* --- Mockup-paneel (rechterrand): springen, docentinstelling, ontwerpkeuze --- */}
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        aria-label="Mockup-paneel"
        className="fixed right-2 bottom-2 z-[60] h-9 px-3 rounded-full bg-accent-400 text-brand-900 shadow-lg ring-2 ring-white/70 flex items-center gap-1.5 text-xs font-extrabold opacity-90 hover:opacity-100"
      >
        <SlidersHorizontal size={14} />
        <span>V2</span>
      </button>
      {panelOpen && (
        <div className="fixed right-2 bottom-14 z-[60] w-72 rounded-2xl bg-white shadow-2xl border border-border-subtle p-4 flex flex-col gap-3 animate-[mock-pop_180ms_ease-out]">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-text-main">V2-mockup</span>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Sluiten" className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-text-muted"><X size={16} /></button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Spring naar</span>
            {STEPS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setScreen(id); setPanelOpen(false); }}
                className={cn('h-10 px-3 rounded-lg text-left text-sm font-semibold', screen === id ? 'bg-brand-900 text-white' : 'hover:bg-neutral-100 text-text-main')}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setScreen('admin'); setPanelOpen(false); }}
              className={cn('h-10 px-3 rounded-lg text-left text-sm font-semibold inline-flex items-center gap-2', screen === 'admin' ? 'bg-brand-900 text-white' : 'hover:bg-neutral-100 text-text-main')}
            >
              <Settings size={16} /> Beheer (admin + editor)
            </button>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-text-main cursor-pointer">
            <input type="checkbox" checked={mirrorEnabled} onChange={(e) => setMirrorEnabled(e.target.checked)} className="w-5 h-5 accent-[var(--color-success-600)]" />
            <span>Docent: Luisterspiegel aan<br /><span className="text-xs font-normal text-text-muted">per opdracht in te stellen</span></span>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-text-main cursor-pointer">
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} className="w-5 h-5 accent-[var(--color-brand-900)]" />
            <span>Donkerblauwe kaart en studio<br /><span className="text-xs font-normal text-text-muted">uit = precies zoals nu (licht)</span></span>
          </label>
          <button type="button" onClick={restart} className="inline-flex items-center justify-center gap-2 h-10 rounded-lg border-2 border-border-subtle text-sm font-bold text-text-main hover:bg-neutral-50">
            <RotateCcw size={16} /> Opnieuw beginnen
          </button>
        </div>
      )}
    </div>
  );
}
