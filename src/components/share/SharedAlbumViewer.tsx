/**
 * SharedAlbumViewer - Publiek klas-album (R4, migratie 031)
 *
 * Wordt geopend via ?album=CODE of de 8-karakter code op het startscherm.
 * Toont álle formeel ingeleverde composities van één klas-opdracht als
 * afspeellijst in het universele presentatiescherm; bij een praatplaat-
 * opdracht als klikbaar bord. Statemachine + gesture-gate volgen het
 * SharedPraatplaatViewer-patroon.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Volume2 } from 'lucide-react';
import * as Tone from 'tone';
import { getSharedClassAlbum, type SharedAlbumData } from '../../lib/albums';
import type { Submission } from '../../hooks/useSubmissions';
import { PresentationSurface } from '../presentation/PresentationSurface';
import { Button } from '../ui/Button';
import { audioService } from '../../services/AudioService';
import { findStoryboardById, getTheme } from '../../data/themes';
import { logger } from '../../utils/logger';

type ViewerState = 'loading' | 'waiting-gesture' | 'ready' | 'error' | 'not-found' | 'expired';

interface SharedAlbumViewerProps {
  code: string;
  onBack: () => void;
}

export function SharedAlbumViewer({ code, onBack }: SharedAlbumViewerProps) {
  const { t } = useTranslation();

  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<SharedAlbumData | null>(null);

  // --- Data laden ---
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setViewerState('loading');
      try {
        const result = await getSharedClassAlbum(code);
        if (cancelled) return;

        if (!result) {
          setViewerState('not-found');
          return;
        }

        setData(result);
        setViewerState('waiting-gesture');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : t('album.fetchError');
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
      logger.error('SharedAlbumViewer audio init failed:', err);
      setErrorMessage(t('sharedPraatplaat.audioError'));
      setViewerState('error');
    }
  }, [t]);

  // Weergavenaam van de opdracht: server-naam of client-resolutie via de refs
  const assignmentName = data
    ? data.assignment_name
      ?? (data.storyboard_ref ? (() => {
        const found = findStoryboardById(data.storyboard_ref!);
        return found ? t(found.storyboard.name) : null;
      })() : null)
      ?? (data.free_theme_id ? (() => {
        const theme = getTheme(data.free_theme_id!);
        return theme ? t(theme.name) : null;
      })() : null)
      ?? t('album.fallbackTitle')
    : '';

  // Playlist voor de surface (posities injecteren voor het praatplaat-bord)
  const playlist: Submission[] = (data?.submissions ?? []).map((sub) => ({
    id: sub.id,
    student_name: sub.student_name,
    composition_name: sub.composition_name,
    composition_data: {
      ...sub.composition_data,
      praatplaatPosition: sub.composition_data?.praatplaatPosition
        ?? (sub.position_x != null && sub.position_y != null
          ? { x: sub.position_x, y: sub.position_y }
          : undefined),
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

  if (viewerState === 'not-found' || viewerState === 'expired' || viewerState === 'error') {
    const title = viewerState === 'not-found'
      ? t('album.notFoundTitle')
      : viewerState === 'expired' ? t('album.expiredTitle') : t('sharedPraatplaat.errorTitle');
    const description = viewerState === 'not-found'
      ? t('album.notFoundDescription')
      : viewerState === 'expired' ? t('album.expiredDescription') : (errorMessage || t('sharedPraatplaat.errorDescription'));
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className={`font-semibold text-lg mb-2 ${viewerState === 'error' ? 'text-error-600' : 'text-text-main'}`}>
            {title}
          </p>
          <p className="text-text-muted text-sm mb-6">{description}</p>
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
            <>
              <p className="text-text-muted text-sm mb-1">{t('album.byClass', { className: data.class_name })}</p>
              <h1 className="text-text-main font-bold text-2xl mb-2">{assignmentName}</h1>
            </>
          )}
          <p className="text-text-muted text-sm mb-2">
            {data && data.submissions.length > 0
              ? t('album.submissionCount', { count: data.submissions.length })
              : t('album.noSubmissions')}
          </p>
          <p className="text-text-muted text-sm mb-8">{t('sharedPraatplaat.gestureHint')}</p>
          <Button variant="primary" size="lg" onClick={handleStartListening}>
            <Volume2 className="w-5 h-5 mr-2" />
            {t('album.startListening')}
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

  if (playlist.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="text-center max-w-sm px-6">
          <p className="text-text-main font-semibold text-lg mb-2">{assignmentName}</p>
          <p className="text-text-muted text-sm mb-6">{t('album.noSubmissions')}</p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('sharedPraatplaat.backToStart')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PresentationSurface
      playlist={playlist}
      mode="public"
      onClose={onBack}
      interactiveBoard={
        data.assignment_type === 'praatplaat' && data.image_url
          ? { imageUrl: data.image_url, name: assignmentName }
          : null
      }
      respectLoop
    />
  );
}

export default SharedAlbumViewer;
