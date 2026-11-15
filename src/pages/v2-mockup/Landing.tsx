/**
 * Landing — speelbare landingspagina (V2-voorstel §6.4 A), opgeschoond na
 * Berts review: geen kleine regels onder de knoppen, geen uitlegblokken.
 * Primair: "Nieuwe soundscape" → bestaande keuzeflow. Secundair: "Kies een
 * wereld". Code en docenten staan rechtsboven.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, GraduationCap, Hand, KeyRound, Sparkles } from 'lucide-react';
import { SampleIcon } from '../../utils/iconMap';
import {
  LOCATIONS, SAMPLES, Scene, MiniTimeline, PlayButton, sampleToSound, toLite,
  startChipDrag, newClipId, useLevelGlow, textOn, type MockSound,
} from './shared';
import {
  MiniLoop, previewSound, stopPreview, subscribeFrame, getLevel, getAnalyser, getCtx, type LoopClip,
} from './liteAudio';

type Lang = 'nl' | 'en';

const COPY: Record<Lang, Record<string, string>> = {
  nl: {
    code: 'Ik heb een code',
    teachers: 'Voor docenten',
    title: 'Maak je eigen soundscape',
    sub: 'Tik op een geluid. Sleep het naar de tijdlijn.',
    hint: 'Tik = luisteren · Slepen = meedoen',
    start: 'Nieuwe soundscape',
    worlds: 'Kies een wereld',
  },
  en: {
    code: 'I have a code',
    teachers: 'For teachers',
    title: 'Make your own soundscape',
    sub: 'Tap a sound. Drag it to the timeline.',
    hint: 'Tap = listen · Drag = join in',
    start: 'New soundscape',
    worlds: 'Explore worlds',
  },
};

const HERO_LOCATION = LOCATIONS.find((l) => l.id === 'boerderij') ?? LOCATIONS[0];

/** Vooraf gemaakte soundscape: [sampleId, spoor, starttel]. */
const PRESET: Array<[string, number, number]> = [
  ['boerderij-kippen', 0, 0],
  ['boerderij-koe', 1, 2],
  ['boerderij-hond', 2, 8],
  ['boerderij-geit', 1, 12],
];

/** Audio-reactieve achtergrond: kleurvlekken die ademen op het geluidsniveau. */
function ReactiveBackdrop({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef(colors);
  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const freq = new Uint8Array(64);
    let smooth = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const unsub = subscribeFrame((now) => {
      const w = canvas.width, h = canvas.height;
      smooth += (getLevel() - smooth) * 0.18;
      g.clearRect(0, 0, w, h);
      const t = reduce ? 0 : now / 1000;
      const palette = colorsRef.current.length > 0 ? colorsRef.current : ['#fbbf24'];
      g.globalCompositeOperation = 'lighter';
      palette.slice(0, 6).forEach((color, i) => {
        const cx = w * (0.5 + 0.38 * Math.sin(t * 0.21 + i * 1.9));
        const cy = h * (0.5 + 0.34 * Math.cos(t * 0.17 + i * 2.4));
        const r = Math.max(w, h) * (0.16 + smooth * 0.32);
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `${color}${Math.round(40 + smooth * 110).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, `${color}00`);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      });
      getAnalyser().getByteFrequencyData(freq);
      g.globalCompositeOperation = 'source-over';
      const barW = w / freq.length;
      for (let i = 0; i < freq.length; i++) {
        const v = freq[i] / 255;
        g.fillStyle = `rgba(251,191,36,${0.05 + v * 0.3})`;
        g.fillRect(i * barW + 1, h - v * h * 0.28, barW - 2, v * h * 0.28);
      }
    });
    return () => {
      unsub();
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
}

interface Props {
  onStart: () => void;
  onWorlds: () => void;
  onCode: () => void;
  onTeachers: () => void;
}

export default function Landing({ onStart, onWorlds, onCode, onTeachers }: Props) {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Lang>('nl');
  const c = COPY[lang];

  const sounds = useMemo(() => {
    const map = new Map<string, MockSound>();
    for (const hs of HERO_LOCATION.hotspots) {
      const sample = SAMPLES.find((s) => s.id === hs.sampleId);
      if (sample) map.set(sample.id, sampleToSound(sample, t(sample.name)));
    }
    return map;
  }, [t]);

  const [clips, setClips] = useState<LoopClip[]>(() =>
    PRESET.map(([sampleId, track, startBeat]) => ({ id: newClipId(), sampleId, track, startBeat })),
  );
  const [playing, setPlaying] = useState(false);
  const [touched, setTouched] = useState(false);
  const loop = useMemo(() => new MiniLoop(), []);
  const sceneBoxRef = useRef<HTMLDivElement>(null);
  const hotspotRefs = useRef(new Map<string, HTMLButtonElement>());
  const tapUntil = useRef(new Map<string, number>());

  useLevelGlow(sceneBoxRef);

  useEffect(() => {
    loop.setContent(clips, [...sounds.values()].map(toLite));
  }, [loop, clips, sounds]);

  useEffect(() => () => {
    loop.stop();
    stopPreview();
  }, [loop]);

  // Hotspots zwellen met hun eigen geluid (direct naar de DOM).
  useEffect(() => subscribeFrame(() => {
    const level = getLevel();
    const now = getCtx().currentTime;
    for (const [id, el] of hotspotRefs.current) {
      const active = loop.isSoundActive(id) || (tapUntil.current.get(id) ?? 0) > now;
      el.style.transform = `translate(-50%, -50%) scale(${active ? 1.12 + level * 0.5 : 1})`;
      el.style.boxShadow = active
        ? `0 0 ${18 + level * 40}px ${4 + level * 14}px ${sounds.get(id)?.color ?? '#fbbf24'}aa`
        : '0 4px 14px rgba(15,23,42,0.35)';
    }
  }), [loop, sounds]);

  const togglePlay = () => {
    setTouched(true);
    if (loop.isPlaying) {
      loop.stop();
      setPlaying(false);
    } else {
      void loop.play();
      setPlaying(true);
    }
  };

  const handleTap = (sound: MockSound) => {
    setTouched(true);
    tapUntil.current.set(sound.id, getCtx().currentTime + sound.duration);
    void previewSound(toLite(sound));
  };

  const addClip = (sound: MockSound, track: number, startBeat: number) => {
    setTouched(true);
    setClips((prev) => [...prev, { id: newClipId(), sampleId: sound.id, track, startBeat }]);
    if (!loop.isPlaying) {
      void loop.play();
      setPlaying(true);
    }
  };

  const activeColors = useMemo(
    () => [...new Set(clips.map((cl) => sounds.get(cl.sampleId)?.color).filter((x): x is string => !!x))],
    [clips, sounds],
  );

  return (
    <div className="relative min-h-dvh bg-brand-900 text-white overflow-hidden flex flex-col">
      <ReactiveBackdrop colors={activeColors} />

      {/* Bovenbalk: code en docenten rechtsboven */}
      <header className="relative flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3">
        <div className="flex-1" />
        <div className="flex h-9 rounded-full bg-white/10 p-0.5 text-xs font-bold">
          {(['nl', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-3 rounded-full uppercase ${lang === l ? 'bg-white text-brand-900' : 'text-brand-200'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button type="button" onClick={onTeachers} className="hidden sm:inline-flex items-center gap-1.5 h-11 px-3 rounded-full text-sm font-semibold text-brand-200 hover:bg-white/10">
          <GraduationCap size={16} /> {c.teachers}
        </button>
        <button type="button" onClick={onCode} className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/10 ring-1 ring-white/25 hover:bg-white/20 font-bold text-sm">
          <KeyRound size={16} /> {c.code}
        </button>
      </header>

      {/* Hero: tekst + speelbare scène */}
      <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-6 lg:gap-12 items-center px-4 sm:px-8 py-6 lg:py-10 w-full max-w-[1500px] mx-auto">
        <div className="flex flex-col gap-5 lg:gap-7 text-center lg:text-left items-center lg:items-start">
          {/* Merk groot en centraal, zoals op de huidige startpagina */}
          <div className="flex flex-col items-center lg:items-start gap-2">
            <img
              src="/images/overige/logo-soundscout-white.svg"
              alt=""
              className="h-20 sm:h-24 xl:h-28 w-auto drop-shadow-[0_0_24px_rgba(251,191,36,0.35)]"
            />
            <p className="text-5xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-none">
              Sound<span className="text-accent-400">Scout</span>
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-balance">
            {c.title}
          </h1>
          <p className="text-lg sm:text-xl text-brand-200 text-balance -mt-2">{c.sub}</p>
          <div className="flex flex-wrap justify-center lg:justify-start gap-3">
            <button type="button" onClick={onStart} className="inline-flex items-center gap-2 h-14 px-7 rounded-full bg-accent-400 hover:bg-accent-300 text-brand-900 text-lg font-extrabold shadow-lg shadow-accent-500/20">
              <Sparkles size={20} /> {c.start}
            </button>
            <button type="button" onClick={onWorlds} className="inline-flex items-center gap-2 h-14 px-6 rounded-full bg-white/10 hover:bg-white/20 text-lg font-bold ring-1 ring-white/30">
              <Compass size={20} /> {c.worlds}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          {/* Hoogte begrensd op het scherm: scène + tijdlijn passen altijd boven de vouw */}
          <div
            className="relative flex min-h-[200px] h-[var(--hero-h)] lg:h-[var(--hero-h-lg)]"
            style={{
              '--hero-h': 'min(calc(100dvh - 20rem), 54vw)',
              '--hero-h-lg': 'min(calc(100dvh - 20rem), 32vw)',
            } as React.CSSProperties}
          >
            <Scene image={HERO_LOCATION.backgroundImage} alt="" boxRef={sceneBoxRef}>
              {HERO_LOCATION.hotspots.map((hs) => {
                const sound = sounds.get(hs.sampleId);
                if (!sound) return null;
                return (
                  <button
                    key={hs.id}
                    type="button"
                    ref={(el) => {
                      if (el) hotspotRefs.current.set(sound.id, el);
                      else hotspotRefs.current.delete(sound.id);
                    }}
                    aria-label={sound.label}
                    title={sound.label}
                    onPointerDown={(e) => startChipDrag(e, {
                      sound,
                      onTap: () => handleTap(sound),
                      onDrop: ({ track, startBeat }) => addClip(sound, track, startBeat),
                    })}
                    className="absolute rounded-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing border-2 border-white/90"
                    style={{
                      left: `${hs.x}%`,
                      top: `${hs.y}%`,
                      width: 'clamp(44px, 9cqw, 72px)',
                      height: 'clamp(44px, 9cqw, 72px)',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: sound.color,
                      color: textOn(sound.color),
                    }}
                  >
                    <SampleIcon name={sound.icon} size={24} />
                  </button>
                );
              })}
              {!touched && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-900/85 text-sm font-bold shadow-lg animate-bounce">
                    <Hand size={16} className="text-accent-400" /> {c.hint}
                  </span>
                </div>
              )}
            </Scene>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 p-3">
            <PlayButton playing={playing} onToggle={togglePlay} />
            <div className="flex-1 min-w-0">
              <MiniTimeline
                clips={clips}
                sounds={sounds}
                loop={loop}
                dark
                trackHeight={36}
                onRemoveClip={(id) => setClips((prev) => prev.filter((cl) => cl.id !== id))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
