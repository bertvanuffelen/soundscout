/**
 * useDarkPage — de pagina zelf (<html>) donker maken zolang een donker scherm
 * open is (startscherm, locatie). Zonder dit toont het "doorveren" voorbij de
 * rand van de pagina (iPad Safari, Chrome op de Mac) de witte basis van
 * <html> (stagingtest 16-11). Andere schermen zijn nog licht, dus bij
 * verlaten zet de hook alles terug.
 *
 * `lockScroll`: voor schermen van precies schermhoogte (locatie). Zet ook het
 * doorveren en het verschuiven van de pagina uit; scrollen BINNEN het scherm
 * (bijv. de recorderbalk) blijft werken.
 */

import { useEffect } from 'react';

export function useDarkPage({ lockScroll = false }: { lockScroll?: boolean } = {}): void {
  useEffect(() => {
    const root = document.documentElement;
    const previous = {
      backgroundColor: root.style.backgroundColor,
      overscrollBehavior: root.style.overscrollBehavior,
      overflow: root.style.overflow,
    };
    root.style.backgroundColor = 'var(--color-brand-900)';
    if (lockScroll) {
      root.style.overscrollBehavior = 'none';
      root.style.overflow = 'hidden';
    }
    return () => {
      root.style.backgroundColor = previous.backgroundColor;
      root.style.overscrollBehavior = previous.overscrollBehavior;
      root.style.overflow = previous.overflow;
    };
  }, [lockScroll]);
}
