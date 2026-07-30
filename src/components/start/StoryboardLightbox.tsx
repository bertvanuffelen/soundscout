/**
 * StoryboardLightbox — overlay waarmee de leerling door de afbeeldingen van
 * een storyboard kan bladeren vóórdat die gekozen wordt (#78).
 *
 * Puur preview: geen "kies deze"-knop. Sluiten via X, backdrop of Escape.
 * Navigatie handmatig (prev/next); geen auto-advance.
 *
 * Ondersteunt ook swipen op touch-devices via native pointer-events
 * (geen extra library nodig).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Storyboard } from '../../types';

interface StoryboardLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  storyboard: Storyboard | null;
  /** Afbeelding waarop geopend wordt (default 0) */
  startIndex?: number;
}

const SWIPE_THRESHOLD_PX = 50;

export function StoryboardLightbox({ isOpen, onClose, storyboard, startIndex = 0 }: StoryboardLightboxProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Bij elke opening starten op de gevraagde afbeelding (default de eerste)
  useEffect(() => {
    if (isOpen) setIndex(startIndex);
  }, [isOpen, storyboard?.id, startIndex]);

  const total = storyboard?.images.length ?? 0;

  const handlePrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  // Toetsenbord-navigatie
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !storyboard || total === 0) return null;

  const current = storyboard.images[index];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx > 0) handlePrev();
    else handleNext();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t(storyboard.name)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
        aria-label={t('common.close')}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Content */}
      <div
        className="relative max-w-4xl w-full flex flex-col items-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 text-center">
          {t(storyboard.name)}
        </h2>

        {/* Image frame */}
        <div className="relative w-full bg-black/40 rounded-xl overflow-hidden flex items-center justify-center">
          <img
            src={current.url}
            alt={t(current.label)}
            className="w-full max-h-[70vh] object-contain select-none"
            draggable={false}
          />

          {total > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors"
                aria-label={t('storyboardLightbox.previous')}
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors"
                aria-label={t('storyboardLightbox.next')}
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}
        </div>

        {/* Label + counter */}
        <div className="mt-3 text-center text-white">
          <p className="text-sm sm:text-base font-medium">{t(current.label)}</p>
          <p className="text-xs text-white/70 mt-1">
            {t('storyboardLightbox.counter', { current: index + 1, total })}
          </p>
        </div>

        {/* Dot indicators */}
        {total > 1 && (
          <div className="flex gap-1.5 mt-3" role="tablist">
            {storyboard.images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={t('storyboardLightbox.goTo', { index: i + 1 })}
                aria-current={i === index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
