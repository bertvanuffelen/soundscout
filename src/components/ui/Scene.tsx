/**
 * Scene — dé manier om een beeld met dingen erop te tonen
 * (V2 Fase 1, v2-architecture-proposal.md §6.1 regel 1).
 *
 * Vult de ruimte die de ouder geeft met een kader in een vaste verhouding
 * (standaard 16:9) dat ALTIJD past: de kleinste van "volle breedte" en
 * "hoogte × verhouding". Het rekent in container-eenheden, dus met de ruimte
 * die het écht krijgt — niet met de vensterhoogte en geen vaste header-maten.
 *
 * Alles wat je erin zet (hotspots, kaartmarkers, een gekozen plek) positioneer
 * je in percentages van het kader; die kloppen dan op elk scherm.
 *
 * Gebruik:
 *   <div className="h-dvh flex flex-col">
 *     <header className="shrink-0">…</header>
 *     <Scene className="p-2">            ← neemt de rest van de hoogte
 *       <img className="absolute inset-0 w-full h-full object-cover" … />
 *       <button style={{ left: '40%', top: '30%' }} className="absolute" />
 *     </Scene>
 *   </div>
 *
 * De ouder moet een flex-container zijn met een begrensde hoogte.
 */

import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

interface SceneProps {
  children: ReactNode;
  /** Breedte ÷ hoogte van het kader. Standaard 16/9. */
  ratio?: number;
  /** Klassen voor het buitenvlak (de beschikbare ruimte), bv. padding. */
  className?: string;
  /** Klassen voor het kader zelf, bv. afronding en schaduw. */
  frameClassName?: string;
  frameStyle?: CSSProperties;
  frameRef?: Ref<HTMLDivElement>;
  /** Extra attributen op het kader (klik-handlers, role, tabIndex, aria-*). */
  frameProps?: HTMLAttributes<HTMLDivElement>;
  /** Extra's om het kader heen die mee moeten schalen (bv. een witte kaart). */
  wrapFrame?: (frame: ReactNode) => ReactNode;
}

export function Scene({
  children, ratio = 16 / 9, className, frameClassName, frameStyle, frameRef, frameProps, wrapFrame,
}: SceneProps) {
  const frame = (
    <div
      {...frameProps}
      ref={frameRef}
      className={cn('relative w-full overflow-hidden', frameClassName)}
      style={{ aspectRatio: String(ratio), ...frameStyle }}
    >
      {children}
    </div>
  );

  return (
    <div className={cn('flex-1 min-h-0 min-w-0 flex items-center justify-center [container-type:size]', className)}>
      <div className="w-full" style={{ maxWidth: `min(100cqw, calc(100cqh * ${ratio}))` }}>
        {wrapFrame ? wrapFrame(frame) : frame}
      </div>
    </div>
  );
}

export default Scene;
