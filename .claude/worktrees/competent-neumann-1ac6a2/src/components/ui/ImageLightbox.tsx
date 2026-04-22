/**
 * ImageLightbox - Fullscreen image overlay (#60)
 *
 * Shows an image at full resolution with optional transport controls.
 * Click backdrop or X button to close. Escape key supported.
 * Space bar toggles play/pause when transport is available.
 */

import { useEffect, useCallback } from 'react';
import { X, Play, Pause, SkipBack } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
  /** Optional transport controls */
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onStop?: () => void;
}

export function ImageLightbox({
  src,
  alt,
  onClose,
  isPlaying,
  onPlayPause,
  onStop,
}: ImageLightboxProps) {
  const hasTransport = onPlayPause !== undefined;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && onPlayPause) {
        e.preventDefault();
        onPlayPause();
      }
    },
    [onClose, onPlayPause],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image — click stops propagation so only backdrop click closes */}
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Transport controls */}
      {hasTransport && (
        <div
          className="flex items-center gap-3 mt-4 sm:mt-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onPlayPause}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-accent-400 hover:bg-accent-500 active:bg-accent-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent-400/30 transition-all active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 sm:w-8 sm:h-8" />
            ) : (
              <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5" />
            )}
          </button>
          {onStop && (
            <button
              onClick={onStop}
              className="w-14 h-14 sm:w-16 sm:h-16 bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
            >
              <SkipBack className="w-7 h-7 sm:w-8 sm:h-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
