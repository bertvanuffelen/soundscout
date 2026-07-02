/**
 * TeacherLandingPage — publieke "Voor-docenten" landingspagina (#docentenpagina).
 *
 * Stap 1: losse, op zichzelf staande route (`/teacher`), nog niet gekoppeld aan
 * startscherm-navigatie of dashboard. Doel: een docent in ~2 min van "wat is
 * dit?" naar "dit kan ik volgende week gebruiken" brengen.
 *
 * Styling volgt exact de app-stijl: Nunito, bestaande design-tokens, pill-
 * buttons en de mode-kleuren uit ComposeModeModal (via composeVariants).
 *
 * Het hart van de pagina is de interactieve hero-switcher: klikken op één van de
 * drie vorm-kaarten (sectie 2) wisselt de hero-preview + het bijschrift (sectie
 * 1) via lokale React-state.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, Bot, Film, Music, type LucideIcon } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { cn } from '../utils/cn';
import { HeroPreview } from '../components/teacher-landing/HeroPreview';
import { LandingVideo } from '../components/teacher-landing/LandingVideo';
import {
  COMPOSE_VARIANTS,
  type ComposeVariant,
} from '../components/teacher-landing/composeVariants';

export default function TeacherLandingPage() {
  const [activeVariant, setActiveVariant] = useState<ComposeVariant>('praatplaat');

  return (
    <div className="min-h-screen bg-bg-app text-text-main">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-16 sm:gap-24">
        <HeroSection activeVariant={activeVariant} />
        <ComposeSection activeVariant={activeVariant} onSelect={setActiveVariant} />
        <VideosSection />
        <StepsSection />
        <LessonsSection />
        <CurriculumSection />
      </div>
      <WorkshopsBand />
    </div>
  );
}

// --- Sectie 1: Hero ---
function HeroSection({ activeVariant }: { activeVariant: ComposeVariant }) {
  const { t } = useTranslation();
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 items-center">
      <div className="flex flex-col gap-4 sm:gap-5 order-2 md:order-1">
        <span className="inline-flex self-start items-center rounded-full bg-accent-100 text-accent-800 text-xs sm:text-sm font-bold px-3 py-1">
          {t('teacherLanding.hero.eyebrow')}
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
          {t('teacherLanding.hero.title')}
        </h1>
        <p className="text-base sm:text-lg text-text-muted leading-relaxed">
          {t('teacherLanding.hero.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-1">
          {/* Placeholder-CTA's — koppeling aan login/registratie volgt in stap 2 */}
          <Button variant="primary" size="lg" className="rounded-full w-full sm:w-auto">
            {t('teacherLanding.hero.ctaPrimary')}
          </Button>
          <Button variant="secondary" size="lg" className="rounded-full w-full sm:w-auto">
            {t('teacherLanding.hero.ctaSecondary')}
          </Button>
        </div>
      </div>

      <div className="order-1 md:order-2 flex flex-col gap-3">
        <HeroPreview variant={activeVariant} />
        <p className="text-sm sm:text-base text-text-muted text-center leading-relaxed px-2">
          {t(`teacherLanding.compose.captions.${activeVariant}`)}
        </p>
      </div>
    </section>
  );
}

// --- Sectie 2: Drie manieren om te componeren (interactief) ---
function ComposeSection({
  activeVariant,
  onSelect,
}: {
  activeVariant: ComposeVariant;
  onSelect: (v: ComposeVariant) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t('teacherLanding.compose.title')}
        </h2>
        <p className="text-text-muted text-base sm:text-lg">
          {t('teacherLanding.compose.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {COMPOSE_VARIANTS.map(({ id, key, Icon, colors }) => {
          const isActive = id === activeVariant;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(id)}
              className={cn(
                'group flex flex-col items-start text-left p-5 rounded-2xl border-2 bg-bg-surface',
                'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                'min-h-[44px] cursor-pointer',
                // Kleur-fix: neutrale kaart; alléén de actieve kaart krijgt de
                // variant-rand → nooit drie kleurranden naast elkaar.
                isActive ? cn(colors.active, 'shadow-md') : 'border-border-subtle hover:shadow-sm'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={colors.icon}>
                  <Icon size={26} />
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full text-[11px] font-bold px-2.5 py-0.5',
                    colors.tag
                  )}
                >
                  {t(`teacherLanding.compose.variants.${key}.tag`)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-main mb-1">
                {t(`teacherLanding.compose.variants.${key}.title`)}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {t(`teacherLanding.compose.variants.${key}.description`)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// --- Sectie 3 (nieuw): Zo werkt het — in beeld (2 demovideo's) ---
// Video-ID's staan in code (niet in i18n): makkelijk te wisselen. Standaard een
// leerling-uitleg + een docent/dashboard-demo, hergebruikt uit de tutorials.
const LANDING_VIDEOS = [
  { key: 'student', youtubeId: 'WRvXvKsIQfc' },
  { key: 'teacher', youtubeId: 'clA69CeXXcM' },
] as const;

function VideosSection() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t('teacherLanding.videos.title')}
        </h2>
        <p className="text-text-muted text-base sm:text-lg">
          {t('teacherLanding.videos.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {LANDING_VIDEOS.map(({ key, youtubeId }) => (
          <LandingVideo
            key={key}
            youtubeId={youtubeId}
            title={t(`teacherLanding.videos.${key}.title`)}
            description={t(`teacherLanding.videos.${key}.description`)}
            playLabel={t('teacherLanding.videos.play')}
          />
        ))}
      </div>
    </section>
  );
}

// --- Sectie 4: Zo zet je een klas op (3 stappen + dashboard-knop) ---
function StepsSection() {
  const { t } = useTranslation();
  const steps = ['step1', 'step2', 'step3'] as const;
  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
        {t('teacherLanding.steps.title')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {steps.map((step, i) => (
          <Card key={step} padding="lg" className="flex flex-col gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-900 text-text-inverse font-extrabold flex items-center justify-center">
              {i + 1}
            </span>
            <h3 className="text-lg font-bold text-text-main">
              {t(`teacherLanding.steps.${step}.title`)}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t(`teacherLanding.steps.${step}.description`)}
            </p>
          </Card>
        ))}
      </div>
      <div className="flex justify-center">
        {/* Placeholder — redirect-wiring in stap 2 (auth):
            → /?screen=teacher; TeacherPage toont zelf login als uitgelogd. */}
        <Button variant="primary" size="lg" className="rounded-full">
          {t('teacherLanding.steps.ctaDashboard')}
        </Button>
      </div>
    </section>
  );
}

// --- Sectie 5: Kant-en-klare leskaarten (master-detail) ---
type LessonId = 'robotfactory' | 'storyboard' | 'free';

const LESSONS: Array<{ id: LessonId; Icon: LucideIcon; available: boolean }> = [
  { id: 'robotfactory', Icon: Bot, available: true },
  { id: 'storyboard', Icon: Film, available: false },
  { id: 'free', Icon: Music, available: false },
];

function LessonsSection() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<LessonId>('robotfactory');

  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
        {t('teacherLanding.lessons.title')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,18rem)_1fr] gap-4 sm:gap-6 items-start">
        {/* Links: selecteerbare lijst */}
        <div className="flex flex-col gap-3">
          {LESSONS.map(({ id, Icon, available }) => {
            const isActive = id === selected;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelected(id)}
                className={cn(
                  'flex items-center gap-3 text-left p-4 rounded-2xl border-2 bg-bg-surface',
                  'transition-all duration-200 min-h-[44px] cursor-pointer',
                  isActive ? 'border-brand-300 shadow-md' : 'border-border-subtle hover:shadow-sm'
                )}
              >
                <span className="text-text-muted flex-shrink-0">
                  <Icon size={22} />
                </span>
                <span className="flex flex-col">
                  <span className="font-bold text-text-main leading-tight">
                    {t(`teacherLanding.lessons.${id}.title`)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {available
                      ? t('teacherLanding.lessons.robotfactory.level')
                      : t('teacherLanding.lessons.soon')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Rechts: detail in kader */}
        <Card padding="lg" className="border border-border-subtle">
          {selected === 'robotfactory' ? (
            <RobotfactoryDetail />
          ) : (
            <SoonDetail title={t(`teacherLanding.lessons.${selected}.title`)} />
          )}
        </Card>
      </div>
    </section>
  );
}

function RobotfactoryDetail() {
  const { t } = useTranslation();
  const phases = ['orient', 'research', 'perform', 'evaluate'] as const;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-xl font-extrabold text-text-main">
            {t('teacherLanding.lessons.robotfactory.title')}
          </h3>
          <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-600 text-xs font-bold px-2.5 py-0.5">
            {t('teacherLanding.lessons.robotfactory.tag')}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          {t('teacherLanding.lessons.robotfactory.subtitle')}
        </p>
      </div>

      <p className="text-sm sm:text-base text-text-main leading-relaxed">
        <span className="font-bold">{t('teacherLanding.lessons.robotfactory.goalLabel')} </span>
        {t('teacherLanding.lessons.robotfactory.goal')}
      </p>

      <div className="flex flex-col gap-2">
        <h4 className="font-bold text-text-main">
          {t('teacherLanding.lessons.robotfactory.phasesTitle')}
        </h4>
        <ul className="flex flex-col gap-2">
          {phases.map((p) => (
            <li key={p} className="border-l-2 border-accent-400 pl-3 text-sm sm:text-base">
              <span className="font-bold text-text-main">
                {t(`teacherLanding.lessons.robotfactory.phases.${p}.name`)}
              </span>
              <span className="text-text-muted">
                {' — '}
                {t(`teacherLanding.lessons.robotfactory.phases.${p}.text`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Placeholder-download — echte PDF komt apart */}
      <Button variant="primary" size="md" className="rounded-full self-start mt-1">
        <FileDown className="w-4 h-4 mr-2" />
        {t('teacherLanding.lessons.download')}
      </Button>
    </div>
  );
}

function SoonDetail({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 items-start">
      <span className="inline-flex items-center rounded-full bg-neutral-100 text-text-muted text-xs font-bold px-2.5 py-0.5">
        {t('teacherLanding.lessons.soon')}
      </span>
      <h3 className="text-xl font-extrabold text-text-main">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">
        {t('teacherLanding.lessons.soonDetail')}
      </p>
    </div>
  );
}

// --- Sectie 5: Sluit aan op de leerlijn muziek (kerndoelen) ---
function CurriculumSection() {
  const { t } = useTranslation();
  const pills = ['pill1', 'pill2', 'pill3'] as const;
  return (
    <section className="flex flex-col gap-5 sm:gap-6 items-center text-center">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
        {t('teacherLanding.curriculum.title')}
      </h2>
      <p className="text-text-muted text-base sm:text-lg max-w-2xl leading-relaxed">
        {t('teacherLanding.curriculum.intro')}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {pills.map((pill) => (
          <span
            key={pill}
            className="inline-flex items-center rounded-full bg-bg-surface border border-border-subtle text-text-main font-semibold text-sm px-4 py-2 shadow-sm"
          >
            {t(`teacherLanding.curriculum.${pill}`)}
          </span>
        ))}
      </div>
    </section>
  );
}

// --- Sectie 6: Workshops-CTA (footer-band) ---
function WorkshopsBand() {
  const { t } = useTranslation();
  return (
    <section className="bg-brand-900 text-text-inverse mt-16 sm:mt-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center text-center gap-5">
        <p className="text-lg sm:text-xl font-semibold max-w-2xl leading-relaxed">
          {t('teacherLanding.workshops.text')}
        </p>
        <a
          href="https://bertvanuffelen.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
        >
          <Button variant="primary" size="lg" className="rounded-full">
            {t('teacherLanding.workshops.cta')}
          </Button>
        </a>
      </div>
    </section>
  );
}
