/**
 * useStudioKeyboardShortcuts - Keyboard shortcuts voor StudioView
 *
 * Shortcuts:
 * - Space: Toggle play/pause
 * - Ctrl+D / Cmd+D: Duplicate geselecteerde clip
 */

import { useEffect } from 'react';

interface UseStudioKeyboardShortcutsOptions {
  isPlaying: boolean;
  hasSelectedClip: boolean;
  onPlay: () => void;
  onPause: () => void;
  onDuplicate: () => void;
}

export function useStudioKeyboardShortcuts({
  isPlaying,
  hasSelectedClip,
  onPlay,
  onPause,
  onDuplicate,
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

      // Ctrl+D or Cmd+D to duplicate selected clip
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (hasSelectedClip) {
          onDuplicate();
        }
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
  }, [hasSelectedClip, onDuplicate, isPlaying, onPlay, onPause]);
}
