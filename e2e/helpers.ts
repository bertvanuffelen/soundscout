/**
 * Gedeelde hulpjes voor de Fase 0-suites.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Page } from '@playwright/test';

/** Formaten uit het V2-voorstel §6.1 regel 4. */
export const VIEWPORTS = [
  { id: 'chromebook-1366x768', width: 1366, height: 768 },
  { id: 'ipad-landscape-1024x768', width: 1024, height: 768 },
  { id: 'ipad-portrait-768x1024', width: 768, height: 1024 },
  { id: 'ipad-mini-744x1133', width: 744, height: 1133 },
  { id: 'digibord-1920x1080', width: 1920, height: 1080 },
  { id: 'phone-landscape-844x390', width: 844, height: 390 },
  { id: 'phone-portrait-390x844', width: 390, height: 844 },
] as const;

const FIRST_RUN_FLAGS = ['onboarding-intro', 'clip-tools-hint', 'map-hint', 'landscape-hint', 'sequencer-hint'];

/** Vaste begintoestand: Nederlands, alle eenmalige tips al gezien, lege opslag. */
export async function prepare(page: Page): Promise<void> {
  await page.addInitScript((flags) => {
    try {
      if (!sessionStorage.getItem('e2e-init')) {
        localStorage.clear();
        sessionStorage.setItem('e2e-init', '1');
      }
      for (const f of flags) localStorage.setItem(`soundscout:first-run:${f}`, 'true');
    } catch { /* geen opslag beschikbaar */ }
  }, FIRST_RUN_FLAGS);
}

export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(250);
}

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

export interface LayoutMetrics {
  /** Pixels dat de pagina breder/hoger is dan het venster (0 = past). */
  pageOverflowX: number;
  pageOverflowY: number;
  /** Staat er een dialoog open? Dan gaan de tellingen alleen over die dialoog. */
  dialogOpen: boolean;
  interactiveCount: number;
  /** Bedienelementen die (deels) buiten het venster vallen en niet in een scrollgebied staan. */
  offscreen: string[];
  /** Bedienelementen met een zichtbare kant < 44px resp. < 24px. */
  under44: number;
  under24: number;
  smallestTarget: number | null;
  /** Paren bedienelementen die elkaar overlappen (≥ 25% van de kleinste). */
  overlaps: string[];
  /** Tekstelementen met een lettergrootte < 12px. */
  textUnder12: number;
}

/** Meet de layout van het huidige scherm. Faalt nooit: dit is een meting. */
export async function measureLayout(page: Page): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const label = (el: Element) =>
      ((el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40));
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
    };
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return true;
      }
      return false;
    };
    // Staat er een dialoog open, dan telt alleen wat daarin staat (de rest is afgedekt).
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const scope: ParentNode = dialogs.length ? dialogs[dialogs.length - 1] : document;
    const els = [...scope.querySelectorAll('button, a[href], [role="button"], input, select, [role="slider"]')].filter(visible);
    const rects = els.map((el) => ({ el, r: el.getBoundingClientRect() }));

    const offscreen = rects
      .filter(({ el, r }) => (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1) && !inScroller(el))
      .map(({ el }) => label(el));

    const sizes = rects.map(({ r }) => Math.min(r.width, r.height));
    const overlaps: string[] = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w <= 0 || h <= 0) continue;
        const smaller = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
        if ((w * h) / smaller >= 0.25) overlaps.push(`${label(a.el)} × ${label(b.el)}`);
      }
    }

    let textUnder12 = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || seen.has(parent) || !node.textContent?.trim() || !visible(parent)) continue;
      seen.add(parent);
      if (parseFloat(getComputedStyle(parent).fontSize) < 12) textUnder12 += 1;
    }

    const root = document.documentElement;
    return {
      pageOverflowX: Math.max(0, root.scrollWidth - vw),
      pageOverflowY: Math.max(0, root.scrollHeight - vh),
      dialogOpen: dialogs.length > 0,
      interactiveCount: els.length,
      offscreen: [...new Set(offscreen)].slice(0, 20),
      under44: sizes.filter((s) => s < 44).length,
      under24: sizes.filter((s) => s < 24).length,
      smallestTarget: sizes.length ? Math.round(Math.min(...sizes)) : null,
      overlaps: [...new Set(overlaps)].slice(0, 20),
      textUnder12,
    };
  });
}
