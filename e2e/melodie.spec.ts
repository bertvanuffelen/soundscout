/**
 * V2 Fase 4 — de Melodie-tab in de studio, van begin tot export.
 *
 * Sequence toevoegen → tab Melodie → noten zetten → synthklank kiezen →
 * swing → tab sluiten (chip in de bibliotheek) → op de tijdlijn zetten
 * (via de store, deterministisch — zelfde patroon als layout.spec.ts) →
 * afspelen (afspeellijn loopt, geen consolefouten) → via de clip heropenen
 * (noten staan er nog) → export-render + validator.
 */
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

async function toStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nieuwe soundscape' }).click();
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: /De Stad/ }).click();
  await page.getByTitle('De Kinderboerderij').click();
  await page.locator('button.hotspot').first().waitFor({ timeout: 20000 });
  for (let i = 0; i < 2; i++) {
    await page.locator('button.hotspot:not([disabled])').first().click({ force: true, timeout: 8000 });
    await page.waitForTimeout(350);
  }
  await page.getByRole('button', { name: 'Naar Studio' }).click();
  await page.getByRole('heading', { name: 'Studio' }).waitFor();
}

test.use({ viewport: { width: 1366, height: 768 } });

test('melodie: maken, plaatsen, afspelen, heropenen en exporteren', async ({ page }) => {
  const consoleErrors: string[] = [];
  // Netwerkfouten van de nep-Supabase (themalijst, statistiek) horen bij de
  // e2e-opzet; die worden per URL gecontroleerd in plaats van als consoletekst.
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('response', (res) => { if (res.status() >= 400 && !res.url().includes('/__e2e-supabase/')) consoleErrors.push(`404 ${res.url()}`); });

  await prepare(page);
  await toStudio(page);

  // --- Sequence toevoegen en naar Melodie ---
  await page.getByTitle('Sequence toevoegen').click();
  const panel = page.getByRole('region', { name: 'Sequencer Lab' });
  await panel.waitFor();
  await panel.getByRole('tab', { name: 'Melodie' }).click();
  await expect(panel.getByRole('tab', { name: 'Melodie' })).toHaveAttribute('aria-selected', 'true');

  // --- Noten zetten ---
  for (const name of ['C4, tel 1', 'E4, tel 3', 'G4, tel 5', 'A5, tel 7']) {
    await panel.getByRole('button', { name, exact: true }).click();
  }
  await expect(panel.getByRole('button', { name: 'G4, tel 5, Hard' })).toHaveAttribute('aria-pressed', 'true');

  // --- Synthklank kiezen ---
  await panel.getByRole('button', { name: /^Klank: / }).click();
  const voiceDialog = page.getByRole('dialog');
  await voiceDialog.getByRole('button', { name: 'Helder', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Klank: Helder' })).toBeVisible();

  // --- Swing ---
  await panel.getByRole('slider').fill('0.2');

  // --- In het paneel afspelen: de afspeellijn loopt (DOM, geen React-state) ---
  await page.getByRole('button', { name: 'Afspelen' }).first().click();
  await expect(panel.locator('[data-current="true"]').first()).toBeAttached({ timeout: 5000 });
  await page.getByRole('button', { name: /Pauze|Stop/ }).first().click();

  const seq = await page.evaluate(async () => {
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    const s = useTimelineStore.getState().sequences[0];
    return { id: s.id, kind: s.kind, swing: s.swing, voice: s.melody?.voice, notes: s.melody?.notes };
  });
  expect(seq.kind).toBe('melody');
  expect(seq.swing).toBe(0.2);
  expect(seq.voice).toEqual({ type: 'synth', preset: 'bright' });
  expect(seq.notes).toHaveLength(4);

  // --- Tab sluiten → chip in de bibliotheek ---
  await panel.getByRole('button', { name: 'Sequencer sluiten' }).click();
  await expect(panel).toBeHidden();
  const chip = page.getByTitle('Patroon bewerken').filter({ hasText: 'Sequence 1' }).first();
  await expect(chip).toBeVisible();

  // --- Op de tijdlijn zetten (store) ---
  await page.evaluate(async (sequenceId) => {
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
    const { withSequenceSamples, sequenceSampleId } = await import('/src/utils/sequencer.ts');
    const timeline = useTimelineStore.getState();
    const samples = withSequenceSamples(useLibraryStore.getState().librarySamples, timeline.sequences);
    timeline.addClip(0, { id: 'e2e-melodie', sampleId: sequenceSampleId(sequenceId), startBeat: 0 }, samples);
  }, seq.id);
  const clip = page.locator('[role="listitem"]').first();
  await clip.waitFor();

  // --- Compositie afspelen: de afspeelpositie loopt ---
  await page.getByRole('button', { name: 'Afspelen' }).first().click();
  await page.waitForTimeout(1500);
  const beat = await page.evaluate(async () => {
    const { playbackClock } = await import('/src/services/playbackClock.ts');
    return playbackClock.getBeat();
  });
  expect(beat).toBeGreaterThan(0.5);
  await page.getByRole('button', { name: 'Pauze' }).first().click();

  // --- Heropenen via de clip: de noten staan er nog ---
  await clip.click();
  await page.getByRole('button', { name: 'Patroon bewerken' }).click();
  await panel.waitFor();
  await expect(panel.getByRole('tab', { name: 'Melodie' })).toHaveAttribute('aria-selected', 'true');
  for (const name of ['C4, tel 1, Hard', 'E4, tel 3, Hard', 'G4, tel 5, Hard', 'A5, tel 7, Hard']) {
    await expect(panel.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }

  // --- Export: de echte exportketen + validator ---
  const verdict = await page.evaluate(async () => {
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
    const ae = await import('/src/utils/audioExport.ts');
    const rv = await import('/src/utils/renderValidation.ts');
    const { tracks, sequences, bpm } = useTimelineStore.getState();
    const samples = useLibraryStore.getState().librarySamples;
    const { bufferMap } = await ae.preloadBuffers(samples);
    const missing = ae.findMissingSampleIds(tracks, bufferMap, sequences);
    await ae.ensurePitchBuffers(tracks, bufferMap, samples, { bpm, sequences });
    const duration = ae.calculateTimelineDuration(tracks, samples, bpm, null, sequences);
    const buffer = await ae.renderOffline(tracks, samples, duration, bufferMap, { bpm, sequences });
    const analysis = rv.analyzeAudioBuffer(buffer);
    const checked = await ae.validateOrCapture(buffer, tracks, samples, duration, undefined, sequences, bpm);
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      for (const v of buffer.getChannelData(ch)) peak = Math.max(peak, Math.abs(v));
    }
    return { missing, duration, peak, suspicious: analysis.suspicious, reasons: analysis.reasons, fallback: checked.usedRealtimeFallback };
  });
  expect(verdict.missing).toEqual([]);
  expect(verdict.duration).toBeGreaterThan(3);
  expect(verdict.peak).toBeGreaterThan(0.01);
  expect(verdict.suspicious, verdict.reasons.join('; ')).toBe(false);
  expect(verdict.fallback).toBe(false);

  expect(consoleErrors).toEqual([]);
});

test('melodie: tab wisselen op een gevuld ritme vraagt om een nieuwe sequence', async ({ page }) => {
  await prepare(page);
  await toStudio(page);
  await page.getByTitle('Sequence toevoegen').click();
  const panel = page.getByRole('region', { name: 'Sequencer Lab' });
  await panel.waitFor();
  // Ritme vullen: eerste spoor een geluid geven en een stap aanzetten
  await page.evaluate(async () => {
    const { useSequencerStore } = await import('/src/stores/sequencerStore.ts');
    const { useLibraryStore } = await import('/src/stores/libraryStore.ts');
    const s = useSequencerStore.getState();
    const track = s.activeSequence()!.tracks[0];
    s.setTrackSample(track.id, useLibraryStore.getState().librarySamples[0].id);
    s.toggleStep(track.id, 0);
  });
  await panel.getByRole('tab', { name: 'Melodie' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Nieuwe melodie' }).click();
  await expect(panel.getByRole('tab', { name: 'Melodie' })).toHaveAttribute('aria-selected', 'true');
  const kinds = await page.evaluate(async () => {
    const { useTimelineStore } = await import('/src/stores/timelineStore.ts');
    return useTimelineStore.getState().sequences.map((s) => s.kind ?? 'rhythm');
  });
  expect(kinds).toEqual(['rhythm', 'melody']);
});
