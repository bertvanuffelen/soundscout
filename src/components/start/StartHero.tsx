/**
 * StartHero — statisch, licht beeld voor het startscherm (V2).
 *
 * Bewust GEEN audio, geen Tone.js, geen canvas-lus: de start moet binnen
 * 2 seconden bruikbaar zijn op een school-Chromebook. Het beeld is een
 * verkleinde kopie van de kinderboerderij (public/images/hero/, gemaakt met
 * sips/cwebp) in een vaste beeldverhouding (geen layout shift). Een paar
 * stippen en een mini-tijdlijn in HTML/CSS laten zien wat de app doet; ze zijn
 * puur decoratief (aria-hidden, niet klikbaar). De stippen pulseren zacht
 * (CSS, uit bij prefers-reduced-motion).
 */

import { useTranslation } from 'react-i18next';
import { Bird, Dog, Rabbit, Smile, type LucideIcon } from 'lucide-react';

/** Verhouding van het bronbeeld (1920 × 1072). */
const HERO_W = 1920;
const HERO_H = 1072;
const HERO_SIZES = [640, 1024, 1600] as const;
const heroSrcSet = (ext: 'jpg' | 'webp') =>
  HERO_SIZES.map((w) => `/images/hero/boerderij-${w}.${ext} ${w}w`).join(', ');
/** Desktop: rechterkolom (~58vw); kort liggend scherm: halve breedte; anders volle breedte. */
const HERO_IMG_SIZES = '(min-width: 1024px) 58vw, (min-width: 640px) and (max-height: 540px) 50vw, 100vw';

/** Stippen op de echte hotspot-plekken van de kinderboerderij (basis-manifest). */
const DOTS: Array<{ x: number; y: number; color: string; Icon: LucideIcon; delay: string }> = [
  { x: 24.6, y: 36.3, color: '#FFC107', Icon: Smile, delay: '0s' },
  { x: 62.7, y: 40.7, color: '#795548', Icon: Rabbit, delay: '0.8s' },
  { x: 85.3, y: 72, color: '#FF9800', Icon: Dog, delay: '1.6s' },
  { x: 89.8, y: 26.7, color: '#E74C3C', Icon: Bird, delay: '2.4s' },
];

/** Mini-tijdlijn: [spoor, start %, breedte %, kleur] — dezelfde kleuren als de stippen. */
const BLOCKS: Array<[number, number, number, string]> = [
  [0, 2, 22, '#E74C3C'],
  [0, 50, 18, '#E74C3C'],
  [1, 12, 26, '#FF9800'],
  [1, 64, 22, '#795548'],
  [2, 30, 16, '#FFC107'],
  [2, 72, 24, '#FFC107'],
];

export function StartHero() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 min-w-0 w-full">
      <div
        className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-brand-800 ring-1 ring-white/15 shadow-2xl"
        style={{ aspectRatio: `${HERO_W} / ${HERO_H}` }}
      >
        <picture>
          <source type="image/webp" srcSet={heroSrcSet('webp')} sizes={HERO_IMG_SIZES} />
          <img
            src="/images/hero/boerderij-1024.jpg"
            srcSet={heroSrcSet('jpg')}
            sizes={HERO_IMG_SIZES}
            width={1600}
            height={893}
            alt={t('start.heroAlt')}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>

        <div className="absolute inset-0" aria-hidden="true">
          {DOTS.map(({ x, y, color, Icon, delay }) => (
            <span
              key={`${x}-${y}`}
              className="absolute flex items-center justify-center rounded-full border-2 border-white/90 text-white shadow-lg w-8 h-8 sm:w-11 sm:h-11 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%`, backgroundColor: color }}
            >
              <span
                className="start-hero-pulse absolute inset-0 rounded-full ring-4 ring-white/60"
                style={{ animationDelay: delay }}
              />
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
            </span>
          ))}
        </div>
      </div>

      {/* Mini-tijdlijn (decoratief): drie sporen + rode afspeellijn */}
      <div
        className="relative rounded-2xl bg-white/10 ring-1 ring-white/15 p-2.5 sm:p-3 flex flex-col gap-1.5 short:hidden"
        aria-hidden="true"
      >
        {[0, 1, 2].map((track) => (
          <div key={track} className="relative h-3 sm:h-4 rounded-full bg-white/5">
            {BLOCKS.filter(([tr]) => tr === track).map(([, start, width, color]) => (
              <span
                key={start}
                className="absolute inset-y-0 rounded-full"
                style={{ left: `${start}%`, width: `${width}%`, backgroundColor: color }}
              />
            ))}
          </div>
        ))}
        <span className="absolute top-1.5 bottom-1.5 w-0.5 rounded-full bg-error-500" style={{ left: '44%' }} />
      </div>
    </div>
  );
}
