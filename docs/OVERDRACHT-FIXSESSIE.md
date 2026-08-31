# Overdracht — fixsessie zachte lancering (24-8)

> Plak dit in een **nieuwe chat die je start vanuit de hoofdmap**:
> `cd ~/Documents/gebouwde-apps/SoundScout && claude`
> De vorige chat zat vast aan de worktree `masterplan-6-weken` en kon daardoor
> niet bouwen of schrijven in `main`. Alleen dát was het probleem — de diagnoses
> hieronder zijn in de browser geverifieerd op de echte code.

## Waar we staan

- `main` = `origin/main` (in sync). Alles zit erin: Audio Engine v2, sequencer
  zonder dev-vlag, `/over`, CSP/AudioWorklet-fix, kosten-teksten, CTA-hiërarchie.
- `main/public/.htaccess` is geverifieerd correct: `blob:` + `'wasm-unsafe-eval'`
  in `script-src`, `blob:` in `connect-src`, `frame-src 'self' …`, `/over`-rewrite.
- Testplan: `docs/TESTPLAN-LANCERING.md` — **bijgewerkt 24-8** met negen
  afgevinkte punten. `docs/TESTPLAN-MASTERPLAN.md` blijft staan als
  regressie-referentie; niet opschonen.
- Piraten blijft `isPublic: true`.

## Taak 1 — Fullscreen-praatplaat: witte balken (de enige echte bug)

**Symptoom.** Presenteren met een beeld-vorm → fullscreen (knop of `F`).
Montagelijn klapt dicht ✅, zijpaneel klapt in ✅, achtergrond buiten de kaart is
donker ✅ — maar de plaat staat in een **witte kaart** met brede witte balken
links en rechts.

**Meting (ultrabreed scherm, viewport 3440px):**
- `img` = **2082 × 1171** px, klasse `h-full w-auto max-w-full rounded-xl object-contain`
- wrapper `div.relative.h-full` = 2082px (shrink-wrapt correct om het beeld)
- beeldzone `div.min-h-0.relative.flex.items-center.justify-center.p-3.bg-neutral-50.flex-1`
  = **3416px**, achtergrond `rgb(249,250,251)`
- inhoudskaart `div.flex-1.min-h-0.flex.flex-col.bg-bg-surface.mx-3.rounded-2xl…`
  = 3416px, achtergrond `rgb(255,255,255)`
→ ±1334px wit verdeeld over beide zijden.

**Diagnose.** Het beeld schaalt correct; het probleem is dat de **containers licht
blijven** in fullscreen. In venstermodus valt dat niet op omdat de kaart dan
bijna helemaal gevuld is.

**Bestand.** `src/components/presentation/PresentationSurface.tsx`
- praatplaat-bord (`interactiveBoard`): beeldzone ~r456, wrapper ~r457, `img` ~r461
- losse praatplaat: beeldzone ~r518, wrapper ~r521, `img` ~r525
- inhoudskaart: ~r421
- bestaande fullscreen-hook + effect: `isFullscreen` (~r242) en het
  collapse-effect (~r250-254) — dat werkt al goed, daar hoeft niets aan.

**Fix-richting.** Maak beeldzone + inhoudskaart donker zolang `isFullscreen`
(bijv. via `cn()` de `bg-neutral-50` / `bg-bg-surface` vervangen door de
brand-900-tint), zodat alleen het beeld oplicht — precies Berts wens "alleen de
afbeelding, met donkere achtergrond".

**Let op (bijwerking).** De wrapper moet exact om het zichtbare beeld blijven
vallen, anders verspringen `PraatplaatMarker` / `PraatplaatSpot` (die staan op
x%/y% van die wrapper). Zie de comment bij r519-520.

**Verificatie.** Presenteren met een praatplaat → `F` → alleen beeld op donker,
geen witte balken; spots nog op de juiste plek; venstermodus onveranderd;
storyboard-vorm ook checken.

## Taak 2 — Verouderde tekst in de docentenhandleiding

Hoofdstuk **"De sequencer"** eindigt met:
> "Let op: de sequencer is nog in ontwikkeling en staat standaard uit. Hij
> verschijnt pas als de functie voor jouw omgeving is aangezet."

Klopt niet meer sinds `108d2ff` (sequencer staat voor iedereen aan). Een docent
leest hier iets onjuists over een functie die hij gewoon ziet.
**Actie:** alinea verwijderen of herschrijven, **NL én EN**
(`teacher.guide.sections.sequencer.*` in `src/i18n/locales/{nl,en}.json`).

## Taak 3 (optioneel, klein) — Leeg album voorkomen

B1 bleek **geen bug**: de knop "Open montage" staat er wel; het album was leeg
omdat de opdracht *De schattenjacht* 0 ingeleverde composities heeft. De
presenteer-keuzemodal zegt dat al eerlijk ("Actieve opdracht (0) — Nog geen
inzendingen bij deze opdracht").
**Overweging:** in `ShareAlbumModal` waarschuwen of de knop uitschakelen bij 0
ingeleverde composities, zodat je geen leeg album deelt. i18n NL+EN.

## Werkafspraken (van Bert)

- Raak geen werkende functionaliteit aan die niet genoemd is.
- Bestaande UI-componenten (`Button`, `Modal`, `Card`) + `cn()`; geen nieuwe varianten.
- Geen hardcoded strings: alles via `src/i18n/locales/{nl,en}.json`, NL en EN samen.
- Beat-based positionering, conversies via `src/utils/audio.ts`.
- Kleine stappen, één onderwerp per keer; na elke wijziging `npx tsc -b --noEmit`
  en `npm run test:run` groen.
- Wijkt de werkelijkheid af van wat hier staat: stop en meld het.

## Wat Bert zelf nog test (niet automatiseerbaar)

Geluid (N3-exports, sequence hoorbaar), reset-mail (O1), testmail naar
`hello@soundscout.nl`, bewaarcode→podium (O3), touch-targets en landscape
(O5/O6), de **uitgelogde** CTA-toestanden (N6), en blok 0 (upload + console-check
op `ss-dev.techindeles.nl`).
