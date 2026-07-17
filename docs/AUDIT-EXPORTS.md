# Audit: MP3- en video-export (17-7-2026)

> **Status na fixronde (zelfde dag, commit `377fcad`):** de belangrijkste bevindingen zijn gefixt en beide exports zijn end-to-end in de browser geverifieerd (MP3 → "MP3 gedownload!", video → 17,7 MB MP4 via WebCodecs/hardware-H.264).
> - ✅ #1 ontbrekende samples → waarschuwing in de modal (MP3 én video)
> - ✅ #2 ontbrekende afbeeldingen → waarschuwing in de modal
> - ✅ #3 fout/succes/waarschuwing zichtbaar ín de Opslaan & Delen-modal
> - ✅ #5 reverb-staart telt mee in de exportduur · ✅ #6 `reverb.ready` afgewacht
> - ✅ #8 "houd dit tabblad zichtbaar"-hint tijdens exporteren
> - ✅ #13 (deels) video-beeldwissels volgen nu de compositie-bpm · ✅ #14 vroege lamejs-import · ✅ #16 (deels) foutstrings via i18n
> - ➖ #4 **gecorrigeerd**: `compositionInit` herstelt de praatplaat-context wél als er een snapshot is; alleen oude composities zónder snapshot missen de video-knop — daarvoor bestaat de afbeelding simpelweg niet meer aan de clientkant (geen fix mogelijk, wordt gelogd).
> - ⏳ Open (bewust): #7 solo-besluit · #9 render-progress · #10/#11 MediaRecorder-fallback-robustheid · #12 encode naar Worker · #15 preload-scope · 'unsupported'-uitleg.

Read-only doorlichting van de volledige exportketen, op verzoek van Bert (taak "Alle exports nalopen", P2). Twee code-audits (audio- en videoketen, alle vier de vormen: vrij / template / storyboard / praatplaat) + live browser-verificatie. **Er is in deze ronde niets aan de code veranderd** — fixes volgen na Berts hertest van het presentatiescherm, zodat zijn testsessie niet herlaadt.

**Kernbeeld**: de exportketen is architectonisch gezond — video en MP3 delen dezelfde offline audio-render, en die render loopt netjes in de pas met live playback (clip-loops, effects, fades, mute, volumes, 12 sporen, 64 maten). De bevindingen zitten vooral in randgevallen en foutmaskering: stilletjes weggelaten geluiden/beelden, een afgekapte galmstaart en onzichtbare foutstaten.

## Prioriteit 1 — gebruiker merkt het en er is geen melding

| # | Bevinding | Waar |
|---|---|---|
| 1 | **Niet-geladen samples verdwijnen stil uit MP3 én video.** Laadfouten (404/netwerk) geven alleen een `logger.warn`; de export "slaagt" met ontbrekende sporen. | `audioExport.ts:58-60`, `:196` |
| 2 | **Ontbrekende storyboard-afbeeldingen → stil zwart beeldsegment in de video.** Per-afbeelding fetch-fout is alleen een warn; pas als álles faalt komt er een fout. | `canvasFrameRenderer.ts:49-51`, `:115-123` |
| 3 | **Video-fout/succes onzichtbaar zolang de Opslaan & Delen-modal openstaat.** De fout-/succesmelding rendert in de StageView-body ónder de modal; de knop klapt gewoon terug naar "Download video". | `StageView.tsx:355-360` vs `StageActionsModal.tsx:196-206` |
| 4 | **Herstelde praatplaat-compositie heeft géén video-knop.** Bij restore van een `praatplaat-*`-storyboardId wordt `activeStoryboard` op null gezet → `hasStoryboard` false → knop weg zonder uitleg. Live praatplaat-flow werkt wél. | `compositionInit.ts:80-88`, `StageView.tsx:516` |

## Prioriteit 2 — hoorbaar/voelbaar kwaliteitsverlies

| # | Bevinding | Waar |
|---|---|---|
| 5 | **Reverb-staart wordt afgekapt.** Exportduur = laatste clip-einde + 0,5 s, maar de reverb-decay loopt tot ±4,5 s. Een galm-clip aan het einde wordt afgesneden. | `audioExport.ts:96` vs `:222` |
| 6 | **Reverb-impulse-response mogelijk niet klaar in de offline render.** `new Tone.Reverb()` genereert zijn IR asynchroon; er wordt nergens op `reverb.ready` gewacht → reverb kan droog/stil renderen. | `audioExport.ts:220-226` |
| 7 | **Solo wordt genegeerd in de export** (mute wél gerespecteerd). Voor de eindmix is dat verdedigbaar, maar wie een spoor solo zet en exporteert, krijgt iets anders dan wat die hoort. Besluit nodig: solo respecteren, of expliciet melden dat de export de volledige mix is. | geen referentie aan `soloTrackIndex` in `audioExport.ts` |
| 8 | **Achtergrond-tab vertraagt de export extreem.** Tone's offline render stapt met timer-yields door de tijd; in een verborgen tab worden timers naar 1×/s gesmoord → een export van 45 s duurt dan "eeuwig" op ~30%. Live gereproduceerd (tab hidden → setTimeout(50 ms) duurde 955 ms, render bleef op 30% staan). Melding "houd dit tabblad open" of een Web Worker lost dit op. | `Tone.Offline`-mechaniek + `useAudioExport` progressmapping |
| 9 | **Voortgang blijft de hele render op 30 % staan.** Mapping is laden 0-30 % → render (geen tussentijdse progress) → encode 70-100 %. Bij een lange compositie lijkt de export bevroren. | `audioExport.ts` progress-callbacks |

## Prioriteit 3 — robuustheid/latent

| # | Bevinding | Waar |
|---|---|---|
| 10 | **MediaRecorder-fallback zonder `onerror`** → kan bij een opnamefout eeuwig op ~95 % hangen (en `onstop` wordt pas ná `stop()` toegewezen — fragiel). | `videoExportEngines.ts:286-338` |
| 11 | **MediaRecorder-fallback rendert realtime** (4 min compositie = 4 min wachten) met `setTimeout`-frames → timingdrift/desync-risico en alle chunks in geheugen. WebCodecs-pad is netjes. | `videoExportEngines.ts:302-323` |
| 12 | **MP3-encodering synchroon op de main thread** — UI bevriest merkbaar bij lange composities op zwakke tablets (piek ~100-150 MB bij 128 s). | `audioExport.ts:418-438` |
| 13 | **BPM half-af**: export volgt de store-bpm (B0-fix ✓), maar live playback gebruikt nog hardcoded `DEFAULT_BPM`, en `computeImageTimeline` (beeldwissels video) ook. Nu identiek (120); zodra bpm ooit variabel wordt, desynchroniseert het. | `AudioService.ts:698`, `videoExport.ts:145` |
| 14 | **lamejs wordt pas ná de volledige render geïmporteerd** — een chunk-load-fout gooit de renderttijd weg. Vroeg importeren is gratis winst. | `audioExport.ts:408` |
| 15 | **Hele bibliotheek wordt gepreload**, ook samples die niet op de tijdlijn staan. | `audioExport.ts:333/376` |
| 16 | **'unsupported' verbergt de video-knop zonder uitleg** + twee hardcoded NL-foutstrings (niet i18n). | `useVideoExport.ts:72`, `videoExport.ts:108/135` |

## Gecheckt en in orde

- Video en MP3 delen dezelfde offline audio-render → geen kwaliteitsverschil tussen beide.
- Clip-loops (#65), effects-keten pitch→reverb→fade→volume (#33/#79), per-iteratie fades, mute (track+clip), volumes (dB-optelling): 1-op-1 gelijk aan live playback.
- 12 sporen en 64 maten (256 beats): geen caps in de exportpaden; de audio-bus-limiet van live geldt offline niet.
- Sectie-loop (`loopRegion`) wordt terecht genegeerd: altijd de hele tijdlijn.
- Beeldwissel-timing video = exact dezelfde sectie-logica als het podium (`computeImageTimeline` vs `getActiveImageIndex`), ook na verplaatste sectie-markers.
- Stille storyboard-secties: duur = max(audio, tijdlijn), laatste beeld blijft staan. Crossfade bij 1 beeld: geen fout.
- Lege tijdlijn → nette fout; H.264-profielvolgorde + hardware/software-fallback + OffscreenCanvas-gate: correct.
- UI: MP3-knop toont progress + disabled-states kloppen; video-knop disabled zodra er íéts exporteert.
- Live geverifieerd (preview-browser, storyboard-compositie BBD6KD): preload → 30 % → render start zonder fouten; engine-detectie kiest WebCodecs/MP4 (hardware H.264).

## Voorgestelde fixvolgorde (na hertest presentatiescherm)

1. **Foutmaskering dichten** (1, 2, 3): mislukte samples/afbeeldingen → zichtbare waarschuwing ("Export gemaakt, maar 2 geluiden ontbreken"); video-fout/succes ín de modal tonen.
2. **Reverb** (5, 6): staartbuffer verruimen als er reverb in de compositie zit + `reverb.ready` afwachten.
3. **Praatplaat-restore video-knop** (4) + besluit over solo (7).
4. **UX-robuustheid** (8, 9, 14): tabblad-open-melding of Worker, render-progress, vroege lamejs-import.
5. **Rest** (10-16) als losse kleine verbeteringen.
