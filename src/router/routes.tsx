/**
 * De routes van SoundScout (V2 Fase 2) — TanStack Router, SPA-modus.
 *
 *  root
 *  ├─ /teacher, /teacher.html, /over, /over.html   losse pagina's (eigen HTML + SEO-meta)
 *  ├─ /beheer                                      beheerdersdashboard (eigen chunk, eigen login-poort)
 *  ├─ /editor, /sequencer, /v2-mockup              alleen in ontwikkeling
 *  └─ app-layout (AppShell: thema, auth, werk-in-uitvoering)
 *       ├─ /  /nieuw  /kaart  /locatie/$locationId  /studio  /podium …
 *       └─ al het andere → startscherm
 *
 * Elke app-route draagt in `staticData.screen` het `GameScreen` dat erbij
 * hoort; screenSync.ts houdt de appStore daarmee gelijk.
 * Tabel met alle adressen: docs/v2/URL-CONTRACT.md.
 */
/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';
import {
  Outlet,
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore';
import { useThemeStore } from '../stores/themeStore';
import { useDevFlagsStore } from '../stores/devFlagsStore';
import { lookupAndRouteAssignment } from '../utils/compositionInit';
import { logger } from '../utils/logger';
import { FeatureErrorBoundary } from '../components/common/FeatureErrorBoundary';
import { StartScreen } from '../components/StartScreen';
import { MapView } from '../components/map/MapView';
import { LocationScene } from '../components/location/LocationScene';
import type { GameScreen } from '../types';
import AppShell from './AppShell';
import { resolveLegacyEntry, type LegacyEffect } from './legacyEntry';
import { validateAppSearch } from './searchParams';
import { hasSessionStarted } from './screenSync';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Het appStore-scherm dat bij deze route hoort (alleen app-routes) */
    screen?: GameScreen;
  }
}

// --- Hulpjes ---

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app text-text-muted">
      <div className="text-center">
        <div className="text-lg font-medium">{t('common.loading')}</div>
      </div>
    </div>
  );
}

function Feature({ name, children }: { name: string; children: ReactNode }) {
  return (
    <FeatureErrorBoundary featureName={name}>
      <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
    </FeatureErrorBoundary>
  );
}

interface PreloadableComponent {
  (): ReactNode;
  preload: () => Promise<void>;
}

/**
 * Een lazy scherm in zijn eigen chunk. De router roept `preload` aan vóór hij
 * van scherm wisselt, zodat de overgang naar het echte scherm gaat en niet
 * naar "Laden…". Is de chunk er toch nog niet, dan vangt Suspense het op.
 */
function lazyScreen(name: string, importer: () => Promise<{ default: ComponentType }>): PreloadableComponent {
  let Loaded: ComponentType | null = null;
  let pending: Promise<{ default: ComponentType }> | null = null;
  const load = () => {
    pending ??= importer().then((module) => {
      Loaded = module.default;
      return module;
    });
    // Mislukt de download (wifi weg), dan mag een volgende poging opnieuw
    pending.catch(() => { pending = null; });
    return pending;
  };
  const Lazy = lazy(load);
  const Screen: PreloadableComponent = () => {
    const Ready = Loaded;
    return <Feature name={name}>{Ready ? <Ready /> : <Lazy />}</Feature>;
  };
  Screen.preload = () => load().then(() => undefined);
  return Screen;
}

/** Werkschermen zijn geen instappunt: koud binnenkomen → startscherm. */
function requireSession(): void {
  if (!hasSessionStarted()) throw redirect({ to: '/', search: true, replace: true });
}

function runLegacyEffect(effect: LegacyEffect): void {
  const app = useAppStore.getState();
  switch (effect.type) {
    case 'enableDevFlags':
      useDevFlagsStore.getState().setAllFlags(true);
      return;
    case 'pendingLessonCard':
      app.setPendingLessonCardKey(effect.key);
      return;
    case 'pendingTeacherTab':
      app.setPendingTeacherTab(effect.tab);
      return;
    case 'guideSection':
      app.setPendingGuideSection(effect.section);
      return;
    case 'pendingSaveCode':
      app.setPendingSaveCode(effect.code);
      return;
    case 'lookupClassCode':
      // Via de opdracht-landing (#78), ook voor deeplinks: de leerling ziet
      // eerst welke opdracht ze binnengaat.
      lookupAndRouteAssignment(effect.code).then((result) => {
        if (result !== 'ok') {
          logger.warn(`[router] ?pp=${effect.code}: lookup mislukt`);
          useAppStore.getState().goToStart();
        }
      }).catch((err: unknown) => {
        logger.error('[router] ?pp= lookup failed:', err);
        useAppStore.getState().goToStart();
      });
      return;
  }
}

// --- Root ---

export const rootRoute = createRootRoute({
  component: Outlet,
});

// --- Losse pagina's: eigen HTML-entry met eigen SEO-meta (teacher.html, over.html) ---

const TeacherLandingPage = lazy(() => import('../pages/TeacherLandingPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));

function TeacherLanding() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TeacherLandingPage />
    </Suspense>
  );
}

function About() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AboutPage />
    </Suspense>
  );
}

// --- Beheer (V2 Fase 3): eigen lazy chunk, buiten de app-layout, ook in productie ---

const AdminPage = lazy(() => import('../pages/admin/AdminPage'));

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/beheer',
  component: () => (
    <FeatureErrorBoundary featureName="Admin">
      <Suspense fallback={<LoadingFallback />}>
        <AdminPage />
      </Suspense>
    </FeatureErrorBoundary>
  ),
});

const teacherLandingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/teacher', component: TeacherLanding });
const teacherLandingHtmlRoute = createRoute({ getParentRoute: () => rootRoute, path: '/teacher.html', component: TeacherLanding });
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/over', component: About });
const aboutHtmlRoute = createRoute({ getParentRoute: () => rootRoute, path: '/over.html', component: About });

// --- Alleen in ontwikkeling (in productie vallen deze paden op het startscherm) ---

const EditorHub = lazy(() => import('../pages/EditorHub').then((m) => ({ default: m.EditorHub })));
const SequencerLab = lazy(() => import('../pages/SequencerLab'));
const V2Mockup = lazy(() => import('../pages/V2Mockup'));

const devRoutes = import.meta.env.DEV
  ? [
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/editor',
        component: () => <Suspense fallback={null}><EditorHub /></Suspense>,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/sequencer',
        component: () => <Suspense fallback={null}><SequencerLab /></Suspense>,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/v2-mockup',
        component: () => <Suspense fallback={null}><V2Mockup /></Suspense>,
      }),
    ]
  : [];

// --- App-layout ---

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  validateSearch: validateAppSearch,
  // Oude links (?share=, ?album=, ?pp-share=, ?pp=, ?screen=…, #code=) werken
  // op elk pad: eerst onthouden wat erbij hoort, dan door naar het scherm.
  beforeLoad: ({ search, location }) => {
    const legacy = resolveLegacyEntry(location.pathname, search, location.hash);
    if (!legacy) return;
    legacy.effects.forEach(runLegacyEffect);
    throw redirect({ href: legacy.href, replace: true });
  },
  component: AppShell,
});

const app = () => appRoute;

const startRoute = createRoute({
  getParentRoute: app,
  path: '/',
  staticData: { screen: 'start' },
  component: StartScreen,
});

const composeModeRoute = createRoute({
  getParentRoute: app,
  path: '/nieuw',
  staticData: { screen: 'compose-mode' },
  beforeLoad: requireSession,
  component: lazyScreen('ComposeMode', () => import('../components/start/ComposeModeScreen')),
});

const mapRoute = createRoute({
  getParentRoute: app,
  path: '/kaart',
  staticData: { screen: 'map' },
  beforeLoad: requireSession,
  component: () => (
    <FeatureErrorBoundary featureName="Map">
      <MapView />
    </FeatureErrorBoundary>
  ),
});

const locationRoute = createRoute({
  getParentRoute: app,
  path: '/locatie/$locationId',
  staticData: { screen: 'location' },
  beforeLoad: ({ params }) => {
    requireSession();
    // Een locatie die niet in het thema van nu zit (oude geschiedenis-stap na
    // een themawissel): terug naar de kaart.
    if (!useThemeStore.getState().getLocationById(params.locationId)) {
      throw redirect({ to: '/kaart', search: true, replace: true });
    }
  },
  component: () => (
    <FeatureErrorBoundary featureName="Location">
      <LocationScene />
    </FeatureErrorBoundary>
  ),
});

const studioRoute = createRoute({
  getParentRoute: app,
  path: '/studio',
  staticData: { screen: 'studio' },
  beforeLoad: requireSession,
  component: lazyScreen('Studio', () => import('../components/studio/StudioView')),
});

const stageRoute = createRoute({
  getParentRoute: app,
  path: '/podium',
  staticData: { screen: 'stage' },
  beforeLoad: requireSession,
  component: lazyScreen('Stage', () => import('../components/stage/StageView')),
});

const compositionsRoute = createRoute({
  getParentRoute: app,
  path: '/composities',
  staticData: { screen: 'compositions' },
  component: lazyScreen('Compositions', () => import('../components/compositions/CompositionsView')),
});

const tutorialRoute = createRoute({
  getParentRoute: app,
  path: '/uitleg',
  staticData: { screen: 'tutorial' },
  component: lazyScreen('Tutorial', () => import('../components/tutorial/TutorialScreen')),
});

const teacherGuideRoute = createRoute({
  getParentRoute: app,
  path: '/handleiding',
  staticData: { screen: 'teacher-guide' },
  component: lazyScreen('TeacherGuide', () => import('../components/teacher/TeacherGuideScreen')),
});

const teacherRoute = createRoute({
  getParentRoute: app,
  path: '/docent',
  staticData: { screen: 'teacher' },
  component: lazyScreen('Teacher', () => import('../pages/TeacherPage')),
});

const assignmentLandingRoute = createRoute({
  getParentRoute: app,
  path: '/opdracht',
  staticData: { screen: 'assignment-landing' },
  // Zonder opgezochte klascode valt er niets te tonen
  beforeLoad: () => {
    if (!useAppStore.getState().pendingAssignment) throw redirect({ to: '/', search: true, replace: true });
  },
  component: lazyScreen('AssignmentLanding', () => import('../components/assignment/AssignmentLandingScreen')),
});

const praatplaatSelectRoute = createRoute({
  getParentRoute: app,
  path: '/praatplaat/plek',
  staticData: { screen: 'praatplaat-select' },
  beforeLoad: () => {
    if (!useAppStore.getState().activePraatplaat) throw redirect({ to: '/', search: true, replace: true });
  },
  component: lazyScreen('Praatplaat', () => import('../components/praatplaat/PraatplaatSelectScreen')),
});

// --- Gedeelde schermen: de code staat in het pad, dus herladen en doorsturen werkt ---

const SharedPlayer = lazyRouteComponent(() => import('../components/share/SharedPlayer'));
const SharedPraatplaatViewer = lazyRouteComponent(() => import('../components/praatplaat/SharedPraatplaatViewer'));
const SharedAlbumViewer = lazyRouteComponent(() => import('../components/share/SharedAlbumViewer'));

const backToStart = () => useAppStore.getState().goToStart();

const sharedRoute = createRoute({
  getParentRoute: app,
  path: '/gedeeld/$code',
  staticData: { screen: 'shared' },
  component: function SharedScreen() {
    const { code } = sharedRoute.useParams();
    return (
      <Feature name="Player">
        <SharedPlayer key={code} code={code} onBack={backToStart} />
      </Feature>
    );
  },
});

const sharedPraatplaatRoute = createRoute({
  getParentRoute: app,
  path: '/praatplaat/gedeeld/$code',
  staticData: { screen: 'shared-praatplaat' },
  component: function SharedPraatplaatScreen() {
    const { code } = sharedPraatplaatRoute.useParams();
    return (
      <Feature name="SharedPraatplaat">
        <SharedPraatplaatViewer key={code} code={code} onBack={backToStart} />
      </Feature>
    );
  },
});

const sharedAlbumRoute = createRoute({
  getParentRoute: app,
  path: '/album/$code',
  staticData: { screen: 'shared-album' },
  component: function SharedAlbumScreen() {
    const { code } = sharedAlbumRoute.useParams();
    return (
      <Feature name="SharedAlbum">
        <SharedAlbumViewer key={code} code={code} onBack={backToStart} />
      </Feature>
    );
  },
});

// Onbekend pad (ook /index.html, en /editor in productie): het startscherm,
// zoals altijd. Oude parameters zijn hierboven in de layout al afgehandeld.
const fallbackRoute = createRoute({
  getParentRoute: app,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/', search: true, replace: true });
  },
});

export const routeTree = rootRoute.addChildren([
  teacherLandingRoute,
  teacherLandingHtmlRoute,
  aboutRoute,
  aboutHtmlRoute,
  adminRoute,
  ...devRoutes,
  appRoute.addChildren([
    startRoute,
    composeModeRoute,
    mapRoute,
    locationRoute,
    studioRoute,
    stageRoute,
    compositionsRoute,
    tutorialRoute,
    teacherGuideRoute,
    teacherRoute,
    assignmentLandingRoute,
    praatplaatSelectRoute,
    sharedRoute,
    sharedPraatplaatRoute,
    sharedAlbumRoute,
    fallbackRoute,
  ]),
]);
