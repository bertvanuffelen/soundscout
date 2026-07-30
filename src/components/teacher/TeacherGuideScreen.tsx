/**
 * TeacherGuideScreen — Docentenhandleiding met accordeon-secties.
 *
 * Structuur: 12 onderwerpen als collapsible accordeons, één tegelijk open.
 * Elke sectie bevat prose-tekst en optioneel een ingebedde YouTube-video
 * (dezelfde videopool als TutorialScreen, maar hier contextueel per onderwerp).
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, Play } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { cn } from '../../utils/cn';
import { SoundScoutAnimation } from '../common/OnboardingAnimation';

// --- Video helpers (zelfde provider als TutorialScreen) ---

function thumbnailUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

function embedUrl(id: string): string {
  // playsinline=1 is essentieel voor iOS/iPadOS: zonder rendert de embed
  // zwart wanneer Safari autoplay-met-geluid blokkeert (BUG-YOUTUBE).
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
}

// --- Content item types ---

/** Een content-item is een platte string (paragraaf) of een object met type. */
type ContentItem = string | { type: 'heading'; text: string };

/** Type guard: is dit een structured content item? */
function isStructuredItem(item: ContentItem): item is { type: 'heading'; text: string } {
  return typeof item === 'object' && item !== null && 'type' in item;
}

// --- Sectie-data ---

interface GuideSection {
  id: string;
  /** i18n-key voor titel */
  titleKey: string;
  /** i18n-key voor content (array van paragrafen of { type, text }) */
  contentKey: string;
  /** Optionele YouTube video-id die bij dit onderwerp hoort */
  videoId?: string;
  /** i18n-key voor videotitel (valt terug op sectietitel) */
  videoTitleKey?: string;
  /** Uitleg-animatie uit public/animaties/ (bestandsnaam zonder extensie) */
  animation?: string;
}

// Volgorde volgt de docent-reis: oriëntatie → opzetten → content maken →
// uitdelen → oogsten → praktijk. De genummerde badge volgt de array-index.
const SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    titleKey: 'teacher.guide.sections.getting-started.title',
    contentKey: 'teacher.guide.sections.getting-started.content',
  },
  {
    id: 'dashboard-tour',
    titleKey: 'teacher.guide.sections.dashboard-tour.title',
    contentKey: 'teacher.guide.sections.dashboard-tour.content',
  },
  {
    id: 'classes',
    titleKey: 'teacher.guide.sections.classes.title',
    contentKey: 'teacher.guide.sections.classes.content',
  },
  {
    id: 'assignments',
    titleKey: 'teacher.guide.sections.assignments.title',
    contentKey: 'teacher.guide.sections.assignments.content',
  },
  {
    id: 'compose-modes',
    titleKey: 'teacher.guide.sections.compose-modes.title',
    contentKey: 'teacher.guide.sections.compose-modes.content',
  },
  {
    id: 'sequencer',
    titleKey: 'teacher.guide.sections.sequencer.title',
    contentKey: 'teacher.guide.sections.sequencer.content',
    animation: 'sequencer-uitleg',
  },
  {
    id: 'templates',
    titleKey: 'teacher.guide.sections.templates.title',
    contentKey: 'teacher.guide.sections.templates.content',
  },
  {
    id: 'assignment-cards',
    titleKey: 'teacher.guide.sections.assignment-cards.title',
    contentKey: 'teacher.guide.sections.assignment-cards.content',
  },
  {
    id: 'praatplaat',
    titleKey: 'teacher.guide.sections.praatplaat.title',
    contentKey: 'teacher.guide.sections.praatplaat.content',
  },
  {
    id: 'lesson-cards',
    titleKey: 'teacher.guide.sections.lesson-cards.title',
    contentKey: 'teacher.guide.sections.lesson-cards.content',
  },
  {
    id: 'submissions',
    titleKey: 'teacher.guide.sections.submissions.title',
    contentKey: 'teacher.guide.sections.submissions.content',
    videoId: 'clA69CeXXcM',
    videoTitleKey: 'tutorial.videos.dashboard',
  },
  {
    id: 'save-codes',
    titleKey: 'teacher.guide.sections.save-codes.title',
    contentKey: 'teacher.guide.sections.save-codes.content',
    videoId: 'sbkeAC7GC18',
    videoTitleKey: 'tutorial.videos.save-share',
  },
  {
    id: 'classroom-tips',
    titleKey: 'teacher.guide.sections.classroom-tips.title',
    contentKey: 'teacher.guide.sections.classroom-tips.content',
  },
  {
    id: 'feedback-tips',
    titleKey: 'teacher.guide.sections.feedback-tips.title',
    contentKey: 'teacher.guide.sections.feedback-tips.content',
  },
];

// --- Component ---

export default function TeacherGuideScreen() {
  const { t } = useTranslation();
  const goToTeacher = useAppStore((s) => s.goToTeacher);
  // Open op de contextuele deeplink-sectie als die gezet is (patroon: pending-state
  // eenmalig lezen bij mount, daarna wissen — net als pendingLessonCardKey).
  const [openId, setOpenId] = useState<string | null>(() => {
    const target = useAppStore.getState().pendingGuideSection;
    if (target && SECTIONS.some((s) => s.id === target)) return target;
    return SECTIONS[0]?.id ?? null;
  });
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    const { pendingGuideSection, setPendingGuideSection } = useAppStore.getState();
    if (!pendingGuideSection) return;
    setPendingGuideSection(null);
    // Scroll de geopende sectie in beeld (deeplink kan diep in de lijst zitten).
    requestAnimationFrame(() => {
      document
        .getElementById(`guide-section-${pendingGuideSection}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  const handleToggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
    setPlayingVideoId(null);
  }, []);

  return (
    <div className="min-h-screen bg-bg-app flex flex-col">
      {/* --- Header --- */}
      <header className="bg-brand-900 border-b border-brand-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={goToTeacher}
            className="p-2 -ml-2 rounded-lg text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
            aria-label={t('teacher.guide.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t('teacher.guide.title')}
            </h1>
            <p className="text-sm text-brand-300">
              {t('teacher.guide.subtitle')}
            </p>
          </div>
          {/* Taalknop op de vaste plek rechtsboven (wens Bert 19-7) */}
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      {/* --- Content --- */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-2">
            {SECTIONS.map((section, index) => {
              const isOpen = openId === section.id;
              const contentItems = t(section.contentKey, { returnObjects: true, defaultValue: [] }) as ContentItem[];

              return (
                <div
                  key={section.id}
                  className="bg-bg-surface rounded-xl border border-border-subtle overflow-hidden"
                >
                  {/* --- Header button --- */}
                  <button
                    onClick={() => handleToggle(section.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-4 text-left min-h-[56px]',
                      'hover:bg-neutral-50 active:bg-neutral-100 transition-colors',
                      isOpen && 'bg-neutral-50'
                    )}
                    aria-expanded={isOpen}
                    aria-controls={`guide-section-${section.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="flex-shrink-0 w-7 h-7 bg-accent-400 text-accent-900 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="text-text-main font-semibold text-base sm:text-lg leading-snug">
                        {t(section.titleKey)}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-text-muted flex-shrink-0 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* --- Content panel --- */}
                  {isOpen && (
                    <div
                      id={`guide-section-${section.id}`}
                      className="px-4 pb-5 pt-1 sm:px-6"
                    >
                      {/* Prose content */}
                      <div className="flex flex-col gap-3 text-text-main text-sm sm:text-base leading-relaxed">
                        {Array.isArray(contentItems) && contentItems.map((item, i) => {
                          if (isStructuredItem(item)) {
                            if (item.type === 'heading') {
                              return (
                                <h3
                                  key={i}
                                  className="font-semibold text-text-main text-sm sm:text-base mt-2 first:mt-0"
                                >
                                  {item.text}
                                </h3>
                              );
                            }
                            return null;
                          }
                          return <p key={i}>{item}</p>;
                        })}
                      </div>

                      {/* Optionele uitleg-animatie (looping, geen geluid) */}
                      {section.animation && (
                        <div className="mt-5 rounded-xl overflow-hidden border border-border-subtle">
                          <SoundScoutAnimation
                            name={section.animation}
                            title={t(section.titleKey)}
                            initialHeight={420}
                          />
                        </div>
                      )}

                      {/* Optional embedded video */}
                      {section.videoId && (
                        <div className="mt-5">
                          {playingVideoId === section.videoId ? (
                            <div className="aspect-video rounded-xl overflow-hidden bg-neutral-900 shadow-lg">
                              <iframe
                                src={embedUrl(section.videoId)}
                                title={t(section.videoTitleKey ?? section.titleKey)}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setPlayingVideoId(section.videoId!)}
                              className="group relative w-full aspect-video rounded-xl overflow-hidden border border-border-subtle hover:border-brand-400 hover:shadow-md transition-all"
                              aria-label={t('teacher.guide.playVideo')}
                            >
                              <img
                                src={thumbnailUrl(section.videoId)}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                <div className="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="w-6 h-6 text-brand-800 ml-0.5" fill="currentColor" />
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                <p className="text-white text-sm font-medium text-left">
                                  {t(section.videoTitleKey ?? section.titleKey)}
                                </p>
                              </div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* --- Link naar algemene tutorials --- */}
          <div className="mt-8 bg-accent-50 border border-accent-200 rounded-xl p-4 text-sm text-accent-800">
            <p className="mb-2 font-medium">{t('teacher.guide.moreVideosTitle')}</p>
            <p className="text-accent-700">{t('teacher.guide.moreVideosDescription')}</p>
          </div>

          {/* --- Bottom back button --- */}
          <div className="mt-8 pb-4">
            <Button
              onClick={goToTeacher}
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t('teacher.guide.back')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
