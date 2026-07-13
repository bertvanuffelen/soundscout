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
   vallen"). De lijst wordt gegenereerd **uít de sample-lijst van het themaplan**:
   elke sample van de gekoppelde locaties komt minstens 1× terug als activiteit; geen
   activiteit die niet sonificeerbaar is.
5. **Diversiteit**: neem het robot-standaardblok uit
   [stijl-robots.md](stijl-robots.md) op — brede kleurmix (geen kleur > ~20%), variatie
   in vorm (blik/android/chibi) en grootte.
6. **Verborgen zoekdetails**: 3-5 kleine elementen om te vinden.
7. **Stijl & mood**: cartoon line-art, clean bold outlines, heldere licht verweerde
   kleuren, dominante themakleur benoemen, kindvriendelijk, 4k detail.

## Negatieve prompt (altijd, letterlijk opnemen)

- **Álles is een robot** (huisstijlregel): piraten, bewoners én dieren zijn robot-versies
  — robot-papegaai, robot-aap, robot-piraat. Geen mensen, geen echte dieren.
- **Geen tekst, tekstballonnen, letters, cijfers, labels, logo's, borden met opschrift,
  watermerken.** (De bestaande platen bevatten wartaal-tekst zoals "SUFARD MARKT
  DRAKMFARKES" — dit is precies wat we uitbannen. Nieuwe platen wijken hier bewust en
  positief af van de oude.)
- Geen letterbox, randen of kaders — het beeld vult het volledige 16:9-vlak.

## SoundScout-eisen

- Elk element moet **sonificeerbaar** zijn: een leerling kiest een element en bouwt er
  een compositie bij met de samples van het gekoppelde thema.
- Activiteiten ruimtelijk spreiden (leerlingen kiezen posities op de plaat; clustering
  op 5%-afstand wordt in de app samengevoegd).
- Doelgroep: basisschool. Vrolijke chaos, geen enge of gewelddadige elementen.
