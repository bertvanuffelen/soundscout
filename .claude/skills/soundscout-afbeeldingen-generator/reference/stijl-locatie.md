# Stijlcontract: locatie-achtergrond

Referentiebeelden (allemaal **locatie**platen — bekijk er minstens twee met Read):
`public/images/themes/basis/boerderij.jpg`, `.../klaslokaal.jpg`,
`public/images/praatplaten/sportveld.jpg` (sportveld = locatie-stijl).

## Waargenomen huisstijl

**Volle wemelscène** — net zo druk als een praatplaat. Tientallen robots die van alles
uitspoken, humoristische chaos, veel te ontdekken. Cartoon line-art, bold outlines,
cel-shaded, warme kleuren, gloeiende accenten. Géén rustig scherm: het is een
zoek-en-geniet-plaat. (Mijn eerdere "locaties rustiger" was fout — locaties en
praatplaten zijn even vol.)

## Functionele eisen (hard)

- **~20-30 acties/elementen** in beeld (zelfde dichtheid als een praatplaat).
- Daarvan zijn **6-8 duidelijk herkenbare "sound-sources"** = de samples/hotspots. Die
  moeten opvallend en eenduidig vindbaar zijn tussen de drukte (ze krijgen in de app een
  pulserende marker), 1-op-1 gekoppeld aan een sample uit het themaplan, en visueel
  "klinken" (een blaffende robothond, een sissende koffiemachine).
- De overige acties zijn **on-theme achtergrond-gags** (klungelige robot-lol) — die
  hoeven géén eigen sample; ze maken de plaat rijk en grappig.
- **Sound-sources niet in de onderste ~8% strook** (app-UI overlapt daar met de
  hotspot-markers); achtergrond-gags mogen daar wél.
- Sound-sources ruimtelijk gespreid over het vlak (niet clusteren).

## Promptstructuur

1. "Wide horizontal illustration" + beschrijving van de locatie en sfeer + "busy,
   detailed wimmelbild packed with activity".
2. **De 6-8 sound-sources expliciet** opsommen (personage/object + hoorbare actie).
3. **~15-20 extra klungelige on-theme gags** opsommen (of enkele noemen + "and many more
   clumsy mishaps in the same spirit").
4. Robot-standaardblok uit [stijl-robots.md](stijl-robots.md) (kleur/vorm/grootte-diversiteit).
5. Stijl: warme cartoonstijl, bold outlines, themakleur-accenten, kindvriendelijk, 4k.

## Negatieve prompt (altijd)

Alle figuren/dieren zijn robot-versies (huisstijl — nooit mensen/echte dieren); geen
tekst/letters/cijfers/labels/logo's/watermerk; geen letterbox of kaders.

## Beoordelings-extra

Benoem bij de checklist per sound-source een **x/y-schatting in %** — dat wordt het
hotspot-startadvies in INTEGRATIE.md. (Alleen voor de 6-8 sound-sources, niet voor de
achtergrond-gags.)
