/**
 * StudioView - Main composition interface
 *
 * Uses extracted hooks for:
 * - DnD logic (useStudioDnD)
 * - Audio playback (useStudioPlayback)
 * - Cleanup (useAudioCleanup)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, pointerWithin, closestCenter, MeasuringStrategy, type CollisionDetection } from '@dnd-kit/core';
import { Music, Image, Map as MapIcon, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore, NEUTRAL_CLIP_EFFECTS } from '../../stores/timelineStore';
import { useAudioStore } from '../../stores/audioStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useStudioDnD } from '../../hooks/useStudioDnD';
import { useStudioPlayback } from '../../hooks/useStudioPlayback';
import { useAudioCleanup } from '../../hooks/useAudioCleanup';
import { useRescheduleOnChange } from '../../hooks/useRescheduleOnChange';
import { useStudioKeyboardShortcuts } from '../../hooks/useStudioKeyboardShortcuts';
import { useUndoRedoTimeline } from '../../hooks/useUndoRedoTimeline';
import { SampleLibrary } from './SampleLibrary';
import { Timeline } from './Timeline';
import { TransportControls } from './TransportControls';
import { StorytellingPanel, StorytellingToggle, StorytellingFilmstrip } from './storytelling';
import type { StudioViewMode } from './storytelling';
// EditToolbar is now integrated into Timeline header bar
import { TrimModal } from './TrimModal';
import { TempoPicker } from './TempoPicker';
import { SampleIcon } from '../../utils/iconMap';
import { getOnSoundTextClass } from '../../utils/soundColor';
import { Button, Modal } from '../ui';
import { ClassSessionBadge } from '../ui/ClassSessionBadge';
import { audioService } from '../../services/AudioService';
import { generateClipId, generateId } from '../../utils/uuid';
import { EffectsModal } from './EffectsModal';
import { resolveSampleKind } from '../../utils/sampleKinds';
import type { Clip, EffectSound, Sample } from '../../types';
import { useSequencerStore } from '../../stores/sequencerStore';
import { sequencerEngine } from '../../services/SequencerEngine';
import StudioSequencerPanel from '../sequencer/StudioSequencerPanel';
import SequenceKindChooser from '../sequencer/SequenceKindChooser';
import type { SequenceKind } from '../../types/sequencer';
import {
  getSequenceIdFromSampleId,
  isSequenceEmpty,
  isSequenceSampleId,
  sequenceSampleId,
  withSequenceSamples,
} from '../../utils/sequencer';

/**
 * Custom collision detection: prefer the track the pointer is actually inside,
 * fall back to closestCenter when pointer isn't directly over any track.
 * This fixes the "sample sticks to track 1" bug when dragging from library.
 */
const trackCollisionDetection: CollisionDetection = (args) => {
  // First: check which droppable(s) the pointer is literally inside
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // Fallback: closestCenter for when pointer is outside all tracks
  // (e.g., during the transition from library to timeline area)
  return closestCenter(args);
};

export function StudioView() {
  const { t } = useTranslation();

  // Navigation
  const goToMap = useAppStore((s) => s.goToMap);
  const goToStage = useAppStore((s) => s.goToStage);

  // Template state
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const templateLockOptions = useAppStore((s) => s.templateLockOptions);

  // Storytelling state (#41)
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const composeMode = useAppStore((s) => s.composeMode);
  const hasStorytelling = activeStoryboard !== null;
  // 'Scènes'-filmstrip (Feature F) alleen zinvol bij een multi-image storyboard.
  const allowScenes = composeMode === 'storyboard' && (activeStoryboard?.images.length ?? 0) > 1;
  const [viewMode, setViewMode] = useState<StudioViewMode>('split');
  // Val terug op 'split' als 'scenes' geselecteerd is maar niet (meer) toegestaan.
  const effectiveMode: StudioViewMode = viewMode === 'scenes' && !allowScenes ? 'split' : viewMode;
  // Mobile tab: only 'library' or 'image' (no split on small screens)
  const [mobileTab, setMobileTab] = useState<'library' | 'image'>('library');
  // Gedeelde scroll-container van de timeline (Feature F): de scène-filmstrip spiegelt hem.
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Timeline state
  const tracks = useTimelineStore((s) => s.tracks);
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const removeClip = useTimelineStore((s) => s.removeClip);
  const updateClipTrim = useTimelineStore((s) => s.updateClipTrim);
  const duplicateClip = useTimelineStore((s) => s.duplicateClip);
  const updateClipVolume = useTimelineStore((s) => s.updateClipVolume);
  const setClipMute = useTimelineStore((s) => s.setClipMute);
  const updateClipLabel = useTimelineStore((s) => s.updateClipLabel);
  const updateClipEffects = useTimelineStore((s) => s.updateClipEffects);
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
    loopMode,
    canLoopSection,
    handlePlay,
    handlePause,
    handleStop,
    handleRewind,
    handleLoopWhole,
    handleLoopSection,
    handleLoopOff,
    handlePreview,
    handleSeek,
  } = useStudioPlayback();

  // --- Sequencer in de studio (fase 2) ---
  const sequences = useTimelineStore((st) => st.sequences);
  const openSequenceId = useSequencerStore((st) => st.openSequenceId);
  const setOpenSequenceId = useSequencerStore((st) => st.setOpenSequenceId);
  const seqIsPlaying = useSequencerStore((st) => st.isPlaying);
  const sequencerOpen = !!openSequenceId;

  // Compositie-sequences in de werk-store laden (studio-modus: mutaties
  // spiegelen direct terug naar timelineStore, incl. audioVersion-bump)
  useEffect(() => {
    useSequencerStore
      .getState()
      .hydrateForStudio(useTimelineStore.getState().sequences);
  }, []);

  // Sample-lijst aangevuld met virtuele sequence-samples: hierdoor werken
  // collision, clip-breedte, dupliceren en DnD ongewijzigd voor bundels
  const samplesWithSequences = useMemo(
    () => withSequenceSamples(librarySamples, sequences),
    [librarySamples, sequences]
  );

  const handleStopPreview = useCallback((sampleId: string) => {
    audioService.stopSample(sampleId);
  }, []);

  const handleOpenSequence = useCallback(
    (sequenceId: string) => {
      // Compositie-afspelen pauzeren vóór het wisselen van context
      if (useAudioStore.getState().isPlaying) handlePause();
      // Een sequence die via de chip klinkt, stoppen
      sequencerEngine.stop();
      setOpenSequenceId(sequenceId);
    },
    [handlePause, setOpenSequenceId]
  );

  // --- Sequence maken (designronde nov 2026) ---
  // "+ Sequence" → eerst kiezen: Ritme of Melodie (daarna vast).
  const [kindChooserOpen, setKindChooserOpen] = useState(false);
  const handleAddSequence = useCallback(() => setKindChooserOpen(true), []);
  const handleChooseKind = useCallback((kind: SequenceKind) => {
    setKindChooserOpen(false);
    const store = useSequencerStore.getState();
    const number = store.sequences.filter((sq) => (sq.kind ?? 'rhythm') === kind).length + 1;
    store.createSequence(
      t(kind === 'melody' ? 'sequencer.sequences.untitledMelody' : 'sequencer.sequences.untitledRhythm', { number }),
      kind,
    );
    const newId = useSequencerStore.getState().activeSequenceId;
    if (newId) handleOpenSequence(newId);
  }, [t, handleOpenSequence]);

  // Korte bevestiging onderin (bewaard / niets bewaard)
  const [studioToast, setStudioToast] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!studioToast) return;
    const timer = setTimeout(() => setStudioToast(null), 2800);
    return () => clearTimeout(timer);
  }, [studioToast]);

  const handleSeqPlay = useCallback(async () => {
    await sequencerEngine.start();
    useSequencerStore.getState().setIsPlaying(true);
  }, []);

  const handleSeqStop = useCallback(() => {
    sequencerEngine.stop();
    useSequencerStore.getState().setIsPlaying(false);
  }, []);

  // --- Sequence beluisteren vanaf de chip (wens Bert 17-11) ---
  // Speelt het patroon één keer af zonder de editor te openen; nog een klik
  // (of een andere chip) stopt het.
  const [previewSequenceId, setPreviewSequenceId] = useState<string | null>(null);
  const previewSeqTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSequencePreview = useCallback(() => {
    if (previewSeqTimerRef.current) clearTimeout(previewSeqTimerRef.current);
    previewSeqTimerRef.current = null;
    if (!useSequencerStore.getState().openSequenceId) sequencerEngine.stop();
    setPreviewSequenceId(null);
  }, []);
  useEffect(() => () => { if (previewSeqTimerRef.current) clearTimeout(previewSeqTimerRef.current); }, []);
  // De tijdlijn gaat spelen → chip-voorbeeld stoppen (nooit twee tegelijk)
  useEffect(() => useAudioStore.subscribe((st, prev) => {
    if (st.isPlaying && !prev.isPlaying && previewSeqTimerRef.current) stopSequencePreview();
  }), [stopSequencePreview]);
  const handlePreviewSequence = useCallback(async (sequenceId: string) => {
    if (previewSequenceId === sequenceId) { stopSequencePreview(); return; }
    stopSequencePreview();
    const store = useSequencerStore.getState();
    if (store.openSequenceId) return; // editor open: de transportknop speelt daar
    const seq = store.sequences.find((sq) => sq.id === sequenceId);
    if (!seq) return;
    if (useAudioStore.getState().isPlaying) handlePause();
    audioService.stopAllSamples();
    sequencerEngine.setSamples(librarySamples);
    const voiceId = seq.kind === 'melody' && seq.melody?.voice?.type === 'sample' ? seq.melody.voice.sampleId : null;
    const ids = [...seq.tracks.map((tr) => tr.sampleId), voiceId].filter((id): id is string => !!id);
    await Promise.all(ids.map((id) => {
      const smp = librarySamples.find((x) => x.id === id);
      return smp ? sequencerEngine.ensureBuffer(smp) : Promise.resolve();
    }));
    store.setActiveSequence(sequenceId);
    await sequencerEngine.prepare(seq);
    await sequencerEngine.start();
    setPreviewSequenceId(sequenceId);
    // Eén keer rond (lengte × teldur in het huidige tempo), dan stoppen
    const seconds = seq.lengthSteps * (60 / bpm) + 0.25;
    previewSeqTimerRef.current = setTimeout(stopSequencePreview, seconds * 1000);
  }, [previewSequenceId, stopSequencePreview, handlePause, librarySamples, bpm]);

  // --- Geluidseffect (designronde nov 2026) ---
  // "+ Geluidseffect" → kies een bibliotheekgeluid → Vervormen → Klaar →
  // een eigen chip. Klik op de chip = aanpassen (ook alle geplaatste clips).
  const effectSounds = useTimelineStore((st) => st.effectSounds);
  const addEffectSound = useTimelineStore((st) => st.addEffectSound);
  const updateEffectSound = useTimelineStore((st) => st.updateEffectSound);
  const removeEffectSound = useTimelineStore((st) => st.removeEffectSound);
  const [effectDeleteTarget, setEffectDeleteTarget] = useState<EffectSound | null>(null);
  const handleConfirmDeleteEffect = useCallback(() => {
    if (!effectDeleteTarget) return;
    removeEffectSound(effectDeleteTarget.id);
    setStudioToast({ id: Date.now(), text: t('studio.effectSoundDeleted', { name: effectDeleteTarget.name }) });
    setEffectDeleteTarget(null);
  }, [effectDeleteTarget, removeEffectSound, t]);
  const effectSoundItems = useMemo(
    () => effectSounds
      .map((effectSound) => ({ effectSound, source: librarySamples.find((smp) => smp.id === effectSound.sourceSampleId) }))
      .filter((item): item is { effectSound: EffectSound; source: Sample } => !!item.source),
    [effectSounds, librarySamples],
  );
  const [effectPickerOpen, setEffectPickerOpen] = useState(false);
  const [effectTarget, setEffectTarget] = useState<
    { mode: 'new'; sample: Sample } | { mode: 'edit'; sample: Sample; effectSound: EffectSound } | null
  >(null);
  const handleAddEffectSound = useCallback(() => setEffectPickerOpen(true), []);
  const handleOpenEffectSound = useCallback((id: string) => {
    const item = effectSoundItems.find((it) => it.effectSound.id === id);
    if (item) setEffectTarget({ mode: 'edit', sample: item.source, effectSound: item.effectSound });
  }, [effectSoundItems]);
  const handlePreviewEffectSound = useCallback((id: string) => {
    const item = effectSoundItems.find((it) => it.effectSound.id === id);
    if (!item) return;
    void audioService.playSampleWithEffects(
      item.source.id, 0, item.source.duration,
      { ...NEUTRAL_CLIP_EFFECTS, ...item.effectSound.effects },
      { bpm, kind: resolveSampleKind(item.source) },
    );
  }, [effectSoundItems, bpm]);
  const effectClip: Clip | null = effectTarget
    ? {
        id: 'effect-sound-editor',
        sampleId: effectTarget.sample.id,
        startBeat: 0,
        effects: effectTarget.mode === 'edit' ? { ...NEUTRAL_CLIP_EFFECTS, ...effectTarget.effectSound.effects } : undefined,
      }
    : null;
  const handleApplyEffectSound = useCallback((patch: Partial<import('../../types').ClipEffects>) => {
    if (!effectTarget) return;
    if (effectTarget.mode === 'edit') {
      updateEffectSound(effectTarget.effectSound.id, { effects: patch });
      setStudioToast({ id: Date.now(), text: t('studio.effectSoundUpdated', { name: effectTarget.effectSound.name }) });
      return;
    }
    const base = t(effectTarget.sample.name);
    const count = useTimelineStore.getState().effectSounds.filter((e) => e.sourceSampleId === effectTarget.sample.id).length + 1;
    const name = (count > 1 ? t('studio.effectSoundNameN', { name: base, number: count }) : t('studio.effectSoundName', { name: base })).slice(0, 60);
    addEffectSound({ id: generateId(), name, sourceSampleId: effectTarget.sample.id, effects: patch });
    setStudioToast({ id: Date.now(), text: t('sequencer.studio.savedToast', { name }) });
  }, [effectTarget, addEffectSound, updateEffectSound, t]);

  // Sequencer sluiten ("Klaar", ✕ of de tab Tijdlijn). Een LEGE sequence die
  // nergens op de tijdlijn staat, wordt niet bewaard — zo ontstaan er geen
  // lege chips meer. Anders: bevestiging "staat in je bibliotheek".
  // Klikken buiten het paneel sluit niet meer (designronde nov 2026).
  const handleCloseSequencer = useCallback(() => {
    sequencerEngine.stop();
    const store = useSequencerStore.getState();
    store.setIsPlaying(false);
    const seq = store.sequences.find((sq) => sq.id === store.openSequenceId);
    setOpenSequenceId(null);
    if (!seq) return;
    const sampleId = sequenceSampleId(seq.id);
    const usedOnTimeline = useTimelineStore.getState().tracks.some((tr) => tr.clips.some((c) => c.sampleId === sampleId));
    if (isSequenceEmpty(seq) && !usedOnTimeline) {
      store.deleteSequence(seq.id, '');
      setStudioToast({ id: Date.now(), text: t('sequencer.studio.emptyDiscarded') });
    } else {
      setStudioToast({ id: Date.now(), text: t('sequencer.studio.savedToast', { name: seq.name }) });
    }
  }, [setOpenSequenceId, t]);

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
  } = useStudioDnD({ samples: samplesWithSequences });

  // Cleanup on unmount
  useAudioCleanup();

  // Reschedule audio when timeline changes during playback (#22)
  useRescheduleOnChange();

  // Undo/Redo
  const { undo, redo, canUndo, canRedo } = useUndoRedoTimeline();

  // Navigation handlers
  // Always go to map — never to start (student would lose all work)
  // When libraryLocked, hotspots are disabled on the location screen
  const handleBack = useCallback(() => {
    handleStop();
    goToMap();
  }, [handleStop, goToMap]);

  const handleGoToStage = useCallback(() => {
    handleStop();
    // Solo is een studio-monitortool — op het podium klinkt altijd de
    // volledige mix (B3)
    useTimelineStore.getState().setSoloTrack(null);
    audioService.setSoloTrack(null);
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

    const sample = samplesWithSequences.find((s) => s.id === clip.sampleId);
    if (!sample) return null;

    return { clip, sample, trackIndex: selectedTrackIndex };
  }, [selectedClipId, selectedTrackIndex, tracks, samplesWithSequences]);

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
        samplesWithSequences,
      );
      // Select the new clip if duplication was successful
      if (result.reason !== 'rejected' && result.newClipId) {
        selectClip(result.newClipId, result.trackIndex);
      }
    }
  }, [selectedClipData, duplicateClip, selectClip, samplesWithSequences]);

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

  // Handle clip label change (#66)
  const handleClipLabelChange = useCallback(
    (label: string) => {
      if (selectedClipData) {
        updateClipLabel(selectedClipData.trackIndex, selectedClipData.clip.id, label);
      }
    },
    [selectedClipData, updateClipLabel],
  );

  // Handle clip effects apply (#33, #79) — pitch, reverb, fade
  const handleClipEffectsApply = useCallback(
    (effects: Partial<import('../../types').ClipEffects>) => {
      if (selectedClipData) {
        updateClipEffects(
          selectedClipData.trackIndex,
          selectedClipData.clip.id,
          effects,
          selectedClipData.sample,
        );
      }
    },
    [selectedClipData, updateClipEffects],
  );

  // A11Y-1: Add selected library sample to first available track position
  const addClip = useTimelineStore((s) => s.addClip);
  const handleAddToTrack = useCallback(() => {
    if (!selectedLibrarySampleId) return;
    // Block if template doesn't allow new clips (#59)
    if (activeTemplate && !templateLockOptions.allowNewClips) return;

    const clip = {
      id: generateClipId(),
      sampleId: selectedLibrarySampleId,
      startBeat: 0,
    };

    // Try track 0 first — smart snap will find the best position
    addClip(0, clip, samplesWithSequences);

    // Clear selection after adding
    setSelectedLibrarySampleId(null);
  }, [selectedLibrarySampleId, addClip, activeTemplate, templateLockOptions.allowNewClips, samplesWithSequences]);

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
      {/* Navigatiebalk — donker kader (designronde nov 2026). Zelfde plek en
          hoogte als voorheen. De terugknop naar de kaart staat er altijd
          (wens Bert 17-11); "Verzamel meer geluiden" in de maakbalk doet
          hetzelfde vanuit de bibliotheek. */}
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-brand-900 text-white border-b border-brand-800">
        <Button variant="secondary" size="sm" onClick={handleBack} className="inline-flex items-center gap-1.5 shrink-0">
          <MapIcon className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('studio.backToLocation')}</span>
          <span className="sm:hidden">{t('common.back')}</span>
        </Button>
        <h1 className="type-title text-white">{t('studio.title')}</h1>
        <ClassSessionBadge variant="dark" />
        <div className="flex-1" />
        {/* Desktop storytelling toggle (hidden on mobile — mobile uses tab bar below) */}
        {hasStorytelling && (
          <div className="hidden sm:block">
            <StorytellingToggle viewMode={viewMode} onViewModeChange={setViewMode} allowScenes={allowScenes} />
          </div>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleGoToStage}
          disabled={!hasClips}
        >
          {t('studio.toStage')}
        </Button>
      </div>

      {/* Mobile tab bar for storytelling (visible only on mobile when storytelling active) */}
      {hasStorytelling && (
        <div className="flex sm:hidden border-b border-border-subtle bg-white/90">
          <button
            onClick={() => setMobileTab('library')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
              mobileTab === 'library'
                ? 'text-brand-700 border-b-2 border-brand-700'
                : 'text-text-muted'
            }`}
          >
            <Music size={14} />
            {t('composeMode.viewLibrary')}
          </button>
          <button
            onClick={() => setMobileTab('image')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
              mobileTab === 'image'
                ? 'text-brand-700 border-b-2 border-brand-700'
                : 'text-text-muted'
            }`}
          >
            <Image size={14} />
            {t('composeMode.viewImage')}
          </button>
        </div>
      )}

      {/* Feedback woont op het podium (testronde 2): de FeedbackBanner is
          daarheen verhuisd — de studio blijft de rustige werkplek */}

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
        collisionDetection={trackCollisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Content area: Library, Split, or Image — depends on storytelling state.
            (Klikken hier sluit de sequencer niet meer: alleen Klaar of ✕.) */}
        <div className="contents">
        {!hasStorytelling ? (
          /* No storytelling: library only (existing behavior) */
          <SampleLibrary
            samples={librarySamples}
            onPreview={handlePreview}
            selectedSampleId={selectedLibrarySampleId}
            onSelectSample={setSelectedLibrarySampleId}
            sequences={sequences}
            onOpenSequence={handleOpenSequence}
            onAddSequence={handleAddSequence}
                  onCollectMore={handleBack}
                  onAddEffectSound={handleAddEffectSound}
                  effectSounds={effectSoundItems}
                  onOpenEffectSound={handleOpenEffectSound}
                  onPreviewEffectSound={handlePreviewEffectSound}
                  onPreviewSequence={(id) => void handlePreviewSequence(id)}
                  previewSequenceId={previewSequenceId}
            onStopPreview={handleStopPreview}
          />
        ) : (
          <>
            {/* Desktop layout (sm+) */}
            <div className="hidden sm:flex flex-1 min-h-0">
              {effectiveMode === 'scenes' ? (
                /* Scènes-modus: alle storyboard-beelden als filmstrip, uitgelijnd op de timeline */
                <StorytellingFilmstrip syncScrollFrom={timelineScrollRef} className="flex-1 min-w-0" />
              ) : (
                <>
                  {effectiveMode !== 'image' && (
                    <SampleLibrary
                      samples={librarySamples}
                      onPreview={handlePreview}
                      selectedSampleId={selectedLibrarySampleId}
                      onSelectSample={setSelectedLibrarySampleId}
                      sequences={sequences}
                      onOpenSequence={handleOpenSequence}
                      onAddSequence={handleAddSequence}
                  onCollectMore={handleBack}
                  onAddEffectSound={handleAddEffectSound}
                  effectSounds={effectSoundItems}
                  onOpenEffectSound={handleOpenEffectSound}
                  onPreviewEffectSound={handlePreviewEffectSound}
                  onPreviewSequence={(id) => void handlePreviewSequence(id)}
                  previewSequenceId={previewSequenceId}
                      onStopPreview={handleStopPreview}
                    />
                  )}
                  {effectiveMode !== 'library' && (
                    <StorytellingPanel className={effectiveMode === 'split' ? 'flex-1 min-w-0 border-l border-border-subtle bg-white/90 md:bg-bg-surface' : 'flex-1'} />
                  )}
                </>
              )}
            </div>

            {/* Mobile layout (<sm): tabs */}
            <div className="flex sm:hidden flex-1 min-h-0">
              {mobileTab === 'library' ? (
                <SampleLibrary
                  samples={librarySamples}
                  onPreview={handlePreview}
                  selectedSampleId={selectedLibrarySampleId}
                  onSelectSample={setSelectedLibrarySampleId}
                  sequences={sequences}
                  onOpenSequence={handleOpenSequence}
                  onAddSequence={handleAddSequence}
                  onCollectMore={handleBack}
                  onAddEffectSound={handleAddEffectSound}
                  effectSounds={effectSoundItems}
                  onOpenEffectSound={handleOpenEffectSound}
                  onPreviewEffectSound={handlePreviewEffectSound}
                  onPreviewSequence={(id) => void handlePreviewSequence(id)}
                  previewSequenceId={previewSequenceId}
                  onStopPreview={handleStopPreview}
                />
              ) : (
                <StorytellingPanel className="flex-1" />
              )}
            </div>
          </>
        )}
        </div>

        {/* Timeline - fixed at bottom above transport controls.
            Fase 2: met een geopende sequence vervangt het sequencer-panel de
            volledige tijdlijnzone (incl. werkbalk) — "rustig tenzij". */}
        {sequencerOpen ? (
          <StudioSequencerPanel
            samples={librarySamples}
            isFreeMode={composeMode === 'free'}
            onDone={handleCloseSequencer}
          />
        ) : (
        <Timeline
          tracks={tracks}
          /* Clips oplossen via de eigen bibliotheek, niet via het actieve thema.
             Zonder deze prop viel Track terug op themeGetSampleById: open je een
             compositie op een ánder apparaat (bewaarcode), dan staat daar thema
             'basis' actief en werden clips uit een ander thema niet gevonden —
             lege tijdlijn (bevinding Bert, testronde 4 / punt A3). */
          samples={samplesWithSequences}
          bpm={bpm}
          totalBeats={totalBeats}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          snapPreview={snapPreview}
          externalScrollRef={timelineScrollRef}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          selectedLibrarySampleName={selectedLibrarySampleName}
          onAddToTrack={handleAddToTrack}
          clipEdit={selectedClipData ? {
            clip: selectedClipData.clip,
            sample: selectedClipData.sample,
            onTrim: handleTrimClick,
            onDelete: handleDeleteClick,
            onDuplicate: handleDuplicate,
            onClipVolumeChange: handleClipVolumeChange,
            onClipMuteToggle: handleClipMuteToggle,
            onClipLabelChange: handleClipLabelChange,
            onClipEffectsApply: handleClipEffectsApply,
            onEditPattern: isSequenceSampleId(selectedClipData.clip.sampleId)
              ? () => {
                  const seqId = getSequenceIdFromSampleId(selectedClipData.clip.sampleId);
                  if (seqId) handleOpenSequence(seqId);
                }
              : undefined,
            locked: templateLockOptions.clipsLocked && (selectedClipData.clip.fromTemplate === true),
          } : null}
        />
        )}

        {/* Drag Overlay - hidden when snap preview is visible (only snap preview shows drop location) */}
        <DragOverlay>
          {activeDragSample && !snapPreview ? (
            activeDragType === 'clip' ? (
              <div
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-xl opacity-90"
                style={{ backgroundColor: activeDragSample.color }}
              >
                <SampleIcon name={activeDragSample.icon} size={14} className={getOnSoundTextClass(activeDragSample.color)} />
                <span className={`text-xs font-extrabold ${getOnSoundTextClass(activeDragSample.color)}`}>
                  {t(activeDragSample.name)}
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-white shadow-xl opacity-90"
                style={{ borderColor: activeDragSample.color }}
              >
                <SampleIcon name={activeDragSample.icon} size={20} className="text-neutral-700" />
                <span className="text-sm font-semibold text-neutral-700">
                  {t(activeDragSample.name)}
                </span>
              </div>
            )
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Transport Controls */}
      {/* Modus-bewust: met een open sequencer-tab speelt de grote play-knop
          de sequence (rondlopend, eigen engine); anders de compositie. */}
      <TransportControls
        isPlaying={sequencerOpen ? seqIsPlaying : isPlaying}
        hasClips={sequencerOpen ? true : hasClips}
        onPlay={sequencerOpen ? handleSeqPlay : handlePlay}
        onPause={sequencerOpen ? handleSeqStop : handlePause}
        onRewind={sequencerOpen ? handleSeqStop : handleRewind}
        loopMode={sequencerOpen ? 'whole' : loopMode}
        canLoopSection={sequencerOpen ? false : canLoopSection}
        onLoopWhole={sequencerOpen ? () => undefined : handleLoopWhole}
        onLoopSection={sequencerOpen ? () => undefined : handleLoopSection}
        onLoopOff={sequencerOpen ? () => undefined : handleLoopOff}
        trailing={<TempoPicker />}
      />

      {/* Geluidseffect stap 1: kies een geluid */}
      <Modal isOpen={effectPickerOpen} onClose={() => setEffectPickerOpen(false)} title={t('studio.effectPickerTitle')} size="md">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {librarySamples.map((smp) => (
            <button
              key={smp.id}
              type="button"
              data-testid="effect-source"
              onClick={() => { setEffectPickerOpen(false); setEffectTarget({ mode: 'new', sample: smp }); }}
              className="flex items-center gap-2 rounded-xl border-2 border-border-subtle hover:border-accent-400 bg-bg-surface px-3 min-h-[52px] text-left transition-colors"
            >
              <span className="w-2 self-stretch my-2 rounded-full shrink-0" style={{ backgroundColor: smp.color }} aria-hidden="true" />
              <SampleIcon name={smp.icon} size={18} className="text-text-main shrink-0" />
              <span className="type-body text-text-main truncate">{t(smp.name)}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-text-muted mt-3">{t('studio.effectPickerHint')}</p>
      </Modal>

      {/* Geluidseffect stap 2: Vervormen (zelfde venster als op een clip), knop Klaar */}
      {effectTarget && effectClip && (
        <EffectsModal
          clip={effectClip}
          sample={effectTarget.sample}
          bpm={bpm}
          isOpen
          onClose={() => setEffectTarget(null)}
          onApply={handleApplyEffectSound}
          applyLabel={t('sequencer.studio.done')}
          onDelete={effectTarget.mode === 'edit' ? () => {
            setEffectDeleteTarget(effectTarget.effectSound);
            setEffectTarget(null);
          } : undefined}
          deleteLabel={t('studio.deleteEffectSound')}
        />
      )}

      {/* Geluidseffect verwijderen: bevestigen (patroon destructieve actie) */}
      <Modal
        isOpen={!!effectDeleteTarget}
        onClose={() => setEffectDeleteTarget(null)}
        title={t('studio.deleteEffectSoundTitle', { name: effectDeleteTarget?.name ?? '' })}
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed text-center">{t('studio.deleteEffectSoundText')}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setEffectDeleteTarget(null)} className="flex-1">{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleConfirmDeleteEffect} className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white" data-testid="effect-sound-delete-confirm">
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      <SequenceKindChooser
        isOpen={kindChooserOpen}
        onClose={() => setKindChooserOpen(false)}
        onChoose={handleChooseKind}
      />

      {studioToast && (
        <div
          key={studioToast.id}
          role="status"
          data-testid="studio-toast"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-toast type-body rounded-full bg-brand-900 text-white px-5 py-3 shadow-xl inline-flex items-center gap-2 max-w-[90vw]"
        >
          <Check className="w-4 h-4 text-accent-400 shrink-0" aria-hidden="true" />
          {studioToast.text}
        </div>
      )}

      {/* Trim Modal */}
      {selectedClipData && (
        <TrimModal
          clip={selectedClipData.clip}
          sample={selectedClipData.sample}
          bpm={bpm}
          isOpen={isTrimModalOpen}
          onClose={handleTrimModalClose}
          onApply={handleTrimApply}
        />
      )}
    </div>
  );
}

export default StudioView;
