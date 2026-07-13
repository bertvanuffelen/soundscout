# Prompt-recept (voor élke beeldprompt naar Higgsfield)

Twee vaste onderdelen, geïnspireerd op Berts "Praatplaat generator"-gem:
**(1) altijd eerst de mini-wizard, (2) altijd het vaste negatief-blok meesturen.**

## 1. Mini-wizard vóór elk beeld (altijd bevragen)

De skill genereert **nooit** een beeld zonder eerst kort te bevragen. Stel (kort,
conversationeel — voorstel + vraag om bevestiging/bijstelling):

- **a) Onderwerp/scène** — welk beeld maken we (staat al in het themaplan; bevestig).
- **b) Drukte** — extreem druk / vol / medium? (default thema-breed, maar per beeld te
  overrulen).
- **c) Shot** — close-up / medium shot / totaalshot / **dwarsdoorsnede**. Kies bewust per
  beeld (kroeg = medium interieur; stad = totaalshot; schip = dwarsdoorsnede kan mooi).
- **d) Kleurenpalet + belichting** — accentkleur + lichtsfeer voor dít beeld (default
  thema-palet; bv. warme lantaarngloed binnen, golden hour buiten, nachtelijk, ...).
- **e) Bijzondere wensen** — extra element, specifieke gag, iets vermijden.

Pas de prompt aan op de antwoorden. Bij een reeks van hetzelfde type (bv. 4
storyboardframes) volstaat één keer bevragen + per frame bevestigen.

## 2. Vaste prompt-opbouw (gem-skelet, in het Engels naar Higgsfield)

1. **"Wide horizontal illustration."** + het gekozen shot.
2. **Titel/intro**: één pakkende zin die de drukke scène neerzet.
3. **Omgeving**: niveaus, zones en de staat van de locatie (nieuw/versleten/besneeuwd/...).
4. **Activiteiten**: 20-30 specifieke acties; de **sound-hotspots** expliciet (personage +
   werkwoord + hoorbaar geluid) + on-theme klungel-gags eromheen.
5. **Robot-standaardblok** uit [stijl-robots.md](stijl-robots.md): kleur/vorm/grootte-
   diversiteit, geen kleur > ~20%.
6. **Verborgen zoekdetails**: 3-5 kleine zoekelementen.
7. **Stijl & mood**: cartoon line-art, duidelijke omtrekken, **heldere maar licht versleten
   kleuren**, palet + belichting van de mini-wizard, kindvriendelijk, 4k.
8. **Negatief-blok** (zie hieronder — altijd, verbatim).

## 3. Vast negatief-blok (ALTIJD meesturen)

```
Negative: no text, letters, numbers, words, speech bubbles, labels or captions on or near
any element; no logos or watermarks; no realistic humans or real animals — robots only;
no letterbox, frame or borders; fill the entire 16:9 frame.
```

**Enige uitzondering — plattegrond**: daar zijn de expliciet opgegeven banner-/bordlabels
juist gewenst (met NL-spellingscheck). Alle overige tekst blijft verboden. Gebruik dan:
```
Negative: no text except the specified sign/banner labels; no numbers or labels on other
elements; no logos or watermarks; no realistic humans or real animals — robots only;
no letterbox, frame or borders; fill the entire 16:9 frame.
```
