/**
 * De router van SoundScout (V2 Fase 2). Eén instantie voor de hele app.
 */
import { createRouter } from '@tanstack/react-router';
import { captureEntryLocation } from './entryLocation';
import { routeTree } from './routes';
import { bindStoreToRouter } from './screenSync';
import { parseSearch, stringifySearch } from './searchParams';

// Vóór de router de adresbalk opschoont: AuthContext wil weten hoe de
// bezoeker binnenkwam (wachtwoord-reset-link).
captureEntryLocation();

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export const router = createRouter({
  routeTree,
  parseSearch,
  stringifySearch,
  // Korte overvloeier tussen schermen (zie index.css, ::view-transition-*).
  // Geen overgang bij "minder beweging" of als alleen het zoekdeel wijzigt;
  // browsers zonder View Transitions wisselen gewoon direct.
  defaultViewTransition: {
    types: ({ pathChanged }) => (pathChanged && !prefersReducedMotion() ? ['screen'] : false),
  },
});

bindStoreToRouter(router);

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
