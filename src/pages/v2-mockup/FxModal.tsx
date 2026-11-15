/**
 * FxModal — de bestaande Effecten-modal, opgewaardeerd tot "Vervormen".
 *
 * Zelfde opbouw als productie (kop met kleurstip · golfvorm · schuiven ·
 * voetregel Voorbeeld / reset / Annuleren / Toepassen). Links de BESTAANDE
 * effecten (toonhoogte, galm, fade in/uit), rechts de NIEUWE (snelheid,
 * achterstevoren, echo, filter).
 *
 * Harde regel: deze modal opent alleen vanaf een clip op de tijdlijn, en een
 * clip kan alleen een geluid uit de eigen bibliotheek zijn — er is dus geen
 * weg naar geluiden die de leerling niet zelf verzameld heeft.
 */

import { useEffect, useRef, useState } from 'react';
import { Play, Rewind, RotateCcw, Square, X } from 'lucide-react';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { toLite, type MockSound } from './shared';
import { playBuffer, resolveBuffer, unlockAudio } from './liteAudio';
import { NO_FX, fxDuration, hasFx, renderFx, type Fx } from './engine';

interface Props {
  sound: MockSound;
  initial?: Fx;
  onClose: () => void;
  onApply: (fx: Fx, buffer: AudioBuffer | null) => void;
}

const SPEEDS: Array<[number, string]> = [[0.5, '½×'], [0.75, '¾×'], [1, '1×'], [1.5, '1½×'], [2, '2×']];

const RANGE = `
  flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-neutral-200 accent-accent-500
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500
  [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
`;

function Slider({ label, value, display, min, max, step, left, right, neutral = 0, onChange }: {
  label: string; value: number; display: string; min: number; max: number; step: number;
  left: string; right: string; neutral?: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-neutral-600">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-400 tabular-nums">{display}</span>
          {value !== neutral && (
            <button type="button" onClick={() => onChange(neutral)} aria-label={`${label} terugzetten`} className="p-0.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400 w-9 text-right shrink-0">{left}</span>
        <input
          type="range" min={min} max={max} step={step} value={value} aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          onDoubleClick={() => onChange(neutral)}
          className={RANGE}
        />
        <span className="text-xs text-neutral-400 w-9 shrink-0">{right}</span>
      </div>
    </div>
  );
}

export default function FxModal({ sound, initial, onClose, onApply }: Props) {
  const [fx, setFx] = useState<Fx>(initial ?? NO_FX);
  const [rendered, setRendered] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = useRef<AudioBufferSourceNode | null>(null);

  const set = (patch: Partial<Fx>) => setFx((prev) => ({ ...prev, ...patch }));
  const body = fxDuration(sound.duration, fx);
  const hasChanges = JSON.stringify(fx) !== JSON.stringify(initial ?? NO_FX);

  const stop = () => {
    try { playing.current?.stop(); } catch { /* al gestopt */ }
    playing.current = null;
    setIsPlaying(false);
  };

  // Opnieuw renderen bij elke wijziging (kort uitgesteld), en de golfvorm tekenen.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void resolveBuffer(toLite(sound)).then(async (source) => {
        if (!source || cancelled) return;
        const out = await renderFx(source, fx);
        if (cancelled) return;
        setRendered(out);
        const canvas = canvasRef.current;
        const g = canvas?.getContext('2d');
        if (!canvas || !g) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = (canvas.width = canvas.clientWidth * dpr), h = (canvas.height = canvas.clientHeight * dpr);
        g.clearRect(0, 0, w, h);
        const data = out.getChannelData(0);
        const bars = Math.floor(w / (4 * dpr));
        const per = Math.floor(data.length / bars);
        g.fillStyle = sound.color;
        for (let i = 0; i < bars; i++) {
          let peak = 0;
          for (let j = 0; j < per; j += 8) peak = Math.max(peak, Math.abs(data[i * per + j]));
          const bh = Math.max(2 * dpr, peak * h * 0.92);
          g.fillRect(i * 4 * dpr, (h - bh) / 2, 2.5 * dpr, bh);
        }
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sound, fx]);

  useEffect(() => stop, []);

  const handlePreview = async () => {
    if (isPlaying) {
      stop();
      return;
    }
    if (!rendered) return;
    await unlockAudio();
    const src = playBuffer(rendered);
    playing.current = src;
    setIsPlaying(true);
    src.addEventListener('ended', () => {
      if (playing.current === src) setIsPlaying(false);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Vervormen" className="relative w-full max-w-3xl max-h-[calc(100dvh-2rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-[mock-pop_200ms_ease-out]">
        {/* Kop — zoals productie */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sound.color }} />
          <SampleIcon name={sound.icon} size={18} className="text-text-main" />
          <h2 className="font-bold text-text-main">Vervormen</h2>
          <span className="text-sm text-text-muted truncate">· {sound.label} · {body.toFixed(1)} s</span>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="ml-auto w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Golfvorm met fade-arcering */}
          <div className="px-4 pt-4">
            <div className="relative rounded-xl bg-neutral-100 overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-[116px] block" />
              {fx.fadeIn > 0 && (
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-neutral-500/45 to-transparent pointer-events-none" style={{ width: `${Math.min(50, (fx.fadeIn / Math.max(body, 0.1)) * 100)}%` }} />
              )}
              {fx.fadeOut > 0 && (
                <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-neutral-500/45 to-transparent pointer-events-none" style={{ width: `${Math.min(50, (fx.fadeOut / Math.max(body, 0.1)) * 100)}%` }} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-4">
            {/* Bestaand */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Klank</p>
              <Slider label="Toonhoogte" value={fx.pitch} display={fx.pitch > 0 ? `+${fx.pitch}` : String(fx.pitch)} min={-12} max={12} step={1} left="Laag" right="Hoog" onChange={(v) => set({ pitch: v })} />
              <Slider label="Galm" value={fx.reverb} display={`${fx.reverb}%`} min={0} max={100} step={5} left="Droog" right="Galm" onChange={(v) => set({ reverb: v })} />
              <Slider label="Fade in" value={fx.fadeIn} display={`${fx.fadeIn.toFixed(1)} s`} min={0} max={3} step={0.1} left="Geen" right="Lang" onChange={(v) => set({ fadeIn: v })} />
              <Slider label="Fade out" value={fx.fadeOut} display={`${fx.fadeOut.toFixed(1)} s`} min={0} max={3} step={0.1} left="Geen" right="Lang" onChange={(v) => set({ fadeOut: v })} />
            </div>

            {/* Nieuw */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Vervormen <span className="ml-1 px-1.5 py-0.5 rounded bg-accent-100 text-accent-800 normal-case tracking-normal">nieuw</span>
              </p>
              <div>
                <span className="text-xs font-medium text-neutral-600">Snelheid</span>
                <div className="flex gap-1.5 mt-1">
                  {SPEEDS.map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set({ speed: v })}
                      aria-pressed={fx.speed === v}
                      className={cn(
                        'flex-1 h-10 rounded-lg text-sm font-bold border transition-colors',
                        fx.speed === v ? 'bg-accent-400 border-accent-400 text-accent-900' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => set({ reverse: !fx.reverse })}
                aria-pressed={fx.reverse}
                className={cn(
                  'w-full h-10 rounded-lg text-sm font-bold border inline-flex items-center justify-center gap-2 transition-colors',
                  fx.reverse ? 'bg-accent-400 border-accent-400 text-accent-900' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50',
                )}
              >
                <Rewind size={16} /> Achterstevoren
              </button>
              <Slider label="Echo" value={fx.echo} display={`${fx.echo}%`} min={0} max={100} step={5} left="Uit" right="Veel" onChange={(v) => set({ echo: v })} />
              <Slider label="Filter" value={fx.filter} display={fx.filter === 0 ? 'Uit' : fx.filter < 0 ? 'Dof' : 'Scherp'} min={-100} max={100} step={10} left="Dof" right="Scherp" onChange={(v) => set({ filter: v })} />
            </div>
          </div>
        </div>

        {/* Voetregel — zoals productie */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePreview()}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors',
                isPlaying ? 'bg-error-100 text-error-600 hover:bg-error-200' : 'bg-white border border-neutral-300 hover:bg-neutral-50',
              )}
            >
              {isPlaying ? <Square size={16} /> : <Play size={16} />}
              <span className="text-sm font-medium">Voorbeeld</span>
            </button>
            <button type="button" onClick={() => setFx(NO_FX)} title="Alles terugzetten" className="p-2 text-neutral-500 hover:bg-neutral-200 rounded-lg transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors">
              Annuleren
            </button>
            <button
              type="button"
              disabled={!hasChanges}
              onClick={() => { stop(); onApply(fx, hasFx(fx) ? rendered : null); }}
              className="px-4 py-1.5 text-sm font-medium text-text-main bg-accent-400 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Toepassen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
