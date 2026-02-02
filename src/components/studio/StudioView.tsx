/**
 * StudioView - Main composition interface
 *
 * Uses extracted hooks for:
 * - DnD logic (useStudioDnD)
 * - Audio playback (useStudioPlayback)
 * - Cleanup (useAudioCleanup)
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useGameStore } from '../../stores/gameStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioStore } from '../../stores/audioStore';
import { useStudioDnD } from '../../hooks/useStudioDnD';
import { useStudioPlayback } from '../../hooks/useStudioPlayback';
import { useAudioCleanup } from '../../hooks/useAudioCleanup';
import { SampleLibrary } from './SampleLibrary';
import { Timeline } from './Timeline';
import { TransportControls } from './TransportControls';
import { SampleIcon } from '../../utils/iconMap';
import { Button } from '../ui';

export function StudioView() {
  const { t } = useTranslation();

  // Navigation
  const goToMap = useGameStore((s) => s.goToMap);
  const goToStage = useGameStore((s) => s.goToStage);

  // Timeline state
  const tracks = useTimelineStore((s) => s.tracks);
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const removeClip = useTimelineStore((s) => s.removeClip);

  // Audio state
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentBeat = useAudioStore((s) => s.currentBeat);

  // Custom hooks
  const {
    sensors,
    activeDragSample,
    activeDragType,
    snapPreview,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  } = useStudioDnD();

  const {
    librarySamples,
    isLooping,
    handlePlay,
    handlePause,
    handleStop,
    handleToggleLoop,
    handlePreview,
    handleClearAll,
  } = useStudioPlayback();

  // Cleanup on unmount
  useAudioCleanup();

  // Track whether any clips exist on the timeline
  const hasClips = tracks.some((track) => track.clips.length > 0);

  // Navigation handlers
  const handleBack = useCallback(() => {
    handleStop();
    goToMap();
  }, [handleStop, goToMap]);

  const handleGoToStage = useCallback(() => {
    handleStop();
    goToStage();
  }, [handleStop, goToStage]);

  const handleRemoveClip = useCallback(
    (trackIndex: number, clipId: string) => {
      removeClip(trackIndex, clipId);
    },
    [removeClip]
  );

  return (
    <div className="min-h-screen flex flex-col bg-studio-bg md:bg-bg-app">
      {/* Navigation bar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-white/90 md:bg-bg-surface border-b border-border-subtle">
        <Button variant="secondary" size="sm" onClick={handleBack}>
          <span className="hidden sm:inline">{t('studio.backToLocation')}</span>
          <span className="sm:hidden">{t('common.back')}</span>
        </Button>
        <h1 className="text-base sm:text-lg font-bold text-text-main">{t('studio.title')}</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={handleGoToStage}
          disabled={!hasClips}
        >
          {t('studio.toStage')}
        </Button>
      </div>

      {/* DnD Context wrapping Library + Timeline */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Sample Library - fills available space */}
        <SampleLibrary samples={librarySamples} onPreview={handlePreview} />

        {/* Timeline - fixed at bottom above transport controls */}
        <Timeline
          tracks={tracks}
          bpm={bpm}
          totalBeats={totalBeats}
          currentBeat={currentBeat}
          isPlaying={isPlaying}
          onRemoveClip={handleRemoveClip}
          snapPreview={snapPreview}
        />

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragSample ? (
            activeDragType === 'clip' ? (
              <div
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-xl opacity-90"
                style={{ backgroundColor: `${activeDragSample.color}cc` }}
              >
                <SampleIcon name={activeDragSample.icon} size={14} className="text-white" />
                <span className="text-[10px] font-semibold text-white">
                  {t(activeDragSample.name)}
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-white shadow-xl opacity-90"
                style={{ borderColor: activeDragSample.color }}
              >
                <SampleIcon name={activeDragSample.icon} size={20} className="text-neutral-700" />
                <span className="text-sm font-medium text-neutral-700">
                  {t(activeDragSample.name)}
                </span>
              </div>
            )
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Transport Controls */}
      <TransportControls
        isPlaying={isPlaying}
        isLooping={isLooping}
        hasClips={hasClips}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onToggleLoop={handleToggleLoop}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
