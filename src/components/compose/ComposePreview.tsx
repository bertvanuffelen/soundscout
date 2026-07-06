/**
 * ComposePreview — gestileerde, geanimeerde placeholder-visual per compositievorm
 * (praatplaat / storyboard / vrij). Gedeeld tussen de publieke docentenlanding
 * (hero-switcher) en de leerling "Nieuwe compositie"-wizard.
 *
 * Puur CSS/Tailwind met bestaande tokens + de mode-kleuren, geen echte
 * screenshots of assets. Decoratief → aria-hidden. rAF-gedreven loops.
 */

import { useEffect, useRef } from 'react';
import {
  Zap,
  Castle,
  Send,
  Fish,
  CircleDot,
  Bot,
  Volume2,
  Music,
  MousePointer2,
  Sun,
  Waves,
  Bird,
  Play,
  type LucideIcon,
} from 'lucide-react';
import type { ComposeVariant } from './composeVariants';

interface ComposePreviewProps {
  variant: ComposeVariant;
}

export function ComposePreview({ variant }: ComposePreviewProps) {
  return (
    <div
      aria-hidden="true"
      className="relative w-full aspect-[16/10] rounded-2xl bg-bg-surface border border-border-subtle shadow-lg overflow-hidden p-3 sm:p-4"
    >
      {/* Kleine venster-chrome zodat het als een 'scherm' leest */}
      <div className="flex gap-1.5 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
      </div>

      <div className="h-[calc(100%-1.75rem)]">
        {variant === 'praatplaat' && <PraatplaatPreview />}
        {variant === 'storyboard' && <StoryboardPreview />}
        {variant === 'vrij' && <VrijPreview />}
      </div>
    </div>
  );
}

// --- Praatplaat: hotspots → cursor klikt → compositie-modal → lus ---
// Overgenomen uit Bert's mock, geport naar één rAF-klok (deterministisch, geen
// setTimeout-keten). Sequentie: hotspots poppen één voor één op → een cursor komt
// in beeld en beweegt naar de doel-hotspot → klik (pulse) → een mini-compositie
// verschijnt → alles sluit → lus.
interface PraatHotspot {
  x: number; // % van de scene
  y: number;
  badge?: number;
  target?: boolean;
}

const PP_HOTSPOTS: PraatHotspot[] = [
  { x: 70, y: 22, badge: 2 },
  { x: 34, y: 40 },
  { x: 20, y: 66, badge: 5 },
  { x: 58, y: 50, target: true },
  { x: 78, y: 70, badge: 2 },
  { x: 48, y: 84, badge: 2 },
];
const PP_CURSOR_START = { x: 96, y: 116 };

// Mini-compositie in de modal (decoratieve sample-kleuren).
const PP_MODAL_ROWS: Array<Array<{ l: number; w: number; c: string }>> = [
  [{ l: 2, w: 40, c: '#efc14e' }, { l: 48, w: 46, c: '#4c9ad6' }],
  [{ l: 14, w: 28, c: '#29b6c9' }, { l: 52, w: 40, c: '#68bf59' }],
  [{ l: 6, w: 44, c: '#9b59b6' }],
];

function PraatplaatPreview() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hotEls = Array.from(root.querySelectorAll<HTMLElement>('[data-hot]'));
    const targetEl = root.querySelector<HTMLElement>('[data-target]');
    const ring = targetEl?.querySelector<HTMLElement>('[data-ring]') ?? null;
    const cursor = root.querySelector<HTMLElement>('[data-cursor]');
    const modal = root.querySelector<HTMLElement>('[data-modal]');
    const backdrop = root.querySelector<HTMLElement>('[data-backdrop]');
    const N = hotEls.length;
    const target = PP_HOTSPOTS.find((h) => h.target) ?? PP_HOTSPOTS[0];

    // --- Vaste tijdlijn (ms) ---
    const START = 400;
    const HOT_STAGGER = 240;
    const HOT_DUR = 440;
    const hotAppear = (i: number) => START + i * HOT_STAGGER;
    const allHot = hotAppear(N - 1) + HOT_DUR;
    const CURSOR_IN = allHot + 400;
    const CURSOR_MOVE = 950;
    const CLICK = CURSOR_IN + CURSOR_MOVE;
    const MODAL_IN = CLICK + 300;
    const MODAL_DUR = 320;
    const MODAL_HOLD = 2400;
    const closeStart = MODAL_IN + MODAL_DUR + MODAL_HOLD;
    const CLOSE_DUR = 320;
    const hotFadeStart = closeStart + 200;
    const FADE_DUR = 450;
    const PERIOD = hotFadeStart + FADE_DUR + 800;

    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
    const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

    // Reduced motion: statische praatplaat met zichtbare hotspots, geen cursor/modal.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hotEls.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'translate(-50%, -50%) scale(1)';
      });
      if (cursor) cursor.style.opacity = '0';
      if (modal) modal.style.opacity = '0';
      if (backdrop) backdrop.style.opacity = '0';
      return;
    }

    let raf = 0;
    let startTime: number | null = null;

    const frame = (now: number) => {
      if (startTime === null) startTime = now;
      const t = (now - startTime) % PERIOD;

      // hotspots
      hotEls.forEach((el, i) => {
        const a = hotAppear(i);
        let op = 0;
        let sc = 0;
        if (t >= a && t < hotFadeStart) {
          const p = clamp01((t - a) / HOT_DUR);
          op = clamp01(p / 0.7);
          sc = p < 0.7 ? (p / 0.7) * 1.12 : 1.12 + (1.0 - 1.12) * ((p - 0.7) / 0.3);
        } else if (t >= hotFadeStart && t < hotFadeStart + FADE_DUR) {
          op = 1 - (t - hotFadeStart) / FADE_DUR;
          sc = 1;
        }
        el.style.opacity = op.toFixed(3);
        el.style.transform = `translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      });

      // klik-pulse op de doel-hotspot
      if (ring) {
        if (t >= CLICK && t <= CLICK + 600) {
          const q = (t - CLICK) / 600;
          ring.style.opacity = (0.7 * (1 - q)).toFixed(3);
          ring.style.transform = `scale(${(1 + 0.9 * q).toFixed(3)})`;
        } else {
          ring.style.opacity = '0';
          ring.style.transform = 'scale(1)';
        }
      }

      // cursor: fade-in, beweeg naar doel, klik-dip, fade-out bij sluiten
      if (cursor) {
        if (t < CURSOR_IN) {
          cursor.style.opacity = '0';
          cursor.style.left = `${PP_CURSOR_START.x}%`;
          cursor.style.top = `${PP_CURSOR_START.y}%`;
          cursor.style.transform = 'scale(1)';
        } else {
          let op = clamp01((t - CURSOR_IN) / 250);
          const mp = clamp01((t - CURSOR_IN) / CURSOR_MOVE);
          const e = easeInOut(mp);
          cursor.style.left = `${lerp(PP_CURSOR_START.x, target.x, e)}%`;
          cursor.style.top = `${lerp(PP_CURSOR_START.y, target.y, e)}%`;
          let sc = 1;
          if (t >= CLICK && t <= CLICK + 220) sc = 1 - 0.18 * Math.sin(Math.PI * ((t - CLICK) / 220));
          if (t >= closeStart) op = clamp01(1 - (t - closeStart) / 400);
          cursor.style.opacity = op.toFixed(3);
          cursor.style.transform = `scale(${sc.toFixed(3)})`;
        }
      }

      // modal + backdrop
      if (modal && backdrop) {
        let mOp = 0;
        let mSc = 0.92;
        let bOp = 0;
        if (t >= MODAL_IN && t < closeStart) {
          const p = clamp01((t - MODAL_IN) / MODAL_DUR);
          mOp = p;
          mSc = lerp(0.92, 1, p);
          bOp = 0.45 * p;
        } else if (t >= closeStart && t < closeStart + CLOSE_DUR) {
          const p = clamp01((t - closeStart) / CLOSE_DUR);
          mOp = 1 - p;
          mSc = lerp(1, 0.95, p);
          bOp = 0.45 * (1 - p);
        }
        modal.style.opacity = mOp.toFixed(3);
        modal.style.transform = `scale(${mSc.toFixed(3)})`;
        backdrop.style.opacity = bOp.toFixed(3);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full rounded-xl overflow-hidden border border-border-subtle"
      style={{
        backgroundImage:
          'radial-gradient(circle at 22% 32%, #d9eef0 0%, transparent 42%),' +
          'radial-gradient(circle at 80% 68%, #e6ddcf 0%, transparent 42%),' +
          'linear-gradient(160deg, #eef4f4 0%, #e7eef2 100%)',
      }}
    >
      {/* hotspots */}
      {PP_HOTSPOTS.map((h, i) => (
        <div
          key={i}
          data-hot
          {...(h.target ? { 'data-target': true } : {})}
          className="absolute opacity-0"
          style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%) scale(0)' }}
        >
          {/* klik-pulse ring (alleen op de doel-hotspot zichtbaar) */}
          <span
            data-ring
            className="absolute inset-0 rounded-full opacity-0"
            style={{ border: '2px solid #e8a200' }}
          />
          <span
            className="flex items-center justify-center rounded-full bg-white shadow-md"
            style={{ width: 26, height: 26, border: '2.5px solid #e8a200' }}
          >
            <Volume2 size={12} style={{ color: '#6b5300' }} />
          </span>
          {h.badge ? (
            <span
              className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold border-2 border-white"
              style={{ minWidth: 15, height: 15, fontSize: 9, padding: '0 3px', backgroundColor: '#f08a24' }}
            >
              {h.badge}
            </span>
          ) : null}
        </div>
      ))}

      {/* muiscursor */}
      <span
        data-cursor
        className="absolute opacity-0 pointer-events-none z-20"
        style={{ left: `${PP_CURSOR_START.x}%`, top: `${PP_CURSOR_START.y}%`, transformOrigin: '0 0' }}
      >
        <MousePointer2 size={16} className="fill-white" style={{ color: '#222' }} strokeWidth={1.5} />
      </span>

      {/* modal met mini-compositie */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <span data-backdrop className="absolute inset-0 opacity-0" style={{ backgroundColor: '#141a26' }} />
        <div
          data-modal
          className="relative w-[68%] bg-white rounded-xl shadow-2xl overflow-hidden opacity-0"
          style={{ transform: 'scale(0.92)' }}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border-subtle">
            <Music size={11} style={{ color: '#e8a200' }} />
            <span className="flex-1 h-1.5 rounded-full bg-neutral-200" style={{ maxWidth: 46 }} />
            <span className="w-1 h-1 rounded-full bg-neutral-300" />
          </div>
          <div className="flex flex-col gap-1 p-2">
            {PP_MODAL_ROWS.map((row, r) => (
              <div key={r} className="relative h-2.5 rounded bg-neutral-100">
                {row.map((seg, s) => (
                  <span
                    key={s}
                    className="absolute top-1/2 -translate-y-1/2 h-2 rounded"
                    style={{ left: `${seg.l}%`, width: `${seg.w}%`, backgroundColor: seg.c }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Storyboard: drie scènes + tijdlijn, afspeellijn licht scènes op volgorde op ---
// Overgenomen uit Bert's mock (soundscout-storyboard-animatie), geport naar de
// rAF-klok en geschaald voor het hero-kader. Sequentie: scènes poppen op (links→
// rechts) → clips poppen op → de rode afspeellijn veegt over de tijdlijn en per
// derde deel licht de bijbehorende scène op (in volgorde) → alles faadt → lus.
const SB_COLS = 12;
const SB_ROWS = 3;

const SB_SCENES: Array<{ bg: string; Icon: LucideIcon }> = [
  { bg: 'linear-gradient(160deg,#fdeecb 0%,#f4cf90 100%)', Icon: Sun },
  { bg: 'linear-gradient(160deg,#d7ecf5 0%,#a9d3e8 100%)', Icon: Waves },
  { bg: 'linear-gradient(160deg,#dcefd3 0%,#b3daa0 100%)', Icon: Bird },
];

interface SbClip {
  row: number;
  col: number;
  span: number;
  color: string;
}

// Clips verdeeld over de drie segmenten (kol 1-4 / 5-8 / 9-12).
const SB_CLIPS: SbClip[] = [
  { row: 1, col: 1, span: 3, color: '#efc14e' },
  { row: 2, col: 2, span: 2, color: '#29b6c9' },
  { row: 3, col: 1, span: 2, color: '#9b59b6' },
  { row: 1, col: 5, span: 3, color: '#e0a56e' },
  { row: 2, col: 6, span: 2, color: '#68bf59' },
  { row: 3, col: 5, span: 3, color: '#4c9ad6' },
  { row: 1, col: 9, span: 4, color: '#4c9ad6' },
  { row: 2, col: 10, span: 3, color: '#29b6c9' },
  { row: 3, col: 9, span: 3, color: '#9b59b6' },
];

function StoryboardPreview() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sceneEls = Array.from(root.querySelectorAll<HTMLElement>('[data-scene]'));
    const clips = Array.from(root.querySelectorAll<HTMLElement>('[data-clip]'));
    const playhead = root.querySelector<HTMLElement>('[data-playhead]');
    const N = clips.length;

    // --- Vaste tijdlijn (ms) ---
    const START = 300;
    const SCENE_STAG = 200;
    const SCENE_APP = 420;
    const scenesEnd = START + 2 * SCENE_STAG + SCENE_APP;
    const CLIP_GAP = 180;
    const clipStart = scenesEnd + CLIP_GAP;
    const CLIP_STAG = 130;
    const CLIP_APP = 420;
    const clipEnd = clipStart + (N - 1) * CLIP_STAG + CLIP_APP;
    const HOLD = 420;
    const PLAY_START = clipEnd + HOLD;
    const SWEEP = 3000; // ~1000ms per scène
    const SWEEP_END = PLAY_START + SWEEP;
    const PH_FADE = 350;
    const FADE = 420;
    const PERIOD = SWEEP_END + FADE + 800;

    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const easeOut = (p: number) => 1 - (1 - p) ** 3;

    // Reduced motion: statische, gevulde staat.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sceneEls.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.filter = 'none';
        const ring = el.querySelector<HTMLElement>('[data-ring]');
        const live = el.querySelector<HTMLElement>('[data-live]');
        if (ring) ring.style.opacity = '0';
        if (live) live.style.opacity = '0';
      });
      clips.forEach((c) => {
        c.style.opacity = '1';
        c.style.transform = 'none';
        c.style.filter = 'none';
      });
      if (playhead) playhead.style.opacity = '0';
      return;
    }

    let raf = 0;
    let startTime: number | null = null;

    const frame = (now: number) => {
      if (startTime === null) startTime = now;
      const t = (now - startTime) % PERIOD;

      const inPlay = t >= PLAY_START && t <= SWEEP_END;
      let frac = 0;
      let activeIdx = -1;
      if (inPlay) {
        frac = (t - PLAY_START) / SWEEP;
        activeIdx = Math.min(2, Math.floor(frac * 3));
      }

      // scènes
      sceneEls.forEach((el, i) => {
        const a = START + i * SCENE_STAG;
        const aEnd = a + SCENE_APP;
        let op = 0;
        let ty = 8;
        let sc = 0.94;
        let br = 1;
        let ring = 0;
        let live = 0;
        if (t >= a && t < aEnd) {
          const p = (t - a) / SCENE_APP;
          const e = easeOut(p);
          op = clamp01(p * 1.6);
          ty = 8 * (1 - e);
          sc = 0.94 + 0.06 * e + 0.03 * Math.sin(p * Math.PI);
        } else if (t >= aEnd && t < SWEEP_END) {
          op = 1;
          ty = 0;
          sc = 1;
          if (inPlay) {
            if (i === activeIdx) {
              const slotP = frac * 3 - activeIdx;
              ring = clamp01(Math.min(slotP / 0.12, (1 - slotP) / 0.12, 1));
              sc = 1 + 0.03 * ring;
              br = 1 + 0.06 * ring;
              live = ring;
            } else {
              br = 0.9;
            }
          }
        } else if (t >= SWEEP_END && t < SWEEP_END + FADE) {
          const p = (t - SWEEP_END) / FADE;
          op = 1 - p;
          sc = 1 - 0.03 * p;
        }
        el.style.opacity = op.toFixed(3);
        el.style.transform = `translateY(${ty.toFixed(2)}px) scale(${sc.toFixed(3)})`;
        el.style.filter = `brightness(${br.toFixed(3)})`;
        const ringEl = el.querySelector<HTMLElement>('[data-ring]');
        const liveEl = el.querySelector<HTMLElement>('[data-live]');
        if (ringEl) ringEl.style.opacity = ring.toFixed(3);
        if (liveEl) liveEl.style.opacity = live.toFixed(3);
      });

      // clips op de tijdlijn
      clips.forEach((c, i) => {
        const a = clipStart + i * CLIP_STAG;
        const aEnd = a + CLIP_APP;
        let op = 0;
        let ty = 7;
        let sc = 0.9;
        let br = 1;
        if (t >= a && t < aEnd) {
          const p = (t - a) / CLIP_APP;
          const e = easeOut(p);
          op = clamp01(p * 1.7);
          ty = 7 * (1 - e);
          sc = 0.9 + 0.1 * e + 0.05 * Math.sin(p * Math.PI);
        } else if (t >= aEnd && t < SWEEP_END) {
          op = 1;
          ty = 0;
          sc = 1;
          const g0 = PLAY_START + ((Number(c.dataset.start) - 1) / SB_COLS) * SWEEP;
          if (t >= g0 && t < g0 + 420) {
            const s = Math.sin(((t - g0) / 420) * Math.PI);
            sc = 1 + 0.05 * s;
            br = 1 + 0.15 * s;
          }
        } else if (t >= SWEEP_END && t < SWEEP_END + FADE) {
          const p = (t - SWEEP_END) / FADE;
          op = 1 - p;
          sc = 1 - 0.04 * p;
        }
        c.style.opacity = op.toFixed(3);
        c.style.transform = `translateY(${ty.toFixed(2)}px) scale(${sc.toFixed(3)})`;
        c.style.filter = `brightness(${br.toFixed(3)})`;
      });

      // afspeellijn
      if (playhead) {
        if (t >= PLAY_START && t <= SWEEP_END) {
          playhead.style.opacity = '1';
          playhead.style.left = `${((t - PLAY_START) / SWEEP) * 100}%`;
        } else if (t > SWEEP_END && t < SWEEP_END + PH_FADE) {
          playhead.style.opacity = (1 - (t - SWEEP_END) / PH_FADE).toFixed(3);
        } else {
          playhead.style.opacity = '0';
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5 h-full">
      {/* drie scène-vlakken */}
      <div className="grid grid-cols-3 gap-1.5" style={{ height: '44%' }}>
        {SB_SCENES.map(({ bg, Icon }, i) => (
          <div
            key={i}
            data-scene
            className="relative rounded-lg overflow-hidden border border-border-subtle opacity-0"
            style={{ background: bg }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white/90">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span
              className="absolute left-1 top-1 flex items-center justify-center rounded-full bg-white/90 text-text-main font-bold"
              style={{ width: 13, height: 13, fontSize: 8 }}
            >
              {i + 1}
            </span>
            {/* 'nu speelt'-chip op de actieve scène */}
            <span
              data-live
              className="absolute right-1 top-1 flex items-center justify-center rounded-full text-white opacity-0"
              style={{ width: 13, height: 13, backgroundColor: '#e5342b' }}
            >
              <Play size={7} fill="currentColor" />
            </span>
            {/* actieve rand */}
            <span
              data-ring
              className="absolute inset-0 rounded-lg opacity-0 pointer-events-none"
              style={{ border: '2px solid #e5342b' }}
            />
          </div>
        ))}
      </div>

      {/* tijdlijn */}
      <div
        className="relative flex-1 rounded-lg bg-white border border-border-subtle overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SB_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${SB_ROWS}, 1fr)`,
          backgroundImage:
            'repeating-linear-gradient(to right, #eef1f4 0 1px, transparent 1px calc(100% / 12)),' +
            'repeating-linear-gradient(to bottom, #eef1f4 0 1px, transparent 1px calc(100% / 3))',
        }}
      >
        {/* segment-scheidslijnen op 1/3 en 2/3 */}
        <span
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: '33.333%', borderLeft: '1.5px dashed #dbe0e6' }}
        />
        <span
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: '66.666%', borderLeft: '1.5px dashed #dbe0e6' }}
        />

        {SB_CLIPS.map((clip, i) => (
          <span
            key={i}
            data-clip
            data-start={clip.col}
            className="m-[2px] rounded shadow-sm opacity-0"
            style={{
              gridColumn: `${clip.col} / span ${clip.span}`,
              gridRow: clip.row,
              backgroundColor: clip.color,
            }}
          />
        ))}

        {/* rode afspeellijn */}
        <span
          data-playhead
          className="absolute top-0 bottom-0 left-0 w-[2px] opacity-0 pointer-events-none"
          style={{ backgroundColor: '#e5342b' }}
        >
          <span
            className="absolute -top-0.5 -left-[3px] w-2 h-2 rounded-full"
            style={{ backgroundColor: '#e5342b' }}
          />
        </span>
      </div>
    </div>
  );
}

// --- Vrij: geanimeerde tijdlijn met clips (overgenomen uit Bert's mock) ---
// Sequentie: clips poppen één voor één in → een rode afspeellijn veegt langs en
// laat elke clip oplichten → clips faden weg → de lus herhaalt. Respecteert
// prefers-reduced-motion: dan meteen een statische, gevulde tijdlijn zonder lus.
const VRIJ_COLS = 12;
const VRIJ_ROWS = 4;

interface VrijClip {
  row: number;
  col: number;
  span: number;
  color: string;
  Icon: LucideIcon;
}

// Decoratieve sample-kleuren uit de mock (bewust losse hexwaarden, net als de
// mode-kleuren geen semantische token-equivalent).
const VRIJ_CLIPS: VrijClip[] = [
  { row: 1, col: 1, span: 3, color: '#efc14e', Icon: Zap },
  { row: 1, col: 4, span: 2, color: '#e0a56e', Icon: Castle },
  { row: 1, col: 6, span: 4, color: '#4c9ad6', Icon: Send },
  { row: 2, col: 2, span: 3, color: '#e0a56e', Icon: Castle },
  { row: 2, col: 5, span: 2, color: '#29b6c9', Icon: Fish },
  { row: 2, col: 7, span: 3, color: '#68bf59', Icon: CircleDot },
  { row: 3, col: 3, span: 3, color: '#9b59b6', Icon: Bot },
  { row: 4, col: 1, span: 2, color: '#4c9ad6', Icon: Send },
  { row: 4, col: 6, span: 3, color: '#efc14e', Icon: Zap },
  { row: 4, col: 9, span: 3, color: '#29b6c9', Icon: Fish },
];

function VrijPreview() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-clip]'));
    const playhead = root.querySelector<HTMLElement>('[data-playhead]');
    const N = blocks.length;

    // --- Vaste tijdlijn (ms) voor één deterministische lus ---
    const START_DELAY = 350;
    const APPEAR_DUR = 500;
    const STAGGER = 250;
    const HOLD = 500;
    const SWEEP = 3200;
    const AFTER_SWEEP = 600;
    const FADE_DUR = 420;
    const END_PAUSE = 900;
    const GLOW_DUR = 460;

    const appearAt = (i: number) => START_DELAY + i * STAGGER;
    const allAppeared = appearAt(N - 1) + APPEAR_DUR;
    const sweepStart = allAppeared + HOLD;
    const sweepEnd = sweepStart + SWEEP;
    const fadeStart = sweepEnd + AFTER_SWEEP;
    const fadeEnd = fadeStart + FADE_DUR;
    const PERIOD = fadeEnd + END_PAUSE;
    const glowAt = (col: number) => sweepStart + ((col - 1) / VRIJ_COLS) * SWEEP;

    // Reduced motion: statische, gevulde tijdlijn — geen lus, geen afspeellijn.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      blocks.forEach((b) => {
        b.style.opacity = '1';
        b.style.transform = 'none';
        b.style.filter = 'none';
      });
      if (playhead) playhead.style.opacity = '0';
      return;
    }

    let raf = 0;
    let startTime: number | null = null;

    // Eén rAF-klok: elke frame wordt de staat volledig berekend uit de verstreken
    // tijd binnen de lus (elapsed % PERIOD). Zo is elke lus identiek en kan er
    // niets driften of opstapelen — ongeacht timer-throttling of een dubbele
    // effect-start (StrictMode). rAF pauzeert netjes op een achtergrond-tab.
    const frame = (now: number) => {
      if (startTime === null) startTime = now;
      const t = (now - startTime) % PERIOD;

      blocks.forEach((b, i) => {
        const a = appearAt(i);
        let opacity = 0;
        let scale = 1;
        let ty = 0;
        let bright = 1;

        if (t >= a && t < fadeStart) {
          // pop-in: opacity + eindpositie bereikt op 70% van de duur
          const p = Math.min(1, (t - a) / APPEAR_DUR);
          const e = Math.min(1, p / 0.7);
          opacity = e;
          ty = 8 * (1 - e);
          scale =
            p < 0.7 ? 0.9 + (1.06 - 0.9) * (p / 0.7) : 1.06 + (1.0 - 1.06) * ((p - 0.7) / 0.3);

          // glow wanneer de afspeellijn de clip passeert
          const g = glowAt(VRIJ_CLIPS[i].col);
          if (t >= g && t <= g + GLOW_DUR) {
            const s = Math.sin(Math.PI * ((t - g) / GLOW_DUR));
            scale *= 1 + 0.06 * s;
            bright = 1 + 0.15 * s;
          }
        } else if (t >= fadeStart && t < fadeEnd) {
          // fade-out aan het eind van de lus
          const p = (t - fadeStart) / FADE_DUR;
          opacity = 1 - p;
          scale = 1 - 0.04 * p;
        }

        b.style.opacity = opacity.toFixed(3);
        b.style.transform = `translateY(${ty.toFixed(2)}px) scale(${scale.toFixed(3)})`;
        b.style.filter = `brightness(${bright.toFixed(3)})`;
      });

      if (playhead) {
        if (t >= sweepStart && t <= sweepEnd) {
          playhead.style.opacity = '1';
          playhead.style.left = `${((t - sweepStart) / SWEEP) * 100}%`;
        } else if (t > sweepEnd && t < sweepEnd + 300) {
          playhead.style.opacity = (1 - (t - sweepEnd) / 300).toFixed(3);
        } else {
          playhead.style.opacity = '0';
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full rounded-xl bg-white border border-border-subtle overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${VRIJ_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${VRIJ_ROWS}, 1fr)`,
        backgroundImage:
          'repeating-linear-gradient(to right, #eef1f4 0 1px, transparent 1px calc(100% / 12)),' +
          'repeating-linear-gradient(to bottom, #eef1f4 0 1px, transparent 1px calc(100% / 4))',
      }}
    >
      {VRIJ_CLIPS.map((clip, i) => (
        <div
          key={i}
          data-clip
          data-start={clip.col}
          className="m-[3px] flex items-center gap-1 px-1.5 rounded-md text-white shadow-sm overflow-hidden opacity-0 will-change-transform"
          style={{
            gridColumn: `${clip.col} / span ${clip.span}`,
            gridRow: clip.row,
            backgroundColor: clip.color,
          }}
        >
          <clip.Icon size={12} strokeWidth={2.4} className="flex-shrink-0" />
        </div>
      ))}

      {/* rode afspeellijn met kop */}
      <span
        data-playhead
        className="absolute top-0 bottom-0 left-0 w-[2px] bg-error-500 opacity-0 pointer-events-none"
      >
        <span className="absolute -top-0.5 -left-[3px] w-2 h-2 rounded-full bg-error-500" />
      </span>
    </div>
  );
}
