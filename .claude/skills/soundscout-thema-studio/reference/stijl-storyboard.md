# Stijlcontract: storyboard-frames

Referentiebeelden: `public/images/storyboards/verspringen/verspringen-{1,2,3}.jpg`
(aanloop → sprong → landing). Bekijk minstens één frame met Read.

## Waargenomen huisstijl

Cinematisch en dynamisch: **één heldpersonage** centraal, actie/close-up, sterke
beweging, neon-/gloedaccenten, rijker gerenderd dan de praatplaten. Elk frame is één
scène uit een kort verhaal.

## Functionele eisen

- **3-5 frames** die samen één duidelijke handeling vertellen (begin → midden → eind);
  de leerling componeert er per frame een muzikaal segment bij (frames worden secties
  op de timeline).
- **Consistentie over frames is heilig**: zelfde held (kleuren, bouw, gezicht), zelfde
  decor, zelfde belichting. Werkwijze: frame 1 eerst genereren en laten goedkeuren;
  frames 2-5 genereren mét frame 1 als referentiebeeld (character consistency) +
  het stijlanker.
- **Varieer de houding/expressie van de held per frame** — nooit exact dezelfde pose in
  elk frame (dat oogt als copy-paste). De referentie borgt het *ontwerp*; de prompt stuurt
  *pose + expressie*. Een personage kan dus per frame anders staan en kijken — bv. eng/
  dreigend in frame 1-3 en vriendelijk in frame 4 (plottwist) — en tóch duidelijk dezelfde
  robot zijn. Beschrijf per frame expliciet een andere, dynamische houding.
  Dit geldt óók voor **terugkerende secundaire elementen** (ledematen/tentakels, de
  bemanning/menigte): laat die per frame een andere pose aannemen, anders oogt het als
  copy-paste. Overweeg ook per frame een ander camerastandpunt (frontaal / zijkant /
  laag / detail).
- Elk frame moet **in één oogopslag leesbaar** zijn wat er gebeurt (digibord-afstand).
- Kies één frame als `coverImage` (het meest dynamische — cf. `verspringen` gebruikt
  frame 2).
- Elk frame suggereert geluid: de handeling moet hoorbaar voorstelbaar zijn met de
  samples van het thema.

## Werkwijze — karakterreferentie & drift (belangrijk)

- **Genereer eerst het frame waarin de held/het personage het duidelijkst en volledigst in
  beeld is** (niet per se frame 1 — bij een monster dat pas laat verschijnt is dat bv.
  frame 2). Keur dat goed en gebruik het als **canonieke referentie** voor álle andere
  frames.
- Verwijst een frame naar een deel-view (bv. frame 1 = alleen ogen boven water): geef dan
  tóch de canonieke referentie mee én benoem expliciet welke kenmerken moeten matchen
  (bv. "dezelfde ronde gloeiende ogen als de referentie, geen kattenogen").
- **Drift?** Wijkt een frame af (andere personages, andere ogen/kleuren) → regenereer met
  de canonieke referentie als `--image-reference` en noem de afwijking expliciet in de prompt.
- **A/B-varianten**: een object in een frame verwisselen (bv. schat = oliekan ↔ badeendje)
  doe je met een gerichte edit (`--edit-van <frame> --prompt "vervang X door Y, rest
  identiek"`) — zo krijg je zuiver vergelijkbare varianten.

## Promptstructuur

1. "Wide horizontal illustration" + scènebeschrijving (welk moment in de handeling).
2. De held: uiterlijk exact beschrijven (zelfde beschrijving letterlijk herhalen in
   elk frame-prompt) — plus referentiebeeld meesturen vanaf frame 2.
3. Decor + camerastandpunt (mag per frame variëren: totaal → actie → close-up).
4. Stijl: dynamische cartoonstijl, bold outlines, gloedaccenten, kindvriendelijk, 4k.

## Negatieve prompt (altijd)

De held én alle figuren/dieren zijn robot-versies (huisstijlregel — nooit mensen/echte
dieren); **geen tekst/letters/cijfers** (het bestaande
verspringen-storyboard heeft wartaal op tribuneborden — dat bannen we uit); geen
letterbox/kaders.
