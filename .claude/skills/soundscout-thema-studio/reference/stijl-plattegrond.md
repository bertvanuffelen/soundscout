# Stijlcontract: plattegrond (map-achtergrond)

Referentiebeeld: `public/images/themes/basis/plattegrond.jpg` ("Onze Speelstad" —
isometrische stad met tekstbordjes). Bekijk met Read vóór de eerste prompt.

## Waargenomen huisstijl

Isometrisch overzicht, cartoon line-art met nette contouren, gedempt warm palet,
duidelijk gescheiden zones per locatie, wegen/paden die de zones verbinden,
**functionele Nederlandse tekstlabels op bordjes** ("GYMZAAL", "MUZIEKLOKAAL",
banner "ONZE SPEELSTAD").

## Functionele eisen

- Elke locatie van het thema is als herkenbare zone aanwezig, ruimtelijk gespreid
  zodat map-markers (sm 40px / md 64px) niet overlappen.
- De zones moeten matchen met de locatie-achtergronden (zelfde gebouw/sfeer herkenbaar).
- Compositie houdt rekening met `locationPositions` uit het themaplan — plan de zones
  op die posities (of stel na goedkeuring bijgestelde posities voor).

## Tekstbeleid (uitzondering op de andere beeldtypes!)

Tekstlabels zijn hier functioneel gewenst. `gemini-3-pro-image` (Nano Banana Pro) kan
leesbare tekst renderen:
- Geef de exacte labels letterlijk in de prompt op, in HOOFDLETTERS, met de instructie
  dat er géén andere tekst in het beeld mag.
- **NL-spelling is een hard checklist-criterium**: elk label letter voor letter
  controleren; fout → gerichte multi-turn edit van alleen dat bordje.
- Fallback bij herhaald falen: tekstloos genereren (bordjes leeg) en labels later als
  overlay toevoegen.

## Promptstructuur

1. "Wide horizontal illustration, isometric map view" + naam/sfeer van de themawereld.
2. Per locatie: zone-beschrijving + positie-indicatie (linksboven/midden/…) + exact label.
3. Verbindende elementen (paden, rivier, lift, …) + kleine sfeerdetails.
4. Stijl: isometrische cartoonstijl, nette contouren, palet passend bij
   `colors.mapBackground`, kindvriendelijk, 4k.

## Negatieve prompt

Geen fotorealistische mensen/dieren; geen tekst behálve de opgegeven labels; geen
letterbox/kaders.
