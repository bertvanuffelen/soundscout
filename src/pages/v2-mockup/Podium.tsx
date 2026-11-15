/**
 * Podium — de Luisterspiegel is hier ONDERDEEL van het podium (Berts besluit):
 * "Naar Podium" gaat direct door, zonder blokkerende modal. Links luister je
 * naar je soundscape; rechts staat de spiegel (vormkaart + vragen), vlak vóór
 * het inleveren. Inleveren kan altijd — de vragen zijn over te slaan.
 *
 * Mockup: het echte podium (opslaan, delen, feedback, klasgenoten) blijft zoals
 * het is; dit scherm toont alleen wáár de Luisterspiegel erin komt.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, FlipHorizontal2, Mic2, Pause, Pencil, Play, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { MiniLoop, getLevel, stopPreview, subscribeFrame } from './liteAudio';
import type { MirrorQuestion } from './engine';
import { MirrorContent } from './MirrorModal';
import type { StagePayload } from './Studio';

interface Props {
  payload: StagePayload;
  questions: MirrorQuestion[];
  mirrorEnabled: boolean;
  onBack: () => void;
  onRestart: () => void;
}

export default function Podium({ payload, questions, mirrorEnabled, onBack, onRestart }: Props) {
  const [playing, setPlaying] = useState(false);
  const [wantsChange, setWantsChange] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const loop = useMemo(() => new MiniLoop(), []);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loop.configure({ loopBeats: payload.loopBeats, repeat: false, onEnded: () => setPlaying(false) });
    loop.setContent(payload.loopClips, payload.liteSounds);
    return () => {
      loop.stop();
      stopPreview();
    };
  }, [loop, payload]);

  // Podiumlicht ademt mee met het geluid (direct naar de DOM)
  useEffect(() => {
    let smooth = 0;
    return subscribeFrame(() => {
      const el = ringRef.current;
      if (!el) return;
      smooth += (getLevel() - smooth) * 0.2;
      el.style.transform = `scale(${1 + smooth * 0.35})`;
      el.style.boxShadow = `0 0 ${40 + smooth * 140}px ${10 + smooth * 50}px rgba(251,191,36,${0.18 + smooth * 0.5})`;
    });
  }, []);

  const togglePlay = () => {
    if (loop.isPlaying) {
      loop.stop();
      setPlaying(false);
    } else {
      void loop.play();
      setPlaying(true);
    }
  };

  const submit = () => {
    loop.stop();
    setPlaying(false);
    setSubmitted(true);
  };

  const hasContent = payload.mirrorClips.length > 0;

  return (
    <div className="relative min-h-dvh bg-brand-900 text-white flex flex-col overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_30%_0%,var(--color-stage-light-purple),transparent_55%),radial-gradient(circle_at_0%_100%,var(--color-stage-light-cyan),transparent_45%),radial-gradient(circle_at_70%_100%,var(--color-stage-light-amber),transparent_45%)]" />

      <div className="relative flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
        <Button variant="secondary" size="sm" onClick={() => { loop.stop(); onBack(); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar de studio
        </Button>
        <h1 className="flex items-center gap-2 text-base sm:text-lg font-extrabold tracking-tight">
          <Mic2 size={18} className="text-accent-400" /> Podium
        </h1>
        <span className="w-24" />
      </div>

      <div className={cn(
        'relative flex-1 grid gap-6 items-center px-4 sm:px-8 pb-8 w-full max-w-[1400px] mx-auto',
        mirrorEnabled && !submitted ? 'grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : 'grid-cols-1',
      )}>
        {/* Het podium zelf: luisteren */}
        <div className="flex flex-col items-center gap-6 py-6">
          {submitted ? (
            <>
              <span className="w-28 h-28 rounded-full bg-accent-400 text-brand-900 flex items-center justify-center shadow-[0_0_60px_10px_rgba(251,191,36,0.35)] animate-[mock-pop_420ms_ease-out]">
                <Check size={56} strokeWidth={3} />
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight">Ingeleverd!</h2>
              <p className="text-brand-200 text-lg">Je docent kan je soundscape nu beluisteren.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={() => setSubmitted(false)}>Terug naar het podium</Button>
                <Button variant="primary" onClick={onRestart}>Nieuwe soundscape</Button>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div ref={ringRef} className="absolute inset-0 rounded-full bg-accent-400/20" />
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!hasContent}
                  aria-label={playing ? 'Pauzeren' : 'Luister naar je soundscape'}
                  className="relative w-32 h-32 rounded-full bg-accent-400 hover:bg-accent-300 text-brand-900 flex items-center justify-center shadow-2xl transition-transform active:scale-95 disabled:opacity-40"
                >
                  {playing ? <Pause size={52} fill="currentColor" /> : <Play size={52} fill="currentColor" className="ml-2" />}
                </button>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-extrabold tracking-tight">Jouw soundscape</h2>
                <p className="text-brand-200 mt-1">Luister nog één keer. Klaar? Lever in.</p>
              </div>
              {!mirrorEnabled && (
                <button type="button" onClick={submit} className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-accent-400 hover:bg-accent-300 text-brand-900 text-lg font-extrabold shadow-lg">
                  <Send size={20} /> Inleveren
                </button>
              )}
            </>
          )}
        </div>

        {/* De Luisterspiegel: onderdeel van het podium, vlak vóór inleveren */}
        {mirrorEnabled && !submitted && (
          <div className="rounded-3xl bg-white text-text-main shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[calc(100dvh-6rem)]">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                <FlipHorizontal2 size={22} />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">Luisterspiegel</h2>
                <p className="text-sm text-text-muted">Zo ziet jouw soundscape eruit.</p>
              </div>
            </div>

            <div className="overflow-y-auto min-h-0 -mx-1 px-1">
              <MirrorContent
                clips={payload.mirrorClips}
                tracks={payload.tracks}
                lookup={(id) => payload.sounds[id]}
                questions={questions}
                onWantsChange={setWantsChange}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
              {wantsChange && (
                <button type="button" onClick={() => { loop.stop(); onBack(); }} className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full bg-accent-400 hover:bg-accent-300 text-brand-900 font-extrabold">
                  <Pencil size={18} /> Terug naar de studio
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full font-extrabold',
                  wantsChange ? 'bg-white border-2 border-brand-900 text-brand-900 hover:bg-neutral-100' : 'bg-accent-400 hover:bg-accent-300 text-brand-900',
                )}
              >
                <Send size={18} /> Inleveren
              </button>
            </div>
            <p className="text-xs text-text-muted text-center -mt-1">Je mag de vragen overslaan en direct inleveren.</p>
          </div>
        )}
      </div>
    </div>
  );
}
