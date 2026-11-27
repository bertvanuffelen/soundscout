/**
 * Testopstelling voor e2e/presentation-clock.spec.ts (V2 Fase 1).
 *
 * De echte presentatieschermen (digibord, gedeelde speler, peer review) halen
 * hun inzendingen uit Supabase en zitten deels achter een docent-login. Deze
 * opstelling zet het échte `PresentationSurface` (modus 'public') in de pagina
 * met een vaste, lokaal samengestelde playlist — zonder netwerk of login.
 * Het is dus een test van het component + de afspeelmotor, niet van het
 * ophalen van inzendingen.
 *
 * Wordt alleen door Playwright geladen (dev-server, `import('/e2e/harness/…')`);
 * zit niet in de productie-build.
 */
import { Profiler } from 'react';
import { createRoot } from 'react-dom/client';
import { PresentationSurface } from '../../src/components/presentation/PresentationSurface';
import { samples as basisSamples } from '../../src/data/themes/basis/samples';
import type { Submission } from '../../src/hooks/useSubmissions';
import type { CompositionData } from '../../src/types';

declare global {
  interface Window {
    __presentation?: { commits: number };
  }
}

function composition(sampleIds: string[], totalBeats: number): CompositionData {
  const samples = basisSamples.filter((s) => sampleIds.includes(s.id));
  return {
    bpm: 120,
    totalBeats,
    isLooping: false,
    samples,
    tracks: samples.map((sample, i) => ({
      id: `track-${i}`,
      // Kort gehouden (1 s) zodat de compositie snel zijn einde haalt
      clips: [{ id: `clip-${i}`, sampleId: sample.id, startBeat: i * 2, trimStart: 0, trimEnd: 1 }],
    })),
  };
}

export function mountPresentation(): void {
  const ids = basisSamples.slice(0, 3).map((s) => s.id);
  const playlist: Submission[] = [
    { id: 'a', student_name: 'Robin', composition_name: 'Eerste', composition_data: composition(ids, 8), created_at: '2026-01-01T10:00:00Z' },
    { id: 'b', student_name: 'Sam', composition_name: 'Tweede', composition_data: composition(ids.slice(0, 2), 8), created_at: '2026-01-01T10:05:00Z' },
  ];

  const host = document.createElement('div');
  host.id = 'presentation-harness';
  document.body.appendChild(host);
  window.__presentation = { commits: 0 };

  createRoot(host).render(
    <Profiler id="presentation" onRender={() => { window.__presentation!.commits += 1; }}>
      <PresentationSurface playlist={playlist} mode="public" onClose={() => undefined} />
    </Profiler>,
  );
}

/**
 * Raad-de-plek (migratie 047): het praatplaat-bord in docent-presentatie met
 * "Plekken tonen" uit. Drie inzendingen op verschillende plekken, waarvan twee
 * dicht bij elkaar (cluster). `hidden: false` geeft het bestaande bord mét
 * plekken, als vergelijking.
 */
export function mountGuessBoard(options: { hidden?: boolean; mode?: 'teacher-present' | 'public' } = {}): void {
  const { hidden = true, mode = 'teacher-present' } = options;
  const ids = basisSamples.slice(0, 3).map((s) => s.id);
  const item = (id: string, name: string, title: string, x: number, y: number): Submission => ({
    id, student_name: name, composition_name: title, created_at: '2026-11-26T10:00:00Z',
    composition_data: { ...composition(ids.slice(0, 2), 8), praatplaatPosition: { x, y } },
  });
  const playlist: Submission[] = [
    item('a', 'Robin', 'Eerste', 0.2, 0.3),
    item('b', 'Sam', 'Tweede', 0.7, 0.6),
    item('c', 'Noor', 'Derde', 0.72, 0.62),
  ];

  const host = document.createElement('div');
  host.id = 'presentation-harness';
  document.body.appendChild(host);

  createRoot(host).render(
    <PresentationSurface
      playlist={playlist}
      mode={mode}
      onClose={() => undefined}
      interactiveBoard={{ imageUrl: '/images/praatplaten/sinterklaaspaleis.jpg', name: 'Het Sinterklaaspaleis' }}
      hiddenSpotIds={hidden ? new Set(playlist.map((s) => s.id)) : null}
    />,
  );
}
