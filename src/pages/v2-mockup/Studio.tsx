/**
 * Studio — PRODUCTIE-layout (navigatiebalk · Bibliotheek · Tijdlijn · transport),
 * met de V2-toevoegingen op hun natuurlijke plek (Berts review, punt 3–5):
 *  - "Sequence toevoegen" / sequence-chip → het sequencer-PANEEL vervangt de
 *    tijdlijnzone (zoals productie), nu met tabs Ritme | Melodie;
 *  - effecten-knop op een clip → "Vervormen" (bestaande + nieuwe effecten);
 *  - spiegel-icoon in de tijdlijn-werkbalk → Luisterspiegel (vrijwillig);
 *  - "Naar Podium" → door naar het podium; de Luisterspiegel staat dáár.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy, Eraser, Flag, FlipHorizontal2, Grid3x3, GripVertical, Maximize2, Pause, Play, Plus, Redo2,
  Repeat, Scissors, SkipBack, Sparkles, Square, Tag, Trash2, Undo2, Volume2, ZoomIn, ZoomOut,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { startChipDrag, textOn, toLite, type MockSound } from './shared';
import {
  BEAT_SEC, MiniLoop, previewSound, resolveBuffer, stopPreview, subscribeFrame, unlockAudio,
  type LiteSound, type LoopClip,
} from './liteAudio';
import {
  emptyMelody, emptyRows, fxDuration, hasFx, sequenceDuration,
  type Fx, type MirrorClip, type MirrorQuestion, type MockSequence,
} from './engine';
import FxModal from './FxModal';
import SequencerPanel from './SequencerPanel';
import MirrorModal from './MirrorModal';

export interface StudioClip {
  id: string;
  /** Bibliotheek-geluid óf `seq:<id>`. */
  soundId: string;
  track: number;
  startBeat: number;
  fx?: Fx;
}

/** Alles wat het podium nodig heeft: afspeelinhoud + gegevens voor de Luisterspiegel. */
export interface StagePayload {
  loopClips: LoopClip[];
  liteSounds: LiteSound[];
  loopBeats: number;
  mirrorClips: MirrorClip[];
  tracks: number[];
  sounds: Record<string, MockSound>;
}

const SEQ_COLORS = ['#F59E0B', '#D97706', '#B45309'];

const TOTAL_BEATS = 128; // 32 maten, zoals productie
const BARS = TOTAL_BEATS / 4;
const TRACKS = 8;

let studioClipCounter = 0;
const nextClipId = () => `sc-${++studioClipCounter}`;

interface Props {
  bag: MockSound[];
  clips: StudioClip[];
  setClips: React.Dispatch<React.SetStateAction<StudioClip[]>>;
  sequences: MockSequence[];
  setSequences: React.Dispatch<React.SetStateAction<MockSequence[]>>;
  questions: MirrorQuestion[];
  dark: boolean;
  onBack: () => void;
  onToStage: (payload: StagePayload) => void;
}

const ICON_BTN = 'p-1.5 min-w-[32px] min-h-[32px] relative after:absolute after:content-[\'\'] after:-inset-1.5 flex items-center justify-center rounded-lg transition-colors disabled:opacity-25 disabled:pointer-events-none';

export default function Studio({
  bag, clips, setClips, sequences, setSequences, questions, dark, onBack, onToStage,
}: Props) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [fxClipId, setFxClipId] = useState<string | null>(null);
  const [seqPanelId, setSeqPanelId] = useState<string | null>(null);
  const [seqPlaying, setSeqPlaying] = useState(false);
  const [mirror, setMirror] = useState(false);
  const [history, setHistory] = useState<StudioClip[][]>([]);
  const [fxVersion, setFxVersion] = useState(0);

  const fxBuffers = useRef(new Map<string, AudioBuffer>());
  const playheadRef = useRef<HTMLDivElement>(null);
  const loop = useMemo(() => new MiniLoop(), []);

  // --- Kleuren: productie (licht) of donkerblauwe basis ---
  const P = dark
    ? {
        page: 'bg-brand-900', bar: 'bg-brand-800 border-brand-700', text: 'text-white', muted: 'text-brand-300',
        chip: 'bg-brand-700 border-brand-500 text-white', chipText: 'text-white',
        lane: 'bg-brand-800', laneAlt: 'bg-brand-800/60', gutter: 'bg-brand-700 border-brand-600 text-brand-300',
        ruler: 'bg-brand-700 text-brand-300 border-brand-600', grid: 'rgba(255,255,255,0.10)', gridBar: 'rgba(255,255,255,0.22)',
        icon: 'text-brand-300 hover:text-white hover:bg-white/10', round: 'bg-brand-700 text-brand-100 hover:bg-brand-600',
        previewBtn: 'bg-brand-600 text-brand-100 hover:bg-brand-500',
      }
    : {
        page: 'bg-bg-app', bar: 'bg-bg-surface border-border-subtle', text: 'text-text-main', muted: 'text-text-muted',
        chip: 'bg-white', chipText: 'text-text-main',
        lane: 'bg-white', laneAlt: 'bg-neutral-50', gutter: 'bg-neutral-100 border-neutral-200 text-neutral-400',
        ruler: 'bg-neutral-100 text-neutral-500 border-neutral-200', grid: 'rgba(15,23,42,0.06)', gridBar: 'rgba(15,23,42,0.16)',
        icon: 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60', round: 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300',
        previewBtn: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-700',
      };

  // --- Geluiden opzoeken ---

  const seqSound = (seq: MockSequence): MockSound => ({
    id: `seq:${seq.id}`, label: seq.name, icon: 'Bot', color: seq.color,
    duration: sequenceDuration(seq.kind), buffer: seq.buffer,
  });

  const soundFor = (soundId: string): MockSound | undefined => {
    if (soundId.startsWith('seq:')) {
      const seq = sequences.find((s) => `seq:${s.id}` === soundId);
      return seq ? seqSound(seq) : undefined;
    }
    return bag.find((b) => b.id === soundId);
  };

  const clipSeconds = (clip: StudioClip): number => {
    const sound = soundFor(clip.soundId);
    return sound ? fxDuration(sound.duration, clip.fx) : 0;
  };

  // --- Afspeelinhoud voor de lichte motor ---

  const buildPlayback = () => {
    const loopClips: LoopClip[] = [];
    const lite = new Map<string, LiteSound>();
    let end = 0;
    for (const clip of clips) {
      const sound = soundFor(clip.soundId);
      if (!sound) continue;
      const fxBuffer = hasFx(clip.fx) ? fxBuffers.current.get(clip.id) : undefined;
      const playId = fxBuffer ? `fx:${clip.id}` : clip.soundId;
      lite.set(playId, fxBuffer ? { id: playId, buffer: fxBuffer, duration: fxBuffer.duration } : toLite(sound));
      loopClips.push({ id: clip.id, sampleId: playId, track: clip.track, startBeat: clip.startBeat });
      end = Math.max(end, clip.startBeat + clipSeconds(clip) / BEAT_SEC);
    }
    return { loopClips, liteSounds: [...lite.values()], loopBeats: Math.max(16, Math.ceil(end / 4) * 4) };
  };

  useEffect(() => {
    const { loopClips, liteSounds, loopBeats } = buildPlayback();
    loop.loopBeats = loopBeats;
    loop.repeat = repeat;
    loop.setContent(loopClips, liteSounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildPlayback hangt af van clips+bag+sequences
  }, [loop, clips, bag, sequences, repeat, fxVersion]);

  useEffect(() => {
    loop.onEnded = () => setPlaying(false);
    return () => {
      loop.stop();
      stopPreview();
    };
  }, [loop]);

  // Afspeellijn direct naar de DOM (geen React-render per frame)
  useEffect(() => subscribeFrame(() => {
    const el = playheadRef.current;
    if (el) el.style.left = `${((loop.isPlaying ? loop.getBeat() : 0) / TOTAL_BEATS) * 100}%`;
  }), [loop]);

  // --- Acties ---

  const commit = (next: StudioClip[]) => {
    setHistory((h) => [...h.slice(-30), clips]);
    setClips(next);
  };

  const seqPanel = sequences.find((sq) => sq.id === seqPanelId) ?? null;

  const togglePlay = () => {
    // Modus-bewust (zoals productie): sequencer open → de sequence speelt.
    if (seqPanel) {
      void unlockAudio().then(() => setSeqPlaying((p) => !p));
      return;
    }
    if (loop.isPlaying) {
      loop.stop();
      setPlaying(false);
    } else {
      stopPreview();
      setPreviewId(null);
      void loop.play();
      setPlaying(true);
    }
  };

  const stopAll = () => {
    loop.stop();
    setPlaying(false);
    setSeqPlaying(false);
  };

  const openSequence = (id: string) => {
    stopAll();
    setSelectedId(null);
    setSeqPanelId(id);
  };

  const addSequence = () => {
    const id = `m${Date.now()}`;
    setSequences((prev) => [...prev, {
      id, name: `Sequence ${prev.length + 1}`, kind: 'rhythm', rows: emptyRows(), melody: emptyMelody(),
      color: SEQ_COLORS[prev.length % SEQ_COLORS.length],
    }]);
    openSequence(id);
  };

  const togglePreview = (sound: MockSound) => {
    if (previewId === sound.id) {
      stopPreview();
      setPreviewId(null);
      return;
    }
    setPreviewId(sound.id);
    void previewSound(toLite(sound));
    window.setTimeout(() => setPreviewId((id) => (id === sound.id ? null : id)), sound.duration * 1000);
  };

  const addClip = (sound: MockSound, track: number, startBeat: number) => {
    const clip: StudioClip = { id: nextClipId(), soundId: sound.id, track, startBeat };
    commit([...clips, clip]);
    setSelectedId(clip.id);
  };

  const selected = clips.find((c) => c.id === selectedId) ?? null;
  const selectedSound = selected ? soundFor(selected.soundId) : undefined;
  const fxClip = clips.find((c) => c.id === fxClipId) ?? null;
  const fxSound = fxClip ? soundFor(fxClip.soundId) : undefined;

  const duplicate = () => {
    if (!selected) return;
    const len = Math.ceil(clipSeconds(selected) / BEAT_SEC);
    const copy: StudioClip = { ...selected, id: nextClipId(), startBeat: Math.min(TOTAL_BEATS - 1, selected.startBeat + len) };
    if (selected.fx && fxBuffers.current.has(selected.id)) fxBuffers.current.set(copy.id, fxBuffers.current.get(selected.id)!);
    commit([...clips, copy]);
    setSelectedId(copy.id);
  };

  const mirrorClips: MirrorClip[] = clips.map((c) => ({
    soundId: c.soundId, startBeat: c.startBeat, lengthBeats: clipSeconds(c) / BEAT_SEC,
  }));

  const handleToStage = () => {
    stopAll();
    const sounds: Record<string, MockSound> = {};
    for (const c of clips) {
      const sound = soundFor(c.soundId);
      if (sound) sounds[c.soundId] = sound;
    }
    onToStage({ ...buildPlayback(), mirrorClips, tracks: clips.map((c) => c.track), sounds });
  };

  // --- Render ---

  const librarySounds = bag;

  return (
    <div className={cn('h-dvh flex flex-col overflow-hidden', P.page)}>
      {/* Navigatiebalk — zoals productie */}
      <div className={cn('flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b', P.bar)}>
        <Button variant="secondary" size="sm" onClick={() => { stopAll(); onBack(); }}>
          {t('studio.backToLocation')}
        </Button>
        <h1 className={cn('text-base sm:text-lg font-extrabold tracking-tight', P.text)}>{t('studio.title')}</h1>
        <Button variant="primary" size="sm" onClick={handleToStage} disabled={clips.length === 0}>
          {t('studio.toStage')}
        </Button>
      </div>

      {/* Bibliotheek — zoals productie */}
      <div className={cn('flex-1 flex flex-col min-h-0 px-2 sm:px-4 py-2 sm:py-3 border-b', P.bar)}>
        <h2 className={cn('text-xs font-bold uppercase tracking-wide mb-1.5 sm:mb-2', P.muted)}>{t('studio.library')}</h2>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 content-start overflow-y-auto">
          {librarySounds.length === 0 && sequences.length === 0 && (
            <p className={cn('text-sm py-2 pr-3', P.muted)}>Nog geen geluiden. Ga terug en verzamel er een paar.</p>
          )}
          {librarySounds.map((sound) => (
            <div
              key={sound.id}
              title={t('studio.dragToTimeline')}
              onPointerDown={(e) => startChipDrag(e, {
                sound,
                onDrop: ({ track, startBeat }) => addClip(sound, track, startBeat),
              })}
              className={cn(
                'flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border sm:border-2 transition-all duration-150 select-none shrink-0 cursor-grab active:cursor-grabbing hover:shadow-md touch-none',
                P.chip,
              )}
            >
              <div className="flex items-center justify-center w-3 sm:w-4 -ml-0.5 sm:-ml-1 text-neutral-400 pointer-events-none">
                <GripVertical className="w-3 h-4 sm:w-4 sm:h-5" aria-hidden="true" />
              </div>
              <div className="w-1 sm:w-2 h-4 sm:h-8 rounded-full shrink-0" style={{ backgroundColor: sound.color }} />
              <SampleIcon name={sound.icon} size={20} className={P.chipText} />
              <span className={cn('text-xs sm:text-sm font-medium whitespace-nowrap', P.chipText)}>{sound.label}</span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => togglePreview(sound)}
                aria-pressed={previewId === sound.id}
                title={t('recorder.preview')}
                className={cn(
                  'ml-0.5 sm:ml-1 w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-colors',
                  previewId === sound.id ? 'bg-accent-400 text-accent-900 hover:bg-accent-500' : P.previewBtn,
                )}
              >
                {previewId === sound.id ? <Square className="w-3 h-3" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}

          {/* Sequence-chips: gestippeld; klik = bewerken, slepen = plaatsen */}
          {sequences.map((seq) => {
            const sound = seqSound(seq);
            return (
              <div
                key={seq.id}
                title="Klik om te bewerken · sleep naar de tijdlijn"
                onPointerDown={(e) => startChipDrag(e, {
                  sound,
                  onTap: () => openSequence(seq.id),
                  onDrop: ({ track, startBeat }) => addClip(sound, track, startBeat),
                })}
                className={cn(
                  'flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border sm:border-2 border-dashed transition-all duration-150 select-none shrink-0 cursor-grab active:cursor-grabbing hover:shadow-md touch-none',
                  dark ? 'bg-brand-700' : 'bg-accent-50',
                  seq.id === seqPanelId && 'ring-2 ring-accent-400',
                )}
                style={{ borderColor: seq.color }}
              >
                <GripVertical className="w-4 h-5 -ml-1 pointer-events-none" style={{ color: seq.color }} aria-hidden="true" />
                <Grid3x3 className="w-4 h-4 shrink-0" style={{ color: seq.color }} aria-hidden="true" />
                <span className={cn('text-xs sm:text-sm font-medium whitespace-nowrap', P.chipText)}>{seq.name}</span>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addSequence}
            className={cn(
              'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border sm:border-2 border-dashed border-accent-400 transition-colors select-none shrink-0',
              dark ? 'text-accent-300 hover:bg-white/10' : 'text-accent-700 hover:bg-accent-50',
            )}
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
            <Grid3x3 className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{t('sequencer.studio.addSequence')}</span>
          </button>
        </div>
      </div>

      {/* Sequencer-paneel vervangt de tijdlijnzone (zoals productie) */}
      {seqPanel && (
        <SequencerPanel
          key={seqPanel.id}
          library={bag}
          sequence={seqPanel}
          playing={seqPlaying}
          dark={dark}
          getBuffer={async (id) => {
            const sound = bag.find((b) => b.id === id);
            return sound ? resolveBuffer(toLite(sound)) : null;
          }}
          onClose={(seq) => {
            setSeqPlaying(false);
            setSequences((prev) => prev.map((sq) => (sq.id === seq.id ? seq : sq)));
            setSeqPanelId(null);
          }}
          onDelete={(id) => {
            setSeqPlaying(false);
            setSequences((prev) => prev.filter((sq) => sq.id !== id));
            setClips((prev) => prev.filter((c) => c.soundId !== `seq:${id}`));
            setSeqPanelId(null);
          }}
        />
      )}

      {/* Tijdlijn — zoals productie */}
      <div className={cn('flex-col shrink-0 max-h-[50dvh]', seqPanel ? 'hidden' : 'flex')} role="region" aria-label={t('studio.timeline')}>
        <div className={cn('flex items-center gap-2 px-2 sm:px-4 py-1 border-b', P.bar)}>
          <h2 className={cn('text-xs font-bold uppercase tracking-wide shrink-0', P.muted)}>{t('studio.timeline')}</h2>

          {/* Midden: bewerkbalk van de geselecteerde clip */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            {selected && selectedSound && (
              <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedSound.color }} />
                <SampleIcon name={selectedSound.icon} size={14} className={P.chipText} />
                <span className={cn('text-xs sm:text-sm font-medium truncate', P.chipText)}>{selectedSound.label}</span>
                <span className={cn('text-xs tabular-nums mr-1', P.muted)}>{clipSeconds(selected).toFixed(1)}s</span>
                <button type="button" title="Label (niet in mockup)" className={cn(ICON_BTN, P.icon)}><Tag size={16} /></button>
                {selected.soundId.startsWith('seq:') ? (
                  <button
                    type="button"
                    title="Patroon bewerken"
                    onClick={() => {
                      const seq = sequences.find((sq) => `seq:${sq.id}` === selected.soundId);
                      if (seq) openSequence(seq.id);
                    }}
                    className={cn(ICON_BTN, P.icon)}
                  >
                    <Grid3x3 size={16} />
                  </button>
                ) : (
                  <button type="button" title="Knippen (niet in mockup)" className={cn(ICON_BTN, P.icon)}><Scissors size={16} /></button>
                )}
                <button type="button" title="Dupliceren" onClick={duplicate} className={cn(ICON_BTN, P.icon)}><Copy size={16} /></button>
                <button type="button" title="Volume (niet in mockup)" className={cn(ICON_BTN, P.icon)}><Volume2 size={16} /></button>
                {!selected.soundId.startsWith('seq:') && (
                  <button
                    type="button"
                    title="Vervormen"
                    onClick={() => { stopAll(); setFxClipId(selected.id); }}
                    className={cn(ICON_BTN, hasFx(selected.fx) ? 'bg-accent-100 text-accent-700' : P.icon)}
                  >
                    <Sparkles size={16} />
                  </button>
                )}
                <button
                  type="button"
                  title={t('common.delete')}
                  onClick={() => { commit(clips.filter((c) => c.id !== selected.id)); setSelectedId(null); }}
                  className={cn(ICON_BTN, 'text-error-500 hover:bg-error-50')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Rechts: spiegel (nieuw) + bestaande knoppen */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              title="Luisterspiegel"
              aria-label="Luisterspiegel"
              disabled={clips.length === 0}
              onClick={() => { stopAll(); setMirror(true); }}
              className={cn(ICON_BTN, dark ? 'text-accent-300 hover:bg-white/10' : 'text-accent-600 hover:bg-accent-100/60')}
            >
              <FlipHorizontal2 size={16} />
            </button>
            <span className={cn('w-px h-5 mx-1', dark ? 'bg-brand-600' : 'bg-neutral-200')} />
            <button type="button" title="Markeer deel (niet in mockup)" className={cn(ICON_BTN, P.icon)}><Flag size={16} /></button>
            <button type="button" title="Wis tijdlijn" disabled={clips.length === 0} onClick={() => { commit([]); setSelectedId(null); }} className={cn(ICON_BTN, P.icon)}><Eraser size={16} /></button>
            <button type="button" title="8 maten korter (niet in mockup)" className={cn(ICON_BTN, P.icon, 'text-xs font-bold tabular-nums')}>−8</button>
            <button type="button" title="8 maten langer (niet in mockup)" className={cn(ICON_BTN, P.icon, 'text-xs font-bold tabular-nums')}>+8</button>
            <button type="button" title="Uitzoomen (niet in mockup)" className={cn(ICON_BTN, P.icon, 'hidden sm:flex')}><ZoomOut size={16} /></button>
            <button type="button" title="Volledige tijdlijn" className={cn(ICON_BTN, 'bg-accent-50 text-accent-600 hidden sm:flex')}><Maximize2 size={16} /></button>
            <button type="button" title="Inzoomen (niet in mockup)" className={cn(ICON_BTN, P.icon, 'hidden sm:flex')}><ZoomIn size={16} /></button>
            <button
              type="button"
              title="Ongedaan maken"
              disabled={history.length === 0}
              onClick={() => {
                const prev = history[history.length - 1];
                setHistory((h) => h.slice(0, -1));
                setClips(prev);
                setSelectedId(null);
              }}
              className={cn(ICON_BTN, P.icon)}
            >
              <Undo2 size={16} />
            </button>
            <button type="button" title="Opnieuw (niet in mockup)" disabled className={cn(ICON_BTN, P.icon)}><Redo2 size={16} /></button>
          </div>
        </div>

        <div className="relative overflow-y-auto overscroll-contain min-h-0 flex-1" onClick={() => setSelectedId(null)}>
          {/* Liniaal met maatnummers */}
          <div className={cn('sticky top-0 z-10 flex h-5 border-b text-[11px] font-semibold', P.ruler)}>
            <div className="w-6 shrink-0" />
            <div className="relative flex-1">
              {Array.from({ length: BARS }, (_, i) => (
                <span key={i} className="absolute top-0.5 pl-1 tabular-nums" style={{ left: `${(i / BARS) * 100}%` }}>{i + 1}</span>
              ))}
            </div>
          </div>

          <div className="relative">
            {Array.from({ length: TRACKS }, (_, track) => (
              <div key={track} className={cn('relative h-12 border-b', dark ? 'border-brand-700' : 'border-neutral-200', track % 2 ? P.laneAlt : P.lane)}>
                <div className={cn('absolute left-0 top-0 bottom-0 w-6 flex flex-col items-center justify-center border-r z-[1] gap-0.5 text-[11px] font-bold', P.gutter)}>
                  {track + 1}
                  <Volume2 size={10} />
                </div>
                <div
                  data-mock-track={track}
                  data-beats={TOTAL_BEATS}
                  className="absolute left-6 right-0 top-0 bottom-0 data-[drop-hover=true]:bg-accent-400/15"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${P.gridBar} 1px, transparent 1px), linear-gradient(to right, ${P.grid} 1px, transparent 1px)`,
                    backgroundSize: `${100 / BARS}% 100%, ${100 / TOTAL_BEATS}% 100%`,
                  }}
                >
                  {clips.filter((c) => c.track === track).map((clip) => {
                    const sound = soundFor(clip.soundId);
                    if (!sound) return null;
                    const widthBeats = Math.min(clipSeconds(clip) / BEAT_SEC, TOTAL_BEATS - clip.startBeat);
                    const isSeq = clip.soundId.startsWith('seq:');
                    return (
                      <div
                        key={clip.id}
                        role="listitem"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => startChipDrag(e, {
                          sound,
                          onTap: () => setSelectedId(clip.id),
                          onDrop: (target) => {
                            commit(clips.map((c) => (c.id === clip.id ? { ...c, track: target.track, startBeat: target.startBeat } : c)));
                            setSelectedId(clip.id);
                          },
                        })}
                        className={cn(
                          'absolute top-1 bottom-1 rounded-lg flex items-center gap-1 px-1.5 overflow-hidden cursor-grab active:cursor-grabbing touch-none shadow-sm text-xs font-bold',
                          clip.id === selectedId && 'ring-2 ring-offset-1 ring-brand-900 shadow-lg',
                        )}
                        style={{
                          left: `${(clip.startBeat / TOTAL_BEATS) * 100}%`,
                          width: `${(widthBeats / TOTAL_BEATS) * 100}%`,
                          backgroundColor: sound.color,
                          color: textOn(sound.color),
                          backgroundImage: isSeq
                            ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 6px, transparent 6px 12px)'
                            : undefined,
                        }}
                      >
                        {isSeq ? <Grid3x3 size={14} className="shrink-0" /> : <SampleIcon name={sound.icon} size={14} className="shrink-0" />}
                        <span className="truncate">{sound.label}</span>
                        {hasFx(clip.fx) && <Sparkles size={12} className="shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {clips.length === 0 && (
              <p className={cn('absolute inset-0 flex items-center justify-center text-sm italic pointer-events-none', P.muted)}>
                Sleep geluiden naar de tijdlijn
              </p>
            )}

            {/* Afspeellijn */}
            <div className="absolute top-0 bottom-0 left-6 right-0 pointer-events-none">
              <div ref={playheadRef} className="absolute top-0 bottom-0 w-0.5 bg-error-500" style={{ left: 0 }}>
                <span className="absolute -top-1 -left-[3px] w-2 h-2 rounded-full bg-error-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transport — zoals productie */}
      <div className={cn('flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-t', P.bar)}>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!seqPanel && clips.length === 0}
          aria-label={(seqPanel ? seqPlaying : playing) ? 'Pauzeren' : 'Afspelen'}
          className="w-12 h-12 rounded-full bg-accent-500 hover:bg-accent-600 text-white flex items-center justify-center shadow-md transition-colors disabled:bg-neutral-300"
        >
          {(seqPanel ? seqPlaying : playing) ? <Pause className="w-[22px] h-[22px]" /> : <Play className="w-[22px] h-[22px]" />}
        </button>
        <button type="button" onClick={stopAll} aria-label="Terug" className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-colors', P.round)}>
          <SkipBack className="w-[18px] h-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setRepeat((r) => !r)}
          aria-pressed={repeat}
          aria-label="Herhalen"
          className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-colors', repeat ? 'bg-accent-400 text-accent-900' : P.round)}
        >
          <Repeat className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* --- Modals --- */}

      {fxClip && fxSound && (
        <FxModal
          sound={fxSound}
          initial={fxClip.fx}
          onClose={() => setFxClipId(null)}
          onApply={(fx, buffer) => {
            if (buffer) fxBuffers.current.set(fxClip.id, buffer);
            else fxBuffers.current.delete(fxClip.id);
            commit(clips.map((c) => (c.id === fxClip.id ? { ...c, fx: hasFx(fx) ? fx : undefined } : c)));
            setFxVersion((v) => v + 1);
            setFxClipId(null);
          }}
        />
      )}

      {mirror && (
        <MirrorModal
          clips={mirrorClips}
          tracks={clips.map((c) => c.track)}
          lookup={(id) => soundFor(id)}
          questions={questions}
          onClose={() => setMirror(false)}
        />
      )}
    </div>
  );
}
