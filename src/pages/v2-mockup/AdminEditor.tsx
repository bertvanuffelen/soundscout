/**
 * AdminEditor — de bestaande /editor (hotspots plaatsen, geluiden koppelen)
 * als volwaardige pagina BINNEN het beheerdersdashboard (Berts review, punt 6).
 *
 * Werkt op een kopie van het echte basis-thema, alleen in het geheugen:
 *  - Hotspots: slepen op de plaat, met veilige zone en overlap-controle live;
 *  - Geluiden: toevoegen via een audiobestand van je computer (wordt lokaal
 *    gedecodeerd — niets wordt geüpload), hernoemen, kleur, licentie, luisteren;
 *  - Kaart: locatie-markers verslepen op de plattegrond;
 *  - Beelden: per beeld formaat-controles en vervangen.
 */

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, CircleAlert, Image as ImageIcon, Map as MapIcon, MapPin, Music, Play, Plus, Save, Target, Trash2, Upload,
} from 'lucide-react';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { THEME, Scene, textOn } from './shared';
import { getCtx, playBuffer, loadBuffer, unlockAudio, stopPreview } from './liteAudio';

interface EdSound {
  id: string;
  label: string;
  icon: string;
  color: string;
  duration: number;
  url: string;
  licence: string;
  buffer?: AudioBuffer;
}

interface EdHotspot {
  id: string;
  soundId: string;
  x: number;
  y: number;
}

interface EdLocation {
  id: string;
  name: string;
  image: string;
  hotspots: EdHotspot[];
  mapX: number;
  mapY: number;
}

type EdTab = 'hotspots' | 'map' | 'assets';

/** Veilige zone (V2-voorstel §6.1 regel 2): hotspots horen hierbinnen. */
const SAFE = { top: 12, bottom: 88, left: 4, right: 96 };
/** Minimale afstand tussen twee hotspots, in % van de plaatbreedte. */
const MIN_GAP = 9;

function useSceneDrag(boxRef: React.RefObject<HTMLDivElement | null>) {
  return (e: React.PointerEvent<HTMLElement>, onMove: (x: number, y: number) => void) => {
    const box = boxRef.current;
    if (!box) return;
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
      onMove(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
}

export default function AdminEditor() {
  const { t } = useTranslation();

  const [sounds, setSounds] = useState<EdSound[]>(() => THEME.samples.map((s) => ({
    id: s.id, label: t(s.name), icon: s.icon, color: s.color, duration: s.duration, url: s.audioUrl, licence: 'CC0',
  })));
  const [locations, setLocations] = useState<EdLocation[]>(() => THEME.locations.map((l) => {
    const pos = THEME.map.locationPositions.find((p) => p.locationId === l.id);
    return {
      id: l.id, name: t(l.name), image: l.backgroundImage,
      hotspots: l.hotspots.map((h) => ({ id: h.id, soundId: h.sampleId, x: h.x, y: h.y })),
      mapX: pos?.x ?? 50, mapY: pos?.y ?? 50,
    };
  }));
  const [locId, setLocId] = useState(locations[0].id);
  const [selId, setSelId] = useState<string | null>(null);
  const [tab, setTab] = useState<EdTab>('hotspots');
  const [saved, setSaved] = useState(false);
  const [mapImage] = useState(THEME.map.backgroundImage);

  const boxRef = useRef<HTMLDivElement>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const drag = useSceneDrag(boxRef);
  const dragMap = useSceneDrag(mapBoxRef);

  const loc = locations.find((l) => l.id === locId) ?? locations[0];
  const selected = loc.hotspots.find((h) => h.id === selId) ?? null;
  const selectedSound = selected ? sounds.find((s) => s.id === selected.soundId) : undefined;

  const patchLoc = (patch: (l: EdLocation) => EdLocation) => {
    setSaved(false);
    setLocations((prev) => prev.map((l) => (l.id === loc.id ? patch(l) : l)));
  };
  const patchSound = (id: string, patch: Partial<EdSound>) => {
    setSaved(false);
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  // --- Controles (live) ---
  const issues = (() => {
    const out = new Map<string, string>();
    loc.hotspots.forEach((h, i) => {
      if (h.y < SAFE.top || h.y > SAFE.bottom || h.x < SAFE.left || h.x > SAFE.right) out.set(h.id, 'Buiten de veilige zone');
      loc.hotspots.forEach((o, j) => {
        if (i === j) return;
        // y omrekenen naar breedte-eenheden (16:9)
        const dist = Math.hypot(h.x - o.x, (h.y - o.y) * (9 / 16));
        if (dist < MIN_GAP) out.set(h.id, 'Te dicht bij een andere hotspot');
      });
      const sound = sounds.find((s) => s.id === h.soundId);
      if (sound && (sound.duration < 2 || sound.duration > 8.05)) out.set(h.id, `Lengte ${sound.duration.toFixed(1)} s (moet 2–8 s zijn)`);
      if (sound && !sound.licence) out.set(h.id, 'Licentie ontbreekt');
    });
    return out;
  })();

  const preview = async (sound: EdSound) => {
    await unlockAudio();
    stopPreview();
    const buffer = sound.buffer ?? (await loadBuffer(sound.url).catch(() => null));
    if (buffer) playBuffer(buffer);
  };

  const addSoundFromFile = async (file: File) => {
    try {
      const buffer = await getCtx().decodeAudioData(await file.arrayBuffer());
      const id = `nieuw-${Date.now()}`;
      const label = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      setSounds((prev) => [...prev, {
        id, label, icon: 'Zap', color: '#0EA5E9', duration: buffer.duration, url: URL.createObjectURL(file), licence: '', buffer,
      }]);
      const hotspot: EdHotspot = { id: `hs-${id}`, soundId: id, x: 50, y: 50 };
      patchLoc((l) => ({ ...l, hotspots: [...l.hotspots, hotspot] }));
      setSelId(hotspot.id);
    } catch {
      window.alert('Dit bestand kan niet als geluid worden gelezen.');
    }
  };

  const TABS: Array<[EdTab, string, typeof Target]> = [
    ['hotspots', 'Hotspots & geluiden', Target],
    ['map', 'Kaart', MapIcon],
    ['assets', 'Beelden', ImageIcon],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main">Editor · Stad</h2>
          <p className="text-sm text-text-muted">Concept — wijzigingen staan pas live na publiceren.</p>
        </div>
        <div className="flex rounded-xl bg-white border border-border-subtle p-1">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn('inline-flex items-center gap-2 h-10 px-3 rounded-lg text-sm font-bold', tab === id ? 'bg-brand-900 text-white' : 'text-text-muted hover:bg-neutral-100')}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSaved(true)}
          className={cn('inline-flex items-center gap-2 h-11 px-4 rounded-full font-extrabold text-sm', saved ? 'bg-success-100 text-success-700' : 'bg-accent-400 text-brand-900')}
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />} {saved ? 'Concept bewaard' : 'Concept bewaren'}
        </button>
      </div>

      {tab !== 'map' && (
        <div className="flex flex-wrap gap-2">
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { setLocId(l.id); setSelId(null); }}
              className={cn('inline-flex items-center gap-2 h-11 pl-1.5 pr-3 rounded-full border-2 text-sm font-bold', l.id === loc.id ? 'border-brand-900 bg-white' : 'border-border-subtle bg-white text-text-muted hover:bg-neutral-50')}
            >
              <img src={l.image} alt="" className="w-12 h-8 rounded-full object-cover" />
              {l.name}
              <span className="text-xs text-text-muted tabular-nums">{l.hotspots.length}</span>
            </button>
          ))}
          <button type="button" className="inline-flex items-center gap-1.5 h-11 px-3 rounded-full border-2 border-dashed border-neutral-300 text-sm font-bold text-text-muted">
            <Plus size={16} /> Locatie
          </button>
        </div>
      )}

      {/* --- Hotspots & geluiden --- */}
      {tab === 'hotspots' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] gap-4">
          <div className="rounded-2xl bg-brand-900 p-3 flex flex-col gap-2">
            <div className="flex aspect-video">
              <Scene image={loc.image} alt={loc.name} boxRef={boxRef}>
                {/* Veilige zone */}
                <div
                  className="absolute border-2 border-dashed border-white/70 rounded-lg pointer-events-none"
                  style={{ top: `${SAFE.top}%`, bottom: `${100 - SAFE.bottom}%`, left: `${SAFE.left}%`, right: `${100 - SAFE.right}%` }}
                />
                <div className="absolute inset-x-0 top-0 bg-error-500/25 pointer-events-none" style={{ height: `${SAFE.top}%` }} />
                <div className="absolute inset-x-0 bottom-0 bg-error-500/25 pointer-events-none" style={{ height: `${100 - SAFE.bottom}%` }} />

                {loc.hotspots.map((h) => {
                  const sound = sounds.find((s) => s.id === h.soundId);
                  if (!sound) return null;
                  const bad = issues.has(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      title={sound.label}
                      onPointerDown={(e) => {
                        setSelId(h.id);
                        drag(e, (x, y) => patchLoc((l) => ({ ...l, hotspots: l.hotspots.map((o) => (o.id === h.id ? { ...o, x, y } : o)) })));
                      }}
                      className={cn(
                        'absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none border-[3px]',
                        bad ? 'border-error-500 ring-4 ring-error-500/40' : 'border-white',
                        h.id === selId && 'ring-4 ring-accent-400',
                      )}
                      style={{ left: `${h.x}%`, top: `${h.y}%`, width: '8%', minWidth: 36, aspectRatio: '1 / 1', backgroundColor: `${sound.color}cc`, color: textOn(sound.color) }}
                    >
                      <SampleIcon name={sound.icon} size={18} />
                    </button>
                  );
                })}
              </Scene>
            </div>
            <p className="text-xs text-brand-300 px-1">
              Sleep een hotspot. Rood = buiten de veilige zone (daar staan knoppen) of te dicht bij een andere.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-white border border-border-subtle overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
                <Music size={16} className="text-text-muted" />
                <span className="font-bold text-sm text-text-main">Geluiden op deze plek</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-accent-400 text-brand-900 text-sm font-extrabold"
                >
                  <Upload size={14} /> Geluid toevoegen
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void addSoundFromFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
              <ul className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
                {loc.hotspots.map((h) => {
                  const sound = sounds.find((s) => s.id === h.soundId);
                  if (!sound) return null;
                  const issue = issues.get(h.id);
                  return (
                    <li key={h.id} className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer', h.id === selId ? 'bg-accent-50' : 'hover:bg-neutral-50')} onClick={() => setSelId(h.id)}>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sound.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-main truncate">{sound.label}</p>
                        <p className={cn('text-xs truncate', issue ? 'text-error-600 font-semibold' : 'text-text-muted')}>
                          {issue ?? `${sound.duration.toFixed(1)} s · ${sound.licence}`}
                        </p>
                      </div>
                      {issue ? <CircleAlert size={16} className="text-error-600 shrink-0" /> : <CheckCircle2 size={16} className="text-success-600 shrink-0" />}
                      <button type="button" aria-label={`Luister naar ${sound.label}`} onClick={(e) => { e.stopPropagation(); void preview(sound); }} className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center shrink-0">
                        <Play size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {selected && selectedSound ? (
              <div className="rounded-2xl bg-white border border-border-subtle p-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
                  Naam (NL)
                  <input type="text" value={selectedSound.label} onChange={(e) => patchSound(selectedSound.id, { label: e.target.value })} className="h-10 px-3 rounded-lg border-2 border-border-subtle text-sm font-semibold text-text-main" />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
                    Kleur
                    <input type="color" value={selectedSound.color} onChange={(e) => patchSound(selectedSound.id, { color: e.target.value })} className="h-10 w-full rounded-lg border-2 border-border-subtle bg-white" />
                  </label>
                  <label className="col-span-2 flex flex-col gap-1 text-xs font-bold text-text-muted">
                    Licentie
                    <select value={selectedSound.licence} onChange={(e) => patchSound(selectedSound.id, { licence: e.target.value })} className="h-10 px-2 rounded-lg border-2 border-border-subtle bg-white text-sm font-semibold text-text-main">
                      <option value="">— kies —</option>
                      <option>CC0</option>
                      <option>CC BY 4.0</option>
                      <option>Eigen opname</option>
                      <option>Gegenereerd</option>
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-muted tabular-nums">
                  <MapPin size={14} /> x {selected.x.toFixed(1)}% · y {selected.y.toFixed(1)}%
                  <button
                    type="button"
                    onClick={() => { patchLoc((l) => ({ ...l, hotspots: l.hotspots.filter((o) => o.id !== selected.id) })); setSelId(null); }}
                    className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-error-600 font-semibold hover:bg-error-50"
                  >
                    <Trash2 size={14} /> Verwijderen
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-neutral-300 p-4 text-sm text-text-muted">
                Kies een hotspot om naam, kleur en licentie aan te passen.
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- Kaart --- */}
      {tab === 'map' && (
        <div className="rounded-2xl bg-brand-900 p-3 flex flex-col gap-2">
          <div className="flex aspect-video max-h-[70dvh]">
            <Scene image={mapImage} alt="Plattegrond" boxRef={mapBoxRef}>
              {locations.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onPointerDown={(e) => dragMap(e, (x, y) => {
                    setSaved(false);
                    setLocations((prev) => prev.map((o) => (o.id === l.id ? { ...o, mapX: x, mapY: y } : o)));
                  })}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing touch-none"
                  style={{ left: `${l.mapX}%`, top: `${l.mapY}%` }}
                >
                  <span className="w-12 h-12 rounded-2xl bg-white border-4 border-accent-400 text-accent-600 flex items-center justify-center shadow-lg"><MapPin size={22} /></span>
                  <span className="bg-white/90 px-2 py-0.5 rounded-lg text-xs font-bold text-text-main whitespace-nowrap">{l.name}</span>
                </button>
              ))}
            </Scene>
          </div>
          <p className="text-xs text-brand-300 px-1">Sleep een locatie naar de juiste plek op de plattegrond.</p>
        </div>
      )}

      {/* --- Beelden --- */}
      {tab === 'assets' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[{ id: 'map', name: 'Plattegrond (NL)', image: mapImage }, ...locations.map((l) => ({ id: l.id, name: l.name, image: l.image }))].map((asset) => (
            <div key={asset.id} className="rounded-2xl bg-white border border-border-subtle overflow-hidden">
              <img src={asset.image} alt="" className="w-full aspect-video object-cover" />
              <div className="p-3 flex flex-col gap-1.5">
                <p className="font-bold text-text-main">{asset.name}</p>
                <p className="flex items-center gap-1.5 text-sm text-text-main"><CheckCircle2 size={16} className="text-success-600" /> 16:9</p>
                <p className="flex items-center gap-1.5 text-sm text-warning-800"><CircleAlert size={16} className="text-warning-600" /> Alleen JPG — AVIF en WebP worden bij publiceren gemaakt</p>
                {asset.id !== 'map' && (
                  <button
                    type="button"
                    onClick={() => { setLocId(asset.id); imageRef.current?.click(); }}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border-2 border-border-subtle text-sm font-bold hover:bg-neutral-50"
                  >
                    <Upload size={14} /> Beeld vervangen
                  </button>
                )}
              </div>
            </div>
          ))}
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) patchLoc((l) => ({ ...l, image: URL.createObjectURL(file) }));
              e.target.value = '';
            }}
          />
        </div>
      )}

      <p className="text-xs text-text-muted">
        Mockup: werkt op een kopie van het echte thema in het geheugen. Bestanden die je kiest blijven op je computer; er wordt niets geüpload of opgeslagen.
      </p>
    </div>
  );
}
