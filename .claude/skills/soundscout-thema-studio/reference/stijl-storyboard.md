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
- Elk frame moet **in één oogopslag leesbaar** zijn wat er gebeurt (digibord-afstand).
- Kies één frame als `coverImage` (het meest dynamische — cf. `verspringen` gebruikt
  frame 2).
- Elk frame suggereert geluid: de handeling moet hoorbaar voorstelbaar zijn met de
  samples van het thema.

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
