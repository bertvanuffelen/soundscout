import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Undo2, Redo2, Plus, Flag, Scissors, Trash2, Copy, Volume2, VolumeX, Eraser, ZoomIn, ZoomOut, Maximize2, Tag, Sparkles } from 'lucide-react';
import type { Track as TrackType, Sample, Clip, Section, ClipEffects } from '../../types';
import { Track } from './Track';
import { Playhead } from './Playhead';
import { SectionBar } from './SectionBar';
import { VolumePopover } from './VolumePopover';
import { EffectsModal } from './EffectsModal';
import { SampleIcon } from '../../utils/iconMap';
import { getClipDuration } from '../../utils/audio';
import { MAX_SECTIONS, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT_DESKTOP, ZOOM_DEFAULT_MOBILE } from '../../constants/config';
import { useSelectionStore } from '../../stores/selectionStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioStore } from '../../stores/audioStore';
import { useAppStore } from '../../stores/appStore';

// --- Clip edit props (inline in header bar) ---
interface ClipEditProps {
  clip: Clip;
  sample: Sample;
  onTrim: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onClipVolumeChange?: (db: number) => void;
  onClipMuteToggle?: (muted: boolean) => void;
  onClipLabelChange?: (label: string) => void;
  onClipEffectsApply?: (effects: Partial<ClipEffects>) => void;
  locked?: boolean;
}

interface TimelineProps {
  tracks: TrackType[];
  bpm: number;
  totalBeats: number;
  currentBeat?: number;  // Optional: uses store subscription if not provided
  isPlaying: boolean;
  onSeek?: (beat: number) => void;
  snapPreview: { trackId: string; beat: number; durationBeats: number; color: string } | null;
  readOnly?: boolean;
  samples?: Sample[];  // Optional: for read-only mode with custom samples
  sections?: Section[];  // Optional: for read-only mode with external sections (SharedPlayer/SubmissionPlayer)
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // A11Y-1: Keyboard add-to-track
  selectedLibrarySampleName?: string | null;
  onAddToTrack?: () => void;
  // Clip editing (inline in header bar)
  clipEdit?: ClipEditProps | null;
}

export const Timeline = memo(function Timeline({
  tracks,
  bpm,
  totalBeats,
  currentBeat: propCurrentBeat,
  isPlaying,
  onSeek,
  snapPreview,
  readOnly = false,
  samples,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  selectedLibrarySampleName,
  onAddToTrack,
  clipEdit,
  sections: propSections,
}: TimelineProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const hasNoClips = useTimelineStore((s) => s.selectHasNoClips());
  const clearAllTracks = useTimelineStore((s) => s.clearAllTracks);

  // Clear timeline confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearClick = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleClearConfirm = useCallback(() => {
    clearAllTracks();
    clearSelection();
    setShowClearConfirm(false);
  }, [clearAllTracks, clearSelection]);

  const handleClearCancel = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  // Section state — use prop if provided (read-only players), otherwise from store
  const storeSections = useTimelineStore((s) => s.sections);
  const sections = propSections ?? storeSections;
  const addSection = useTimelineStore((s) => s.addSection);
  const updateSection = useTimelineStore((s) => s.updateSection);
  const removeSection = useTimelineStore((s) => s.removeSection);

  // Lock sections based on template lock options (#59) or storyboard mode
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const templateLockOptions = useAppStore((s) => s.templateLockOptions);
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const composeMode = useAppStore((s) => s.composeMode);
  const isMultiImageStoryboard = activeStoryboard !== null && composeMode === 'storyboard';
  // Sections locked when: template says so, OR multi-image storyboard (always managed by storyboard)
  const sectionsLocked = (activeTemplate !== null && templateLockOptions.sectionsLocked) || isMultiImageStoryboard;
  // Storyboard sections can be resized but not added/deleted/edited
  // Exception: when template locks sections, no resize allowed
  const sectionsResizable = isMultiImageStoryboard && !(activeTemplate !== null && templateLockOptions.sectionsLocked);

  // Subscribe to currentBeat from store (for StudioView)
  // or use prop (for SubmissionPlayer with local state)
  const storeCurrentBeat = useAudioStore((s) => s.currentBeat);
  const currentBeat = propCurrentBeat ?? storeCurrentBeat;

  // --- Clip edit: volume popover state ---
  const [showClipVolumePopover, setShowClipVolumePopover] = useState(false);
  const clipVolumeBtnRef = useRef<HTMLButtonElement>(null);

  // --- Clip edit: effects modal state (#33, #79) ---
  const [showEffectsModal, setShowEffectsModal] = useState(false);

  // --- Clip edit: label editing state (#66) ---
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);

  const handleClipVolumeClick = useCallback(() => {
    setShowClipVolumePopover((prev) => !prev);
  }, []);

  const handleCloseClipVolumePopover = useCallback(() => {
    setShowClipVolumePopover(false);
  }, []);

  const handleEffectsClick = useCallback(() => {
    setShowEffectsModal(true);
    setShowClipVolumePopover(false);
  }, []);

  const handleCloseEffectsModal = useCallback(() => {
    setShowEffectsModal(false);
  }, []);

  const handleLabelToggle = useCallback(() => {
    setShowLabelInput((prev) => {
      if (!prev && clipEdit) {
        setLabelDraft(clipEdit.clip.label ?? '');
        // Focus the input after render
        requestAnimationFrame(() => labelInputRef.current?.focus());
      }
      return !prev;
    });
  }, [clipEdit]);

  const handleLabelSubmit = useCallback(() => {
    if (clipEdit?.onClipLabelChange) {
      clipEdit.onClipLabelChange(labelDraft.trim());
    }
    setShowLabelInput(false);
  }, [clipEdit, labelDraft]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelSubmit();
    } else if (e.key === 'Escape') {
      setShowLabelInput(false);
    }
  }, [handleLabelSubmit]);

  // Close clip volume popover, effects modal, and label input when selection changes
  useEffect(() => {
    if (!clipEdit) {
      setShowClipVolumePopover(false);
      setShowEffectsModal(false);
      setShowLabelInput(false);
    }
  }, [clipEdit]);

  // Handle click on timeline background to clear selection
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      // Only clear if clicking on timeline background, not on a clip
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  // Mark section at current playhead position
  const handleMarkSection = useCallback(() => {
    // Read currentBeat imperatively to avoid dependency on fast-updating value
    const beat = Math.round(useAudioStore.getState().currentBeat);
    if (beat > 0 && beat <= totalBeats) {
      addSection(beat);
    }
  }, [totalBeats, addSection]);

  // Resize a section's endBeat (drag handle in SectionBar)
  const handleResizeSection = useCallback((sectionId: string, newEndBeat: number) => {
    updateSection(sectionId, { endBeat: newEndBeat });
  }, [updateSection]);

  // --- Zoom state ---
  // Detect mobile once on mount for default zoom level
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth < 640);
  const [zoomLevel, setZoomLevel] = useState(() =>
    isMobileRef.current ? ZOOM_DEFAULT_MOBILE : ZOOM_DEFAULT_DESKTOP,
  );

  // widthMultiplier: 1.0 = fit all beats in viewport, 2.0 = half visible, etc.
  const widthMultiplier = zoomLevel;
  const playheadPercent = (currentBeat / totalBeats) * 100;

  // Zoom handlers — center on playhead position
  const applyZoom = useCallback((newZoom: number) => {
    const clamped = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom)) * 100) / 100;
    const container = scrollContainerRef.current;
    if (container) {
      // Use playhead position as zoom anchor so it stays in view
      const beat = useAudioStore.getState().currentBeat;
      const playheadFraction = beat / totalBeats;
      setZoomLevel(clamped);
      // After React re-renders with new width, scroll to keep playhead in view
      requestAnimationFrame(() => {
        const newScrollWidth = container.scrollWidth;
        const playheadPx = playheadFraction * newScrollWidth;
        // Center the playhead in the viewport
        container.scrollLeft = Math.max(0, playheadPx - container.clientWidth / 2);
      });
    } else {
      setZoomLevel(clamped);
    }
  }, [totalBeats]);

  const handleZoomIn = useCallback(() => applyZoom(zoomLevel + ZOOM_STEP), [zoomLevel, applyZoom]);
  const handleZoomOut = useCallback(() => applyZoom(zoomLevel - ZOOM_STEP), [zoomLevel, applyZoom]);
  const handleZoomFit = useCallback(() => applyZoom(1.0), [applyZoom]);

  // Generate grid lines (one per beat) — memoized since totalBeats rarely changes
  const gridLines = useMemo(
    () => Array.from({ length: totalBeats + 1 }, (_, i) => i),
    [totalBeats],
  );

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerWidth = container.clientWidth;
      const scrollWidth = container.scrollWidth;
      const playheadPosition = (currentBeat / totalBeats) * scrollWidth;

      // Keep playhead in the middle third of the visible area
      const visibleStart = container.scrollLeft;
      const visibleEnd = visibleStart + containerWidth;
      const margin = containerWidth * 0.3;

      if (playheadPosition < visibleStart + margin) {
        container.scrollLeft = Math.max(0, playheadPosition - margin);
      } else if (playheadPosition > visibleEnd - margin) {
        container.scrollLeft = Math.min(scrollWidth - containerWidth, playheadPosition - containerWidth + margin);
      }
    }
  }, [currentBeat, totalBeats, isPlaying]);

  return (
    <div className={`flex flex-col shrink-0 ${composeMode === 'free' ? 'max-h-[50dvh]' : 'max-h-[40dvh]'}`} role="region" aria-label={t('studio.timeline')}>
      {/* --- Header bar: label | clip edit (center) | tools (right) --- */}
      <div className="flex items-center px-2 sm:px-4 py-1 sm:py-1.5 bg-white/60 md:bg-bg-surface border-b border-border-subtle border-t">
        {/* Left: timeline label */}
        <h2 className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wide shrink-0">
          {t('studio.timeline')}
        </h2>

        {/* Center: clip edit actions (only when clip selected) */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {clipEdit && (
            <div
              className="flex items-center gap-0.5 sm:gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sample info pill — hidden on mobile to save toolbar space */}
              <div className="hidden sm:flex items-center gap-1 px-1.5 sm:px-2 mr-0.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: clipEdit.sample.color }}
                />
                <SampleIcon name={clipEdit.sample.icon} size={12} className="text-neutral-600 shrink-0" />
                <span className="text-xs font-medium text-neutral-700 max-w-28 truncate">
                  {t(clipEdit.sample.name)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {getClipDuration(clipEdit.clip, clipEdit.sample).toFixed(1)}s
                  {(clipEdit.clip.trimStart !== undefined || clipEdit.clip.trimEnd !== undefined) && ' ✂'}
                </span>
              </div>

              {/* Label (#66) — toggle inline input, right after sample name */}
              {clipEdit.onClipLabelChange && (
                showLabelInput ? (
                  <input
                    ref={labelInputRef}
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value.slice(0, 30))}
                    onBlur={handleLabelSubmit}
                    onKeyDown={handleLabelKeyDown}
                    placeholder={t('studio.clipLabelPlaceholder')}
                    className="w-20 sm:w-24 text-[10px] sm:text-xs px-1.5 py-0.5 rounded border border-neutral-300 focus:border-accent-400 focus:outline-none bg-white text-neutral-700"
                  />
                ) : (
                  <button
                    onClick={handleLabelToggle}
                    aria-label={t('studio.clipLabel')}
                    title={clipEdit.clip.label ? `${t('studio.clipLabel')}: ${clipEdit.clip.label}` : t('studio.clipLabel')}
                    className={`
                      p-1 sm:p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg transition-colors
                      ${clipEdit.clip.label
                        ? 'bg-accent-50 text-accent-600 hover:bg-accent-100'
                        : 'hover:bg-neutral-100 active:bg-neutral-200 text-neutral-600'
                      }
                    `}
                  >
                    <Tag size={14} />
                  </button>
                )
              )}

              {/* Trim — hidden for locked clips */}
              {!clipEdit.locked && (
                <button
                  onClick={clipEdit.onTrim}
                  aria-label={t('studio.trim')}
                  title={t('studio.trim')}
                  className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 rounded-lg transition-colors"
                >
                  <Scissors size={14} className="text-neutral-600" />
                </button>
              )}

              {/* Duplicate — hidden for locked clips */}
              {!clipEdit.locked && clipEdit.onDuplicate && (
                <button
                  onClick={clipEdit.onDuplicate}
                  aria-label={t('studio.duplicate')}
                  title={t('studio.duplicate')}
                  className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 rounded-lg transition-colors"
                >
                  <Copy size={14} className="text-neutral-600" />
                </button>
              )}

              {/* Volume */}
              {clipEdit.onClipVolumeChange && clipEdit.onClipMuteToggle && (
                <button
                  ref={clipVolumeBtnRef}
                  onClick={handleClipVolumeClick}
                  aria-label={t('studio.clipVolume')}
                  title={(clipEdit.clip.effects?.mute ?? false) ? t('studio.muted') : t('studio.clipVolume')}
                  className={`
                    p-1 sm:p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg transition-colors
                    ${(clipEdit.clip.effects?.mute ?? false)
                      ? 'bg-error-50 hover:bg-error-100'
                      : 'hover:bg-neutral-100 active:bg-neutral-200'
                    }
                  `}
                >
                  {(clipEdit.clip.effects?.mute ?? false)
                    ? <VolumeX size={14} className="text-error-500" />
                    : <Volume2 size={14} className="text-neutral-600" />
                  }
                </button>
              )}

              {/* Effects (#33, #79) — pitch, reverb, fade */}
              {clipEdit.onClipEffectsApply && (
                <button
                  onClick={handleEffectsClick}
                  aria-label={t('studio.effects')}
                  title={t('studio.effects')}
                  className={`
                    p-1 sm:p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg transition-colors
                    ${((clipEdit.clip.effects?.pitch ?? 0) !== 0 || (clipEdit.clip.effects?.reverb ?? 0) > 0 || (clipEdit.clip.effects?.fadeIn ?? 0) > 0 || (clipEdit.clip.effects?.fadeOut ?? 0) > 0)
                      ? 'bg-accent-50 text-accent-600 hover:bg-accent-100'
                      : 'hover:bg-neutral-100 active:bg-neutral-200 text-neutral-600'
                    }
                  `}
                >
                  <Sparkles size={14} />
                </button>
              )}

              {/* Delete — hidden for locked clips */}
              {!clipEdit.locked && (
                <button
                  onClick={clipEdit.onDelete}
                  aria-label={t('studio.delete')}
                  title={t('studio.delete')}
                  className="p-1 sm:p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center hover:bg-error-50 active:bg-error-100 rounded-lg transition-colors"
                >
                  <Trash2 size={14} className="text-error-500" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: tools (section mark, undo/redo, add-to-track) */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* A11Y-1: Add selected sample to track (keyboard alternative for DnD) */}
          {onAddToTrack && selectedLibrarySampleName && (
            <button
              onClick={onAddToTrack}
              aria-label={t('studio.addToTrack', { name: selectedLibrarySampleName })}
              className="p-1 rounded text-accent-600 hover:text-accent-700 hover:bg-accent-100/60 transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          )}
          {/* Mark section button — only in edit mode, hidden when template sections locked */}
          {!readOnly && !sectionsLocked && (
            <button
              onClick={handleMarkSection}
              disabled={sections.length >= MAX_SECTIONS}
              aria-label={t('studio.sections.markSection')}
              title={sections.length >= MAX_SECTIONS
                ? t('studio.sections.maxReached')
                : t('studio.sections.markSection')
              }
              className="p-1 rounded text-neutral-400 hover:text-accent-600 hover:bg-accent-100/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            >
              <Flag size={14} />
            </button>
          )}
          {/* Clear timeline button — only in edit mode */}
          {!readOnly && (
            showClearConfirm ? (
              <div className="flex items-center gap-1 px-1">
                <span className="text-[10px] text-error-500 font-medium whitespace-nowrap">
                  {t('studio.clearConfirm')}
                </span>
                <button
                  onClick={handleClearConfirm}
                  aria-label={t('common.delete')}
                  className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-error-500 hover:bg-error-600 rounded transition-colors"
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={handleClearCancel}
                  aria-label={t('common.cancel')}
                  className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={handleClearClick}
                disabled={hasNoClips}
                aria-label={t('studio.clearTimeline')}
                title={t('studio.clearTimeline')}
                className="p-1 rounded text-neutral-400 hover:text-error-500 hover:bg-error-50 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
              >
                <Eraser size={14} />
              </button>
            )
          )}
          {/* Zoom controls — hidden on mobile to save toolbar space */}
          <div className="hidden sm:flex items-center gap-0">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= ZOOM_MIN}
              aria-label={t('studio.zoomOut')}
              title={t('studio.zoomOut')}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={handleZoomFit}
              aria-label={t('studio.zoomFit')}
              title={t('studio.zoomFit')}
              className={`p-1 rounded transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                zoomLevel === 1.0
                  ? 'text-accent-500'
                  : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60'
              }`}
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= ZOOM_MAX}
              aria-label={t('studio.zoomIn')}
              title={t('studio.zoomIn')}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
            >
              <ZoomIn size={14} />
            </button>
          </div>
          {onUndo && onRedo && (
            <>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                aria-label={t('studio.undo')}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                aria-label={t('studio.redo')}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-25 disabled:pointer-events-none transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
              >
                <Redo2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Clip volume popover — portal to escape overflow */}
      {showClipVolumePopover && clipEdit?.onClipVolumeChange && clipEdit?.onClipMuteToggle && clipVolumeBtnRef.current && createPortal(
        <div
          style={{
            position: 'fixed',
            left: clipVolumeBtnRef.current.getBoundingClientRect().left,
            top: clipVolumeBtnRef.current.getBoundingClientRect().top - 8,
            transform: 'translateY(-100%)',
            zIndex: 9999,
          }}
        >
          <VolumePopover
            volumeDb={clipEdit.clip.effects?.volume ?? 0}
            isMuted={clipEdit.clip.effects?.mute ?? false}
            onVolumeChange={clipEdit.onClipVolumeChange}
            onMuteToggle={clipEdit.onClipMuteToggle}
            onClose={handleCloseClipVolumePopover}
            label={t(clipEdit.sample.name)}
          />
        </div>,
        document.body,
      )}

      {/* Effects modal (#33, #79) — pitch, reverb, fade */}
      {clipEdit?.onClipEffectsApply && (
        <EffectsModal
          clip={clipEdit.clip}
          sample={clipEdit.sample}
          isOpen={showEffectsModal}
          onClose={handleCloseEffectsModal}
          onApply={(effects) => {
            clipEdit.onClipEffectsApply!(effects);
            handleCloseEffectsModal();
          }}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="relative overflow-x-auto overflow-y-auto min-h-0 bg-neutral-50/50 md:bg-neutral-100/50"
        onClick={handleTimelineClick}
      >
        {/* Scrollable content wrapper */}
        <div
          className="relative"
          style={{ width: `${widthMultiplier * 100}%`, minWidth: '100%' }}
        >
          {/* Section bar — shown when sections exist (dev flag or template) */}
          {sections.length > 0 && (
            <div className="relative border-b border-border-subtle">
              {/* Track label spacer */}
              <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-neutral-200/50 z-10" />
              <div className="ml-5 sm:ml-6">
                <SectionBar
                  sections={sections}
                  totalBeats={totalBeats}
                  onUpdate={updateSection}
                  onResize={handleResizeSection}
                  onDelete={removeSection}
                  readOnly={readOnly || sectionsLocked}
                  resizable={!readOnly && sectionsResizable}
                />
              </div>
            </div>
          )}

          {/* Ruler strip - 16px with measure lines */}
          <div className="relative h-4 border-b border-border-subtle bg-neutral-100/80">
            {/* Track label spacer */}
            <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-neutral-200/50" />

            {/* Measure lines in ruler (every 4 beats) */}
            <div className="absolute inset-0 left-4 sm:left-6">
              {gridLines
                .filter((b) => b % 4 === 0)
                .map((beat) => {
                  const leftPercent = (beat / totalBeats) * 100;
                  const measureNumber = beat / 4 + 1;
                  return (
                    <div
                      key={beat}
                      className="absolute top-0 bottom-0 border-l border-neutral-300"
                      style={{ left: `${leftPercent}%` }}
                    >
                      {/* Measure number label */}
                      <span
                        className="absolute left-0.5 top-0 text-[8px] sm:text-[9px] leading-4 text-neutral-400 select-none pointer-events-none"
                      >
                        {measureNumber}
                      </span>
                    </div>
                  );
                })}

              {/* Playhead (handle in ruler + line through tracks) */}
              {onSeek && (
                <Playhead
                  currentBeat={currentBeat}
                  totalBeats={totalBeats}
                  isPlaying={isPlaying}
                  onSeek={onSeek}
                  containerRef={scrollContainerRef}
                />
              )}
            </div>
          </div>

          {/* Grid lines for tracks */}
          <div className="absolute top-4 inset-x-0 bottom-0 left-4 sm:left-6 pointer-events-none">
            {gridLines.map((beat) => {
              const leftPercent = (beat / totalBeats) * 100;
              const isMajor = beat % 4 === 0;
              return (
                <div
                  key={beat}
                  className={`absolute top-0 bottom-0 ${isMajor ? 'border-neutral-300' : 'border-neutral-200/60'}`}
                  style={{
                    left: `${leftPercent}%`,
                    borderLeftWidth: '1px',
                  }}
                />
              );
            })}
          </div>

          {/* Tracks */}
          <div className="relative z-10">
            {tracks.map((track, i) => (
              <Track
                key={track.id}
                track={track}
                trackIndex={i}
                bpm={bpm}
                totalBeats={totalBeats}
                snapPreview={snapPreview?.trackId === track.id ? snapPreview : null}
                readOnly={readOnly}
                samples={samples}
              />
            ))}
          </div>

          {/* Playhead line fallback for read-only mode without seek */}
          {readOnly && !onSeek && (
            <div className="absolute top-4 inset-x-0 bottom-0 left-4 sm:left-6 pointer-events-none z-20">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-error-500 -translate-x-1/2"
                style={{ left: `${playheadPercent}%` }}
              />
            </div>
          )}

          {/* Empty state hint - only show in edit mode */}
          {!readOnly && hasNoClips && (
            <div className="absolute inset-0 top-4 flex items-center justify-center pointer-events-none">
              <p className="text-xs sm:text-sm text-text-muted italic">
                {t('studio.dragHint')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
