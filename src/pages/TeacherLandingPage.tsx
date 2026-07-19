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

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileDown, Film, Music, MapPin, FileText, Play, Loader2, ArrowRight, ArrowLeft,
  Lock, GraduationCap, BadgeCheck, MonitorPlay, MessagesSquare, ClipboardList,
  Send, Star, RefreshCw, ShieldCheck, ChevronDown, Sparkles, Rocket, type LucideIcon,
} from 'lucide-react';
import { Button, Card, LanguageSwitcher } from '../components/ui';
import { SegmentedTabs } from '../components/teacher/common/SegmentedTabs';
import { cn } from '../utils/cn';
import { ComposePreview } from '../components/compose/ComposePreview';
import { OnboardingAnimation } from '../components/common/OnboardingAnimation';
import { LandingVideo } from '../components/teacher-landing/LandingVideo';
import {
  COMPOSE_VARIANTS,
  type ComposeVariant,
} from '../components/compose/composeVariants';
import { fetchBuiltinLessonCards, localizeLessonCard, type PublicLessonCard } from '../lib/lessonCards';
import type { AssignmentType } from '../lib/assignments';
import { getPublicThemes } from '../data/themes';
import { PrivacyModal } from '../components/PrivacyModal';
import { FeedbackModal } from '../components/feedback/FeedbackModal';

/**
 * Navigeer van de losse landingsroute naar het docentgedeelte van de app
 * (`/?screen=teacher`). Met een leskaart-sleutel opent het dashboard straks de
 * Leskaarten-tab op die kaart (na login/registratie).
 */
function navigateToTeacherApp(params?: { lesson?: string; tab?: string }) {
  const url = new URL(window.location.origin);
  url.searchParams.set('screen', 'teacher');
  if (params?.lesson) url.searchParams.set('lesson', params.lesson);
  if (params?.tab) url.searchParams.set('tab', params.tab);
  window.location.href = url.toString();
}

/** Twee tabbladen (testronde 1, wens Bert): "Aan de slag" = praktisch
 *  (werkvormen, video's, thema's, klas opzetten, leskaarten); "Waarom
 *  SoundScout" = overtuigend (usp's, feedback-cirkel, privacy, FAQ,
 *  kerndoelen). Hero, workshops-band en footer zijn gedeeld. */
type LandingTab = 'get-started' | 'why';

export default function TeacherLandingPage() {
  const { t } = useTranslation();
  const [activeVariant, setActiveVariant] = useState<ComposeVariant>('praatplaat');
  const [landingTab, setLandingTab] = useState<LandingTab>('get-started');
  const tabsRef = useRef<HTMLDivElement>(null);
  // Privacy + contact (hergebruik bestaande modals — geen dubbele content)
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // CTA kent de inlogstatus (testronde 2, wens Bert): ingelogde docent ziet
  // "Ga naar dashboard", anders "Log in of maak een gratis account". Lichte
  // sessie-check; falen = behandelen als uitgelogd.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getSupabase } = await import('../lib/supabase');
        const supabase = await getSupabase();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setIsLoggedIn(!!data.session);
      } catch {
        // stil — zonder sessie-info tonen we het uitgelogde label
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTabChange = (tab: LandingTab) => {
    setLandingTab(tab);
    // Houd de tab-balk in beeld bij het wisselen (anders sta je ineens
    // halverwege een andere pagina-inhoud)
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Hero-knop "Bekijk de demo": de video's staan op het "Aan de slag"-tab —
  // eerst (zo nodig) wisselen, daarna naar de sectie scrollen.
  const handleShowDemo = () => {
    setLandingTab('get-started');
    requestAnimationFrame(() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }));
  };

  return (
    <div className="min-h-screen bg-bg-app text-text-main">
      {/* Terug naar de SoundScout-app (losse route → volledige navigatie) + taalwissel */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('teacher.common.backToSoundScout')}
        </button>
        <LanguageSwitcher variant="light" />
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-16 sm:gap-24">
        <HeroSection onShowDemo={handleShowDemo} isLoggedIn={isLoggedIn} />

        <div ref={tabsRef} className="scroll-mt-6">
          <SegmentedTabs<LandingTab>
            variant="large"
            value={landingTab}
            onChange={handleTabChange}
            tabs={[
              { id: 'get-started', label: t('teacherLanding.tabs.getStarted'), icon: Rocket },
              { id: 'why', label: t('teacherLanding.tabs.why'), icon: Sparkles },
            ]}
          />
        </div>

        {landingTab === 'get-started' ? (
          <>
            <ComposeSection activeVariant={activeVariant} onSelect={setActiveVariant} />
            <VideosSection />
            <ThemesSection />
            <StepsSection />
            <LessonsSection />
          </>
        ) : (
          <>
            <UspSection />
            <FeedbackCycleSection />
            <PrivacyBand onOpenPrivacy={() => setShowPrivacy(true)} />
            <FaqSection />
            <CurriculumSection />
          </>
        )}
      </div>
      <WorkshopsBand />
      <LandingFooter onOpenPrivacy={() => setShowPrivacy(true)} onOpenContact={() => setShowContact(true)} />

      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      {showContact && (
        <FeedbackModal isOpen={showContact} onClose={() => setShowContact(false)} mode="feedback" />
      )}
    </div>
  );
}

// --- Footer: wordmark + links (privacy/handleiding/contact) + attributie ---
function LandingFooter({ onOpenPrivacy, onOpenContact }: { onOpenPrivacy: () => void; onOpenContact: () => void }) {
  const { t } = useTranslation();
  return (
    <footer className="bg-bg-app py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 text-text-main font-extrabold tracking-tight">
          <Music className="w-4 h-4 text-accent-500" />
          SoundScout
        </span>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm">
          <button onClick={onOpenPrivacy} className="text-text-muted hover:text-text-main underline underline-offset-2 transition-colors">
            {t('teacherLanding.footer.privacy')}
          </button>
          <button onClick={() => navigateToTeacherApp()} className="text-text-muted hover:text-text-main underline underline-offset-2 transition-colors">
            {t('teacherLanding.footer.guide')}
          </button>
          <button onClick={onOpenContact} className="text-text-muted hover:text-text-main underline underline-offset-2 transition-colors">
            {t('teacherLanding.footer.contact')}
          </button>
        </nav>
        <p className="text-sm text-text-muted">{t('teacherLanding.footer.madeBy')}</p>
      </div>
    </footer>
  );
}

// --- Sectie 1: Hero ---
function HeroSection({ onShowDemo, isLoggedIn }: { onShowDemo: () => void; isLoggedIn: boolean }) {
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
          <Button
            variant="primary"
            size="lg"
            className="rounded-full w-full sm:w-auto"
            onClick={() => navigateToTeacherApp()}
          >
            {isLoggedIn ? t('teacherLanding.hero.ctaDashboard') : t('teacherLanding.hero.ctaLogin')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-full sm:w-auto"
            onClick={onShowDemo}
          >
            <Play className="w-4 h-4 mr-2" />
            {t('teacherLanding.hero.ctaSecondary')}
          </Button>
        </div>

        {/* Trust-strip: de drie redenen om door te lezen */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 pt-4 border-t border-border-subtle">
          {([
            { Icon: Lock, key: 'noAccounts' },
            { Icon: GraduationCap, key: 'byTeacher' },
            { Icon: BadgeCheck, key: 'curriculum' },
          ] as const).map(({ Icon, key }) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-sm text-text-muted">
              <Icon className="w-4 h-4 text-accent-600" />
              {t(`teacherLanding.trust.${key}`)}
            </span>
          ))}
        </div>
      </div>

      {/* Hero-beeld: de algemene 4-stappen-animatie (G4, wens Bert 18-7) —
          de vorm-specifieke preview leeft nu bij "Drie manieren" (G5) */}
      <div className="order-1 md:order-2 flex flex-col gap-3">
        <div className="rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface shadow-lg">
          <OnboardingAnimation />
        </div>
        <p className="text-sm sm:text-base text-text-muted text-center leading-relaxed px-2">
          {t('teacherLanding.hero.animationCaption')}
        </p>
      </div>
    </section>
  );
}

// --- Sectie: Waarom SoundScout (USP's — de uniciteit in vier kaarten) ---
const USP_ITEMS = [
  { key: 'collect', Icon: MapPin },
  { key: 'noAccounts', Icon: Lock },
  { key: 'praatplaat', Icon: MonitorPlay },
  { key: 'feedback', Icon: MessagesSquare },
] as const;

function UspSection() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t('teacherLanding.usp.title')}
        </h2>
        <p className="text-text-muted text-base sm:text-lg">
          {t('teacherLanding.usp.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {USP_ITEMS.map(({ key, Icon }) => (
          <Card key={key} padding="lg" className="flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
              <Icon size={22} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-text-main mb-1">
                {t(`teacherLanding.usp.${key}.title`)}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {t(`teacherLanding.usp.${key}.description`)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

// --- Sectie: De feedback-cirkel (slanke band — docent- + peer-feedback) ---
const CYCLE_STEPS = [
  { key: 'assign', Icon: ClipboardList },
  { key: 'create', Icon: Music },
  { key: 'submit', Icon: Send },
  { key: 'feedback', Icon: Star },
  { key: 'improve', Icon: RefreshCw },
] as const;

function FeedbackCycleSection() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t('teacherLanding.feedbackCycle.title')}
        </h2>
        <p className="text-text-muted text-base sm:text-lg">
          {t('teacherLanding.feedbackCycle.subtitle')}
        </p>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap items-stretch justify-center gap-2">
        {CYCLE_STEPS.map(({ key, Icon }, i) => (
          <div key={key} className="flex items-center gap-2 flex-1 min-w-[100px]">
            <div className="flex-1 bg-accent-50 border border-accent-200 rounded-2xl px-3 py-4 text-center">
              <Icon className="w-5 h-5 text-accent-700 mx-auto mb-1.5" />
              <p className="text-xs sm:text-sm font-bold text-accent-800">
                {t(`teacherLanding.feedbackCycle.steps.${key}`)}
              </p>
            </div>
            {i < CYCLE_STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 text-text-muted shrink-0 hidden sm:block" />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm sm:text-base text-text-muted max-w-3xl mx-auto leading-relaxed">
        {t('teacherLanding.feedbackCycle.description')}
      </p>
    </section>
  );
}

// --- Sectie: Actuele thema's (leest het thema-register incl. seizoensrooster —
//     nieuwe/seizoensgebonden thema's verschijnen hier automatisch) ---
function ThemesSection() {
  const { t } = useTranslation();
  const themes = getPublicThemes();
  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t('teacherLanding.themes.title')}
        </h2>
        <p className="text-text-muted text-base sm:text-lg">
          {t('teacherLanding.themes.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {themes.map((theme) => {
          const isSeasonal = !!(theme.activeFrom && theme.activeUntil);
          return (
            <a
              key={theme.id}
              href={`/?theme=${theme.id}`}
              className="group rounded-2xl border-2 border-border-subtle bg-bg-surface overflow-hidden hover:shadow-md transition-all hover:scale-[1.01]"
            >
              <div className="relative aspect-video bg-neutral-100 overflow-hidden">
                <img
                  src={theme.map.backgroundImage}
                  alt={t(theme.name)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {isSeasonal && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-accent-400 text-accent-900 text-xs font-bold px-2.5 py-1">
                    <Sparkles className="w-3 h-3" />
                    {t('teacherLanding.themes.seasonal')}
                  </span>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="text-lg font-bold text-text-main mb-1">{t(theme.name)}</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-2">{t(theme.description)}</p>
                <p className="text-xs text-text-muted">
                  {t('teacherLanding.themes.stats', {
                    locations: theme.locations.length,
                    sounds: theme.samples.length,
                  })}
                  <span className="text-accent-700 font-semibold ml-2 inline-flex items-center gap-0.5">
                    {t('teacherLanding.themes.try')}
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

// --- Sectie: Veelgestelde vragen (native details/summary — a11y gratis) ---
const FAQ_KEYS = [
  'accounts', 'avg', 'devices', 'install', 'groups',
  'knowledge', 'duration', 'submit', 'home', 'cost',
] as const;

function FaqSection() {
  const { t } = useTranslation();
  return (
    <section id="faq" className="flex flex-col gap-6 sm:gap-8 scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
        {t('teacherLanding.faq.title')}
      </h2>
      <div className="flex flex-col gap-2.5 max-w-3xl mx-auto w-full">
        {FAQ_KEYS.map((key) => (
          <details
            key={key}
            className="group rounded-2xl border border-border-subtle bg-bg-surface px-4 sm:px-5 py-3.5 open:shadow-sm"
          >
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-bold text-text-main text-sm sm:text-base [&::-webkit-details-marker]:hidden">
              {t(`teacherLanding.faq.items.${key}.q`)}
              <ChevronDown className="w-4 h-4 text-text-muted shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed mt-2.5">
              {t(`teacherLanding.faq.items.${key}.a`)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

// --- Paneel: Privacy als uitgangspunt (opent bestaande PrivacyModal) ---
// Licht paneel binnen de content-flow (testronde 1: de donkere band viel
// te zwaar); staat op het "Waarom SoundScout"-tab tussen feedback-cirkel
// en FAQ.
function PrivacyBand({ onOpenPrivacy }: { onOpenPrivacy: () => void }) {
  const { t } = useTranslation();
  const points = ['point1', 'point2', 'point3'] as const;
  return (
    <section className="bg-accent-50 border border-accent-100 rounded-3xl">
      <div className="px-4 sm:px-6 py-10 sm:py-12 flex flex-col items-center text-center gap-5">
        <h2 className="inline-flex items-center gap-2 text-xl sm:text-2xl font-extrabold tracking-tight text-text-main">
          <ShieldCheck className="w-6 h-6 text-accent-600" />
          {t('teacherLanding.privacyBand.title')}
        </h2>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {points.map((point) => (
            <span key={point} className="inline-flex items-center gap-1.5 text-sm sm:text-base text-text-muted">
              <BadgeCheck className="w-4 h-4 text-accent-600 shrink-0" />
              {t(`teacherLanding.privacyBand.${point}`)}
            </span>
          ))}
        </div>
        <button
          onClick={onOpenPrivacy}
          className="text-sm text-text-muted hover:text-text-main underline underline-offset-2 transition-colors"
        >
          {t('teacherLanding.privacyBand.link')}
        </button>
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

      {/* G5 (wens Bert 18-7): knoppen links in een kolom, rechts de preview
          die live meewisselt met de gekozen vorm */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,22rem)_1fr] gap-6 items-start">
        <div className="flex flex-col gap-3">
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

        <div className="flex flex-col gap-3 md:sticky md:top-6">
          <ComposePreview variant={activeVariant} />
          <p className="text-sm sm:text-base text-text-muted text-center leading-relaxed px-2">
            {t(`teacherLanding.compose.captions.${activeVariant}`)}
          </p>
        </div>
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
    <section id="demo" className="flex flex-col gap-6 sm:gap-8 scroll-mt-24">
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
        <Button
          variant="primary"
          size="lg"
          className="rounded-full"
          onClick={() => navigateToTeacherApp()}
        >
          {t('teacherLanding.steps.ctaDashboard')}
        </Button>
      </div>
    </section>
  );
}

// --- Sectie 5: Kant-en-klare leskaarten (master-detail, DB-gedreven) ---
// Leest de ingebouwde leskaarten publiek via get_builtin_lesson_cards() → één
// bron van waarheid met het docentendashboard. "Open voor je klas" stuurt de
// docent naar het dashboard (met login) om de leskaart in één klik te activeren.

const LESSON_TYPE_ICON: Record<AssignmentType, LucideIcon> = {
  praatplaat: MapPin,
  storyboard: Film,
  free: Music,
  template: FileText,
};

const LESSON_TYPE_TAG: Record<AssignmentType, { labelKey: string; classes: string }> = {
  praatplaat: { labelKey: 'templates.typePraatplaat', classes: 'bg-teal-50 text-teal-600' },
  storyboard: { labelKey: 'templates.typeStoryboard', classes: 'bg-purple-50 text-purple-600' },
  free: { labelKey: 'templates.typeFree', classes: 'bg-rose-50 text-rose-600' },
  template: { labelKey: 'templates.typeTemplate', classes: 'bg-accent-50 text-accent-700' },
};

/**
 * Curatie (testronde 2, wens Bert): alleen deze ingebouwde leskaarten zijn
 * zichtbaar op de publieke landingspagina — er komen meer leskaarten dan er
 * hier hoeven te staan. Het dashboard toont altijd alles. Volgorde hier =
 * volgorde op de pagina.
 */
const LANDING_LESSON_KEYS = ['robotfabriek', 'verspringen', 'vrij-basis', 'drumbeat'];

function LessonsSection() {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState<PublicLessonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBuiltinLessonCards()
      .then((data) => {
        if (cancelled) return;
        const curated = LANDING_LESSON_KEYS
          .map((key) => data.find((l) => l.builtinKey === key))
          .filter((l): l is PublicLessonCard => !!l);
        setLessons(curated);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selected = lessons.find((l) => l.id === selectedId) ?? lessons[0] ?? null;

  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
        {t('teacherLanding.lessons.title')}
      </h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-7 h-7 text-accent-500 animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <p className="text-center text-text-muted">{t('teacherLanding.lessons.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,18rem)_1fr] gap-4 sm:gap-6 items-start">
          {/* Links: selecteerbare lijst */}
          <div className="flex flex-col gap-3">
            {lessons.map((lesson) => {
              const isActive = selected?.id === lesson.id;
              const Icon = LESSON_TYPE_ICON[lesson.assignmentType];
              const tag = LESSON_TYPE_TAG[lesson.assignmentType];
              const loc = localizeLessonCard(t, lesson);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedId(lesson.id)}
                  className={cn(
                    'w-full flex items-center gap-3 text-left p-3 rounded-2xl border-2 bg-bg-surface',
                    'transition-all duration-200 min-h-[44px] cursor-pointer',
                    isActive ? 'border-accent-400 bg-accent-50 shadow-sm' : 'border-border-subtle hover:border-accent-300'
                  )}
                >
                  <span className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0 flex items-center justify-center">
                    {lesson.coverImage ? (
                      <img src={lesson.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon size={20} className="text-text-muted" />
                    )}
                  </span>
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-text-main text-sm leading-tight truncate">
                      {loc.title}
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn('inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5', tag.classes)}>
                        {t(tag.labelKey)}
                      </span>
                      {loc.level && (
                        <span className="text-xs text-text-muted truncate">{loc.level}</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rechts: detail in kader */}
          <Card padding="lg" className="border border-border-subtle">
            {selected && <LessonDetail lesson={selected} />}
          </Card>
        </div>
      )}

      {/* Dit is maar een greep — verwijs naar de volledige lijst in het dashboard. */}
      {!loading && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full"
            onClick={() => navigateToTeacherApp({ tab: 'lessons' })}
          >
            {t('teacherLanding.lessons.viewAll')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </section>
  );
}

function LessonDetail({ lesson }: { lesson: PublicLessonCard }) {
  const { t } = useTranslation();
  const tag = LESSON_TYPE_TAG[lesson.assignmentType];
  const loc = localizeLessonCard(t, lesson);
  return (
    <div className="flex flex-col gap-4">
      {/* Cover boven het detail, net als in het dashboard (I12) */}
      {lesson.coverImage && (
        <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-neutral-100">
          <img src={lesson.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-xl font-extrabold text-text-main">{loc.title}</h3>
          <span className={cn('inline-flex items-center rounded-full text-xs font-bold px-2.5 py-0.5', tag.classes)}>
            {t(tag.labelKey)}
          </span>
        </div>
        {loc.level && <p className="text-sm text-text-muted">{loc.level}</p>}
      </div>

      {loc.lessonGoal && (
        <p className="text-sm sm:text-base text-text-main leading-relaxed">
          <span className="font-bold">{t('teacherLanding.lessons.goalLabel')} </span>
          {loc.lessonGoal}
        </p>
      )}

      {loc.phases.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-bold text-text-main">{t('teacherLanding.lessons.phasesTitle')}</h4>
          <ul className="flex flex-col gap-2">
            {loc.phases.map((p, i) => (
              <li key={i} className="border-l-2 border-accent-400 pl-3 text-sm sm:text-base">
                <span className="font-bold text-text-main">{p.name}</span>
                {p.name && p.text ? <span className="text-text-muted">{' — '}{p.text}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-1">
        <Button
          variant="primary"
          size="md"
          className="rounded-full"
          onClick={() => navigateToTeacherApp({ lesson: lesson.builtinKey })}
        >
          <Play className="w-4 h-4 mr-2" />
          {t('teacherLanding.lessons.openForClass')}
        </Button>
        {lesson.pdfUrl && (
          <a
            href={lesson.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold border border-border-subtle text-text-main hover:bg-neutral-50 transition-colors"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {t('teacherLanding.lessons.download')}
          </a>
        )}
        {/* Statische leskaart-pagina (R4): interne SEO-link. Expliciet
            index.html + nieuw tabblad (I3): Vite dev kent geen directory-
            index (/les/x/ viel terug op de app) en de pagina is puur info. */}
        {lesson.builtinKey && (
          <a
            href={`/les/${lesson.builtinKey}/index.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold border border-border-subtle text-text-main hover:bg-neutral-50 transition-colors"
          >
            {t('teacherLanding.lessons.viewLessonPage')}
          </a>
        )}
      </div>
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
