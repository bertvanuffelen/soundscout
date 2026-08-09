# Gotchas — valkuilen van Nano Banana Pro (lees dit vóór je genereert)

Hard geleerd tijdens het piratenthema en de cast-productie. Elke regel heeft ons minstens
één generatie (2 credits) gekost.

## Tekst sluipt er ongevraagd in

| Valkuil | Wat er gebeurt | Wat je doet |
|---|---|---|
| **Scène-namen in hoofdletters** | Schrijf je een mini-tafereel als `"THE GROG BAR: robots clink mugs"`, dan rendert hij een écht bord met die tekst in beeld | Beschrijf tafereeltjes puur beschrijvend, zónder label-achtige naam in caps: *"at a grog bar with barrels, robots clink mugs…"* |
| **Onomatopee** | Bij kanonnen, klappen en explosies verschijnt "BOOM"/"POW"/"SPLASH" als comic-tekst | Verbied ze expliciet in het negatief-blok (staat er standaard in) |
| **Winkels, straatnamen, banners** | Stedelijke scènes krijgen vanzelf uithangborden met wartaal | Noem ze in het negatief-blok: *no shop signs, street signs, labels or captions* |

**Uitzondering**: op de plattegrond zijn labels juist gewenst, en één titel op een poster
mag — spel 'm dan letterlijk voor en verbied álle andere tekst:
`no text anywhere EXCEPT the single title "<Naam>" (spelled exactly, no other words)`.

## Organische dieren blijven terugkomen

Tropische dieren (papegaaien, apen, krabben, meeuwen) komen hardnekkig als **echte** dieren
uit de generator, ook na gerichte edits. Verbieden in het negatief-blok helpt maar
gedeeltelijk.
- Zeg er expliciet bij dat het dier mechanisch is: *"a small mechanical robot parrot with
  metal panel wings"*.
- Blijft het misgaan: **ontwerp eromheen** (ander dier, of dier weglaten) in plaats van
  nóg een iteratie te verbranden.

## Composities-instructies veroorzaken stijldrift

Eén extra alinea over kadrering ("generous margin on all sides, nothing cropped") liet
Nano Banana het **hele beeld** opnieuw interpreteren: de robot-papegaai werd een echte
papegaai, Bolt verloor antenne én borstmeter, Ziggy haar tandwielen, Mossy werd een glad ei.

> **Voeg nooit een compositie-alinea toe aan een recept dat al werkt.** Accepteer liever een
> klein randje bijsnijden, of draai dezelfde prompt nog een keer — elke run kadreert anders.

Dit geldt breder: **verander per iteratie één ding**. Sleutel je aan meerdere knoppen
tegelijk, dan weet je niet welke de drift veroorzaakte.

## Referenties: alleen canonieke bronnen

- Gebruik **nooit een uitsnede uit een groepsbeeld** als referentie voor nieuw werk — daar
  zit al drift in, die je dan vermenigvuldigt. Alleen `reference/cast/{naam}.jpg` en het
  goedgekeurde stijlanker zijn geldige bronnen.
- 2-3 gerichte referenties werkt beter dan 14 vage. Bij een groepsbeeld zijn alle 6
  cast-portretten wél juist — dat is bewezen (zie de groepsposters).
- Bij een **gerichte edit** (`--edit-van`): beschrijf letterlijk dat de rest identiek blijft
  (*"Reproduce the attached illustration EXACTLY … Change ONE thing only: …"*). Dat werkt
  betrouwbaar — zo zijn de Engelse titelvariant en Ziggy's hoofddoek gemaakt.

## Bouw-drift bij personages

Terugkerende personages verliezen hun bouw sneller dan hun kleur. Ziggy werd log en
mannelijk, Mossy werd een klein eivormig wezen — kleur klopte in beide gevallen wél.
- Beschrijf de **bouw** altijd expliciet en in hoofdletters waar het kritisch is
  (`SLENDER SLIM FEMININE build`, `LARGE ROUND CHUNKY`), inclusief wat het **niet** is.
- Zet `do not change any robot's body shape, size or base colour` in het negatief-blok.
- Zie de *Nooit*-lijsten in [stijl-cast.md](stijl-cast.md).

## Techniek

- **Job-id-vormen**: `generate create --json` geeft de id als bare string, soms als
  `["<id>"]`, soms als dict. De wrapper vangt alle vormen af — pas 'm niet aan.
- **Onderbroken download = niet opnieuw genereren.** De job draait al en is betaald;
  herstel 'm via `generate get` (zie [api-setup.md](api-setup.md)).
- **Formaten**: `verwerk-afbeelding.py --formaat breed` (1920×1080, default) voor
  app-beelden en posters · `--formaat vierkant` (1024×1024) voor cast-portretten, die je
  genereert met `--aspect-ratio 1:1`.
- **Resolutie 2k volstaat**; 4k kost hetzelfde aan credits maar levert alleen grotere
  bestanden die je toch terugschaalt.
