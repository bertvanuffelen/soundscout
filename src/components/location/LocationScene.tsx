/**
 * LocationScene - Location exploration screen
 *
 * Uses extracted hooks and components for:
 * - Audio loading (useLocationAudio)
 * - Recorder full modal (RecorderFullModal)
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useThemeStore } from '../../stores/themeStore';
import { useLocationAudio } from '../../hooks/useLocationAudio';
import { Hotspot } from './Hotspot';
import { RecorderBar } from './RecorderBar';
import { RecorderFullModal } from './RecorderFullModal';
import { ZoomableView } from './ZoomableView';
import { Button } from '../ui';
import type { Sample } from '../../types';

export function LocationScene() {
  const { t } = useTranslation();

  // Navigation
  const currentLocationId = useAppStore((s) => s.currentLocationId);
  const goToStudio = useAppStore((s) => s.goToStudio);
  const goToMap = useAppStore((s) => s.goToMap);

  // Template lock state (#59)
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const libraryLocked = useAppStore((s) => s.templateLockOptions).libraryLocked;
  const isLibraryLocked = activeTemplate !== null && libraryLocked;

  // Theme store
  const getLocationById = useThemeStore((s) => s.getLocationById);
  const getSampleById = useThemeStore((s) => s.getSampleById);
  const getSamplesByLocationId = useThemeStore((s) => s.getSamplesByLocationId);

  // Library/Recorder state
  const recorderSlots = useLibraryStore((s) => s.recorderSlots);
  const addToRecorder = useLibraryStore((s) => s.addToRecorder);
  const removeFromRecorder = useLibraryStore((s) => s.removeFromRecorder);
  const isSampleInRecorder = useLibraryStore((s) => s.isSampleInRecorder);
  const isSampleCollected = useLibraryStore((s) => s.isSampleCollected);
  const isRecorderFull = useLibraryStore((s) => s.isRecorderFull);
  const transferRecorderToLibrary = useLibraryStore(
    (s) => s.transferRecorderToLibrary
  );

  // Local state
  const [showFullModal, setShowFullModal] = useState(false);
  const [bgImageFailed, setBgImageFailed] = useState(false);

  // Location data from theme
  const location = currentLocationId
    ? getLocationById(currentLocationId)
    : undefined;
  const locationSamples = currentLocationId
    ? getSamplesByLocationId(currentLocationId)
    : [];

  // Audio hook (with progress, error handling, and optional ambient audio)
  const {
    isLoading,
    loadingProgress,
    hasError,
    failedCount,
    retry,
    playSample,
    stopSample,
    stopAll,
  } = useLocationAudio({
    samples: locationSamples,
    locationId: currentLocationId,
    ambientUrl: location?.ambientAudio || undefined,
  });

  // Handlers
  const handleCollect = useCallback(
    (sample: Sample) => {
      // No playSample() here — hover/touch preview already plays the sound
      const added = addToRecorder(sample);
      if (added && isRecorderFull()) {
        setShowFullModal(true);
      }
    },
    [addToRecorder, isRecorderFull]
  );

  const handleEject = useCallback(
    (sampleId: string) => {
      removeFromRecorder(sampleId);
    },
    [removeFromRecorder]
  );

  const handlePreview = useCallback(
    (sampleId: string) => {
      playSample(sampleId);
    },
    [playSample]
  );

  const handleHoverStart = useCallback(
    (sampleId: string) => {
      playSample(sampleId);
    },
    [playSample]
  );

  const handleHoverEnd = useCallback(
    (sampleId: string) => {
      stopSample(sampleId);
    },
    [stopSample]
  );

  const handleGoToStudio = useCallback(() => {
    stopAll();
    transferRecorderToLibrary();
    goToStudio();
  }, [stopAll, transferRecorderToLibrary, goToStudio]);

  const handleBack = useCallback(() => {
    stopAll();
    goToMap();
  }, [stopAll, goToMap]);

  const handleModalGoToStudio = useCallback(() => {
    setShowFullModal(false);
    handleGoToStudio();
  }, [handleGoToStudio]);

  const handleModalStay = useCallback(() => {
    setShowFullModal(false);
  }, []);

  // Helper for ZoomableView - checks if a sample should be hidden (already collected)
  const isSampleHidden = useCallback(
    (sampleId: string) => {
      return isSampleInRecorder(sampleId) || isSampleCollected(sampleId);
    },
    [isSampleInRecorder, isSampleCollected]
  );

  // Helper for ZoomableView - checks if a sample should be disabled (recorder full or library locked)
  const isSampleDisabled = useCallback(
    () => {
      return isLibraryLocked || isRecorderFull();
    },
    [isLibraryLocked, isRecorderFull]
  );

  // Error state
  if (!location) {
    return (
      <div className="min-h-screen bg-success-50 flex items-center justify-center">
        <p className="text-lg text-text-muted">Location not found</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-brand-900 flex flex-col overflow-hidden">
      {/* Main area: canvas + surrounding space */}
      <div className="flex-1 flex items-start justify-center pt-1 sm:pt-2 px-2 sm:px-4 pb-0">
        {/* 16:9 Canvas container */}
        <div className="relative w-full max-w-[calc(100vh*16/9-120px)] sm:max-w-[calc(100vh*16/9-140px)] aspect-video rounded-2xl overflow-hidden shadow-2xl">
          {/* Background image */}
          <div className="absolute inset-0 bg-screen-location" />
          {!bgImageFailed && (
            <img
              src={location.backgroundImage}
              alt={t(location.name)}
              onError={() => setBgImageFailed(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Location name */}
          <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-20">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white bg-black/30 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">
              {t(location.name)}
            </h2>
          </div>

          {/* Navigation buttons */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20">
            <Button
              onClick={handleBack}
              variant="secondary"
              size="sm"
              className="shadow-md"
            >
              <span className="hidden sm:inline">{t('location.backToMap')}</span>
              <span className="sm:hidden">{t('common.back')}</span>
            </Button>
          </div>
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20">
            <Button onClick={handleGoToStudio} size="sm" className="shadow-md">
              {t('location.toStudio')}
            </Button>
          </div>

          {/* Library locked banner (#59) */}
          {isLibraryLocked && (
            <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 bg-accent-100/90 backdrop-blur-sm text-accent-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-md">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                {t('templates.libraryLockedBanner')}
              </div>
            </div>
          )}

          {/* Hotspots - positioned relative to the canvas */}
          {/* Only show hotspots for samples that haven't been collected yet */}
          {location.hotspots.map((hotspot) => {
            const sample = getSampleById(hotspot.sampleId);
            if (!sample) return null;

            // Hide hotspot if sample is already in recorder or collected
            const isAlreadyCollected = isSampleInRecorder(sample.id) || isSampleCollected(sample.id);
            if (isAlreadyCollected) return null;

            // Disable if recorder is full or library is locked by template
            const disabled = isLibraryLocked || isRecorderFull();

            return (
              <Hotspot
                key={hotspot.id}
                hotspot={hotspot}
                sample={sample}
                disabled={disabled}
                onCollect={handleCollect}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
              />
            );
          })}

          {/* Zoom mode for mobile exploration */}
          <ZoomableView
            location={location}
            getSampleById={getSampleById}
            isSampleHidden={isSampleHidden}
            isSampleDisabled={isSampleDisabled}
            onCollect={handleCollect}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
            showZoomButton="mobile-portrait"
          />

          {/* Loading overlay with progress */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-xl max-w-xs text-center">
                <p className="text-accent-700 font-semibold mb-3">{t('start.loading')}</p>
                {/* Progress bar */}
                <div className="w-full bg-neutral-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-neutral-500 text-sm">{loadingProgress}%</p>
              </div>
            </div>
          )}

          {/* Error state with retry button */}
          {!isLoading && hasError && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-xl max-w-xs text-center">
                <AlertCircle className="w-12 h-12 text-accent-500 mx-auto mb-3" />
                <p className="text-text-main font-medium mb-2">
                  {t('location.loadingError', { count: failedCount })}
                </p>
                <p className="text-text-muted text-sm mb-4">
                  {t('location.loadingErrorHint')}
                </p>
                <Button onClick={retry} variant="primary">
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recorder bar - fixed at bottom */}
      <RecorderBar
        slots={recorderSlots}
        onEject={handleEject}
        onPreview={handlePreview}
      />

      {/* Recorder full modal */}
      <RecorderFullModal
        isOpen={showFullModal}
        onGoToStudio={handleModalGoToStudio}
        onStay={handleModalStay}
      />
    </div>
  );
}
