/**
 * StorytellingFilmstrip - "Scènes"-modus in de studio (Feature F)
 *
 * Toont alle storyboard-scènes groot naast elkaar, elk exact uitgelijnd op zijn
 * timeline-sectie (scène i ↔ sectie i). De strip gebruikt dezelfde percentage-
 * geometrie én dezelfde `zoomLevel` (widthMultiplier) als de timeline, en spiegelt
 * de horizontale scroll van de timeline één-op-één — dus in-/uitzoomen verbreedt
 * de beelden mee en scrollen schuift ze mee.
 *
 * De actieve scène (waar de afspeellijn nu staat, `getActiveImageIndex`) krijgt een
 * accent-border + ▶-badge tijdens afspelen; dat verspringt live met de playhead.
 *
 * LET OP: in deze modus is `StorytellingPanel` niet gemount, dus de playback-sync
 * die `currentImageIndex` bijwerkt draait hier (zelfde patroon als StorytellingPanel).
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import { useAudioStore } from '../../../stores/audioStore';
import { useTimelineStore } from '../../../stores/timelineStore';
import { getActiveImageIndex } from '../../../utils/storytelling';
import { cn } from '../../../utils/cn';

interface StorytellingFilmstripProps {
  className?: string;
  /** Scroll-container van de timeline om horizontaal te spiegelen. */
  syncScrollFrom: RefObject<HTMLDivElement | null>;
}

export function StorytellingFilmstrip({ className = '', syncScrollFrom }: StorytellingFilmstripProps) {
  const { t } = useTranslation();
  const activeStoryboard = useAppStore((s) => s.activeStoryboard);
  const sections = useTimelineStore((s) => s.sections);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const zoomLevel = useTimelineStore((s) => s.zoomLevel);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  const outerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const images = activeStoryboard?.images ?? [];
  const imageCount = images.length;

  // --- Actieve-scène-index sync (zelfde aanpak als StorytellingPanel) ---
  const [activeIndex, setActiveIndex] = useState(() => useAppStore.getState().currentImageIndex);

  const computeIndex = useCallback(() => {
    const sb = useAppStore.getState().activeStoryboard;
    if (!sb) return 0;
    const { currentBeat } = useAudioStore.getState();
    const { totalBeats: tb, sections: secs } = useTimelineStore.getState();
    return getActiveImageIndex(currentBeat, tb, sb.images.length, secs);
  }, []);

  const applyIndex = useCallback((idx: number) => {
    setActiveIndex((prev) => {
      if (prev !== idx) {
        useAppStore.getState().setCurrentImageIndex(idx);
        return idx;
      }
      return prev;
    });
  }, []);

  // rAF-loop tijdens afspelen (lokale functie i.p.v. self-referencing useCallback)
  useEffect(() => {
    if (imageCount <= 1) return;
    const loop = () => {
      if (!useAudioStore.getState().isPlaying) {
        rafRef.current = null;
        return;
      }
      applyIndex(computeIndex());
      rafRef.current = requestAnimationFrame(loop);
    };
    const unsub = useAudioStore.subscribe((state) => {
      if (state.isPlaying && !rafRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    });
    if (useAudioStore.getState().isPlaying && !rafRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      unsub();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [imageCount, applyIndex, computeIndex]);

  // Scrubben (niet afspelen): index volgt de playhead
  useEffect(() => {
    if (imageCount <= 1) return;
    const unsub = useAudioStore.subscribe((state, prev) => {
      if (!state.isPlaying && state.currentBeat !== prev.currentBeat) {
        applyIndex(computeIndex());
      }
    });
    return unsub;
  }, [imageCount, applyIndex, computeIndex]);

  // --- Horizontale scroll spiegelen (timeline → filmstrip, één richting) ---
  useEffect(() => {
    const timeline = syncScrollFrom.current;
    const strip = outerRef.current;
    if (!timeline || !strip) return;
    const sync = () => { strip.scrollLeft = timeline.scrollLeft; };
    sync(); // initieel uitlijnen
    timeline.addEventListener('scroll', sync, { passive: true });
    return () => timeline.removeEventListener('scroll', sync);
  }, [syncScrollFrom]);

  // Bij zoom-wijziging is de content-breedte veranderd → opnieuw uitlijnen
  useEffect(() => {
    const timeline = syncScrollFrom.current;
    const strip = outerRef.current;
    if (timeline && strip) {
      requestAnimationFrame(() => { strip.scrollLeft = timeline.scrollLeft; });
    }
  }, [syncScrollFrom, zoomLevel]);

  const handleSelect = useCallback((index: number) => {
    // Playhead naar het startbeat van deze sectie (zelfde als StorytellingPanel).
    const secs = useTimelineStore.getState().sections;
    const startBeat = index > 0 && secs[index - 1] ? secs[index - 1].endBeat : 0;
    useAudioStore.getState().setCurrentBeat(startBeat);
    useAppStore.getState().setCurrentImageIndex(index);
    setActiveIndex(index);
  }, []);

  if (imageCount <= 1) return null;

  // Beat-bereik per scène: 1:1 met de secties; anders gelijk verdelen (fallback).
  const useSections = sections.length === imageCount;

  return (
    <div ref={outerRef} className={cn('relative overflow-x-hidden overflow-y-hidden bg-neutral-100/60', className)}>
      <div className="relative h-full" style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}>
        {/* Linker-offset gelijk aan de timeline-label-kolom, zodat scène i pal boven sectie i staat */}
        <div className="relative h-full ml-5 sm:ml-6">
          {images.map((img, i) => {
            const startBeat = useSections
              ? (i > 0 ? sections[i - 1].endBeat : 0)
              : (totalBeats / imageCount) * i;
            const endBeat = useSections
              ? sections[i].endBeat
              : (i === imageCount - 1 ? totalBeats : (totalBeats / imageCount) * (i + 1));
            const leftPercent = (startBeat / totalBeats) * 100;
            const widthPercent = ((endBeat - startBeat) / totalBeats) * 100;
            const isActive = i === activeIndex;

            return (
              <button
                key={img.id}
                type="button"
                onClick={() => handleSelect(i)}
                className="absolute top-0 bottom-0 p-2 focus:outline-none"
                style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                title={t(img.label)}
                aria-label={t(img.label)}
                aria-current={isActive}
              >
                <div
                  className={cn(
                    'relative w-full h-full rounded-xl overflow-hidden bg-neutral-200 border-2 transition-all duration-150',
                    isActive
                      ? 'border-accent-500 ring-2 ring-accent-300 shadow-lg'
                      : 'border-border-subtle hover:border-accent-300',
                  )}
                >
                  <img src={img.url} alt={t(img.label)} className="w-full h-full object-contain" />

                  {/* Scène-nummer linksboven */}
                  <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/55 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>

                  {/* ▶-badge rechtsboven bij de actieve scène tijdens afspelen */}
                  {isActive && isPlaying && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center shadow">
                      <Play size={12} className="fill-current" />
                    </span>
                  )}

                  {/* Scène-label onderaan */}
                  <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[11px] font-medium text-white bg-gradient-to-t from-black/60 to-transparent truncate">
                    {t(img.label)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StorytellingFilmstrip;
