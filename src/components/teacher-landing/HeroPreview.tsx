/**
 * HeroPreview — gestileerde placeholder-visual voor de hero, gestuurd door de
 * actieve compositievorm (sectie 2 stuurt dit via lokale state).
 *
 * Stap 1: puur CSS/Tailwind met bestaande tokens + de mode-kleuren, geen echte
 * screenshots of assets. Decoratief → aria-hidden.
 */

import type { ComposeVariant } from './composeVariants';

interface HeroPreviewProps {
  variant: ComposeVariant;
}

export function HeroPreview({ variant }: HeroPreviewProps) {
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

// --- Praatplaat: één beeld met genummerde plekken ---
function PraatplaatPreview() {
  const spots = [
    { n: 1, top: '28%', left: '22%' },
    { n: 2, top: '58%', left: '48%' },
    { n: 3, top: '38%', left: '74%' },
  ];
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-b from-teal-100 via-teal-50 to-teal-200">
      {/* Suggestie van een landschap */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-teal-300/50" />
      <div className="absolute left-[15%] bottom-[30%] w-10 h-10 rounded-full bg-teal-200/70" />
      <div className="absolute right-[18%] top-[14%] w-8 h-8 rounded-full bg-white/60" />
      {spots.map((s) => (
        <div
          key={s.n}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-500 text-white text-sm font-bold flex items-center justify-center shadow-md ring-2 ring-white"
          style={{ top: s.top, left: s.left }}
        >
          {s.n}
        </div>
      ))}
    </div>
  );
}

// --- Storyboard: filmstrip van 3–4 scènes ---
function StoryboardPreview() {
  const scenes = [0, 1, 2, 3];
  return (
    <div className="flex items-center gap-2 h-full">
      {scenes.map((i) => (
        <div
          key={i}
          className="flex-1 h-full rounded-lg bg-purple-50 border border-purple-200 flex flex-col overflow-hidden"
        >
          {/* sprocket-rand */}
          <div className="flex justify-around py-1 bg-purple-200/50">
            {[0, 1, 2].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-sm bg-white/80" />
            ))}
          </div>
          <div className="flex-1 bg-gradient-to-br from-purple-100 to-purple-200/70" />
          {/* mini golfje = soundtrack per scène */}
          <div className="flex items-end justify-center gap-0.5 h-5 px-1 pb-1">
            {[3, 6, 4, 8, 5, 7, 3].map((h, idx) => (
              <span
                key={idx}
                className="w-0.5 rounded-full bg-purple-400"
                style={{ height: `${h * 2}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Vrij: tijdlijn met clips, zonder beeld ---
function VrijPreview() {
  // rij-index → clips als [startPct, breedtePct]
  const rows: Array<Array<[number, number]>> = [
    [[4, 26], [40, 18], [72, 22]],
    [[12, 20], [56, 30]],
    [[0, 16], [30, 22], [66, 16], [86, 12]],
    [[20, 34], [64, 20]],
  ];
  const clipColors = ['bg-accent-300', 'bg-teal-300', 'bg-purple-300', 'bg-accent-400'];
  return (
    <div className="relative w-full h-full rounded-xl bg-brand-900 p-2 overflow-hidden">
      {/* beat-gridlijnen */}
      <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="w-px h-full bg-white/5" />
        ))}
      </div>
      <div className="relative flex flex-col gap-1.5 h-full">
        {rows.map((clips, r) => (
          <div key={r} className="relative flex-1 rounded-md bg-white/5">
            {clips.map(([start, width], c) => (
              <div
                key={c}
                className={`absolute top-1/2 -translate-y-1/2 h-[70%] rounded ${clipColors[r % clipColors.length]} shadow-sm`}
                style={{ left: `${start}%`, width: `${width}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
