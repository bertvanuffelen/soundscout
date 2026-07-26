# Stijlcontract: de vaste SoundScout-cast (mascotte-robots)

Naast de anonieme robotfamilie (zie [stijl-robots.md](stijl-robots.md)) heeft SoundScout
een **vaste cast van 6 mascotte-robots** die als **hoofdrolspelers** terugkomen in élke
praatplaat en elk storyboard — over álle thema's heen (globale cast). Ze geven
herkenbaarheid en dienen als promomateriaal. De rest van een scène wordt aangevuld met
random familie-robots.

## Kernregels

- De cast volgt **exact de robotfamilie/animatiestijl** uit stijl-robots.md (bold dark
  outlines, cel-shaded, scherm-/visorgezicht met gloeiende ogen + simpel mondje, geen
  mensenmond).
- **Base-designs zijn thema-neutraal**; per thema komt de flavor er los overheen
  (piratenhoed, wintermuts, ruimtehelm…) — de robot eronder blijft dezelfde.
- Elk lid heeft een **hard onderscheidend kenmerk** (unieke kleur + lichaamsarchetype +
  vast accessoire), zodat het herkenbaar blijft óók als de generator 'm losjes rendert in
  een drukke plaat. Gezicht-getrouw vooral in held-gerichte storyboards.

## De cast — harde specificatie

**Gebruik deze zinnen letterlijk in de prompt** (Engels), naast de `--image-reference`.
De kolom *Nooit* bevat de drift die we in de praktijk zagen; neem die punten op in het
negatief-blok zodra een lid in beeld komt.

### 1. Finn — de avontuurlijke leider
- **Kleur**: koperoranje (copper-orange), grijs-metalen gewrichten.
- **Bouw**: slanke android, normale (mannelijke) proporties, gemiddelde lengte — de langste
  van de "gewone" androids.
- **Vast**: klein **mechanisch robot-papegaaitje** op zijn schouder (metalen panelen-vleugels).
- **Prompt-zin**: *"FINN — coppery-ORANGE slim android with a small mechanical robot parrot
  on his shoulder."*
- **Nooit**: piratenkleding in het basisontwerp (dat is thema-flavor); geen houten been.

### 2. Bolt — de sterke, onhandige enthousiasteling
- **Kleur**: kersenrood (cherry-red).
- **Bouw**: **groot en blokkig** retro-blikrobot; rechthoekig hoofd, rechthoekig lijf,
  duidelijk de logste/breedste van de zes.
- **Vast**: dunne **antenne** op zijn hoofd + rond **borstmeter-paneel** (analoge wijzer).
- **Prompt-zin**: *"BOLT — big CHERRY-RED BOXY retro tin-robot with a thin antenna and a
  round chest gauge."*
- **Nooit**: slank of android-achtig maken; antenne of meter weglaten.

### 3. Pip — de nieuwsgierige energiebom
- **Kleur**: teal.
- **Bouw**: **heel klein**, rond chibi-botje dat **zweeft** (voetjes los van de grond).
- **Vast**: **enorme** ronde gloeiende ogen die het hele gezichtsscherm vullen.
- **Prompt-zin**: *"PIP — tiny TEAL round chibi robot that floats, with huge glowing eyes."*
- **Nooit**: op mensformaat brengen; gewone kleine ogen geven.

### 4. Nova — de muzikale dromer
- **Kleur**: paars.
- **Bouw**: slanke, gladde, lange android met **vrouwelijke** proporties.
- **Vast**: grote **koptelefoon-oorschelpen** aan weerszijden van haar hoofd.
- **Prompt-zin**: *"NOVA — slim PURPLE android with large headphone ear-cups on the sides of
  her head."*
- **Nooit**: **muzieknoot-ogen** (uitdrukkelijk verboden — gewone gloeiende ogen); de
  oorschelpen wegmoffelen.

### 5. Ziggy — de uitvinder
- **Kleur**: goud/messing (brass), licht verweerd.
- **Bouw**: **slanke, ranke, vrouwelijke** robotbouw — smalle taille, licht gebogen
  heupplaten, lange dunne ledematen. Nadrukkelijk **niet** log, blokkig of breedgeschouderd.
- **Vast**: **stofbril op het voorhoofd** (blauwgetinte glazen, versleten band) + kleine
  **tandwielen en zeskantmoeren** op borst- en schouderplaten + ze **houdt** een moersleutel
  vást (gereedschap in de hand, **niet** vastgelast aan haar arm).
- **Prompt-zin**: *"ZIGGY — GOLD/BRASS tinkerer android with a SLENDER SLIM FEMININE build
  (narrow waist, curved hips, long thin limbs — never bulky or boxy), dust goggles pushed up
  on her forehead, small gears and hex bolts on her chest, holding a wrench."*
- **Nooit**: mannelijke/blokkige bouw; gele of gouden ogen (**altijd cyaan**); moersleutel
  als arm-aanhangsel.

### 6. Mossy — de rustige natuurliefhebber
- **Kleur**: groen, met roestplekken.
- **Bouw**: **groot, rond en bonkig** — dik afgerond tonvormig lijf op **korte stompe
  beentjes**.
- **Vast**: plukken zacht **mos** op schouders/lijf + een klein **blaadje-sprietje** boven op
  zijn hoofd.
- **Prompt-zin**: *"MOSSY — a LARGE ROUND CHUNKY GREEN robot with a big rounded barrel-shaped
  body and short stubby legs, patches of soft moss and rust, and a small leaf sprout on top
  of his head."*
- **Nooit**: klein eivormig wezentje maken; hem bedekken met ruige mos-vacht/baard.

### Geldt voor álle zes
Donker scherm-/visorgezicht met **gloeiende cyaan ogen** + simpel lachlijntje; nooit een
menselijke mond. Bold dark outlines, cel-shaded, warm licht-verweerde kleuren.

### Vast negatief-blok bij cast-beelden
```
no realistic humans or real animals — robots only; no human mouths, lips or teeth;
no extra or floating limbs or detached hands; do not change any robot's body shape,
size or base colour.
```

**Finn = onze bestaande piraten-storyboardheld, maar in thema-neutrale basis**: dezelfde
koperoranje android + cyaan gezicht + papegaaitje, **zónder piratenkleding** (geen
driekante hoed, ooglap of houten been — dat is piraten-flavor die er per thema los
overheen komt). Referentie: `.thema-studio/piraten/kandidaten/sb-schattenjacht-1-v1.png`.

## Canonieke referentiebeelden

Elk lid wordt één keer los gestyled als schoon full-body portret op neutrale achtergrond
(`--aspect-ratio 1:1` → `verwerk-afbeelding.py --formaat vierkant`) en opgeslagen als
`reference/cast/{naam}.jpg`. Dit zijn de **canonieke referenties**: ze gaan
als `--image-reference` mee bij het genereren van praatplaten en storyboards, en dienen
tegelijk als promomateriaal (character line-up).

Bestaand (gegenereerd met Nano Banana Pro):
- `reference/cast/{finn,bolt,pip,nova,ziggy,mossy}.jpg` — de 6 losse portretten. **Dit zijn
  de enige geldige bronbeelden**: gebruik nooit een uitsnede uit een groepsposter als
  referentie voor nieuw werk, want daar zit al drift in.
- `reference/cast/groep-neutraal.jpg` — groepsposter, thema-neutraal (voor de site).
- `reference/cast/groep-piraten.jpg` — groepsposter met piraten-flavor (piratenthema).
- `reference/cast/groep-stad-nl.jpg` — groepsposter thema "De Stad", met titel.

De groepsposters worden gemaakt volgens het recept hieronder, met de 6 losse portretten
samen als `--image-reference` (plus het thema-stijlanker).

**Wijzigt een cast-lid?** Vervang het portret in `reference/cast/`, werk de spec hieronder
bij, en **regenereer elke groepsposter waarin dat lid staat** — anders lopen canon en
promomateriaal uiteen.

## Recept: groepsposter per thema

Elk thema kan een eigen groepsposter krijgen (zoals `groep-piraten.jpg`). Werkwijze:

1. **Rolverdeling** — geef elk cast-lid een rol die bij het thema past én bij zijn karakter
   (Nova = muziek, Pip = snelheid/speels, Mossy = natuur/dieren, Bolt = kracht/sport,
   Ziggy = maken/klussen, Finn = avontuur/leiding). Leg de rolverdeling eerst aan Bert voor.
2. **Prompt** — neem per lid de **letterlijke prompt-zin** uit de spec hierboven over en plak
   de rol eráchter ("… — the FISHERMAN: holding a fishing rod at the canal edge"). Zet erbij:
   *"must match their attached reference portraits EXACTLY in body build, proportions and
   colors; only their role props are added."*
3. **Referenties** — alle 6 portretten mee als `--image-reference` (+ het thema-stijlanker).
4. **Achtergrond** — expliciet **rustig** houden ("keep the background simple and uncluttered
   so the six characters stand out"), anders verdrinkt de cast.
5. **Titel** (optioneel) — één groot hand-drawn cartoon-logo met de themanaam; spel 'm
   letterlijk voor en verbied álle andere tekst in het negatief-blok:
   `no text anywhere EXCEPT the single title "<Naam>" (spelled exactly, no other words);
   no other letters, numbers, shop signs, street signs, labels or captions`.
6. **Controle** — loop de *Nooit*-kolom van elk zichtbaar lid na; drift zit bijna altijd in
   bouw (Ziggy log/mannelijk, Mossy klein/eivormig) en in oogkleur.

**Valkuil — composities-instructies veroorzaken stijldrift.** Een extra alinea over kadrering
("generous margin on all sides, nothing cropped") deed Nano Banana het hele beeld opnieuw
interpreteren: de robot-papegaai werd een échte papegaai, Bolt verloor antenne én borstmeter,
Ziggy haar tandwielen en Mossy werd een glad ei. **Voeg geen compositie-alinea toe** aan een
werkend cast-recept; accepteer liever een klein randje bijsnijden, of draai dezelfde prompt
nog een keer (elke run kadreert anders).

## Gebruik in de pipeline

- **Praatplaat / storyboard**: kies 3-6 relevante cast-leden als hoofdrolspelers, geef hun
  `reference/cast/*.jpg` mee als `--image-reference` (samen met het stijlanker; Nano Banana
  Pro accepteert ≤14 refs), **benoem ze bij naam + hun kenmerk** in de prompt, en geef ze
  de thema-flavor. Vul de rest aan met random familie-robots.
- **Storyboards**: laat één of twee cast-leden de hoofdrol spelen (het meest gezicht-getrouw).
- Bij een nieuw thema hoeft de cast niet opnieuw gestyled te worden — alleen de flavor
  wisselt.
