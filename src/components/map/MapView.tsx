/**
 * MapView - City map screen showing all locations
 *
 * Displays a visual map with clickable location markers.
 * Users can select a location to visit and collect samples.
 */

import { useTranslation } from 'react-i18next';
import { MapPin, ArrowLeft, Music } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { useThemeStore } from '../../stores/themeStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { Button } from '../ui';
import { LocationMarker } from './LocationMarker';

export function MapView() {
  const { t } = useTranslation();
  const goToStart = useGameStore((s) => s.goToStart);
  const goToLocation = useGameStore((s) => s.goToLocation);
  const goToStudio = useGameStore((s) => s.goToStudio);

  const theme = useThemeStore((s) => s.theme);
  const mapConfig = useThemeStore((s) => s.getMapConfig());
  const locations = useThemeStore((s) => s.getLocations());

  const collectedSampleIds = useLibraryStore((s) => s.collectedSampleIds);

  // Get collected sample count per location
  const getCollectedCountForLocation = (locationId: string) => {
    const location = locations.find((l) => l.id === locationId);
    if (!location) return { collected: 0, total: 0 };

    const totalSamples = location.hotspots.length;
    const collectedSamples = location.hotspots.filter((h) =>
      collectedSampleIds.includes(h.sampleId)
    ).length;

    return { collected: collectedSamples, total: totalSamples };
  };

  const handleLocationClick = (locationId: string) => {
    goToLocation(locationId);
  };

  if (!theme || !mapConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-sky-600">Thema laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-white/90 border-b border-sky-200 shrink-0">
        <Button variant="secondary" size="sm" onClick={goToStart}>
          <ArrowLeft className="w-4 h-4 mr-0.5 sm:mr-1" />
          {t('common.back')}
        </Button>
        <h1 className="text-base sm:text-lg font-bold text-sky-700 flex items-center gap-1.5 sm:gap-2">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">{t('map.title')}</span>
        </h1>
        <Button variant="primary" size="sm" onClick={goToStudio}>
          <Music className="w-4 h-4 mr-0.5 sm:mr-1" />
          <span className="hidden sm:inline">{t('studio.title')}</span>
          <span className="sm:hidden">Studio</span>
        </Button>
      </div>

      {/* Map Area with 16:9 canvas */}
      <div className="flex-1 flex items-start justify-center pt-1 sm:pt-2 px-2 sm:px-4 pb-2 sm:pb-4">
        {/* 16:9 Canvas container */}
        <div className="relative w-full max-w-[calc(100vh*16/9-60px)] sm:max-w-[calc(100vh*16/9-80px)] aspect-video rounded-lg overflow-hidden shadow-2xl">
          {/* Background Image */}
          {mapConfig.backgroundImage ? (
            <img
              src={mapConfig.backgroundImage}
              alt="Stadskaart"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-green-200 via-blue-100 to-green-100" />
          )}

          {/* Map overlay for better marker visibility */}
          <div className="absolute inset-0 bg-white/10" />

          {/* Location Markers */}
          {mapConfig.locationPositions.map((pos) => {
            const location = locations.find((l) => l.id === pos.locationId);
            if (!location) return null;

            const { collected, total } = getCollectedCountForLocation(pos.locationId);

            return (
              <LocationMarker
                key={pos.locationId}
                position={pos}
                location={location}
                collected={collected}
                total={total}
                onClick={() => handleLocationClick(pos.locationId)}
              />
            );
          })}
        </div>
      </div>

      {/* Footer with theme info (dev only) */}
      {import.meta.env.DEV && (
        <div className="px-4 py-2 bg-gray-800 text-gray-300 text-xs text-center shrink-0">
          Thema: {theme.id} | Locaties: {locations.length}
        </div>
      )}
    </div>
  );
}
