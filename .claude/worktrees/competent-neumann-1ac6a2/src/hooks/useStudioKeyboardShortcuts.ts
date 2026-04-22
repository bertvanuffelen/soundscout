/**
 * useStudioKeyboardShortcuts - Keyboard shortcuts voor StudioView
 *
 * Shortcuts:
 * - Space: Toggle play/pause
 * - Ctrl+D / Cmd+D: Duplicate geselecteerde clip
 * - Ctrl+Z / Cmd+Z: Undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z: Redo
 */

import { useEffect } from 'react';

interface UseStudioKeyboardShortcutsOptions {
  isPlaying: boolean;
  hasSelectedClip: boolean;
  onPlay: () => void;
  onPause: () => void;
  onDuplicate: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function useStudioKeyboardShortcuts({
  isPlaying,
  hasSelectedClip,
  onPlay,
  onPause,
  onDuplicate,
  onUndo,
  onRedo,
}: UseStudioKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;

      // Ctrl+Z / Cmd+Z = Undo, Ctrl+Shift+Z / Cmd+Shift+Z = Redo
      if (isModifier && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }

      // Ctrl+D or Cmd+D to duplicate selected clip
      if (isModifier && e.key === 'd') {
        e.preventDefault();
        if (hasSelectedClip) {
          onDuplicate();
        }
        return;
      }

      // Space to toggle play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          onPause();
        } else {
          onPlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSelectedClip, onDuplicate, isPlaying, onPlay, onPause, onUndo, onRedo]);
}
