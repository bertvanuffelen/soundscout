/**
 * FittedImage — een afbeelding die zo groot mogelijk in haar kader past
 * (contain), met een overlay-laag die exact over het zichtbare beeld ligt.
 *
 * Waarom: met `h-full w-auto max-w-full object-contain` wordt het beeld op een
 * staand scherm binnen een vol-hoog img-element verkleind, waardoor overlays
 * met procent-posities (praatplaat-spots en -markers) naast het beeld vallen
 * (PRAATPLAAT-MOBIEL, gevonden 6-10). Hier meten we het kader en geven we de
 * wrapper de echte beeldmaat; de overlay (children) verschijnt pas zodra de
 * beeldverhouding bekend is, zodat een spot nooit op een verkeerde plek staat.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { fitContain } from '../../utils/fitContain';

interface FittedImageProps {
  src: string;
  alt: string;
  /** Extra classes voor de img (bv. afronding) */
  imageClassName?: string;
  /** Overlay met absolute procent-posities t.o.v. het beeld */
  children?: ReactNode;
}

export default function FittedImage({ src, alt, imageClassName, children }: FittedImageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  // Verhouding hoort bij één src: wisselt het beeld (volgende inzending), dan
  // telt de oude verhouding niet meer tot het nieuwe beeld geladen is.
  const [loaded, setLoaded] = useState<{ src: string; ratio: number } | null>(null);
  const ratio = loaded && loaded.src === src ? loaded.ratio : null;

  const readRatio = (img: HTMLImageElement) => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setLoaded({ src, ratio: img.naturalWidth / img.naturalHeight });
    }
  };

  // --- Kader meten (ook bij draaien, fullscreen, montagelijn open/dicht) ---
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Uit de cache geladen beelden kunnen 'complete' zijn vóór onLoad gekoppeld is
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) readRatio(img);
    // readRatio leest alleen src; src is de enige trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const size = ratio ? fitContain(frame.width, frame.height, ratio) : null;
  const fitted = size !== null && size.width > 0;

  return (
    <div ref={frameRef} className="relative h-full w-full flex items-center justify-center">
      <div
        className="relative"
        style={fitted ? { width: size.width, height: size.height } : { width: '100%', height: '100%' }}
      >
        <img
          src={src}
          alt={alt}
          ref={imgRef}
          draggable={false}
          onLoad={(e) => readRatio(e.currentTarget)}
          className={cn('w-full h-full object-contain', imageClassName)}
        />
        {fitted && children}
      </div>
    </div>
  );
}
