/**
 * Selection Store - Manages clip selection state in the Studio
 *
 * Tracks which clip is currently selected for editing operations
 * like trimming, deletion, duplication, etc.
 */

import { create } from 'zustand';

interface SelectionStore {
  /** ID of the currently selected clip (null if none) */
  selectedClipId: string | null;
  /** Track index of the selected clip */
  selectedTrackIndex: number | null;

  /** Select a clip for editing */
  selectClip: (clipId: string, trackIndex: number) => void;
  /** Clear the current selection */
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionStore>()((set) => ({
  selectedClipId: null,
  selectedTrackIndex: null,

  selectClip: (clipId, trackIndex) =>
    set({
      selectedClipId: clipId,
      selectedTrackIndex: trackIndex,
    }),

  clearSelection: () =>
    set({
      selectedClipId: null,
      selectedTrackIndex: null,
    }),
}));
