/**
 * SharedPraatplaatViewer - Publieke read-only praatplaat-viewer (#73)
 *
 * Wordt geopend via:
 * 1. URL met ?pp-share=CODE query parameter
 * 2. 8-karakter code invoer op het startscherm
 *
 * Sinds M5 een dunne schil om het universele PresentationSurface
 * (mode 'public' + interactiveBoard). De statemachine ervóór blijft:
 * loading → waiting-gesture (Tone.start vereist een gebaar) → ready,
 * plus not-found / expired / error. Geen login vereist.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Volume2 } from 'lucide-react';
import * as Tone from 'tone';
import { getSharedPraatplaat } from '../../lib/praatplaat';
import type { SharedPraatplaatData } from '../../lib/praatplaat';
import type { Submission } from '../../hooks/useSubmissions';
import { PresentationSurface } from '../presentation/PresentationSurface';
import { Button } from '../ui/Button';
import { audioService } from '../../services/AudioService';
import { logger } from '../../utils/logger';

type ViewerState = 'loading' | 'waiting-gesture' | 'ready' | 'error' | 'not-found' | 'expired';

interface SharedPraatplaatViewerProps {
  code: string;
  onBack: () => void;
}

export function SharedPraatplaatViewer({ code, onBack }: SharedPraatplaatViewerProps) {
  const { t } = useTranslation();

  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<SharedPraatplaatData | null>(null);

  // --- Data laden ---
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setViewerState('loading');
      try {
        const result = await getSharedPraatplaat(code);

        if (cancelled) return;

        if (!result) {
          setViewerState('not-found');
          return;
        }

        setData(result);
        setViewerState('waiting-gesture');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : t('sharedPraatplaat.fetchError');
        if (msg.includes('verlopen') || msg.includes('expired')) {
          setViewerState('expired');
        } else {
          setErrorMessage(msg);
          setViewerState('error');
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [code, t]);

  // --- Audio init (user gesture vereist) ---
  const handleStartListening = useCallback(async () => {
    try {
      await Tone.start();
      await audioService.initialize();
      setViewerState('ready');
    } catch (err) {
      logger.error('SharedPraatplaatViewer audio init failed:', err);
      setErrorMessage(t('sharedPraatplaat.audioError'));
      setViewerState('error');
    }
  }, [t]);

  // Playlist voor de surface: positie uit de kolommen injecteren
  const playlist: Submission[] = (data?.submissions ?? []).map((sub) => ({
    id: sub.id,
    student_name: sub.student_name,
    composition_name: sub.composition_name,
    composition_data: {
      ...sub.composition_data,
      praatplaatPosition: sub.composition_data?.praatplaatPosition
        ?? { x: sub.position_x, y: sub.position_y },
    },
    created_at: sub.created_at,
  }));

  // --- Pre-ready states ---

  if (viewerState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent-400 animate-spin mx-auto mb-4" />
          <p className="text-text-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (viewerState === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className="text-text-main font-semibold text-lg mb-2">
            {t('sharedPraatplaat.notFoundTitle')}
          </p>
          <p className="text-text-muted text-sm mb-6">
            {t('sharedPraatplaat.notFoundDescription')}
          </p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sharedPraatplaat.backToStart')}
          </Button>
        </div>
      </div>
    );
  }

  if (viewerState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className="text-text-main font-semibold text-lg mb-2">
            {t('sharedPraatplaat.expiredTitle')}
          </p>
          <p className="text-text-muted text-sm mb-6">
            {t('sharedPraatplaat.expiredDescription')}
          </p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sharedPraatplaat.backToStart')}
          </Button>
        </div>
      </div>
    );
  }

  if (viewerState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className="text-error-600 font-semibold text-lg mb-2">
            {t('sharedPraatplaat.errorTitle')}
          </p>
          <p className="text-text-muted text-sm mb-6">
            {errorMessage || t('sharedPraatplaat.errorDescription')}
          </p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sharedPraatplaat.backToStart')}
          </Button>
        </div>
      </div>
    );
  }

  if (viewerState === 'waiting-gesture') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-md px-6">
          {data && (
            <h1 className="text-text-main font-bold text-2xl mb-2">
              {data.praatplaat.name}
            </h1>
          )}
          <p className="text-text-muted text-sm mb-2">
            {data && data.submissions.length > 0
              ? t('sharedPraatplaat.submissionCount', { count: data.submissions.length })
              : t('sharedPraatplaat.noSubmissions')
            }
          </p>
          <p className="text-text-muted text-sm mb-8">
            {t('sharedPraatplaat.gestureHint')}
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartListening}
          >
            <Volume2 className="w-5 h-5 mr-2" />
            {t('sharedPraatplaat.startListening')}
          </Button>
          <div className="mt-4">
            <button
              onClick={onBack}
              className="text-text-muted text-sm hover:text-text-main transition-colors"
            >
              {t('sharedPraatplaat.backToStart')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Ready: het universele presentatiescherm neemt over ---

  if (!data) return null;

  // Zonder inzendingen: alleen de plaat + eerlijke lege-staat
  if (playlist.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <span className="text-brand-200 text-sm font-semibold truncate">{data.praatplaat.name}</span>
          <button
            onClick={onBack}
            className="p-2 text-brand-300 hover:text-white rounded-lg hover:bg-brand-800 transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t('sharedPraatplaat.backToStart')}
          </button>
        </div>
        <div className="flex-1 min-h-0 relative flex items-center justify-center p-3">
          <img
            src={data.praatplaat.image_url}
            alt={data.praatplaat.name}
            className="h-full w-auto max-w-full rounded-xl object-contain"
            draggable={false}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-bg-surface/90 rounded-2xl px-8 py-6 text-center max-w-sm">
              <p className="text-text-main font-medium mb-1">
                {t('sharedPraatplaat.emptyTitle')}
              </p>
              <p className="text-text-muted text-sm">
                {t('sharedPraatplaat.emptyDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PresentationSurface
      playlist={playlist}
      mode="public"
      onClose={onBack}
      interactiveBoard={{ imageUrl: data.praatplaat.image_url, name: data.praatplaat.name }}
      respectLoop
    />
  );
}

export default SharedPraatplaatViewer;
