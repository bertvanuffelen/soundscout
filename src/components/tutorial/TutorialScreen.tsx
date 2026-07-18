/**
 * TutorialScreen — Dedicated screen with quick-start steps and video tutorials.
 *
 * Videos are shown as thumbnail cards (no iframes until clicked).
 * Clicking a card opens a single large player inline.
 * Video metadata is centralised so switching providers (YouTube → Vimeo) is trivial.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Play } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui';
import { OnboardingAnimation } from '../common/OnboardingAnimation';
import { cn } from '../../utils/cn';

// --- Video provider helpers (change these two functions to switch provider) ---

/** Thumbnail URL for a given video id */
function thumbnailUrl(id: string): string {
  // YouTube: mqdefault = 320×180
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

/** Embeddable player URL for a given video id */
function embedUrl(id: string): string {
  // playsinline=1 is essentieel voor iOS/iPadOS: zonder rendert de embed
  // zwart wanneer Safari autoplay-met-geluid blokkeert (BUG-YOUTUBE).
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
}

// --- Video data ---

interface TutorialVideo {
  id: string;
  titleKey: string;
  descKey: string;
}

interface VideoCategory {
  titleKey: string;
  videos: TutorialVideo[];
}

const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    titleKey: 'tutorial.forStudents',
    videos: [
      { id: 'WRvXvKsIQfc', titleKey: 'tutorial.videos.soundscout', descKey: 'tutorial.videos.soundscout-desc' },
      { id: '7o2schoRWcE', titleKey: 'tutorial.videos.clip-edit', descKey: 'tutorial.videos.clip-edit-desc' },
      { id: 'sbkeAC7GC18', titleKey: 'tutorial.videos.save-share', descKey: 'tutorial.videos.save-share-desc' },
      { id: 'FjtdwDxt_DI', titleKey: 'tutorial.videos.volume', descKey: 'tutorial.videos.volume-desc' },
      { id: '-6j4oqj-eIk', titleKey: 'tutorial.videos.effects', descKey: 'tutorial.videos.effects-desc' },
      { id: 'ZspFnIGT0Qk', titleKey: 'tutorial.videos.sections', descKey: 'tutorial.videos.sections-desc' },
    ],
  },
  {
    titleKey: 'tutorial.forTeachers',
    videos: [
      { id: 'clA69CeXXcM', titleKey: 'tutorial.videos.dashboard', descKey: 'tutorial.videos.dashboard-desc' },
    ],
  },
];

// --- Component ---

export default function TutorialScreen() {
  const { t } = useTranslation();
  const goToStart = useAppStore((s) => s.goToStart);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (activeVideoId) {
      setActiveVideoId(null);
    } else {
      goToStart();
    }
  }, [activeVideoId, goToStart]);

  // Find the active video's title for the player header
  const activeVideo = activeVideoId
    ? VIDEO_CATEGORIES.flatMap((c) => c.videos).find((v) => v.id === activeVideoId)
    : null;

  const steps = t('tutorial.steps', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-bg-app flex flex-col">
      {/* --- Header --- */}
      <header className="bg-bg-surface border-b border-border-subtle px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors text-text-muted hover:text-text-main"
          aria-label={t('tutorial.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-text-main">
          {activeVideo ? t(activeVideo.titleKey) : t('tutorial.title')}
        </h1>
      </header>

      {/* --- Content --- */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

          {/* Active video player */}
          {activeVideo && (
            <div className="mb-8">
              {/* Back to overview link */}
              <button
                onClick={() => setActiveVideoId(null)}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main mb-3 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('tutorial.backToOverview')}
              </button>

              {/* Video player */}
              <div className="aspect-video rounded-xl overflow-hidden bg-neutral-900 shadow-lg">
                <iframe
                  src={embedUrl(activeVideo.id)}
                  title={t(activeVideo.titleKey)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-text-muted mt-2">{t(activeVideo.descKey)}</p>
            </div>
          )}

          {/* Quick-start steps (only when no video is playing) */}
          {!activeVideoId && (
            <div className="mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-main mb-4">
                {t('tutorial.quickStart')}
              </h2>
              {/* Gemaakte huisstijl-animatie van de 4 stappen (bron: public/animaties/) */}
              <div className="mb-5 rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface">
                <OnboardingAnimation />
              </div>
              <div className="flex flex-col gap-3">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex gap-3 items-center bg-bg-surface rounded-xl p-3 sm:p-4 border border-border-subtle"
                  >
                    <span className="flex-shrink-0 w-8 h-8 bg-accent-400 text-accent-900 rounded-full flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </span>
                    <span className="text-text-main text-sm sm:text-base font-medium leading-snug">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video categories */}
          {VIDEO_CATEGORIES.map((category) => (
            <section key={category.titleKey} className="mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-text-main mb-3">
                {t(category.titleKey)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setActiveVideoId(video.id)}
                    className={cn(
                      'group text-left rounded-xl overflow-hidden border transition-all',
                      activeVideoId === video.id
                        ? 'border-brand-600 ring-2 ring-brand-600/30'
                        : 'border-border-subtle hover:border-brand-400 hover:shadow-md'
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-neutral-100">
                      <img
                        src={thumbnailUrl(video.id)}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 text-brand-800 ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    {/* Title + description */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-text-main leading-snug">
                        {t(video.titleKey)}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5 leading-snug">
                        {t(video.descKey)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {/* Bottom back button */}
          {!activeVideoId && (
            <div className="pt-2 pb-4">
              <Button
                onClick={goToStart}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {t('tutorial.back')}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
