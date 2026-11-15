/**
 * Developer Feature Flags Store
 *
 * Controls visibility of features in development.
 * Activated via ?dev=true URL parameter, persisted in localStorage.
 *
 * Usage:
 *   const sectionsEnabled = useDevFlagsStore((s) => s.sections);
 */

import { create } from 'zustand';

const STORAGE_KEY = 'soundscout:dev-flags';

interface DevFlags {
  /** Enable sections (musical form / vormschema) on timeline */
  sections: boolean;
  /** Enable template system for teachers */
  templates: boolean;
  /** Podiumstap "Luisterspiegel" (vormkaart + reflectievragen) */
  luisterspiegel: boolean;
}

/**
 * Luisterspiegel staat in ontwikkeling standaard AAN en in een productie-build
 * UIT (daar aan te zetten met ?dev=true, net als de andere vlaggen).
 */
const LUISTERSPIEGEL_DEFAULT: boolean = import.meta.env.DEV;

interface DevFlagsStore extends DevFlags {
  /** Set all flags at once */
  setAllFlags: (enabled: boolean) => void;
  /** Set a single flag */
  setFlag: (flag: keyof DevFlags, enabled: boolean) => void;
  /** Initialize from localStorage */
  hydrate: () => void;
}

function loadFlags(): Partial<DevFlags> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<DevFlags>;
  } catch {
    // Ignore parse errors
  }
  return {};
}

function persistFlags(flags: DevFlags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // Ignore storage errors
  }
}

export const useDevFlagsStore = create<DevFlagsStore>((set, get) => ({
  // Default: all flags off (luisterspiegel: aan in ontwikkeling)
  sections: false,
  templates: false,
  luisterspiegel: LUISTERSPIEGEL_DEFAULT,

  setAllFlags: (enabled) => {
    const flags: DevFlags = { sections: enabled, templates: enabled, luisterspiegel: enabled };
    persistFlags(flags);
    set(flags);
  },

  setFlag: (flag, enabled) => {
    const { sections, templates, luisterspiegel } = get();
    const flags: DevFlags = { sections, templates, luisterspiegel, [flag]: enabled };
    persistFlags(flags);
    set({ [flag]: enabled });
  },

  hydrate: () => {
    const saved = loadFlags();
    if (saved.sections !== undefined || saved.templates !== undefined || saved.luisterspiegel !== undefined) {
      set({
        sections: saved.sections ?? false,
        templates: saved.templates ?? false,
        luisterspiegel: saved.luisterspiegel ?? LUISTERSPIEGEL_DEFAULT,
      });
    }
  },
}));
