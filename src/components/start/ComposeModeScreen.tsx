/**
 * ComposeModeScreen - Choose how to compose after theme selection (#41)
 *
 * Offers three modes:
 * - Free: compose without images (current experience)
 * - Image: compose with a single image
 * - Storyboard: compose with a sequence of images
 *
 * Only shown when storytelling is enabled (?storytelling=true)
 * and the selected theme has storyboards.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, Image, Film, ArrowLeft, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { getThemeStoryboards } from '../../data/themes';
import { MAX_SECTIONS } from '../../constants/config';
import type { Storyboard, ComposeMode, Location } from '../../types';

/**
 * Convert a location to a virtual single-image Storyboard.
 * This allows reuse of the existing storyboard system for image-mode composing.
 */
function locationToStoryboard(location: Location, themeId: string): Storyboard {
  return {
    id: `location-${location.id}`,
    themeId,
    name: location.name,
    description: location.description,
    coverImage: location.backgroundImage,
    images: [{ id: location.id, url: location.backgroundImage, label: location.name }],
  };
}

export default function ComposeModeScreen() {
  const { t } = useTranslation();
  const goToMap = useAppStore((s) => s.goToMap);
  const goToStart = useAppStore((s) => s.goToStart);
  const setComposeMode = useAppStore((s) => s.setComposeMode);
  const setActiveStoryboard = useAppStore((s) => s.setActiveStoryboard);
  const themeId = useThemeStore((s) => s.activeThemeId);
  const getLocations = useThemeStore((s) => s.getLocations);

  const storyboards = getThemeStoryboards(themeId) ?? [];
  const locations = getLocations();

  // Virtual storyboards from location images (for "Afbeelding" mode)
  const locationImages = locations.map((loc) => locationToStoryboard(loc, themeId));

  // Step: 'choose-mode' → 'pick-storyboard' | 'pick-image'
  const [step, setStep] = useState<'choose-mode' | 'pick-storyboard' | 'pick-image'>('choose-mode');

  const handleSelectFree = useCallback(() => {
    // Reset timeline completely when switching to free mode
    const { clearAllTracks, clearSections } = useTimelineStore.getState();
    clearAllTracks();
    clearSections();
    setComposeMode('free');
    setActiveStoryboard(null);
    goToMap();
  }, [setComposeMode, setActiveStoryboard, goToMap]);

  const handleSelectStoryboard = useCallback((sb: Storyboard) => {
    const mode: ComposeMode = sb.images.length === 1 ? 'image' : 'storyboard';
    setComposeMode(mode);
    setActiveStoryboard(sb);

    // Always reset timeline when selecting a storyboard/image
    const { totalBeats, clearAllTracks, clearSections, addSection } = useTimelineStore.getState();
    clearAllTracks();
    clearSections();

    // Auto-create sections for storyboards with multiple images
    // E.g. 3 images, 128 beats → sections at beat 43, 86, 128
    // Clamp to MAX_SECTIONS to prevent silent addSection failures
    if (sb.images.length > 1) {
      const sectionCount = Math.min(sb.images.length, MAX_SECTIONS);
      const beatsPerImage = Math.floor(totalBeats / sectionCount);
      for (let i = 0; i < sectionCount; i++) {
        const endBeat = i < sectionCount - 1
          ? beatsPerImage * (i + 1)
          : totalBeats;
        const label = sb.images[i]?.label;
        addSection(endBeat, undefined, label, true);
      }
    }

    goToMap();
  }, [setComposeMode, setActiveStoryboard, goToMap]);

  // Multi-image storyboards for "Storyboard" mode
  const multiImages = storyboards.filter((sb) => sb.images.length > 1);

  return (
    <div className="min-h-screen bg-brand-900 md:bg-bg-app flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl md:bg-bg-surface md:rounded-2xl md:shadow-xl md:p-8 lg:p-10">
        {/* Back button */}
        <button
          onClick={step !== 'choose-mode' ? () => setStep('choose-mode') : goToStart}
          className="flex items-center gap-1.5 text-brand-300 hover:text-white md:text-text-muted md:hover:text-text-main mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t('composeMode.back')}</span>
        </button>

        {step === 'choose-mode' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main mb-2">
              {t('composeMode.title')}
            </h1>
            <p className="text-brand-300 md:text-text-muted mb-8">
              {t('composeMode.subtitle')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Free compose */}
              <ModeCard
                icon={<Music size={32} />}
                title={t('composeMode.free')}
                description={t('composeMode.freeDescription')}
                onClick={handleSelectFree}
                color="accent"
              />

              {/* Single image — always available when theme has locations */}
              {locationImages.length > 0 && (
                <ModeCard
                  icon={<Image size={32} />}
                  title={t('composeMode.image')}
                  description={t('composeMode.imageDescription')}
                  onClick={() => setStep('pick-image')}
                  color="teal"
                />
              )}

              {/* Storyboard */}
              {multiImages.length > 0 && (
                <ModeCard
                  icon={<Film size={32} />}
                  title={t('composeMode.storyboard')}
                  description={t('composeMode.storyboardDescription')}
                  onClick={() => {
                    if (multiImages.length === 1) {
                      handleSelectStoryboard(multiImages[0]);
                    } else {
                      setStep('pick-storyboard');
                    }
                  }}
                  color="purple"
                />
              )}
            </div>
          </>
        )}

        {step === 'pick-image' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main mb-2">
              {t('composeMode.pickImage')}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {locationImages.map((sb) => (
                <StoryboardCard
                  key={sb.id}
                  storyboard={sb}
                  onSelect={() => handleSelectStoryboard(sb)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'pick-storyboard' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main mb-2">
              {t('composeMode.pickStoryboard')}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {multiImages.map((sb) => (
                <StoryboardCard
                  key={sb.id}
                  storyboard={sb}
                  onSelect={() => handleSelectStoryboard(sb)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: 'accent' | 'teal' | 'purple';
}

function ModeCard({ icon, title, description, onClick, color }: ModeCardProps) {
  const colorClasses = {
    accent: 'border-accent-400/30 hover:border-accent-400 hover:bg-accent-50 md:hover:bg-accent-50',
    teal: 'border-teal-400/30 hover:border-teal-400 hover:bg-teal-50 md:hover:bg-teal-50',
    purple: 'border-purple-400/30 hover:border-purple-400 hover:bg-purple-50 md:hover:bg-purple-50',
  };

  const iconColorClasses = {
    accent: 'text-accent-500',
    teal: 'text-teal-500',
    purple: 'text-purple-500',
  };

  return (
    <button
      onClick={onClick}
      className={`
        group flex flex-col items-center text-center p-6 rounded-xl border-2
        bg-white/10 md:bg-white transition-all duration-200
        hover:scale-[1.02] active:scale-[0.98]
        ${colorClasses[color]}
      `}
    >
      <div className={`mb-3 ${iconColorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white md:text-text-main mb-1">
        {title}
      </h3>
      <p className="text-sm text-brand-300 md:text-text-muted">
        {description}
      </p>
    </button>
  );
}

interface StoryboardCardProps {
  storyboard: Storyboard;
  onSelect: () => void;
}

function StoryboardCard({ storyboard, onSelect }: StoryboardCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onSelect}
      className="group relative bg-white/10 md:bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left"
    >
      {/* Cover image */}
      <div className="aspect-video w-full overflow-hidden bg-neutral-100">
        <img
          src={storyboard.coverImage}
          alt={t(storyboard.name)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Title */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-bold text-white md:text-text-main truncate">
          {t(storyboard.name)}
        </h3>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="bg-brand-700 text-white px-4 py-1.5 rounded-full font-semibold text-sm shadow-lg flex items-center gap-1.5">
          <Check size={14} />
          {t('themeSelection.select')}
        </span>
      </div>
    </button>
  );
}
