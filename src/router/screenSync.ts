/**
 * De koppeling tussen de router en de appStore — de ENIGE plek waar die twee
 * elkaar raken (V2 Fase 2).
 *
 * Het pad in de adresbalk bepaalt welk scherm er staat: de router rendert het
 * scherm, niet meer een `switch` op `currentScreen`. De ~100 plekken die
 * `goToStudio()`, `goToMap()` enz. aanroepen blijven ongewijzigd:
 *
 *  1. appStore → router. Een `goTo…()` zet `currentScreen` (plus locatie-id of
 *     deelcode). `bindStoreToRouter` ziet die wijziging en navigeert naar het
 *     pad dat erbij hoort (`pathForScreen`). `currentScreen` is daarmee een
 *     opdracht ("ga hierheen"), geen weergave.
 *  2. router → appStore. Na elke afgeronde navigatie — ook Terug/Vooruit en
 *     een link die direct op een pad binnenkomt — wordt `currentScreen`
 *     gelijkgezet aan de route. Komt de wijziging niet uit de store zelf, dan
 *     loopt ze via dezelfde `goTo…()`-acties, zodat hun opruimwerk (bv.
 *     `goToStart` wist de deelcode) ook bij de terugknop gebeurt.
 *
 * Zonder router (unit-tests, de e2e-harness) verandert er niets: de store
 * werkt dan precies als voorheen.
 */
import type { RegisteredRouter } from '@tanstack/react-router';
import { useAppStore } from '../stores/appStore';
import type { GameScreen } from '../types';
import { pathForScreen, type ScreenState } from './paths';

let booted = false;

/**
 * False tot de eerste navigatie is afgerond. Werkschermen (kaart, locatie,
 * studio, podium) zijn geen instappunt: wie daar koud binnenkomt (herladen,
 * bladwijzer) gaat naar het startscherm, waar "Verder werken" klaarstaat.
 */
export function hasSessionStarted(): boolean {
  return booted;
}

function screenChanged(a: ScreenState, b: ScreenState): boolean {
  return (
    a.currentScreen !== b.currentScreen ||
    a.currentLocationId !== b.currentLocationId ||
    a.shareCode !== b.shareCode ||
    a.sharedPraatplaatCode !== b.sharedPraatplaatCode ||
    a.sharedAlbumCode !== b.sharedAlbumCode
  );
}

/** Navigeer naar het pad van de scherm-toestand; het thema blijft in het adres. */
function navigateToScreen(router: RegisteredRouter, state: ScreenState): void {
  const search = true as const;
  switch (state.currentScreen) {
    case 'location':
      if (state.currentLocationId) {
        void router.navigate({ to: '/locatie/$locationId', params: { locationId: state.currentLocationId }, search });
      } else {
        void router.navigate({ to: '/kaart', search });
      }
      return;
    case 'shared':
      if (state.shareCode) void router.navigate({ to: '/gedeeld/$code', params: { code: state.shareCode }, search });
      else void router.navigate({ to: '/', search });
      return;
    case 'shared-praatplaat':
      if (state.sharedPraatplaatCode) {
        void router.navigate({ to: '/praatplaat/gedeeld/$code', params: { code: state.sharedPraatplaatCode }, search });
      } else {
        void router.navigate({ to: '/', search });
      }
      return;
    case 'shared-album':
      if (state.sharedAlbumCode) void router.navigate({ to: '/album/$code', params: { code: state.sharedAlbumCode }, search });
      else void router.navigate({ to: '/', search });
      return;
    case 'start': void router.navigate({ to: '/', search }); return;
    case 'compose-mode': void router.navigate({ to: '/nieuw', search }); return;
    case 'map': void router.navigate({ to: '/kaart', search }); return;
    case 'studio': void router.navigate({ to: '/studio', search }); return;
    case 'stage': void router.navigate({ to: '/podium', search }); return;
    case 'compositions': void router.navigate({ to: '/composities', search }); return;
    case 'teacher': void router.navigate({ to: '/docent', search }); return;
    case 'tutorial': void router.navigate({ to: '/uitleg', search }); return;
    case 'teacher-guide': void router.navigate({ to: '/handleiding', search }); return;
    case 'praatplaat-select': void router.navigate({ to: '/praatplaat/plek', search }); return;
    case 'assignment-landing': void router.navigate({ to: '/opdracht', search }); return;
  }
}

/** Zet de store gelijk aan de route waar de router op is uitgekomen. */
export function applyRouteToStore(screen: GameScreen, params: Record<string, string | undefined>): void {
  const app = useAppStore.getState();
  const wanted: ScreenState = {
    currentScreen: screen,
    currentLocationId: screen === 'location' ? params.locationId ?? null : app.currentLocationId,
    shareCode: screen === 'shared' ? params.code ?? null : app.shareCode,
    sharedPraatplaatCode: screen === 'shared-praatplaat' ? params.code ?? null : app.sharedPraatplaatCode,
    sharedAlbumCode: screen === 'shared-album' ? params.code ?? null : app.sharedAlbumCode,
  };
  if (pathForScreen(wanted) === pathForScreen(app) && app.currentScreen === screen) return;

  switch (screen) {
    case 'start': app.goToStart(); return;
    case 'map': app.goToMap(); return;
    case 'studio': app.goToStudio(); return;
    case 'stage': app.goToStage(); return;
    case 'location':
      if (params.locationId) app.goToLocation(params.locationId);
      return;
    case 'shared':
      if (params.code) app.goToShared(params.code);
      return;
    case 'shared-praatplaat':
      if (params.code) app.goToSharedPraatplaat(params.code);
      return;
    case 'shared-album':
      if (params.code) app.goToSharedAlbum(params.code);
      return;
    default:
      app.setScreen(screen);
  }
}

/** Koppel store en router. Eén keer aanroepen, direct na `createRouter`. */
export function bindStoreToRouter(router: RegisteredRouter): () => void {
  const unsubscribeStore = useAppStore.subscribe((state, prev) => {
    if (!screenChanged(state, prev)) return;
    if (pathForScreen(state) === router.latestLocation.pathname) return;
    navigateToScreen(router, state);
  });

  const unsubscribeRouter = router.subscribe('onResolved', () => {
    booted = true;
    const leaf = router.state.matches[router.state.matches.length - 1];
    const screen = leaf?.staticData.screen;
    if (!screen) return; // losse pagina's (/teacher, /over, dev-routes)
    applyRouteToStore(screen, leaf.params as Record<string, string | undefined>);
  });

  return () => {
    unsubscribeStore();
    unsubscribeRouter();
  };
}
