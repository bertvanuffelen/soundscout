/**
 * PraatplaatSelectScreen - Leerling kiest positie op de praatplaat (#72)
 *
 * Flow: Leerling voert klascode in → actieve praatplaat gevonden → dit scherm.
 * De leerling klikt op een plek op de afbeelding om een positie te kiezen.
 * Na bevestiging gaat de leerling naar de kaart om samples te verzamelen.
 *
 * Positie wordt opgeslagen als genormaliseerde x,y (0-1) in appStore.
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/Button';
import { praatplaatToStoryboard } from '../../utils/praatplaatStoryboard';

export function PraatplaatSelectScreen() {
  const { t } = useTranslation();
  const activePraatplaat = useAppStore((s) => s.activePraatplaat);
  const setPraatplaatPosition = useAppStore((s) => s.setPraatplaatPosition);
  const setActiveStoryboard = useAppStore((s) => s.setActiveStoryboard);
  const setComposeMode = useAppStore((s) => s.setComposeMode);
  const goToMap = useAppStore((s) => s.goToMap);
  const goToStart = useAppStore((s) => s.goToStart);

  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Verwerk klik op afbeelding
  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const el = imageRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if ('touches' in e) {
        // Touch event
        const touch = e.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        // Mouse event
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;

      // Clamp to 0-1
      setSelectedPos({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      });
    },
    []
  );

  // Keyboard support: Enter/Space selecteert het midden van de afbeelding (UX-A11Y-1)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Selecteer het midden als er nog geen positie is, anders bevestig de huidige
        if (!selectedPos) {
          setSelectedPos({ x: 0.5, y: 0.5 });
        }
      }
    },
    [selectedPos]
  );

  // Bevestig positie, stel storyboard in, en ga naar kaart
  const handleConfirm = useCallback(() => {
    if (!selectedPos || !activePraatplaat) return;
    setPraatplaatPosition(selectedPos);
    // Stel praatplaat in als storyboard zodat de afbeelding in de studio te zien is
    setActiveStoryboard(praatplaatToStoryboard(activePraatplaat));
    setComposeMode('image');
    goToMap();
  }, [selectedPos, activePraatplaat, setPraatplaatPosition, setActiveStoryboard, setComposeMode, goToMap]);

  if (!activePraatplaat) {
    // Fallback — zou niet moeten voorkomen
    goToStart();
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-black/20">
        <button
          onClick={goToStart}
          className="text-white/70 hover:text-white text-sm flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <h1 className="text-white font-semibold text-sm sm:text-base truncate max-w-[60%] text-center">
          {activePraatplaat.name}
        </h1>
        <div className="w-16" /> {/* Spacer */}
      </header>

      {/* Instructie */}
      <div className="text-center px-4 py-3">
        <p className="text-white/80 text-sm sm:text-base">
          {selectedPos
            ? t('praatplaat.select.confirmHint')
            : t('praatplaat.select.instruction')
          }
        </p>
      </div>

      {/* Afbeelding met klik-handler */}
      <div className="flex-1 flex items-center justify-center px-2 pb-2 min-h-0">
        <div
          ref={imageRef}
          className="relative w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl cursor-crosshair select-none"
          onClick={handleImageClick}
          onTouchStart={handleImageClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          aria-label={t('praatplaat.select.imageAria')}
        >
          <img
            src={activePraatplaat.imageUrl}
            alt={activePraatplaat.name}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {/* Geselecteerde positie marker */}
          {selectedPos && (
            <div
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
              style={{
                left: `${selectedPos.x * 100}%`,
                top: `${selectedPos.y * 100}%`,
              }}
            >
              {/* Pin */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent-500 border-3 border-white shadow-lg flex items-center justify-center animate-bounce">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {/* Triangle pointer */}
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-accent-500 -mt-0.5" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer met bevestigknop */}
      <div className="px-4 pb-6 sm:pb-8 flex justify-center">
        {selectedPos ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleConfirm}
            className="min-w-[200px]"
          >
            <Check className="w-5 h-5 mr-2" />
            {t('praatplaat.select.confirm')}
          </Button>
        ) : (
          <p className="text-white/40 text-sm">
            {t('praatplaat.select.tapHint')}
          </p>
        )}
      </div>
    </div>
  );
}

export default PraatplaatSelectScreen;
