# PLAN — Audio Engine v2: één motor voor live, preview én export

> **Status:** plan goedgekeurd qua richting (Bert, 23-7-2026 — Signalsmith-keuze
> en "offline + vangnet" bevestigd), implementatie nog niet gestart.
> **Voorwerk:** `docs/audio/ONDERZOEK-EXPORT-EFFECTGLITCH.md` §15 (empirische
> bevindingen, MP3-vingerafdruk-analyse, metingen live vs offline).
> **Werkwijze:** in deze worktree, commit per fase, `tsc` + tests groen per fase.

---

## 1. Context — waarom deze verbouwing

**Directe aanleiding (testronde 6):** clip-effecten klinken live goed maar
komen uit de MP3/video-export met "enorm veel gestotter". Onderzoek (§15 van
het dossier) wees uit: `Tone.PitchShift` produceert bij hoge pitchwaarden
periodieke korrelklikken (12 Hz-vingerafdruk in Berts export = pitch +12),
offline ~12× erger dan live, met een sessie-afhankelijke catastrofale modus
waarin de interne crossfade-LFO niet loopt en het signaal in mitrailleurkliks
verandert. `windowSize`-tuning maakte het erger. De enige structurele oplossing
is PitchShift **elimineren**, niet repareren.

**Bredere aanleiding (Berts opdracht):** het audiosysteem moet "architectuur-
technisch ultiem" worden — robuust, toekomstbestendig, en met de garantie dat
**export per definitie klinkt als live**. De huidige architectuur kan dat niet
garanderen: er zijn drie onafhankelijke effectketen-bouwers
(`createOnDemandPlayer`, `playSampleWithEffects`, `renderOffline`) die al
aantoonbaar uit elkaar gegroeid zijn (divergentietabel D1–D16 in het dossier):
loops faden anders in export (D4), solo wordt in export genegeerd (D6),
reverbstaart klinkt live anders dan in export (D12).

**Doel:** één gedeelde graph-builder + deterministische effecten (pitch als
voorgebakken buffer, reverb met vaste IR's), waardoor live en export dezelfde
code én hetzelfde deterministische resultaat delen — plus een objectieve
export-validator met realtime-capture-vangnet.

---

## 2. Doelarchitectuur

```
                       ┌──────────────────────────────────────┐
                       │  audioGraph.ts (nieuw, puur)         │
                       │  - buildClipChain(effects, volumeDb) │
                       │  - scheduleClipFades(...)            │
                       │  - generateClipEvents(tracks,...)    │
                       │  - REVERB_DECAY(), fade-curves       │
                       └───────┬──────────────┬───────────────┘
                               │              │
              live/preview (AudioService)   export (renderOffline)
                               │              │
        PitchBufferService ────┴──────────────┴──── zelfde gebakken buffers
        (signalsmith-stretch, cache per sampleId+semitonen)
        ReverbIRService (deterministische IR-cache per decay)
```

### 2.1 Gedeelde graph-builder — `src/services/audioGraph.ts` (nieuw)

Pure module (geen singleton-state) die door **alle drie** de consumenten wordt
gebruikt:

- `generateClipEvents(tracks, samples, bpm)` — de éne bron van ClipEvents
  (loop-iteraties, trim, fades per iteratie, mute/solo-vlaggen, volumeDb).
  Nu gedupliceerd in `AudioService.scheduleTimeline` (:741-812) en
  `renderOffline` (:224-324); de export krijgt hiermee automatisch het
  live-gedrag (fades op élke loop-iteratie — lost D4 op; verse keten per
  event — lost D1/D2/D3 op).
- `buildClipChain(effects, volumeDb, destination)` — bouwt per event een verse
  keten `Player → [Convolver-reverb wet/dry] → [fadeGain] → Volume → destination`
  en geeft een dispose-functie terug. Géén PitchShift-node meer (zie 2.2).
- `scheduleClipFades(gainParam, time, duration, fadeIn, fadeOut, elapsed?)` —
  de bestaande curve-logica (x², (1-x)², 128 stappen) inclusief de
  mid-fade-seek-slice uit `startActiveClips`, één keer gedefinieerd.
- Constanten: `reverbDecay(reverb)` (nu 4× gedupliceerde magic formula
  `1.5 + reverb/100*3`), curve-arrays.

**Export gebruikt dezelfde bus-structuur:** `renderOffline` bouwt voortaan ook
trackbuses + master (lost D5 op) en past solo/mute toe zoals live (lost D6 op —
gedragskeuze: solo telt mee in export; als Bert export-altijd-volle-mix wil,
is dat één boolean op `generateClipEvents`).

### 2.2 Pitch: voorgebakken buffers via Signalsmith Stretch

npm **`signalsmith-stretch`** (officiële WASM/AudioWorklet-release, MIT,
~230 KB unpacked, lazy-loaded — alleen wanneer een clip pitch gebruikt).

- Nieuw `src/services/PitchBufferService.ts`:
  `getPitchedBuffer(sampleId, semitones) → Promise<AudioBuffer>` — rendert de
  volledige sample één keer door signalsmith (duurbehoudend, semitonen −12..+12)
  in een eigen `OfflineAudioContext` en cachet het resultaat
  (`Map<"sampleId|semitones", AudioBuffer>`).
- Bakmomenten: bij toepassen in `EffectsModal` (+ preview gebruikt dezelfde
  gebakken buffer!), bij laden van een compositie met pitch-clips, en vóór
  export. Bak-tijd is ~realtime of sneller voor samples van seconden — met de
  cache is dit eenmalig per (sample, semitoon).
- **Live, preview én export spelen daarna een gewone buffer af** — geen
  pitch-DSP in de graph. Dit:
  - elimineert de glitch-klasse volledig (er valt niets meer te ontsporen),
  - heft de live-limiet "max 2-3 pitch-clips tegelijk" op
    (`PLAN-CLIP-LOOP-EFFECTS.md:937`),
  - maakt de offline render veel sneller (PitchShift was de dure node),
  - klinkt aanzienlijk beter (polyfone spectrale shifter i.p.v. delay-lijn).
- Duur blijft gelijk (time-stretch ratio 1.0) → geen enkel timeline-/trim-/
  collision-gevolg. Trim wordt zoals nu bij het afspelen toegepast
  (`player.start(time, trimStart, dur)` op de gebakken buffer).
- **Fallback-keten:** als de worklet/WASM niet laadt (oude browser) → val terug
  op de huidige `Tone.PitchShift`-route met een `logger.warn`. Geen regressie
  t.o.v. vandaag.

### 2.3 Reverb: deterministische gedeelde impulse responses

`Tone.Reverb` (per clip een nested-OfflineContext-IR van random noise —
niet-deterministisch, `ready`-gedoe, fragiel) vervangen door:

- Nieuw `src/services/ReverbIRService.ts`: genereert IR's met **seeded PRNG**
  (zelfde exponentieel vervallende-noise-aanpak als Tone, maar reproduceerbaar)
  en cachet per decay-bucket (decays 1.5–4.5 s afronden op 0.5 s → max 7 IR's).
- In `buildClipChain`: per reverb-clip een kale `ConvolverNode` met de gedeelde
  IR-buffer + wet/dry-gains (wet = reverb/100, zoals nu). Geen `ready`-await
  meer, geen nested offline render, en **elke export klinkt identiek** aan de
  vorige én aan live.
- Reverbstaart-gedrag gelijktrekken (D12): live laat de staart voortaan ook
  uitklinken — `lastActiveBeat`/auto-stop in `AudioService` rekent de staart
  mee zoals `calculateTimelineDuration` dat al doet.

### 2.4 Export-validator + realtime-capture-vangnet

- `src/utils/renderValidation.ts` (nieuw): de klik-metriek uit het onderzoek
  (max |x[n]−x[n−1]| + tellingen boven drempel, per segment). Draait na elke
  `renderOffline` (goedkoop, één pass).
- Bij een verdachte render (klik-trein-signatuur): automatisch **realtime-
  capture-fallback** — de compositie via de bestaande live-motor afspelen naar
  een `MediaStreamAudioDestinationNode`/worklet-capture en dat opnemen
  (patroon bestaat al in `videoExportEngines.ts:254-330`). UI toont dan
  "export duurt zo lang als je nummer". Bert heeft dit vangnet goedgekeurd.
- De validator logt zijn oordeel via `logger`/`audioDiag` → de export-blinde
  vlek (D15) is daarmee ook gedicht.

### 2.5 Opruimen & kleine correctheid

- `exportToWav` + dependency `audiobuffer-to-wav` verwijderen (dode code).
- `pan` in `ClipEffects`: verwijderen uit type + defaults (of implementeren met
  een `StereoPannerNode` in de builder — beslissing Bert; verwijderen is de
  veilige default, er is geen UI voor).
- MP3-encode naar een Web Worker (open audit #12) — de render is straks snel,
  dan wordt de encode de merkbare blokkering.
- `preloadBuffers` hergebruikt voortaan de al geladen `AudioService.buffers`
  waar mogelijk (open audit #15).

---

## 3. Fasering (elke fase apart te committen en te testen)

**Fase 0 — meetlat.** `renderValidation.ts` + een dev-only diagnosecommando
(`window.__EXPORT_DIAG`) dat de vier isolatie-composities uit dossier §9
rendert en de metriek rapporteert. Referentiewaarden vastleggen vóór er iets
verandert. *(geen gedragswijziging)*

**Fase 1 — gedeelde builder.** `audioGraph.ts` extraheren;
`AudioService.scheduleTimeline`/`createOnDemandPlayer`/`playSampleWithEffects`
en `renderOffline` erop overzetten; export krijgt buses/solo/loop-fades-per-
iteratie. PitchShift blijft in deze fase nog bestaan (via de builder). Lost
D1–D7 en D14 op. *(export klinkt hierna bewust anders op loops/solo: nl. zoals
live)*

**Fase 2 — reverb deterministic.** `ReverbIRService` + ConvolverNode in de
builder; `Tone.Reverb` eruit; staartgedrag gelijk (D12). Bert-luistertest:
reverb-klank moet gelijkwaardig zijn (IR-aanpak is dezelfde decaying noise).

**Fase 3 — pitch prebake.** Eerst een **spike** (halve dag): signalsmith-
stretch worklet in `OfflineAudioContext` op Chrome/Safari/iPad testen +
klank-A/B voor Bert (−12, −5, +7, +12 op piano/drums/stem). Daarna
`PitchBufferService`, EffectsModal-preview erop, `Tone.PitchShift` eruit
(fallback behouden), live-CPU-limiet-documentatie schrappen.

**Fase 4 — vangnet.** Validator aan de exportflow koppelen + realtime-capture-
fallback voor MP3 (video-fallback bestaat al) + nette voortgangs-UI.

**Fase 5 — opruimen.** §2.5-punten, `docs/`-updates (CLAUDE.md audio-sectie,
TONEJS-KENNISBANK aanvullen met de §15-lessen), TESTPLAN-hertestlijst.

Elke fase eindigt met: `npm run build` (tsc) + `npm run test:run` groen +
Fase-0-metriek draaien + kort logboek-item in `LOGBOEK-MASTERPLAN.md`.

---

## 4. Verificatie

1. **Objectief:** Fase-0-metriek op (a) de vier isolatie-composities, (b) een
   reconstructie van Berts Test-23-7-compositie met pitch +12. Doel: 0 kliks
   boven drempel in alle exports; render bit-stabiel over twee runs.
2. **Gehoor (Bert):** A/B live vs export van dezelfde compositie; specifiek
   pitch ±12, reverb-staart, loop-fades, solo-export.
3. **Regressie:** bestaande composities (bewaarcodes) laden en afspelen;
   niet-effect-clips moeten identiek klinken; praatplaat/leskaart-flows
   onaangeroerd (raken deze code niet).
4. **Platform:** exporttest op iPad-Safari en een Chromebook (schooldoelgroep)
   in Fase 3-spike en na Fase 4.

## 5. Risico's

| Risico | Mitigatie |
|---|---|
| signalsmith-klank wijkt af van huidige PitchShift-klank | bewust: het klinkt béter; Bert A/B't in de Fase 3-spike vóór de omschakeling |
| Worklet in OfflineAudioContext op oudere Safari | feature-detect + fallback naar Tone.PitchShift-route |
| +230 KB dependency | lazy import, alleen bij eerste pitch-gebruik |
| Fase 1 verandert exportklank van bestaande composities (loop-fades, solo) | dit ís de bedoeling (export = live); in changelog/logboek benoemen |
| Realtime-capture-vangnet op trage machines | alleen als fallback na validator-afkeuring; UI communiceert de wachttijd |

## 6. Bestandenkaart (belangrijkste wijzigingen)

| Bestand | Actie |
|---|---|
| `src/services/audioGraph.ts` | **nieuw** — gedeelde builder + event-generatie |
| `src/services/PitchBufferService.ts` | **nieuw** — signalsmith prebake + cache |
| `src/services/ReverbIRService.ts` | **nieuw** — deterministische IR-cache |
| `src/utils/renderValidation.ts` | **nieuw** — klik-metriek + exportoordeel |
| `src/services/AudioService.ts` | schedule/onDemand/preview → builder; staartgedrag |
| `src/utils/audioExport.ts` | renderOffline → builder + buses; validator-hook; worker-encode; exportToWav weg |
| `src/utils/videoExportEngines.ts` | ongewijzigd (krijgt schone buffer) |
| `src/components/studio/EffectsModal.tsx` | preview via gebakken pitch-buffer |
| `src/types/index.ts` | `pan` verwijderen (of implementeren) |
| `package.json` | + `signalsmith-stretch`, − `audiobuffer-to-wav` |
