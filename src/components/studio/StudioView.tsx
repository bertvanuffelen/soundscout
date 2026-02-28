/**
 * StudioView - Main composition interface
 *
 * Uses extracted hooks for:
 * - DnD logic (useStudioDnD)
 * - Audio playback (useStudioPlayback)
 * - Cleanup (useAudioCleanup)
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioStore } from '../../stores/audioStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useStudioDnD } from '../../hooks/useStudioDnD';
import { useStudioPlayback } from '../../hooks/useStudioPlayback';
import { useAudioCleanup } from '../../hooks/useAudioCleanup';
import { useStudioKeyboardShortcuts } from '../../hooks/useStudioKeyboardShortcuts';
import { useUndoRedoTimeline } from '../../hooks/useUndoRedoTimeline';
import { SampleLibrary } from './SampleLibrary';
import { Timeline } from './Timeline';
import { TransportControls } from './TransportControls';
import { EditToolbar } from './EditToolbar';
import { TrimModal } from './TrimModal';
import { SampleIcon } from '../../utils/iconMap';
import { Button } from '../ui';
import { generateClipId } from '../../utils/uuid';

export function StudioView() {
  const { t } = useTranslation();

  // Navigation
  const goToMap = useAppStore((s) => s.goToMap);
  const goToStage = useAppStore((s) => s.goToStage);

  // Template state
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const templateClipsLocked = useAppStore((s) => s.templateClipsLocked);

  // Timeline state
  const tracks = useTimelineStore((s) => s.tracks);
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const removeClip = useTimelineStore((s) => s.removeClip);
  const updateClipTrim = useTimelineStore((s) => s.updateClipTrim);
  const duplicateClip = useTimelineStore((s) => s.duplicateClip);
  const updateClipVolume = useTimelineStore((s) => s.updateClipVolume);
  const setClipMute = useTimelineStore((s) => s.setClipMute);
  const hasClips = useTimelineStore((s) => s.selectHasClips());

  // Audio state
  const isPlaying = useAudioStore((s) => s.isPlaying);

  // Selection state
  const selectedClipId = useSelectionStore((s) => s.selectedClipId);
  const selectedTrackIndex = useSelectionStore((s) => s.selectedTrackIndex);
  const selectClip = useSelectionStore((s) => s.selectClip);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  // Trim modal state
  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);

  // A11Y-1: Library sample selection for keyboard add-to-track
  const [selectedLibrarySampleId, setSelectedLibrarySampleId] = useState<string | null>(null);

  // Custom hooks - get playback first so we have samples for DnD
  const {
    librarySamples,
    isLooping,
    handlePlay,
    handlePause,
    handleStop,
    handleRewind,
    handleToggleLoop,
    handlePreview,
    handleSeek,
  } = useStudioPlayback();

  // DnD hook needs samples for collision detection
  const {
    sensors,
    activeDragSample,
    activeDragType,
    snapPreview,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  } = useStudioDnD({ samples: librarySamples });

  // Cleanup on unmount
  useAudioCleanup();

  // Undo/Redo
  const { undo, redo, canUndo, canRedo } = useUndoRedoTimeline();

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
      // Clear selection if the removed clip was selected
      if (clipId === selectedClipId) {
        clearSelection();
      }
    },
    [removeClip, selectedClipId, clearSelection]
  );

  // Find the selected clip and its sample
  const selectedClipData = useMemo(() => {
    if (selectedClipId === null || selectedTrackIndex === null) return null;

    const track = tracks[selectedTrackIndex];
    if (!track) return null;

    const clip = track.clips.find((c) => c.id === selectedClipId);
    if (!clip) return null;

    const sample = librarySamples.find((s) => s.id === clip.sampleId);
    if (!sample) return null;

    return { clip, sample, trackIndex: selectedTrackIndex };
  }, [selectedClipId, selectedTrackIndex, tracks, librarySamples]);

  // Toolbar action handlers
  const handleTrimClick = useCallback(() => {
    setIsTrimModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (selectedClipData) {
      handleRemoveClip(selectedClipData.trackIndex, selectedClipData.clip.id);
    }
  }, [selectedClipData, handleRemoveClip]);

  // Handle duplicate clip
  const handleDuplicate = useCallback(() => {
    if (selectedClipData) {
      const result = duplicateClip(
        selectedClipData.trackIndex,
        selectedClipData.clip.id,
      );
      // Select the new clip if duplication was successful
      if (result.reason !== 'rejected' && result.newClipId) {
        selectClip(result.newClipId, result.trackIndex);
      }
    }
  }, [selectedClipData, duplicateClip, selectClip]);

  // Handle trim apply from modal
  const handleTrimApply = useCallback(
    (trimStart: number, trimEnd: number) => {
      if (selectedClipData) {
        updateClipTrim(
          selectedClipData.trackIndex,
          selectedClipData.clip.id,
          trimStart,
          trimEnd
        );
      }
    },
    [selectedClipData, updateClipTrim]
  );

  // Handle trim modal close
  const handleTrimModalClose = useCallback(() => {
    setIsTrimModalOpen(false);
  }, []);

  // Handle clip volume change
  const handleClipVolumeChange = useCallback(
    (db: number) => {
      if (selectedClipData) {
        updateClipVolume(selectedClipData.trackIndex, selectedClipData.clip.id, db);
      }
    },
    [selectedClipData, updateClipVolume],
  );

  // Handle clip mute toggle
  const handleClipMuteToggle = useCallback(
    (muted: boolean) => {
      if (selectedClipData) {
        setClipMute(selectedClipData.trackIndex, selectedClipData.clip.id, muted);
      }
    },
    [selectedClipData, setClipMute],
  );

  // A11Y-1: Add selected library sample to first available track position
  const addClip = useTimelineStore((s) => s.addClip);
  const handleAddToTrack = useCallback(() => {
    if (!selectedLibrarySampleId) return;

    const clip = {
      id: generateClipId(),
      sampleId: selectedLibrarySampleId,
      startBeat: 0,
    };

    // Try track 0 first — smart snap will find the best position
    addClip(0, clip);

    // Clear selection after adding
    setSelectedLibrarySampleId(null);
  }, [selectedLibrarySampleId, addClip]);

  // Get translated name of selected library sample for the "+" button aria-label
  const selectedLibrarySampleName = useMemo(() => {
    if (!selectedLibrarySampleId) return null;
    const sample = librarySamples.find((s) => s.id === selectedLibrarySampleId);
    return sample ? t(sample.name) : null;
  }, [selectedLibrarySampleId, librarySamples, t]);

  // Keyboard shortcuts (extracted hook)
  useStudioKeyboardShortcuts({
    isPlaying,
    hasSelectedClip: !!selectedClipData,
    onPlay: handlePlay,
    onPause: handlePause,
    onDuplicate: handleDuplicate,
    onUndo: undo,
    onRedo: redo,
  });

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-studio-bg md:bg-bg-app">
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

      {/* Template info banner */}
      {activeTemplate && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-accent-50 border-b border-accent-200 text-xs sm:text-sm text-accent-800">
          <span className="font-semibold">{t('templates.activeBanner')}</span>
          <span className="truncate">{activeTemplate.name}</span>
          {activeTemplate.instructions && (
            <span className="text-accent-600 italic truncate hidden sm:inline">— {activeTemplate.instructions}</span>
          )}
        </div>
      )}

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
        <SampleLibrary
          samples={librarySamples}
          onPreview={handlePreview}
          selectedSampleId={selectedLibrarySampleId}
          onSelectSample={setSelectedLibrarySampleId}
        />

        {/* Edit Toolbar - appears above timeline when clip is selected */}
        {selectedClipData && (
          <div className="flex items-center justify-center px-2 sm:px-4 py-2 bg-neutral-50/80 md:bg-neutral-100/50 border-t border-border-subtle">
            <EditToolbar
              clip={selectedClipData.clip}
              sample={selectedClipData.sample}
              onTrim={handleTrimClick}
              onDelete={handleDeleteClick}
              onDuplicate={handleDuplicate}
              onClipVolumeChange={handleClipVolumeChange}
              onClipMuteToggle={handleClipMuteToggle}
              locked={templateClipsLocked && (selectedClipData.clip.fromTemplate === true)}
            />
          </div>
        )}

        {/* Timeline - fixed at bottom above transport controls */}
        <Timeline
          tracks={tracks}
          bpm={bpm}
          totalBeats={totalBeats}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          snapPreview={snapPreview}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          selectedLibrarySampleName={selectedLibrarySampleName}
          onAddToTrack={handleAddToTrack}
        />

        {/* Drag Overlay - hidden when snap preview is visible (only snap preview shows drop location) */}
        <DragOverlay>
          {activeDragSample && !snapPreview ? (
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
        onRewind={handleRewind}
        onToggleLoop={handleToggleLoop}
      />

      {/* Trim Modal */}
      {selectedClipData && (
        <TrimModal
          clip={selectedClipData.clip}
          sample={selectedClipData.sample}
          isOpen={isTrimModalOpen}
          onClose={handleTrimModalClose}
          onApply={handleTrimApply}
        />
      )}
    </div>
  );
}

export default StudioView;
