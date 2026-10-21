/**
 * Werk-in-uitvoering dat een herlaadbeurt overleeft (A1, B32).
 *
 * De stores leven alleen in het geheugen: een herladen tabblad of een
 * Chromebook die in slaap viel, wiste het werk én de klasverbinding. Deze
 * service spiegelt de open soundscape (tijdlijn, bibliotheek, klas- en
 * beeldcontext) naar localStorage en zet die bij het opstarten stil terug.
 * Er wordt niet genavigeerd: het startscherm toont daarna gewoon "Verder
 * werken", en de bestaande waarschuwing bij "Nieuwe soundscape" geldt weer.
 *
 * Eén sleutel, één werk. Een lege tijdlijn én lege bibliotheek wist de
 * sleutel: dan is er bewust opnieuw begonnen.
 */

import { z } from 'zod';
import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useThemeStore } from '../stores/themeStore';
import { TimelineStateSchema, SampleSchema } from '../utils/schemas';
import { logger } from '../utils/logger';
import type { AppStore } from '../stores/appStore';

const KEY = 'soundscout:wip';
const VERSION = 1;
const DEBOUNCE_MS = 600;

/** De compositie-context uit appStore die bij het werk hoort */
const CONTEXT_FIELDS = [
  'currentCompositionId',
  'compositionTitle',
  'composeMode',
  'activeTemplate',
  'templateLockOptions',
  'activeStoryboard',
  'currentImageIndex',
  'activePraatplaat',
  'praatplaatPosition',
  'classSession',
  'submissionId',
  'submissionSynced',
] as const;

type ContextField = (typeof CONTEXT_FIELDS)[number];
type WorkContext = Pick<AppStore, ContextField>;

const WorkInProgressSchema = z.object({
  version: z.literal(VERSION),
  savedAt: z.string(),
  themeId: z.string(),
  timeline: TimelineStateSchema,
  samples: z.array(SampleSchema),
  // Context-objecten (storyboard, template, klas) zijn app-eigen data;
  // alleen de vorm "object" controleren, de velden komen 1-op-1 terug.
  context: z.record(z.string(), z.unknown()),
});

type WorkInProgress = z.infer<typeof WorkInProgressSchema>;

// --- Lezen / schrijven ---

function hasWork(): boolean {
  return useTimelineStore.getState().selectHasClips()
    || useLibraryStore.getState().librarySamples.length > 0;
}

export function readWorkInProgress(): WorkInProgress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    // Schema als poortwachter; de ruwe data teruggeven, want Zod-objecten
    // strippen onbekende velden (clip- en sample-velden buiten het schema)
    if (!WorkInProgressSchema.safeParse(data).success) {
      logger.warn('[workInProgress] ongeldige snapshot genegeerd');
      return null;
    }
    return data as WorkInProgress;
  } catch {
    return null;
  }
}

export function clearWorkInProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Opslag geblokkeerd: niets te wissen
  }
}

/** Schrijf de huidige soundscape weg (of wis de sleutel als er niets is) */
export function snapshotWorkInProgress(): void {
  if (!hasWork()) {
    clearWorkInProgress();
    return;
  }
  const app = useAppStore.getState();
  const context = Object.fromEntries(CONTEXT_FIELDS.map((f) => [f, app[f]]));
  const snapshot: WorkInProgress = {
    version: VERSION,
    savedAt: new Date().toISOString(),
    themeId: useThemeStore.getState().activeThemeId,
    timeline: useTimelineStore.getState().getTimelineState(),
    samples: useLibraryStore.getState().librarySamples,
    context,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch (error) {
    // Vol of geblokkeerd: het werk blijft in het geheugen, alleen herladen
    // overleeft het dan niet
    logger.warn('[workInProgress] bewaren mislukt', error);
  }
}

/**
 * Zet een bewaarde soundscape terug in de stores, zonder te navigeren.
 * Doet niets als er al werk open staat (dat heeft voorrang).
 * @returns true als er iets is teruggezet
 */
export function restoreWorkInProgress(): boolean {
  if (hasWork()) return false;
  const wip = readWorkInProgress();
  if (!wip) return false;

  // Een expliciete ?theme= in de link wint van het bewaarde thema
  const urlTheme = new URLSearchParams(window.location.search).get('theme');
  if (!urlTheme && wip.themeId !== useThemeStore.getState().activeThemeId) {
    useThemeStore.getState().setTheme(wip.themeId);
  }

  useTimelineStore.getState().loadTimeline(wip.timeline);
  useLibraryStore.getState().loadLibrary(wip.samples);

  const context: Partial<WorkContext> = {};
  for (const field of CONTEXT_FIELDS) {
    if (field in wip.context) {
      (context as Record<string, unknown>)[field] = wip.context[field];
    }
  }
  useAppStore.setState(context);
  logger.info('[workInProgress] soundscape teruggezet na herladen');
  return true;
}

// --- Automatisch bijhouden ---

/**
 * Zet bewaard werk terug en houd het daarna bij. Geeft een opruimfunctie
 * terug (voor useEffect). Veilig om twee keer aan te roepen (StrictMode).
 */
export function startWorkInProgressPersistence(): () => void {
  restoreWorkInProgress();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      snapshotWorkInProgress();
    }, DEBOUNCE_MS);
  };
  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    snapshotWorkInProgress();
  };

  const unsubTimeline = useTimelineStore.subscribe((s, prev) => {
    if (s.tracks !== prev.tracks || s.sections !== prev.sections
      || s.sequences !== prev.sequences || s.totalBeats !== prev.totalBeats) {
      schedule();
    }
  });
  const unsubLibrary = useLibraryStore.subscribe((s, prev) => {
    if (s.librarySamples !== prev.librarySamples) schedule();
  });
  const unsubApp = useAppStore.subscribe((s, prev) => {
    if (CONTEXT_FIELDS.some((f) => s[f] !== prev[f])) schedule();
  });

  // Tabblad dicht of naar de achtergrond: niet op de debounce wachten
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    flush();
    unsubTimeline();
    unsubLibrary();
    unsubApp();
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
