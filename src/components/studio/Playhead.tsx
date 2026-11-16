import { memo, useCallback, useRef } from 'react';
import { useScrub } from '../../hooks/useScrub';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { useBeatFrame, type BeatGetter } from '../../hooks/useBeatFrame';

interface PlayheadProps {
  /** Actuele positie (afspeelklok of eigen bron). Wordt per frame gelezen. */
  getBeat: BeatGetter;
  totalBeats: number;
  isPlaying: boolean;
  onSeek: (beat: number) => void;
  /** Niet meer nodig voor de berekening (die gebruikt de liniaal zelf); blijft voor compatibiliteit */
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Playhead component with draggable handle in ruler strip.
 *
 * - Clicking anywhere on the ruler seeks to that position
 * - Handle is draggable (also during playback)
 * - The whole ruler is draggable too (scrubben), also with a finger
 * - 44px touch hitbox for accessibility
 * - Visual handle is 12px circle
 *
 * Positie: volgt de afspeelklok per frame (V2 Fase 1, useBeatFrame).
 * Touch: `touch-action: none` staat ALTIJD aan op liniaal en handvat. De
 * browser beslist bij pointerdown of een aanraking een scroll wordt; stond
 * dit alleen tíjdens het slepen aan, dan werd de eerste swipe een scroll en
 * kwam er een pointercancel (bug: swipen over de tijdlijn werkte niet op
 * tablet/digibord). Sleeplogica: useScrub (gedeeld met het sporenvlak van
 * de alleen-lezen tijdlijn, zie Timeline.tsx).
 */
export const Playhead = memo(function Playhead(props: PlayheadProps) {
  const { getBeat, totalBeats, onSeek } = props;
  const { t } = useTranslation();
  const { isDragging, handlers } = useScrub(onSeek, totalBeats);

  // V2 Fase 1: het handvat volgt de klok per frame, direct in de DOM.
  // React rendert dit component niet meer mee met de afspeelpositie.
  const handleRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ el: HTMLElement | null; left: string; value: number }>({ el: null, left: '', value: -1 });
  useBeatFrame((beat) => {
    const el = handleRef.current;
    if (!el) return;
    if (last.current.el !== el) last.current = { el, left: '', value: -1 };
    const left = `${(beat / totalBeats) * 100}%`;
    if (left !== last.current.left) {
      el.style.left = left;
      last.current.left = left;
    }
    const value = Math.round(beat);
    if (value !== last.current.value) {
      el.setAttribute('aria-valuenow', String(value));
      last.current.value = value;
    }
  }, getBeat);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 1; // Move by 1 beat per key press
      const currentBeat = getBeat();
      let newBeat = currentBeat;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newBeat = Math.max(0, currentBeat - step);
          onSeek(newBeat);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newBeat = Math.min(totalBeats, currentBeat + step);
          onSeek(newBeat);
          break;
        case 'Home':
          e.preventDefault();
          onSeek(0);
          break;
        case 'End':
          e.preventDefault();
          onSeek(totalBeats);
          break;
        default:
          break;
      }
    },
    [getBeat, totalBeats, onSeek]
  );

  return (
    <>
      {/* Liniaal-zone — hele liniaal, achter het handvat: tikken = zoeken,
          slepen = scrubben (ook met een vinger, dus altijd touch-none) */}
      <div
        className="absolute inset-0 z-20 cursor-pointer touch-none"
        {...handlers('self')}
      />

      {/* Handle in ruler strip - interactive, draggable */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={t('studio.playhead')}
        aria-valuemin={0}
        aria-valuemax={totalBeats}
        className={cn(
          // Large touch hitbox (44px wide)
          'absolute top-0 h-4 w-11 -translate-x-1/2 z-30',
          'flex items-center justify-center',
          'rounded-full cursor-ew-resize touch-none',
          'focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-1'
        )}
        ref={handleRef}
        {...handlers('parent')}
        onKeyDown={handleKeyDown}
      >
        {/* Visual handle - circle */}
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2 border-white shadow-sm transition-transform',
            'bg-error-500',
            isDragging && 'scale-125'
          )}
        />
      </div>

      {/* De verticale lijn door de sporen wordt op wrapper-niveau gerenderd
          in Timeline.tsx (bottom-0 = exact tot de laatste rij). Een vaste
          hoogte hier creëerde scrollruimte onder de sporen (BUG-TIMELINE-GRIJS). */}
    </>
  );
});
