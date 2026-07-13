/**
 * MapView - City map screen showing all locations
 *
 * Displays a visual map with clickable location markers.
 * Users can select a location to visit and collect samples.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowLeft, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useThemeStore } from '../../stores/themeStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { Button } from '../ui';
import { LocationMarker } from './LocationMarker';
import { hasSeenFirstRun, markFirstRunSeen } from '../../utils/firstRun';

export function MapView() {
  const { t } = useTranslation();
  const goToStart = useAppStore((s) => s.goToStart);
  const goToLocation = useAppStore((s) => s.goToLocation);
  const goToStudio = useAppStore((s) => s.goToStudio);

  // Eenmalige hint (week 3): wat doe je op deze kaart?
  const [showMapHint, setShowMapHint] = useState(() => !hasSeenFirstRun('map-hint'));
  const dismissMapHint = () => {
    markFirstRunSeen('map-hint');
    setShowMapHint(false);
  };

  const theme = useThemeStore((s) => s.theme);
  const mapConfig = useThemeStore((s) => s.getMapConfig());
  const locations = useThemeStore((s) => s.getLocations());

  const isSampleCollected = useLibraryStore((s) => s.isSampleCollected);

  // Get collected sample count per location
  const getCollectedCountForLocation = (locationId: string) => {
    const location = locations.find((l) => l.id === locationId);
    if (!location) return { collected: 0, total: 0 };

    const totalSamples = location.hotspots.length;
    const collectedSamples = location.hotspots.filter((h) =>
      isSampleCollected(h.sampleId)
    ).length;

    return { collected: collectedSamples, total: totalSamples };
  };

  const handleLocationClick = (locationId: string) => {
    // Eerste locatiebezoek = doel van de kaart begrepen; hint vervalt
    if (showMapHint) dismissMapHint();
    goToLocation(locationId);
  };

  if (!theme || !mapConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-900">
        <div className="text-brand-300">{t('map.loadingTheme')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-900 md:bg-bg-app overflow-hidden">
      {/* Header - branding donkerblauw op mobile, wit op desktop */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-brand-800/90 md:bg-bg-surface border-b border-brand-700 md:border-border-subtle shrink-0">
        <Button variant="secondary" size="sm" onClick={goToStart} className="bg-brand-700 md:bg-white text-white md:text-text-main border-brand-600 md:border-border-subtle hover:bg-brand-600 md:hover:bg-neutral-50">
          <ArrowLeft className="w-4 h-4 mr-0.5 sm:mr-1" />
          {t('common.back')}
        </Button>
        <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white md:text-text-main flex items-center gap-1.5 sm:gap-2">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent-400" />
          <span className="hidden sm:inline">{t('map.title')}</span>
        </h1>
        <Button variant="primary" size="sm" onClick={goToStudio}>

          <span className="hidden sm:inline">{t('studio.title')}</span>
          <span className="sm:hidden">{t('map.studioShort')}</span>
        </Button>
      </div>

      {/* Eenmalige tip: wat doe je op deze kaart? (week 3, onboarding) */}
      {showMapHint && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-50 md:border-b md:border-accent-200 text-xs sm:text-sm text-accent-800 shrink-0">
          <MapPin size={14} className="shrink-0" />
          <span className="flex-1">{t('map.firstVisitHint')}</span>
          <button
            onClick={dismissMapHint}
            aria-label={t('common.close')}
            className="p-0.5 rounded hover:bg-accent-100 text-accent-600 hover:text-accent-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Map Area - Desktop: white card with minimal padding, Mobile: full bleed */}
      <div className="flex-1 flex items-center justify-center p-[1%] md:p-[2%]">
        {/* Card wrapper for desktop - constrained to never exceed viewport height */}
        <div className="w-full max-w-[calc((100vh-80px)*16/9)] md:max-w-[calc((100vh-100px)*16/9)] md:bg-bg-surface md:rounded-2xl md:shadow-xl md:p-3">
          {/* 16:9 Canvas container */}
          <div className="relative w-full aspect-video rounded-lg md:rounded-2xl overflow-hidden shadow-2xl md:shadow-lg">
            {/* Background Image */}
            {mapConfig.backgroundImage ? (
              <img
                src={mapConfig.backgroundImage}
                alt={t('map.cityMapAlt')}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <>{/* Decorative map fallback (only shown if the map image fails to load).
                     DELIBERATE exception to the design-token rule: the soft green/blue reads as
                     "outdoors/map"; there is no token equivalent and neutral grey would degrade it. */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-200 via-blue-100 to-green-100" /></>
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
      </div>

      {/* Footer with theme info (dev only) */}
      {import.meta.env.DEV && (
        <div className="px-4 py-2 bg-brand-800 md:bg-neutral-200 text-brand-300 md:text-neutral-500 text-xs text-center shrink-0">
          Thema: {theme.id} | Locaties: {locations.length}
        </div>
      )}
    </div>
  );
}
