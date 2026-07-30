/**
 * SequencerLab — dev-only prototype van de step sequencer (/sequencer).
 *
 * Volledig geïsoleerd van de reguliere app: eigen route buiten de app-shell
 * (zelfde patroon als /editor), eigen store, eigen audio-engine met eigen
 * Tone.Clock — géén interactie met AudioService of Tone.Transport.
 * Zie docs-plan "Step Sequencer Lab" voor het ontwerp.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, Plus } from 'lucide-react';
import { Button } from '../components/ui';
import { useThemeStore } from '../stores/themeStore';
import { useSequencerStore } from '../stores/sequencerStore';
import { sequencerEngine } from '../services/SequencerEngine';
import SequencerTransport from '../components/sequencer/SequencerTransport';
import SequencerGrid from '../components/sequencer/SequencerGrid';
import SequenceManagerBar from '../components/sequencer/SequenceManagerBar';
import { SEQ_MAX_TRACKS } from '../types/sequencer';

export default function SequencerLab() {
  const { t } = useTranslation();
  const initTheme = useThemeStore((s) => s.initTheme);
  const isThemeInitialized = useThemeStore((s) => s.isInitialized);
  const hasHydrated = useSequencerStore((s) => s.hasHydrated);
  const hydrate = useSequencerStore((s) => s.hydrate);
  const addTrack = useSequencerStore((s) => s.addTrack);
  const setIsPlaying = useSequencerStore((s) => s.setIsPlaying);
  const trackCount = useSequencerStore(
    (s) =>
      s.sequences.find((seq) => seq.id === s.activeSequenceId)?.tracks.length ?? 0
  );

  // Theme zelf bootstrappen — deze route rendert buiten AppContent,
  // dus niemand anders roept initTheme() aan (zelfde patroon als de editor).
  useEffect(() => {
    if (!isThemeInitialized) {
      initTheme();
    }
  }, [isThemeInitialized, initTheme]);

  // Store hydrateren + engine voeden met de themasamples
  useEffect(() => {
    if (!isThemeInitialized) return;
    hydrate(t('sequencer.sequences.untitled', { number: 1 }));
    sequencerEngine.setSamples(useThemeStore.getState().getSamples());
  }, [isThemeInitialized, hydrate, t]);

  // Buffers van reeds toegewezen samples voorladen (ID-gebaseerde dependency
  // — stabiele string i.p.v. array-referentie, repo-conventie)
  const assignedSampleIds = useSequencerStore((s) =>
    (s.sequences.find((seq) => seq.id === s.activeSequenceId)?.tracks ?? [])
      .map((track) => track.sampleId)
      .filter(Boolean)
      .join(',')
  );
  useEffect(() => {
    if (!isThemeInitialized || !assignedSampleIds) return;
    const { getSampleById } = useThemeStore.getState();
    for (const sampleId of assignedSampleIds.split(',')) {
      const sample = getSampleById(sampleId);
      if (sample) void sequencerEngine.ensureBuffer(sample);
    }
  }, [isThemeInitialized, assignedSampleIds]);

  // Opruimen bij unmount: klok + players + nodes weg, playing-state resetten
  useEffect(() => {
    return () => {
      sequencerEngine.dispose();
      useSequencerStore.getState().setIsPlaying(false);
    };
  }, [setIsPlaying]);

  if (!isThemeInitialized || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app text-text-muted">
        <div className="text-lg font-medium">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg-app flex flex-col">
      {/* --- Header --- */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-white">
        <div className="w-10 h-10 rounded-xl bg-accent-400 flex items-center justify-center">
          <Music className="w-5 h-5 text-accent-900" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text-main leading-tight">
            {t('sequencer.title')}
          </h1>
          <p className="text-xs text-text-muted">{t('sequencer.subtitle')}</p>
        </div>
        <span className="px-2 py-1 rounded-md bg-error-500 text-white text-xs font-bold tracking-wide">
          {t('sequencer.devBadge')}
        </span>
      </header>

      {/* --- Inhoud --- */}
      <main className="flex-1 flex flex-col gap-4 p-3 sm:p-4 overflow-hidden">
        <SequenceManagerBar />
        <SequencerTransport />

        <div className="flex-1 overflow-y-auto min-h-0">
          <SequencerGrid />

          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={addTrack}
              disabled={trackCount >= SEQ_MAX_TRACKS}
            >
              <Plus className="w-4 h-4 mr-1.5" aria-hidden />
              {t('sequencer.addTrack')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
