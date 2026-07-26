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

## De cast

| # | Naam | Kleur | Lichaamsvorm | Vast kenmerk / accessoire | Rol |
|---|---|---|---|---|---|
| 1 | **Finn** | koperoranje | slanke android | klein mechanisch robot-papegaaitje op de schouder; cyaan scherm-gezicht met blije lach | avontuurlijke leider |
| 2 | **Bolt** | kersenrood | blokkige retro-blikrobot (groot/log) | antenne + rond borstmeter-paneel | sterke, onhandige enthousiasteling |
| 3 | **Pip** | teal | klein rond chibi-botje (zweeft) | enorme gloeiende ronde ogen | nieuwsgierig, energiek |
| 4 | **Nova** | paars | gladde lange android | grote koptelefoon-oorschelpen (géén muzieknoot-ogen — gewone gloeiende ogen) | muzikale dromer |
| 5 | **Ziggy** | goud/messing | lange lenige tinkeraar-android | gereedschap-arm + stofbril op het voorhoofd | uitvinder |
| 6 | **Mossy** | groen | rond vriendelijk botje | roest-/mosplekjes + klein blaadje-sprietje | rustige natuurliefhebber |

**Finn = onze bestaande piraten-storyboardheld, maar in thema-neutrale basis**: dezelfde
koperoranje android + cyaan gezicht + papegaaitje, **zónder piratenkleding** (geen
driekante hoed, ooglap of houten been — dat is piraten-flavor die er per thema los
overheen komt). Referentie: `.thema-studio/piraten/kandidaten/sb-schattenjacht-1-v1.png`.

## Canonieke referentiebeelden

Elk lid wordt één keer los gestyled als schoon full-body portret op neutrale achtergrond en
opgeslagen als `reference/cast/{naam}.jpg`. Dit zijn de **canonieke referenties**: ze gaan
als `--image-reference` mee bij het genereren van praatplaten en storyboards, en dienen
tegelijk als promomateriaal (character line-up).

Bestaand (allemaal Bert-goedgekeurd, gegenereerd met Nano Banana Pro):
- `reference/cast/{finn,bolt,pip,nova,ziggy,mossy}.jpg` — de 6 losse portretten.
- `reference/cast/groep-neutraal.jpg` — groepsposter, thema-neutraal (voor de site).
- `reference/cast/groep-piraten.jpg` — groepsposter met piraten-flavor (voor het piratenthema).

De groepsposters worden gemaakt door de 6 losse portretten samen als `--image-reference`
mee te geven (piratenversie + het stijlanker erbij).

## Gebruik in de pipeline

- **Praatplaat / storyboard**: kies 3-6 relevante cast-leden als hoofdrolspelers, geef hun
  `reference/cast/*.jpg` mee als `--image-reference` (samen met het stijlanker; Nano Banana
  Pro accepteert ≤14 refs), **benoem ze bij naam + hun kenmerk** in de prompt, en geef ze
  de thema-flavor. Vul de rest aan met random familie-robots.
- **Storyboards**: laat één of twee cast-leden de hoofdrol spelen (het meest gezicht-getrouw).
- Bij een nieuw thema hoeft de cast niet opnieuw gestyled te worden — alleen de flavor
  wisselt.
