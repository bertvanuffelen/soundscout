# Geheugenbudget voor gedecodeerde audio (V2 Fase 3)

Gedecodeerde audio kost ongeveer 15 keer de MP3-grootte (PHASE-0-BASELINE §Memory). Eén volledig thema is 43–58 MB, drie thema's ongeveer 145 MB. Daarom houdt de engine nu bij hoeveel gedecodeerde audio er in het geheugen staat. Boven een budget per apparaat ruimt hij de minst recent gebruikte buffers op (LRU). Een buffer die in gebruik is, wordt nooit opgeruimd.

Code: `src/services/audio/memoryBudget.ts` (boekhouding, budget, LRU), `src/services/audio/audioPins.ts` (wat "in gebruik" is), `SampleStore.ts` en `PitchBufferService.ts` (melden buffers aan en ruimen ze op), `AudioService.collectPins()` (de enige pin-provider).

## Wat telt mee

Per buffer: `length × kanalen × 4` bytes (float32-PCM).

| Categorie | Bron | Opruimbaar |
|---|---|---|
| `sample` | `SampleStore.buffers`: één ToneAudioBuffer per geluid | ja, LRU |
| `pitch` | `PitchBufferService`-cache: één gebakken buffer per (geluid, semitonen) | ja, LRU, per toonhoogte vastgepind |

Langlevende buffers die **niet** meetellen (bewust, of nog niet):

| Buffer | Waarom niet |
|---|---|
| Reverb-IR's (`ReverbIRService`) | Begrensd: maximaal 7 decay-buckets × 2 kanalen × ≤4,5 s, samen hooguit ~8 MB per sample rate. Deterministisch, dus nooit weggooien. |
| Ambient-loop (`AmbientPlayer`) | Eén tegelijk; wordt vervangen bij elke locatie. |
| `SequencerEngine.buffers` | Eigen kopie van de patroongeluiden, voor lab en sequencer-preview. Dat is een dubbele decodering van dezelfde geluiden. **Vervolgstap:** de engine buffers laten lenen van SampleStore in plaats van zelf te decoderen. |
| Export-buffers uit `preloadBuffers` voor geluiden die de studio níét had | Leven alleen zolang de export loopt. |
| Preview-Players | Wrappen dezelfde AudioBuffer; geen extra PCM. |

## Budget

| `navigator.deviceMemory` | Budget |
|---|---|
| ontbreekt (Safari/iPad, Firefox) | **96 MB** |
| ≤ 1 GB | 64 MB |
| ≤ 2 GB | 96 MB |
| ≤ 4 GB | 128 MB |
| > 4 GB (Chromium kapt af op 8) | 192 MB |

Onderbouwing: elk budget past minstens één volledig thema (58 MB) plus pitch-bakes. iPad Safari geeft geen `deviceMemory`, dus daar geldt de standaard. 96 MB is ongeveer anderhalf thema. Dat ligt ver onder wat een oudere iPad met 2–3 GB RAM per tabblad verdraagt voordat iOS het tabblad sluit. Bij normaal gebruik staat er veel minder in het geheugen: de studio na één locatie met 6 geluiden is 12,7 MB (meting hieronder). Het budget raakt dus pas vol als iemand veel locaties of thema's afloopt, of bij de presentatiespeler met veel inzendingen.

## Pinregels: nooit opruimen

`AudioService.collectPins()` is de enige bron van waarheid. Het budget vraagt de pins bij elke opruimronde opnieuw op, dus ze zijn nooit verouderd.

| Regel | Bron |
|---|---|
| (a) clips op de tijdlijn, inclusief de geluiden in **alle** sequences van de compositie (`seq:`-clips pakken uit naar hun patroongeluiden) | `timelineStore.tracks` + `.sequences` |
| (b) bibliotheek en recorder-slots van de sessie | `libraryStore` |
| (c) wat de motor gepland heeft of speelt, ook tracks die niet in de stores staan (presentatiespeler, realtime-vangnet) | `AudioService.scheduledTracks/Sequences`. `activeSources` komen altijd hieruit of uit de preview. |
| (d) een export in uitvoering | De export rendert de tijdlijn (a)/(c). Daarnaast **disposet opruimen de ToneAudioBuffer niet**: een export die hem al via `getLoadedBuffer` vasthoudt, blijft werken, en de GC ruimt hem daarna op. |
| (e) de laatste preview (hover, trim, effecten), inclusief de previewtoonhoogte | `AudioService.previewSampleId/previewPitchKey` |
| (f) de laatste 3 laadverzoeken (werksets) | `SampleStore.getRecentRequestIds()`. Dit dekt de hotspots van de locatie waar het kind nu staat, en de gap tussen laden en plannen in de presentatiespeler. |
| plus | De buffer die net is toegevoegd, wordt in dezelfde ronde nooit opgeruimd (`enforce({ keep })`). |

Pitch-bakes worden per `sampleId|semitonen` vastgepind. Een bake van een oude previewtoonhoogte (+2 terwijl de clip op +5 staat) mag dus weg, ook als het geluid zelf vastgepind is.

Is alles wat overblijft vastgepind en zitten we tóch boven budget, dan ruimt de engine niets op en logt hij één waarschuwing (opnieuw pas nadat het weer onder budget is geweest). Afspelen gaat altijd voor het budget.

## Opruimen en herladen

- **Geluid:** de preview-Player wordt gestopt en gedisposed (Tone-valkuil 5) en de Map-entry verdwijnt. De ToneAudioBuffer wordt níét gedisposed (zie regel d) en de golfvorm blijft in de cache (klein). SampleStore onthoudt de `Sample` (url) en laadt het geluid bij het volgende gebruik opnieuw via het gewone `loadSample`-pad. `playSample` op een opgeruimd geluid herlaadt het transparant en speelt het daarna, tenzij er intussen een nieuwere preview is gestart.
- **Pitch-bake:** de bake wordt uit de cache gehaald. Bij het volgende gebruik bakt `bake()`/`ensureForTracks` hem opnieuw. Tot dat klaar is, valt live afspelen terug op de PitchShift-keten, zoals vóór een eerste bake. Voor geplande en geëxporteerde clips gebeurt dit niet, want die zijn vastgepind.

Opruimmomenten: na elk laadblok van `loadSamples`, na elke losse `loadSample`, na elke nieuwe bake, en bij `setMemoryBudget`.

## Relatie met `disposeUnusedPlayers`

Die functie blijft bestaan. Bij een nieuwe compositie (themawissel, `compositionInit`) ruimt hij in één keer alles buiten het nieuwe thema op, inclusief golfvormen en pitch-bakes. Dat gebeurt op een moment dat er gegarandeerd niets speelt. Hij loopt nu via `SampleStore.removeUnused`, zodat de boekhouding klopt. Het LRU-budget dekt de paden die hij mist: veel locaties binnen één thema, bewaarcodes en composities openen, en de presentatiespeler die inzendingen van verschillende thema's achter elkaar laadt. Met het budget is de themawissel-opruiming dus grotendeels overbodig, maar hij kan geen kwaad.

## Statistieken lezen

- Code: `audioService.getMemoryStats()` geeft `{ totalBytes, totalMB, budgetBytes, budgetMB, budgetSource, deviceMemoryGB, entryCount, byCategory: { sample, pitch }, pinnedBytes, evictedTotal }`.
- Console (alleen DEV): `__soundscoutAudioStats()`.
- Bij elke opruimronde verschijnt één `logger.info`-regel: `Audio-geheugen: N buffer(s) opgeruimd, X MB vrij, nu Y MB van Z MB budget`.
- e2e: `e2e/audio-memory.spec.ts` schrijft `docs/v2/baseline/audio-memory-latest.json`.

Meting (headless Chromium, 16-11-2026): basis-thema, De Kinderboerderij, 6 geluiden in de studio: **12,7 MB in 6 buffers**, 0 pitch-bakes, alles vastgepind, 0 opgeruimd, budget 192 MB (`deviceMemory` 8+).

## Afstemmen

- Console (DEV): `__soundscoutAudioBudget(40)` zet het budget op 40 MB en ruimt meteen op. `__soundscoutAudioBudget(null)` zet het terug op automatisch. Zo test je opruimen en herladen met de hand.
- Code en tests: `audioService.setMemoryBudget(bytes | null)`, of `new DecodedAudioBudget(deviceMemoryGB)`.
- De trappen staan in `selectBudgetBytes` (memoryBudget.ts). De breedte van de werkset staat in `RECENT_REQUESTS_KEPT` (SampleStore.ts).

## Niet geverifieerd

- Echt geheugengedrag op een school-iPad of Chromebook. Safari geeft geen geheugen-API, dus meet daar met Web Inspector → Timelines → Memory. Doe dat terwijl je in één sessie meerdere thema's of veel inzendingen in de presentatie afloopt.
- Hoeveel van een opgeruimde buffer de browser echt vrijgeeft, en wanneer. Dat hangt af van de GC.
