/* eslint-disable react-refresh/only-export-components -- dev-only mockup: helpers en componenten bewust in één bestand */
/**
 * Gedeelde bouwstenen voor de V2-mockup: data uit het echte basis-thema,
 * de <Scene>-primitive, de geluid-chip, vlieg- en sleepgedrag, mini-tijdlijn.
 */

import { useEffect, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Square, X } from 'lucide-react';
import { basisTheme } from '../../data/themes/basis';
import type { Location, Sample } from '../../types';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import {
  LOOP_BEATS, BEAT_SEC, MiniLoop, subscribeFrame, getLevel,
  type LiteSound, type LoopClip,
} from './liteAudio';

// --- Data (echte basis-thema-content) ---

export const THEME = basisTheme;
export const LOCATIONS: Location[] = basisTheme.locations;
export const SAMPLES: Sample[] = basisTheme.samples;
export const MAP = basisTheme.map;
export const BAG_LIMIT = 6;
export const TRACK_COUNT = 4;

/** Een geluid in de mockup: thema-sample óf Klanklab-geluid (recept → buffer). */
export interface MockSound {
  id: string;
  label: string;
  icon: string;
  color: string;
  duration: number;
  url?: string;
  buffer?: AudioBuffer;
  /** Klanklab-recept (alleen ter illustratie getoond). */
  recipe?: Record<string, unknown>;
}

export function sampleToSound(sample: Sample, label: string): MockSound {
  return {
    id: sample.id,
    label,
    icon: sample.icon,
    color: sample.color,
    duration: sample.duration,
    url: sample.audioUrl,
  };
}

export function toLite(sound: MockSound): LiteSound {
  return { id: sound.id, url: sound.url, buffer: sound.buffer, duration: sound.duration };
}

/** Leesbare tekstkleur (navy of wit) op een geluidskleur. */
export function textOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0f172a' : '#ffffff';
}

let clipCounter = 0;
export function newClipId(): string {
  clipCounter += 1;
  return `clip-${clipCounter}`;
}

// --- <Scene>: dé manier om een beeld met dingen erop te tonen (§6.1 regel 1) ---

interface SceneProps {
  image: string;
  alt: string;
  children?: ReactNode;
  className?: string;
  /** Ref naar de beeld-box (voor audio-reactieve gloed). */
  boxRef?: React.Ref<HTMLDivElement>;
}

/**
 * Vult de beschikbare ruimte met een exacte 16:9-box (container-eenheden,
 * dus onafhankelijk van het venster). Posities van kinderen zijn altijd
 * percentages van de beeld-box. Bediening hoort BUITEN deze component.
 */
export function Scene({ image, alt, children, className, boxRef }: SceneProps) {
  return (
    <div className={cn('flex-1 min-h-0 min-w-0 [container-type:size] flex items-center justify-center', className)}>
      <div
        ref={boxRef}
        className="relative w-full max-w-[min(100cqw,calc(100cqh*16/9))] aspect-video rounded-2xl overflow-hidden shadow-2xl bg-brand-800"
      >
        <img src={image} alt={alt} draggable={false} className="absolute inset-0 w-full h-full object-cover select-none" />
        {children}
      </div>
    </div>
  );
}

// --- Geluid-chip: overal hetzelfde object (hotspot → tas → tijdlijn) ---

interface ChipProps {
  sound: MockSound;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
  className?: string;
  dataAttrs?: Record<string, string>;
}

export function SoundChip({ sound, size = 'md', onRemove, onPointerDown, className, dataAttrs }: ChipProps) {
  const fg = textOn(sound.color);
  return (
    <div
      {...dataAttrs}
      onPointerDown={onPointerDown}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-xl font-bold shadow-md select-none touch-none cursor-grab active:cursor-grabbing',
        size === 'md' ? 'h-11 pl-2.5 pr-3 text-sm' : 'h-8 pl-2 pr-2.5 text-xs',
        className,
      )}
      style={{ backgroundColor: sound.color, color: fg }}
    >
      <SampleIcon name={sound.icon} size={size === 'md' ? 18 : 14} />
      <span className="truncate max-w-[9rem]">{sound.label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`${sound.label} terugleggen`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-900 text-white flex items-center justify-center shadow after:absolute after:content-[''] after:-inset-2"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// --- Vliegende chip: het geluid reist zichtbaar van A naar B ---

function mountGhost(sound: MockSound): { el: HTMLDivElement; cleanup: () => void } {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;pointer-events:none;will-change:transform;';
  document.body.appendChild(el);
  const root = createRoot(el);
  root.render(<SoundChip sound={sound} />);
  return {
    el,
    cleanup: () => {
      root.unmount();
      el.remove();
    },
  };
}

export function flyChip(sound: MockSound, from: DOMRect, to: DOMRect, onArrive?: () => void): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    onArrive?.();
    return;
  }
  const { el, cleanup } = mountGhost(sound);
  const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
  const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
  // Boogje: tussenpunt ligt boven de rechte lijn.
  const mx = (fx + tx) / 2, my = Math.min(fy, ty) - 90;
  const at = (x: number, y: number, s: number) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
  const anim = el.animate(
    [
      { transform: at(fx, fy, 0.4), opacity: 0.2 },
      { transform: at(fx, fy - 12, 1.15), opacity: 1, offset: 0.18 },
      { transform: at(mx, my, 1.1), opacity: 1, offset: 0.6 },
      { transform: at(tx, ty, 0.9), opacity: 1 },
    ],
    { duration: 620, easing: 'cubic-bezier(0.3, 0.1, 0.2, 1)' },
  );
  anim.onfinish = () => {
    cleanup();
    onArrive?.();
  };
}

// --- Slepen: tik = luisteren, slepen = neerzetten op een spoor ---

export interface DropTarget {
  track: number;
  startBeat: number;
}

interface DragOptions {
  sound: MockSound;
  onTap?: () => void;
  onDrop?: (target: DropTarget) => void;
}

/** Zoekt het spoor onder de pointer en rekent de tel uit (heel getal, geklemd). */
function findDrop(x: number, y: number, duration: number): DropTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-mock-track]');
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const lenBeats = duration / BEAT_SEC;
  const beats = Number(el.dataset.beats ?? LOOP_BEATS);
  const raw = ((x - rect.left) / rect.width) * beats - Math.min(lenBeats, 4) / 2;
  const startBeat = Math.max(0, Math.min(beats - 1, Math.round(raw)));
  return { track: Number(el.dataset.mockTrack), startBeat };
}

export function startChipDrag(e: ReactPointerEvent<HTMLElement>, opts: DragOptions): void {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  const startX = e.clientX, startY = e.clientY;
  let ghost: ReturnType<typeof mountGhost> | null = null;
  let hovered: HTMLElement | null = null;

  const move = (ev: PointerEvent) => {
    const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
    if (!ghost && dist > 8) ghost = mountGhost(opts.sound);
    if (!ghost) return;
    ghost.el.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%) scale(1.08)`;
    const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-mock-track]') ?? null;
    if (over !== hovered) {
      hovered?.removeAttribute('data-drop-hover');
      over?.setAttribute('data-drop-hover', 'true');
      hovered = over;
    }
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    hovered?.removeAttribute('data-drop-hover');
    if (!ghost) {
      opts.onTap?.();
      return;
    }
    ghost.cleanup();
    const target = findDrop(ev.clientX, ev.clientY, opts.sound.duration);
    if (target) opts.onDrop?.(target);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

// --- Mini-tijdlijn: sporen + clips + afspeellijn (leest de audioklok per frame) ---

interface MiniTimelineProps {
  clips: LoopClip[];
  sounds: Map<string, MockSound>;
  loop: MiniLoop;
  onRemoveClip?: (id: string) => void;
  /** Hoeveel sporen zichtbaar zijn (peek = 1). */
  visibleTracks?: number;
  dark?: boolean;
  trackHeight?: number;
}

export function MiniTimeline({
  clips, sounds, loop, onRemoveClip, visibleTracks = TRACK_COUNT, dark = false, trackHeight = 44,
}: MiniTimelineProps) {
  const playheadRef = useRef<HTMLDivElement>(null);

  // Afspeellijn: direct naar de DOM, geen React-render per frame.
  useEffect(() => subscribeFrame(() => {
    const el = playheadRef.current;
    if (!el) return;
    const playing = loop.isPlaying;
    el.style.opacity = playing ? '1' : '0';
    if (playing) el.style.left = `${(loop.getBeat() / LOOP_BEATS) * 100}%`;
  }), [loop]);

  return (
    <div className="relative">
      <div className="flex flex-col gap-1">
        {Array.from({ length: visibleTracks }, (_, track) => (
          <div
            key={track}
            data-mock-track={track}
            className={cn(
              'relative rounded-lg transition-colors data-[drop-hover=true]:ring-2 data-[drop-hover=true]:ring-accent-400',
              dark
                ? 'bg-white/10 data-[drop-hover=true]:bg-white/20'
                : 'bg-neutral-100 data-[drop-hover=true]:bg-accent-50',
            )}
            style={{
              height: trackHeight,
              backgroundImage: `linear-gradient(to right, ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)'} 1px, transparent 1px)`,
              backgroundSize: `${100 / (LOOP_BEATS / 4)}% 100%`,
            }}
          >
            {clips.filter((c) => c.track === track).map((clip) => {
              const sound = sounds.get(clip.sampleId);
              if (!sound) return null;
              const widthBeats = Math.min(sound.duration / BEAT_SEC, LOOP_BEATS - clip.startBeat);
              return (
                <button
                  key={clip.id}
                  type="button"
                  title={onRemoveClip ? `${sound.label} — tik om weg te halen` : sound.label}
                  onClick={() => onRemoveClip?.(clip.id)}
                  className="absolute top-1 bottom-1 rounded-md px-1.5 flex items-center gap-1 text-xs font-bold overflow-hidden shadow-sm animate-[mock-pop_260ms_ease-out]"
                  style={{
                    left: `${(clip.startBeat / LOOP_BEATS) * 100}%`,
                    width: `${(widthBeats / LOOP_BEATS) * 100}%`,
                    backgroundColor: sound.color,
                    color: textOn(sound.color),
                  }}
                >
                  <SampleIcon name={sound.icon} size={14} className="shrink-0" />
                  <span className="truncate">{sound.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div
        ref={playheadRef}
        className="absolute top-0 bottom-0 w-0.5 bg-error-500 pointer-events-none opacity-0 shadow-[0_0_10px_2px_rgba(239,68,68,0.6)]"
        style={{ left: 0 }}
      />
    </div>
  );
}

// --- Ronde afspeelknop ---

export function PlayButton({ playing, onToggle, size = 56 }: { playing: boolean; onToggle: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? 'Stop' : 'Speel af'}
      className="shrink-0 rounded-full bg-accent-400 hover:bg-accent-300 active:scale-95 text-brand-900 flex items-center justify-center shadow-lg transition-transform"
      style={{ width: size, height: size }}
    >
      {playing ? <Square size={size * 0.36} fill="currentColor" /> : <Play size={size * 0.42} fill="currentColor" className="ml-0.5" />}
    </button>
  );
}

// --- Audio-reactieve gloed op een element (schaal/box-shadow via de frame-loop) ---

export function useLevelGlow(ref: React.RefObject<HTMLElement | null>, color = '251,191,36'): void {
  useEffect(() => {
    let smooth = 0;
    return subscribeFrame(() => {
      const el = ref.current;
      if (!el) return;
      smooth += (getLevel() - smooth) * 0.25;
      el.style.boxShadow = `0 0 ${20 + smooth * 90}px ${smooth * 26}px rgba(${color},${0.12 + smooth * 0.5})`;
    });
  }, [ref, color]);
}
