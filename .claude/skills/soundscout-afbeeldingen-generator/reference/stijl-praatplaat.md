# Stijlcontract: praatplaat

> **HUISSTIJLREGEL (geldt voor álle beeldtypes): alles is een robot.** Piraten, bewoners,
> dieren, monsters — uitsluitend robot-versies (robot-papegaai, robot-aap, robot-piraat).
> De thema-flavor zit in hóe de robots eruitzien (roest, houten-been-bouten, zeewier),
> niet in óf ze robot zijn. Nooit fotorealistische mensen of echte dieren.

Referentiebeelden (bekijk ze met Read vóór je de eerste prompt schrijft; gebruik ze als
`--style-ref` bij thema's in de basis-stijl):
- `public/images/praatplaten/koningsdag.jpg` — straatscène, hoog standpunt, oranje domineert
- `public/images/praatplaten/robotfabriek.jpg` — dwarsdoorsnede met 4 verdiepingen
- `public/images/praatplaten/sportveld.jpg` — arena-overzicht

## Waargenomen huisstijl (uit de echte assets)

Cartoon line-art met duidelijke donkere contouren; heldere maar licht verweerde kleuren;
**één dominante themakleur per plaat**; hoog standpunt; zeer hoge detaildichtheid
(wimmelbeeld); humoristische chaos; robots als personages (basis-thema). De drie platen
variëren in shot: straatscène / dwarsdoorsnede / overzicht — kies per plaat bewust
(wizard-vraag in fase A/B).

## Promptstructuur (verplichte opbouw)

1. **Titel** — pakkend, intern (komt niet in het beeld).
2. **Opening**: "Wide horizontal illustration" + gedetailleerde drukke scène/dwarsdoorsnede.
3. **Omgeving**: zones en niveaus, staat van de locatie (nieuw/versleten/besneeuwd/…).
4. **Activiteiten**: 20-30 specifieke, chaotische activiteiten, **elk geformuleerd als
   personage + werkwoord + hoorbaar geluid** ("een robot laat een stapel pannen kletterend
   vallen"). Elke activiteit is **sonificeerbaar met ≥1 sample uit het thema** (richting:
   activiteit → sample). Streef naar spreiding over alle locatie-klankwerelden; bij een
   thema met veel samples hoeft niet elke sample afgebeeld te worden.
5. **Vaste cast**: laat 3-6 leden van de [vaste cast](stijl-cast.md) als hoofdrolspelers
   opduiken (bij naam + kenmerk + thema-flavor), met hun `reference/cast/*.jpg` als
   `--image-reference` naast het stijlanker. Vul de rest aan met random familie-robots.
6. **Diversiteit**: neem het robot-standaardblok uit
   [stijl-robots.md](stijl-robots.md) op — brede kleurmix (geen kleur > ~20%), variatie
   in vorm (blik/android/chibi) en grootte.
7. **Verborgen zoekdetails**: 3-5 kleine elementen om te vinden.
8. **Stijl & mood**: cartoon line-art, clean bold outlines, heldere licht verweerde
   kleuren, dominante themakleur benoemen, kindvriendelijk, 4k detail.

## Negatieve prompt (altijd, letterlijk opnemen)

- **Álles is een robot** (huisstijlregel): piraten, bewoners én dieren zijn robot-versies
  — robot-papegaai, robot-aap, robot-piraat. Geen mensen, geen echte dieren.
- **Geen tekst, tekstballonnen, letters, cijfers, labels, logo's, borden met opschrift,
  watermerken.** (De bestaande platen bevatten wartaal-tekst zoals "SUFARD MARKT
  DRAKMFARKES" — dit is precies wat we uitbannen. Nieuwe platen wijken hier bewust en
  positief af van de oude.)
- Geen letterbox, randen of kaders — het beeld vult het volledige 16:9-vlak.

## Twee soorten "praatplaten" — belangrijk onderscheid

- **Locatie-achtergrond** (`stijl-locatie.md`): de wemelscène áchter een locatie, met
  6-8 sound-hotspots (= de samples) + achtergrond-gags. Prima als volle drukke plaat;
  hoeft géén losse mini-verhaaltjes.
- **Hoofd-praatplaat** (dit contract): de **losstaande** praatplaat (bv. een marktplein)
  die een kind kiest en waar het bij componeert. **Hier** geldt de mini-verhaaltjes-eis
  hieronder.

## Hoofd-praatplaat = verzameling mini-verhaaltjes (soundscape-vignetten)

De sterkste hoofd-praatplaat is **niet één grote massa**, maar een set **duidelijk
gescheiden mini-taferelen** — elk een klein verhaaltje waar een kind een héle *soundscape*
bij kan bedenken (een reeks geluiden, niet één klank). Elk tafereel heeft z'n eigen plek,
personages en gebeurtenis (bv. "de kombuis": pruttelende pot + hakkend mes + kat die een
pan omstoot + mopperende kok).
- **Streef naar 20-30 herkenbare mini-taferelen**, elk met eigen soundscape-potentie,
  ruimtelijk gescheiden zodat een kind er eentje kan "aanwijzen".
- Dit kan in **elke setting** — een druk marktplein werkt prima; een dwarsdoorsnede
  (schip/grot met aparte ruimtes) is een optie, geen must.
- Formuleer elk tafereel in de prompt als een klein clustertje activiteit (2-4 dingen die
  samen één verhaaltje vormen), niet als losse atomaire acties.

## SoundScout-eisen

- Elk element moet **sonificeerbaar** zijn: een leerling kiest een element en bouwt er
  een compositie bij met de samples van het gekoppelde thema.
- Activiteiten ruimtelijk spreiden (leerlingen kiezen posities op de plaat; clustering
  op 5%-afstand wordt in de app samengevoegd).
- Doelgroep: basisschool. Vrolijke chaos, geen enge of gewelddadige elementen.
