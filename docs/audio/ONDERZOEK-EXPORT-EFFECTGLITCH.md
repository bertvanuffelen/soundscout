# Onderzoek — glitches/gestotter bij export van geluidseffecten

> **Status:** open onderzoek. Dit is géén opgeloste bug — het is een
> voorbereidingsdossier zodat een aparte, gefocuste sessie (verse chat) er
> direct diep in kan. Geschreven na testronde 6 (23-7-2026).
>
> **Kernvraag:** waarom klinken clip-effecten (pitch / reverb / fade) prima
> tijdens het **afspelen** in de app, maar komen ze er bij de **export**
> (MP3 én video) uit met veel gestotter/glitches — vooral op de samples
> waar effecten op zijn toegepast?

---

## 1. Symptoom (observatie Bert, testronde 6)

- Effecten zijn in de export **hoorbaar**, maar met "enorm veel gestotter en
  glitches. Geen mooie export."
- Het zit **vooral op de samples waar de effecten op zijn toegepast** — clips
  zónder effecten lijken schoon.
- **Live afspelen in de studio klinkt goed** — het probleem is export-specifiek.
- Geldt voor **MP3-export** (testplan C4) en dus ook voor **video-export**
  (video hergebruikt exact dezelfde audio-render — zie §5).

## 2. Reproductie (voor de onderzoekssessie)

1. Studio → sleep een paar samples op de tijdlijn.
2. Selecteer een clip → **Effecten** → zet bijvoorbeeld **pitch** op −5 of +7,
   en/of **reverb** op ~50%, en/of een **fade in/out**.
3. Podium → **Opslaan & Delen** → **MP3-export** (of video-export bij een
   storyboard).
4. Luister de export terug → gestotter/glitch op de effect-clips.
5. Vergelijk met live afspelen van dezelfde compositie (klinkt goed).

Isoleer daarna per effect (zie §9) om de échte boosdoener te bevestigen.

---

## 3. De kern: twee lósse audio-motoren

SoundScout bouwt de effectketen op **twee onafhankelijke plekken**, en die zijn
in de loop van de tijd uit elkaar gegroeid:

| | Live afspelen | Export (offline) |
|---|---|---|
| Functie | `AudioService.createOnDemandPlayer()` | `renderOffline()` |
| Bestand | `src/services/AudioService.ts:622-675` | `src/utils/audioExport.ts:194-348` |
| Context | realtime `AudioContext` | `Tone.Offline()` = `OfflineAudioContext` |
| Keten-leven | **verse keten per noot/gebeurtenis**, auto-dispose via `player.onstop` | **één blijvende keten per clip**, blijft de hele render leven |
| Node-volgorde | Player → PitchShift → Reverb → FadeGain → Volume → trackBus → master | Player → PitchShift → Reverb → FadeGain → Volume → destination |

De **node-volgorde en de parameters zijn identiek** (zelfde `decay`, zelfde
`wet`, zelfde `PitchShift({pitch})`, zelfde fade-curves). Het verschil zit in
**hoe** en **waar** de keten leeft: live maakt per afspeel-event een verse,
kortlevende keten; de export bouwt één keten per clip en hergebruikt die.

> **Belangrijk:** de export reproduceert de live-logica dus niet — het is een
> parallelle implementatie. Elke divergentie tussen die twee is een potentiële
> bron van het verschil in klank.

---

## 4. De export-keten, exact (`src/utils/audioExport.ts`)

`renderOffline` (`:210-339`) draait binnen `Tone.Offline(async ({ transport }) => {…}, duration, channels, sampleRate)` met `sampleRate 44100`, `channels 2`.

Per clip (`:238-282`) — **één** blijvende keten:

```ts
if ((clip.effects?.pitch ?? 0) !== 0) {
  chainNodes.push(new Tone.PitchShift({ pitch: clip.effects!.pitch }));   // :250  ← geen windowSize
}
if ((clip.effects?.reverb ?? 0) > 0) {
  const reverb = new Tone.Reverb({ decay: 1.5 + (clip.effects!.reverb / 100) * 3 }); // :253
  reverb.wet.value = clip.effects!.reverb / 100;                          // :256
  chainNodes.push(reverb); reverbs.push(reverb);
}
if (clipFadeIn > 0 || clipFadeOut > 0) { fadeGain = new Tone.Gain(1); chainNodes.push(fadeGain); } // :265
chainNodes.push(new Tone.Volume(totalVolumeDb));                          // :269
// sequentieel verbinden, laatste node .toDestination()                    :273-276
const player = new Tone.Player(buffer).connect(targetNode);              // :282
```

Reverb-gereedheid wordt afgewacht vóór de render (`:329-331`):
```ts
if (reverbs.length > 0) { await Promise.all(reverbs.map((r) => r.ready)); }
transport.start(0);                                                       // :334
```

**Loop-clips** (`:292-314`) — let op: bij een loopende effect-clip wordt
**dezelfde `player` en dezelfde `fadeGain`** meerdere keren gebruikt:
```ts
while (offset < totalSeconds - 0.001) {
  transport.schedule((time) => {
    if (fadeGain) scheduleFadeCurves(fadeGain, time, dur, eventFadeIn, eventFadeOut); // zelfde fadeGain, meerdere keren
    player.start(time, trimStart, dur);   // zelfde monofone Tone.Player, meerdere keren
  }, scheduleTime);
  offset += singleDuration; iterIndex++;
}
```

De reverb-staart wordt in de duurberekening meegenomen
(`calculateTimelineDuration:112-118`: `reverbTail = 1.5 + reverb/100*3`).

Fade-curves (`createFadeCurve` / `scheduleFadeCurves`, `:148-185`): fade-in `x²`,
fade-out `(1-x)²`, 128 stappen, via `setValueCurveAtTime` — **identiek** aan
`AudioService.createFadeCurve` (`:598-609`).

## 5. Video gebruikt exact dezelfde render

`src/utils/videoExport.ts:122` roept **`renderOffline` uit `audioExport.ts`
direct aan** voor de audiotrack. De resulterende `AudioBuffer` wordt gemuxt door
`src/utils/videoExportEngines.ts` (WebCodecs → AAC bij `:225`, of MediaRecorder
realtime-capture bij `:254-330`). Er is **geen aparte audio-implementatie voor
video** → dezelfde effect-glitch verschijnt gegarandeerd ook in de geëxporteerde
video.

## 6. De live-keten, exact (`src/services/AudioService.ts:622-675`)

```ts
if (effects.pitch !== 0) nodes.push(new Tone.PitchShift({ pitch: effects.pitch })); // :633  ← ook geen windowSize
if (effects.reverb > 0) {
  const reverb = new Tone.Reverb({ decay: 1.5 + (effects.reverb / 100) * 3 });       // :636
  reverb.wet.value = effects.reverb / 100; nodes.push(reverb);
}
if (effects && (effects.fadeIn > 0 || effects.fadeOut > 0)) { fadeGain = new Tone.Gain(1); nodes.push(fadeGain); }
nodes.push(new Tone.Volume(volumeDb));
const player = new Tone.Player(buffer);
player.chain(...nodes, destination);       // :659 — verse keten per event
player.onstop = () => { /* dispose player + alle nodes */ };  // :666-672 — kortlevend
```

Verschil met export: **verse keten per afspeel-event, meteen weggegooid.** Geen
node leeft langer dan één noot. In de export leeft alles de hele render.

---

## 7. Hypotheses, gerangschikt op waarschijnlijkheid

### H1 — `Tone.PitchShift` in een offline-render (sterkste verdachte)
`Tone.PitchShift` (Tone 15.1.22) is een **granulaire/delay-line pitch shifter**:
twee kruisvervagende `Delay`-nodes gemoduleerd door interne **LFO's** op
`1/windowSize` (default `windowSize 0.1s` → ~10 Hz korrelfrequentie). `windowSize`
wordt **nergens** ingesteld (`audioExport.ts:250`, `AudioService.ts:633` — beide
default). Deze klasse effecten (interne oscillator-/LFO-bronnen) is de klassieke
boosdoener bij **niet-realtime `OfflineAudioContext`-rendering**: de korrel-
crossfade kan verkeerd doorlopen → periodieke **korrelklikjes / gestotter** —
precies wat Bert beschrijft. Live monitoren maskeert het; een schone offline
bounce legt het bloot.
- Corroboratie: het team flagde PitchShift al als fragiel — `docs/audio/archief/PLAN-CLIP-LOOP-EFFECTS.md:937` "PitchShift CPU te zwaar … Max 2-3 clips met pitch tegelijk."
- Betrokken Tone-API's: `Tone.PitchShift`, interne `Tone.LFO`/`Tone.Delay`, `Tone.Offline`/`OfflineAudioContext`.
- **Waarschuwing bij dit spoor:** een `OfflineAudioContext` rendert oscillatoren
  in principe correct. Bevestig dus éérst empirisch (§9) dat pitch-only écht
  glitcht, vóór je aanneemt dat dit dé oorzaak is.

### H2 — `Tone.Reverb` IR-generatie in de offline-context
Ook al wordt `reverb.ready` nu afgewacht (`:329-331`, exports-audit #6 gemarkeerd
gefixt): elke `new Tone.Reverb()` genereert zijn impulse-response via een eígen
interne render. Eén Reverb per reverb-clip in de offline-callback is fragiel; bij
meerdere reverb-clips worden de convolver-buffers vlak vóór `transport.start(0)`
toegewezen. Een droge/korte/mis-getimede IR kan een klik geven bij clip-onset.
Lager dan H1 omdat gereedheid nu tenminste wordt afgewacht.

### H3 — één blijvende keten hergebruikt over loop-iteraties
Alleen bij **loopende effect-clips**: de export hergebruikt één `Tone.Player` +
één `fadeGain`/PitchShift/Reverb en roept `player.start()` herhaald aan
(`:292-314`). `Tone.Player` is monofoon → iteratie 2's `start()` **knipt
iteratie 1 af**. En herhaalde `setValueCurveAtTime` op dezelfde `fadeGain.gain`
kan overlappen/gooien → dropout. Live maakt hiervoor een **verse** keten per
event. Secundaire bijdrager; treft niet de niet-loopende effect-clips.

### H4 — fade-curve `setValueCurveAtTime`-randgevallen
Timing identiek aan live; voor enkele (niet-loop) clips wordt de curve één keer
gepland. Onwaarschijnlijk de hoofdoorzaak, maar controleer randgevallen waar
`fadeOutStart` midden in een korrel valt.

### H5 — UITGESLOTEN: node-count / CPU in offline
Offline is **niet-realtime**: de berekening per sample is deterministisch,
ongeacht het aantal nodes. CPU kan geen "stotter" veroorzaken.
`docs/audio/AUDIT-EXPORTS.md:53` bevestigt: geen caps, de live-bus-limiet geldt offline
niet. **Niet de oorzaak.**

---

## 8. Waarom de bestaande audit dit miste

`docs/audio/AUDIT-EXPORTS.md` (17-7) noemde de pijplijn "architectonisch gezond" en nam
aan dat live- en offline-effectketens "1-op-1 gelijk" zijn (`:52`). Bekende
export-items: #5 reverb-staart (✅ gefixt), #6 reverb-IR-gereedheid (✅ gefixt),
#8 hidden-tab-throttling (⏳ open), #13 BPM (⏳ deels). **Er is géén bevinding over
PitchShift-korrelartefacten of effect-clip-glitching in de export** — dat is
precies het gat waarin deze bug leeft. De aanname "live == offline voor effecten"
is niet empirisch getoetst.

---

## 9. Isolatie-protocol (eerst doen in de onderzoekssessie)

Bevestig de échte boosdoener vóór je fixt. Maak vier minimale exports en luister
+ analyseer elk:

1. **Pitch-only**: één clip, alleen pitch (bv. +7), geen reverb/fade/loop.
2. **Reverb-only**: één clip, alleen reverb (bv. 50%).
3. **Fade-only**: één clip, alleen fade-in + fade-out.
4. **Loop + effect**: één loopende clip met pitch of fade.

Verwachting op basis van de hypotheses: (1) glitcht → H1; (2) glitcht → H2; (4)
glitcht maar (1)-(3) niet → H3. Combineer met de objectieve meting uit §11.

---

## 10. Fix-richtingen (voor de onderzoekssessie — nog te kiezen/testen)

### R-A — De export gelijktrekken met live (structureel, aanbevolen basis)
Bouw in de offline-render een **verse keten per event** (per loop-iteratie),
net als `createOnDemandPlayer`. Extraheer één gedeelde `buildEffectChain(effects,
volumeDb)`-helper die **zowel** `AudioService` als `renderOffline` gebruiken, zodat
de twee motoren niet meer uit elkaar kunnen lopen. Dit elimineert H3 volledig en
voorkomt toekomstige divergentie. Lost H1/H2 op zichzelf niet op, maar is het
juiste fundament.

### R-B — PitchShift-specifiek (als H1 bevestigd)
- Expliciete `windowSize` proberen (bv. 0.03–0.1) en per-pitch afstemmen.
- Of pitch **pre-bakken** door de bronbuffer te resamplen i.p.v. de granulaire
  PitchShift te gebruiken in offline. **Nadeel:** resamplen verandert óók de
  duur/het karakter (tape/varispeed-effect, "chipmunk") — dat klinkt anders dan
  de duur-behoudende PitchShift. Alleen acceptabel als Bert die klank goedkeurt.

### R-C — Vangnet: realtime-capture-export (klinkt gegarandeerd als live)
De MediaRecorder-video-engine doet al realtime-capture
(`videoExportEngines.ts:254-330`). Pas dezelfde aanpak toe op de MP3-export voor
composities mét effecten: speel de compositie in een **echte** `AudioContext` af
(waar de effecten goed klinken) en neem de output op. **Nadeel:** de export duurt
dan ~zo lang als het nummer (niet sneller-dan-realtime), en is minder
deterministisch. **Voordeel:** klinkt exact als live — geen offline-artefacten
mogelijk. Bij korte kindercomposities (< 1 min) is de wachttijd acceptabel.
Besluit Bert (testronde 6): dit vangnet is akkoord als de offline-route niet
schoon te krijgen is.

**Aanbevolen volgorde:** R-A als basis → R-B proberen → als pitch offline tóch
niet schoon wordt, R-C voor (in elk geval de) effect-composities.

---

## 11. Verificatie (objectief + gehoor)

- **Objectief (zonder oren):** analyseer de gerenderde `AudioBuffer` op
  **sample-tot-sample-discontinuïteiten** (grote sprongen in opeenvolgende
  samples) — glitches/klikken tonen zich als pieken in `|x[n] − x[n−1]|`. Dit
  geeft een meetbaar signaal vóór/ná een fix, los van subjectief "klinkt vies".
  Kan als klein test-/diagnosescript naast `audioExport.ts`.
- **Gehoor (Bert):** uiteindelijke toets is Berts oor op de vier isolatie-
  exports en een echte compositie.
- **Regressie:** clips zónder effecten moeten schoon blijven; live afspelen mag
  niet veranderen (als `buildEffectChain` gedeeld wordt, live meetesten).

---

## 12. Bestanden-index (voor snelle navigatie)

| Onderwerp | Bestand : regels |
|---|---|
| Offline render (MP3 + video-audio) | `src/utils/audioExport.ts:194-348` |
| Per-clip effectketen offline | `src/utils/audioExport.ts:238-282` |
| Loop-clip offline (node-hergebruik) | `src/utils/audioExport.ts:292-314` |
| Reverb-ready await | `src/utils/audioExport.ts:329-331` |
| Duur incl. reverb-staart | `src/utils/audioExport.ts:94-124` |
| Fade-curves offline | `src/utils/audioExport.ts:148-185` |
| Live effectketen (per event) | `src/services/AudioService.ts:622-675` |
| Live fade-curve | `src/services/AudioService.ts:598-609` |
| Video → renderOffline | `src/utils/videoExport.ts:122-132` |
| Video-mux (WebCodecs/MediaRecorder) | `src/utils/videoExportEngines.ts:225, 254-330` |
| MP3-export-trigger | `src/hooks/useAudioExport.ts:46-94` |
| Video-export-trigger | `src/hooks/useVideoExport.ts:82-148` |

## 13. Relevante bestaande documentatie

- `docs/audio/AUDIT-EXPORTS.md` — exports-audit (17-7); #5/#6 reverb gefixt, #8 open;
  géén PitchShift-bevinding (het gat).
- `docs/audio/archief/PLAN-AUDIO-REFACTOR.md` — on-demand fire-and-forget-architectuur (PERF-1);
  bevestigt dat de export bewust aparte players per clip maakt.
- `docs/audio/archief/PLAN-CLIP-LOOP-EFFECTS.md` — clip-loop + effecten (#65/#33); `:937` flagt
  PitchShift als CPU-/stabiliteitsrisico.
- `docs/audio/archief/PLAN-EXPORT-MP3.md` — oorspronkelijk MP3-export-ontwerp.
- `docs/audio/TONEJS-KENNISBANK.md` — Tone.js-valkuilen.

---

## 14. Samenvatting in één alinea (voor de verse chat)

De export bouwt effectketens in een **aparte offline-implementatie**
(`renderOffline`, `audioExport.ts`) los van de live-motor (`createOnDemandPlayer`,
`AudioService.ts`). Het gestotter zit vrijwel zeker in het offline renderen van
**`Tone.PitchShift`** (granulair, default `windowSize`, `OfflineAudioContext`),
met `Tone.Reverb`-IR-in-offline en het hergebruik van één keten over loop-
iteraties als secundaire verdachten; node-count/CPU is uitgesloten (offline is
niet-realtime). Begin met **empirisch isoleren** (pitch/reverb/fade/loop apart),
trek daarna de offline-render **gelijk aan live** (gedeelde `buildEffectChain`),
stem PitchShift af, en val zo nodig terug op een **realtime-capture-export** die
gegarandeerd als live klinkt (Bert akkoord met dat vangnet). Verifieer objectief
met buffer-discontinuïteitsanalyse én op Berts gehoor.

---

## 15. Empirische bevindingen onderzoekssessie (23/24-7-2026) — AFGEROND

Het isolatie-protocol uit §9 is uitgevoerd in de browser (Chromium, Mac, Tone
15.1.22, echte theme-samples, verbatim kopie van de worktree-`renderOffline`),
met een objectieve klik-metriek: sprongen in `|x[n] − x[n−1]|` boven drempel.
Daarnaast is **Berts echte glitchende export geanalyseerd**
(`~/Downloads/Test-23-7-8_16.mp3`, testronde 6, 18.1s).

### 15.1 De vingerafdruk in Berts MP3 (de doorslag)

- **Klik-clusters met periodiciteit ~12 Hz** (op 2.304 / 2.387 / 2.471 / 2.554 /
  2.638 s — spacing ≈ 0.0835 s), sprongen tot **0.70**. 12 Hz is exact de
  korrelfrequentie van `Tone.PitchShift` bij **pitch +12** met default
  `windowSize 0.1` (`factor · 1.2/0.1`, factor = 2^(12/12) − 1 = 1). Het
  "gestotter" is dus een mitrailleur van korrelklikjes op een +12-clip.
- **Geen clipping** (0 samples op full scale) — dat spoor is dood.
- De "dropouts" rond 4 s bleken stil materiaal van de compositie zelf.

### 15.2 Meetresultaten (kern)

| Test | Resultaat |
|---|---|
| Sinus, offline: kaal / pitch±7 / reverb / loop-hergebruik / verse players | **allemaal schoon** (0 kliks) |
| Drums, offline: fade-only / reverb-only / 16 gelijktijdige pitch+reverb-ketens / 70 s render | **schoon** |
| Drums, offline: pitch −5 | 1-2 korrelklikjes (inherent granulair artefact, ook live) |
| Loop met gedeelde player+fadeGain vs verse players (H3) | **identiek resultaat** — H3 weerlegd als glitchbron |
| Twee renders van dezelfde pitch-clip | bit-identiek (deterministisch binnen sessie) |
| lamejs MP3-encode (float→int16 clampt correct) | **schoon**, geen wrap-around |
| Sinus 0.8, offline 44.1k, **pitch +12** | **366 kliks** (periodiek — hoorbaar gekraak) |
| Zelfde keten **live** (48k, AudioWorklet-capture) pitch +12 | 30 kliks (~12× minder); pitch +7 live: 0 |
| Zelfde offline render, **later in dezelfde paginasessie** | **16.164 kliks, amplitude tot 1.59** — catastrofale modus |

### 15.3 Conclusies

1. **H1 bevestigd, in verfijnde vorm.** `Tone.PitchShift` produceert bij hoge
   pitchwaarden (±10..12) periodieke korrelklikken; offline (44.1k) is dat
   ~12× erger dan live (48k). Er bestaat bovendien een **sessie-afhankelijke
   catastrofale modus** waarin de crossfade-LFO van PitchShift in de offline
   render effectief niet loopt: beide delay-takken worden ongemaskeerd opgeteld
   (amplitude ×2, sawtooth-wraps volledig hoorbaar = het "enorme gestotter").
   Die modus was in één sessie 100% deterministisch reproduceerbaar (16.164
   kliks bij elke render, ook na context-suspend), maar de precieze trigger is
   niet geïsoleerd (Tone.start, worklet-registratie, live afspelen via de echte
   AudioService en app-niveau-export triggeren hem elk afzonderlijk níet).
   Berts app-exports hebben de vingerafdruk van deze modus.
2. **H2 (reverb) en H3 (keten-hergebruik bij loops) niet gereproduceerd** als
   glitchbron. Ze blijven architectonische zwaktes maar zijn niet de oorzaak.
3. **H5 blijft uitgesloten**; ook de MP3-encodestap en de 48k→44.1k
   buffer-resampling zijn schoon gemeten.
4. `windowSize` afstemmen (R-B, 0.03/0.05) **verergerde** de catastrofale modus
   — geen begaanbare route.
5. Extra gevonden (architectuurkaart): hoorbare live≠export-verschillen die los
   van de glitch bestaan — loops faden in export alleen op eerste/laatste
   iteratie i.p.v. elke iteratie (D4), **solo wordt in export genegeerd** (D6),
   reverbstaart wordt live afgekapt maar in export volledig gerenderd (D12),
   `pan` is een dood veld, `exportToWav` is dode code.

### 15.4 Besluit

Gekozen richting (Bert akkoord, 23-7): **PitchShift volledig vervangen** door
vooraf gebakken pitch-buffers via **Signalsmith Stretch** (WASM, MIT, npm
`signalsmith-stretch`) + één gedeelde graph-builder voor live/preview/export +
deterministische reverb-IR's + export-validator met realtime-capture-vangnet.
Volledig plan: `docs/audio/PLAN-AUDIO-ENGINE-V2.md`.
