/// <reference types="vite-plugin-pwa/client" />
/**
 * Registratie van de service worker (V2 Fase 2 — offline).
 * Uitleg, updategedrag en noodrem: docs/v2/OFFLINE.md.
 *
 * Alleen in een productie-build. In `npm run dev` (en dus in de gewone
 * Playwright-suites) bestaat er geen service worker.
 *
 * Updates: een nieuwe versie wordt op de achtergrond geïnstalleerd en WACHT.
 * Ze wordt pas actief als alle tabbladen dicht zijn geweest, of als iemand op
 * een rustig moment op "Vernieuwen" tikt (UpdateNotice). Nooit vanzelf midden
 * in het werk.
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { useThemeStore } from '../stores/themeStore';
import { hasUnsavedWork } from '../hooks/useLeaveGuard';
import { logger } from '../utils/logger';
import { scheduleThemeWarmup } from './warmThemeCache';
import { useUpdateStore } from './updateStore';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const UPDATE_CHECK_MIN_GAP_MS = 10 * 60 * 1000;
const RELOAD_GUARD_KEY = 'soundscout:sw-reload';

let noticeMounted = false;

/** De melding heeft een eigen React-root: los van de app, en pas geladen als ze nodig is. */
async function mountUpdateNotice(): Promise<void> {
  if (noticeMounted) return;
  noticeMounted = true;
  try {
    const { default: UpdateNotice } = await import('./UpdateNotice');
    const host = document.createElement('div');
    host.id = 'pwa-update-notice';
    document.body.appendChild(host);
    createRoot(host).render(createElement(UpdateNotice));
  } catch (error) {
    noticeMounted = false;
    logger.warn('[pwa] updatemelding kon niet worden getoond', error);
  }
}

/** Kijk af en toe of er een nieuwe versie is (lang openstaande tabbladen). */
function watchForUpdates(registration: ServiceWorkerRegistration): void {
  let lastCheck = Date.now();
  const check = () => {
    if (!navigator.onLine || Date.now() - lastCheck < UPDATE_CHECK_MIN_GAP_MS) return;
    lastCheck = Date.now();
    // Mislukt tijdens een half geüploade versie of zonder verbinding: de oude
    // versie blijft gewoon werken en we proberen het later opnieuw.
    registration.update().catch(() => undefined);
  };
  setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}

/**
 * Een ander tabblad heeft de nieuwe versie in gebruik genomen terwijl dit
 * tabblad nog op de oude code draait. De oude codebestanden zijn dan uit de
 * cache; lukt het laden van een scherm daardoor niet, herlaad dan één keer
 * (het werk komt terug via workInProgress).
 */
function recoverFromStaleShell(): void {
  let staleShell = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) staleShell = true;
  });
  window.addEventListener('vite:preloadError', (event) => {
    if (!staleShell) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
      return;
    }
    event.preventDefault();
    window.location.reload();
  });
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      useUpdateStore.setState({ needRefresh: true });
      void mountUpdateNotice();
    },
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration);
    },
    onRegisterError(error) {
      // Geen service worker = de app werkt zoals voorheen, alleen niet offline
      logger.warn('[pwa] service worker niet geregistreerd', error);
    },
  });

  useUpdateStore.setState({
    applyUpdate: () => {
      // Dubbele bewaking: nooit herladen terwijl er werk open staat
      if (hasUnsavedWork()) return;
      // Zelf herladen zodra de nieuwe versie de pagina overneemt. De plugin
      // doet dat alleen voor een update die hij zelf vlak na het laden vond,
      // niet voor een update in een tabblad dat al lang open staat.
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      void updateSW(true);
    },
  });

  recoverFromStaleShell();

  // Mediacache opwarmen voor het actieve thema: nu, bij een themawissel, en
  // zodra de service worker (eerste bezoek) de pagina overneemt.
  const warmActiveTheme = () => scheduleThemeWarmup(useThemeStore.getState().theme);
  useThemeStore.subscribe((s, prev) => {
    if (s.theme !== prev.theme) warmActiveTheme();
  });
  navigator.serviceWorker.addEventListener('controllerchange', warmActiveTheme);
  warmActiveTheme();
}
