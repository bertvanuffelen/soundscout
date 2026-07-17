/**
 * SharedPlayer - Publieke read-only player voor gedeelde composities
 *
 * Wordt geopend via:
 * 1. URL met ?share=CODE query parameter
 * 2. Code invoer op het startscherm
 *
 * Sinds fase 2 een data-schil om het universele PresentationSurface
 * (mode 'public'): deze component haalt de compositie op en bewaakt de
 * gesture-gate (Chrome blokkeert AudioContext zonder gebaar); zodra de
 * bezoeker op "Luister" klikt neemt de surface het over (fullscreen-knop,
 * montagelijn-toggle, transport, laad/foutstaten).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, AlertCircle, Play, ArrowLeft } from 'lucide-react';
import { getSharedComposition } from '../../lib/submissions';
import { isValidCompositionData } from '../../utils/compositionData';
import { PresentationSurface } from '../presentation/PresentationSurface';
import { Button } from '../ui';
import type { Submission } from '../../hooks/useSubmissions';
import type { CompositionData } from '../../types';

interface SharedPlayerProps {
  code: string;
  onBack: () => void;
}

/** Data-fase (vóór audio); in de audio-fase neemt PresentationSurface het over */
type DataPhase = 'loading-data' | 'waiting-gesture' | 'audio' | 'not-found' | 'error';

export function SharedPlayer({ code, onBack }: SharedPlayerProps) {
  const { t } = useTranslation();
  const [dataPhase, setDataPhase] = useState<DataPhase>('loading-data');
  const [dataError, setDataError] = useState<string | null>(null);
  const [compositionName, setCompositionName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [data, setData] = useState<CompositionData | null>(null);

  // --- Fetch composition data ---
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const result = await getSharedComposition(code);

        if (!isMounted) return;

        if (!result) {
          setDataPhase('not-found');
          return;
        }

        setCompositionName(result.composition_name);
        setStudentName(result.student_name);

        // Runtime validatie van compositie data uit Supabase
        const composition = result.composition_data;
        if (!isValidCompositionData(composition)) {
          setDataError(t('share.notFound'));
          setDataPhase('error');
          return;
        }

        setData(composition);
        // Wacht op user gesture voordat we audio initialiseren
        // (Chrome blokkeert AudioContext zonder user interaction)
        setDataPhase('waiting-gesture');
      } catch (err) {
        if (isMounted) {
          setDataError(err instanceof Error ? err.message : t('share.errorGeneric'));
          setDataPhase('error');
        }
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [code, t]);

  // --- Audio starten na user gesture (sticky activation → surface mag laden) ---
  const handleStartAudio = useCallback(() => {
    if ((data?.samples?.length ?? 0) === 0) {
      setDataError(t('share.notFound'));
      setDataPhase('error');
      return;
    }
    setDataPhase('audio');
  }, [data, t]);

  // Pseudo-inzending voor de surface (publiek: geen id/feedback nodig)
  const playlist = useMemo<Submission[]>(() => {
    if (!data) return [];
    return [{
      id: `share-${code}`,
      student_name: studentName,
      composition_name: compositionName,
      composition_data: data,
      created_at: new Date().toISOString(),
    }];
  }, [data, code, studentName, compositionName]);

  // --- Audio-fase: het universele presentatiescherm neemt over ---
  if (dataPhase === 'audio' && playlist.length > 0) {
    return (
      <PresentationSurface
        playlist={playlist}
        mode="public"
        onClose={onBack}
        respectLoop
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-900">
      {/* Header — compact: back + title on one line */}
      <div className="bg-bg-surface border-b border-border-subtle px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-3 shrink-0">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">{t('share.backToStart')}</span>
          <span className="sm:hidden">{t('common.back')}</span>
        </Button>
        <div className="flex-1 min-w-0 text-center">
          <span className="text-sm sm:text-base font-bold text-text-main">SoundScout</span>
        </div>
        <div className="w-16 sm:w-20 shrink-0" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Loading data */}
        {dataPhase === 'loading-data' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Music className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-pulse" />
              <p className="text-white font-medium">{t('share.loading')}</p>
            </div>
          </div>
        )}

        {/* Waiting for user gesture to unlock audio */}
        {dataPhase === 'waiting-gesture' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <Music className="w-16 h-16 text-accent-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-1">
                {compositionName}
              </h2>
              <p className="text-neutral-400 text-sm mb-6">
                {t('share.by')} {studentName}
              </p>
              <Button variant="primary" size="lg" onClick={handleStartAudio}>
                <Play className="w-5 h-5 mr-2" />
                {t('share.openComposition')}
              </Button>
            </div>
          </div>
        )}

        {/* Not found */}
        {dataPhase === 'not-found' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <AlertCircle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">{t('share.notFound')}</p>
              <p className="text-neutral-400 text-sm mb-6">{t('share.expired')}</p>
              <Button variant="primary" onClick={onBack}>
                {t('share.backToStart')}
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {dataPhase === 'error' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-xs">
              <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
              <p className="text-error-400 font-medium mb-4">{dataError}</p>
              <Button variant="primary" onClick={onBack}>
                {t('share.backToStart')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SharedPlayer;
