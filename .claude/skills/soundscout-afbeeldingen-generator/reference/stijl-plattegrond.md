# Stijlcontract: plattegrond (map-achtergrond)

Referentiebeeld: `public/images/themes/basis/plattegrond.jpg` ("Onze Speelstad" —
isometrische stad met tekstbordjes). Bekijk met Read vóór de eerste prompt.

## Waargenomen huisstijl

Cartoon line-art met nette contouren, gedempt/warm palet, duidelijk gescheiden zones per
locatie, wegen/paden die de zones verbinden. **Twee toegestane kaartstijlen:**
- **(a) Landschapskaart** (winterspelen-stijl): een overzicht van een landschap
  (bergen/eilanden/velden) met per zone een **lint-banner** als naamlabel, kronkelende
  **wegen/route** ertussen, kleine **wegwijzer-bordjes** (met humor), en sfeer-vignetten
  (bomen, gebouwtjes, bergen).
- **(b) Isometrische stad** (basis-stijl, `public/images/themes/basis/plattegrond.jpg`):
  gebouwen als zones met straatnaam-/gevelbordjes en een titel-banner ("ONZE SPEELSTAD").

**Vaste kaart-elementen (beide stijlen):**
- **Lint-banners** met de zone-namen (nette leesbare letters).
- Een **legenda-kader** linksonder (bv. Wegen / Route / Locaties / Schip).
- Een **kompasroos** in een hoek (mag een thema-twist hebben, bv. een robot- of schedel-'N').
- Verbindende **route/wegen** + een paar **bordjes** (ruimte voor humor).

## Functionele eisen

- Elke locatie van het thema is als herkenbare zone aanwezig, ruimtelijk gespreid
  zodat map-markers (sm 40px / md 64px) niet overlappen.
- De zones moeten matchen met de locatie-achtergronden (zelfde gebouw/sfeer herkenbaar).
- Compositie houdt rekening met `locationPositions` uit het themaplan — plan de zones
  op die posities (of stel na goedkeuring bijgestelde posities voor).

## Taalvarianten (plattegrond = enige beeld met tekst)

Omdat alle andere beeldtypes tekstloos zijn, is de **plattegrond het enige beeld dat een
per-taal-variant nodig heeft**. Lever bij een tweetalig thema **beide** aan:
`plattegrond.jpg` (NL) + `plattegrond-en.jpg` (EN). Maak de EN-versie het snelst met een
**gerichte edit** van de goedgekeurde NL-kaart ("vervang alleen de labels door de Engelse,
rest identiek") — dat lukt betrouwbaar (tekstvervanging = accessoire-achtige edit).
**App-implicatie**: `MapConfig.backgroundImage` is nu één pad; om de EN-kaart te tonen bij
Engelse taal is een kleine codewijziging nodig (map-achtergrond kiezen op i18n-taal, bv.
`plattegrond-{lang}.jpg`). Noteer dit in INTEGRATIE.md.

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

1. "Wide horizontal illustration" + kaartstijl (landschapskaart óf isometrische stad) +
   naam/sfeer van de themawereld.
2. Per locatie: zone-beschrijving + positie-indicatie (linksboven/midden/…) + exact
   **banner-label**.
3. Vaste elementen: kronkelende route/wegen tussen de zones · **legenda-kader** linksonder ·
   **kompasroos** in een hoek · een paar wegwijzer-bordjes · sfeer-vignetten.
4. Stijl: cartoonstijl, nette contouren, palet passend bij `colors.mapBackground`,
   kindvriendelijk, 4k.

## Negatieve prompt

Eventuele figuren/dieren zijn robot-versies (huisstijlregel — nooit mensen/echte dieren);
geen tekst behálve de opgegeven labels; geen letterbox/kaders.
