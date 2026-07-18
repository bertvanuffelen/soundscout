# Ontwerp: Luister-en-plaats (#44) — geluiddictee op beeld (17-7-2026)

> **Concept (Bert, kans #1)**: het omgekeerde spel. Niet geluiden zoeken en componeren, maar *luisteren*: je hoort een geluid en wijst aan wáár op het beeld het hoort. Traint gericht luisteren, klanken herkennen en geluid-bron-koppeling — de luistervaardigheid uit de muziekdoelen die nu nog geen eigen werkvorm heeft.
> **Besluit Bert**: beide varianten in één model ontwerpen; **klassikaal digibord-spel eerst bouwen**, individueel als vervolg.
> **Status**: ontwerp ter bespreking — nog niet bouwen.

---

## 1. Eén datamodel voor beide varianten: zones

Elk speelbaar beeld krijgt **zones**: cirkels op de plaat waar een geluid "goed" is.

```
zone = { sampleId, x, y, radius }        // genormaliseerd 0-1, zoals alle posities
speelplaat = { imageUrl, zones: Zone[] } // afgeleid van bestaande content
```

**Het mooie: de content bestaat grotendeels al.**
- **Thema-locaties** hebben hotspots — geluiden die al op een x/y-positie op het beeld staan (`locations.ts` per thema). Een zone = hotspot-positie + royale radius. De vijf basislocaties + piraten zijn dus *gratis* speelbaar.
- **Praatplaat-afbeeldingen** (registry) hebben nog geen posities; die krijgen per plaat een klein `zones`-blok in `praatplaatImages.ts` (contentwerk, geen bouwwerk).
- Geluiden komen uit de bestaande theme-samples via `audioService` (preview-play bestaat).

Eén registry-helper `getSpeelplaten()` levert alles wat zones heeft; nieuwe thema's uit de thema-studio doen automatisch mee.

## 2. Variant A — klassikaal digibord-spel (eerst bouwen)

**Spelverloop** (docent bedient, klas speelt samen — geen leerling-devices):
1. Docent kiest een speelplaat (zelfde kiezer-stijl als de praatplaat-catalogus) → fullscreen bord in presentatiescherm-stijl (lichte kaart, fullscreen-knop — hergebruik van de PresentationSurface-schil).
2. **Ronde**: de app speelt een willekeurig geluid uit de zones (nog niet gebruikt deze sessie). Grote "nog eens luisteren"-knop.
3. De klas overlegt en wijst op het (digi)bord — de docent tikt de plek aan die de klas kiest.
4. **Onthulling**: raak binnen de zone → de zone licht groen op met het geluidsicoon + naam, feestje-animatie; ernaast → de juiste plek pulseert alsnog (leren, niet afstraffen). Klassikale teller ("7 van de 9 goed") optioneel en uitzetbaar.
5. Volgende ronde tot alle zones geweest zijn → eindscherm met de volledige "klankenkaart" (alle zones zichtbaar, elk aanklikbaar om nog eens te luisteren).

**Didactische knoppen voor de docent** (instellingen vooraf, alles optioneel):
- Aantal rondes (alles / 5 / 10) · teller aan/uit · "eerst 2× luisteren" aan/uit.
- **Moeilijkheid** via radius: groot (kleuters) / normaal / klein (bovenbouw) — één instelling, geen aparte content.

**Waar het leeft**: als spelvorm in het klaslokaal (naast Presenteren) én als losse ingang zonder klas — ook een invaller (U6) of ouder kan het spelen; het vergt geen inzendingen. Overweging: ook op de publieke landingspagina als proefje (sterke demo van "wat is SoundScout").

**Bouwomvang**: klein-middel. Eén spelscherm (state: rondes, gespeeld, onthuld), zones-registry, kiezer. Geen database, geen migratie — het spel slaat niets op.

## 3. Variant B — individueel op device (vervolg)

- Leerling (klascode of leerling-code) krijgt dezelfde plaat met onderaan een rij **geluidskaartjes** (afspeelbaar); sleept elk kaartje naar de plek waar het hoort (dnd-kit, bestaat in de studio).
- Feedback per kaartje: goed = vast klikken op de zone; fout = kaartje stuitert terug (max 3 pogingen, dan hint: de zone knippert).
- Eindscore ("8/10 in 2 pogingen") — met leerling-codes (zie ONTWERP-LEERLING-CODES) kan de docent later scores per kind zien; zonder dat fundament blijft het device-lokaal.
- Bouwomvang: middel; hergebruikt het zones-model, de dnd-infrastructuur en (voor score-opslag) de leerling-codes.

## 4. Contentbehoefte per plaat

| Bron | Wat nodig | Wie |
|---|---|---|
| Thema-locaties (basis, piraten, winterspelen) | Niets — hotspots zijn de zones; alleen radius-defaults checken | ik |
| Praatplaat-afbeeldingen (registry) | Per plaat 6-10 zones kiezen (welk geluid hoort waar) | Bert kiest, ik zet in data (of via de thema-studio-sessie) |
| Nieuwe thema's | Automatisch mee via hotspots | — |

## 5. Open vragen voor Bert
1. **Onthulling-toon**: teller/score klassikaal aan als standaard, of standaard uit (puur samen luisteren)? 
2. **Fout-gedrag variant A**: bij mis meteen de juiste zone tonen (mijn voorstel), of de klas nóg een kans geven?
3. **Publieke demo**: het klassikale spel ook op de landingspagina zetten (zonder login) — goede etalage of te vroeg?
4. **Volgorde in de routekaart**: bevestigd als R5 (na deploy, betaal-voorbereiding en klas-album), of eerder naar voren halen omdat het klein en zichtbaar is?
