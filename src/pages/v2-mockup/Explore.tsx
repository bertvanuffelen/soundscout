/**
 * Explore — Kaart en Locatie in de PRODUCTIE-layout (Berts review, punt 3).
 *
 * Uiterlijk en knopplaatsing zijn overgenomen uit MapView / LocationScene /
 * RecorderBar. Onder de motorkap zit de <Scene>-primitive (§6.1):
 *  - kaart en plaat passen altijd in de ruimte (container-eenheden, geen 100vh);
 *  - kaartmarkers zijn nooit kleiner dan 44px;
 *  - Terug / titel / Naar Studio staan in één rij en kunnen elkaar niet raken.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin } from 'lucide-react';
import type { ThemeConfig } from '../../data/themes';
import { getMapBackgroundImage } from '../../data/themes';
import type { Location } from '../../types';
import { Button } from '../../components/ui/Button';
import { SampleIcon } from '../../utils/iconMap';
import { cn } from '../../utils/cn';
import { BAG_LIMIT, Scene, flyChip, toLite, type MockSound } from './shared';
import { previewSound, stopPreview } from './liteAudio';

// --- Kaart ---

interface MapProps {
  theme: ThemeConfig;
  bag: MockSound[];
  dark: boolean;
  onBack: () => void;
  onOpenLocation: (id: string) => void;
  onStudio: () => void;
}

export function MapScreen({ theme, bag, dark, onBack, onOpenLocation, onStudio }: MapProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className={cn('h-dvh flex flex-col overflow-hidden', dark ? 'bg-brand-900' : 'bg-bg-app')}>
      <div className={cn(
        'flex items-center justify-between gap-2 px-2 sm:px-4 py-2 sm:py-3 border-b shrink-0',
        dark ? 'bg-brand-800/90 border-brand-700' : 'bg-bg-surface border-border-subtle',
      )}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onBack}
          className={dark ? 'bg-brand-700 text-white border-brand-600 hover:bg-brand-600' : undefined}
        >
          <ArrowLeft className="w-4 h-4 mr-0.5 sm:mr-1" />
          {t('common.back')}
        </Button>
        <h1 className={cn('min-w-0 text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-1.5 sm:gap-2', dark ? 'text-white' : 'text-text-main')}>
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent-400 shrink-0" />
          <span className="truncate">{t('map.title')}</span>
        </h1>
        <Button variant="primary" size="sm" onClick={onStudio}>{t('studio.title')}</Button>
      </div>

      <div className="flex-1 min-h-0 flex p-2 sm:p-4">
        <div className={cn('flex-1 min-h-0 flex', !dark && 'bg-bg-surface rounded-2xl shadow-xl p-3')}>
          <Scene image={getMapBackgroundImage(theme.map, i18n.language)} alt={t('map.cityMapAlt')}>
            {theme.map.locationPositions.map((pos) => {
              const loc = theme.locations.find((l) => l.id === pos.locationId);
              if (!loc) return null;
              const total = loc.hotspots.length;
              const got = bag.filter((b) => loc.hotspots.some((h) => h.sampleId === b.id)).length;
              return (
                <button
                  key={pos.locationId}
                  type="button"
                  onClick={() => onOpenLocation(loc.id)}
                  title={t(loc.name)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded-xl"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <span
                    className={cn(
                      'rounded-2xl shadow-lg flex items-center justify-center border-4 transition-colors',
                      got === total && total > 0
                        ? 'bg-success-100 border-success-400 text-success-600'
                        : got > 0
                          ? 'bg-accent-100 border-accent-400 text-accent-600'
                          : 'bg-white border-brand-300 text-brand-600',
                    )}
                    // V2: nooit kleiner dan 44px (productie: 20px op smalle schermen)
                    style={{ width: 'clamp(44px, 6cqw, 64px)', height: 'clamp(44px, 6cqw, 64px)' }}
                  >
                    <MapPin className="w-6 h-6" />
                  </span>
                  <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-md text-sm font-semibold text-text-main whitespace-nowrap">
                    {t(loc.name)}
                  </span>
                  <span className="bg-white/90 px-2 py-0.5 rounded-full shadow text-xs font-semibold text-text-muted tabular-nums">
                    {got}/{total}
                  </span>
                </button>
              );
            })}
          </Scene>
        </div>
      </div>
    </div>
  );
}

// --- Locatie ---

interface LocationProps {
  location: Location;
  sounds: Map<string, MockSound>;
  bag: MockSound[];
  setBag: React.Dispatch<React.SetStateAction<MockSound[]>>;
  onBack: () => void;
  onStudio: () => void;
}

export function LocationScreen({ location, sounds, bag, setBag, onBack, onStudio }: LocationProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<string[]>([]);
  const full = bag.length + pending.length >= BAG_LIMIT;

  const collect = (sound: MockSound, fromEl: HTMLElement) => {
    if (full) return;
    void previewSound(toLite(sound));
    const slotIndex = bag.length + pending.length;
    setPending((p) => [...p, sound.id]);
    const arrive = () => {
      setPending((p) => p.filter((id) => id !== sound.id));
      setBag((prev) => (prev.some((b) => b.id === sound.id) ? prev : [...prev, sound]));
    };
    const slot = document.querySelector<HTMLElement>(`[data-recorder-slot="${slotIndex}"]`);
    if (slot) flyChip(sound, fromEl.getBoundingClientRect(), slot.getBoundingClientRect(), arrive);
    else arrive();
  };

  return (
    <div className="relative h-dvh bg-brand-900 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex px-2 sm:px-4 py-1 sm:py-2">
        <Scene image={location.backgroundImage} alt={t(location.name)}>
          {/* Zelfde plek en stijl als productie; één rij, dus nooit overlap */}
          <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 z-20 flex items-start justify-between gap-2">
            <Button onClick={() => { stopPreview(); onBack(); }} variant="secondary" size="sm" className="shadow-md shrink-0">
              {t('location.backToMap')}
            </Button>
            <h2 className="min-w-0 truncate text-sm sm:text-base font-extrabold tracking-tight text-white bg-black/30 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">
              {t(location.name)}
            </h2>
            <Button onClick={() => { stopPreview(); onStudio(); }} size="sm" className="shadow-md shrink-0">
              {t('location.toStudio')}
            </Button>
          </div>

          {/* Hotspots: zoals productie (halfdoorzichtig, pulserend, weg na verzamelen) */}
          {location.hotspots.map((hs) => {
            const sound = sounds.get(hs.sampleId);
            if (!sound) return null;
            if (bag.some((b) => b.id === sound.id) || pending.includes(sound.id)) return null;
            return (
              <button
                key={hs.id}
                type="button"
                disabled={full}
                aria-label={sound.label}
                title={sound.label}
                onPointerEnter={(e) => { if (!full && e.pointerType === 'mouse') void previewSound(toLite(sound)); }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') stopPreview(); }}
                onClick={(e) => collect(sound, e.currentTarget)}
                className={cn(
                  'hotspot absolute rounded-full',
                  full ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer transition-transform hover:scale-110 active:scale-95',
                )}
                style={{
                  left: `${hs.x}%`,
                  top: `${hs.y}%`,
                  width: '8%',
                  minWidth: 44,
                  minHeight: 44,
                  aspectRatio: '1 / 1',
                  translate: '-50% -50%',
                  backgroundColor: full ? 'transparent' : `${sound.color}20`,
                  border: `2px solid ${sound.color}`,
                  boxShadow: full ? 'none' : `0 0 8px 2px ${sound.color}40`,
                }}
              />
            );
          })}
        </Scene>
      </div>

      {/* Recorder-balk: identiek aan productie */}
      <div className="shrink-0 md:mx-2 md:mb-2 bg-bg-surface/95 backdrop-blur-sm border-t border-border-subtle md:border md:rounded-2xl md:shadow-lg px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
          <h3 className="text-xs sm:text-sm font-bold text-text-main">{t('recorder.title')}</h3>
          <span className="text-xs font-semibold text-text-muted bg-neutral-100 px-1.5 sm:px-2 py-0.5 rounded-full">
            {bag.length}/{BAG_LIMIT}
          </span>
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto">
          {Array.from({ length: BAG_LIMIT }, (_, i) => {
            const slot = bag[i];
            return (
              <div key={i} data-recorder-slot={i} className="flex-1 min-w-[48px] sm:min-w-[56px]">
                {slot ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => void previewSound(toLite(slot))}
                    onKeyDown={(e) => { if (e.key === 'Enter') void previewSound(toLite(slot)); }}
                    className="flex flex-col items-center gap-0.5 sm:gap-1 rounded-xl p-1.5 sm:p-2 transition-colors duration-150 cursor-pointer hover:bg-neutral-50 active:bg-neutral-100"
                    style={{ backgroundColor: `${slot.color}15`, border: `2px solid ${slot.color}` }}
                  >
                    <SampleIcon name={slot.icon} size={22} className="text-text-main" />
                    <span className="text-xs font-medium text-text-muted truncate w-full text-center leading-tight">{slot.label}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBag((prev) => prev.filter((b) => b.id !== slot.id)); }}
                      className="text-xs text-error-400 hover:text-error-600 font-semibold cursor-pointer transition-colors px-3 py-1.5 -mb-1 rounded-md hover:bg-error-50"
                    >
                      Verwijder
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl p-1.5 sm:p-2 border-2 border-dashed border-neutral-300 min-h-[60px] sm:min-h-[72px]">
                    <span className="text-neutral-300 text-xs">{t('recorder.empty')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
