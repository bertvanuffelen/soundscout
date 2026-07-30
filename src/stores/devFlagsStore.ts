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
  /** Enable de sequencer in de studio (fase 2 — admin-testfase) */
  sequencer: boolean;
}

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
  // Default: all flags off
  sections: false,
  templates: false,
  sequencer: false,

  setAllFlags: (enabled) => {
    const flags: DevFlags = { sections: enabled, templates: enabled, sequencer: enabled };
    persistFlags(flags);
    set(flags);
  },

  setFlag: (flag, enabled) => {
    const { sections, templates, sequencer } = get();
    const flags: DevFlags = { sections, templates, sequencer, [flag]: enabled };
    persistFlags(flags);
    set({ [flag]: enabled });
  },

  hydrate: () => {
    const saved = loadFlags();
    if (
      saved.sections !== undefined ||
      saved.templates !== undefined ||
      saved.sequencer !== undefined
    ) {
      set({
        sections: saved.sections ?? false,
        templates: saved.templates ?? false,
        sequencer: saved.sequencer ?? false,
      });
    }
  },
}));
