# Beoordelings-checklist (kwaliteitslus fase C)

Loop na élke generatie de checklist af op het verwerkte jpg (Read). Per criterium ✓/✗
met één regel toelichting; log in `manifest.json`. Eén ✗ = beeld gaat niet naar Bert
(behalve als je twijfelt over je eigen waarneming — dan voorleggen mét de twijfel).
**Jij keurt alleen af; Bert keurt goed.**

## Algemeen (elk beeldtype)

| # | Criterium |
|---|---|
| A1 | Volledig gevuld 16:9-vlak — geen letterbox, randen, kaders |
| A2 | **Geen tekst**: geen letters, cijfers, tekstballonnen, logo's, watermerken, én **geen geluidswoorden/onomatopee** (BOOM, POW, SPLASH) — die sluipt Nano Banana er graag in bij kanonnen/klappen (uitzondering: de expliciet opgegeven labels op de plattegrond — dan NL-spelling letter voor letter checken) |
| A3 | Stijlmatch met het stijlanker: lijnvoering, detaildichtheid, kleurbehandeling |
| A4 | Palet conform themaplan (dominante themakleur aanwezig, niet vals) |
| A5 | **Álles is een robot**: piraten/bewoners/monsters zijn robot-versies; géén mensen. **Gezicht = scherm/visor met gloeiende ogen + simpel mondje; géén menselijke mond/tanden/lippen** |
| A5b | **Dieren zijn mechanische robot-dieren** (metaal, panelen, gloeiende ogen, zichtbare naden/bouten) — géén echte vacht, veren of huid (let op: meeuwen, apen, krabben komen snel organisch uit de generator) |
| A6 | Kindvriendelijk (geen enge/gewelddadige elementen) |
| A7 | Geen AI-artefacten: extra ledematen, half gerenderde objecten, onmogelijke aansluitingen, smeltende vormen |
| A8 | **Robot-diversiteit** (zie stijl-robots.md): brede kleurmix, geen kleur > ~20%, niet overwegend zilver/grijs; variatie in vorm (blik/android/chibi) en grootte; herkenbare robotfamilie |
| A9 | **Periode/wereld-echtheid**: props, bouwwerken en voertuigen passen bij de tijd/wereld van het thema (piraten = hout/touw/canvas, géén moderne stalen machines); alleen de robots zijn futuristisch |
| A10 | **Drukte gehaald**: het aantal zichtbare acties matcht de afspraak (extreem druk ≥30 · vol ~25 · medium ~18) |

## Praatplaat (extra)

| # | Criterium |
|---|---|
| P1 | Geschat 20-30 telbare activiteiten (tel systematisch per zone; noteer je telling — het blijft een schatting, meld dat erbij) |
| P2 | Alle geplande sample-activiteiten uit het themaplan aanwijsbaar (loop de mapping af) |
| P3 | Verborgen zoekdetails (3-5) aanwezig |
| P4 | Drukte-niveau conform intake |
| P5 | Personage-kleurspreiding: geen kleur domineert (> ~20%) |
| P6 | Activiteiten ruimtelijk gespreid (geen lege kwadranten, geen klontering) |

## Locatie-achtergrond (extra)

| # | Criterium |
|---|---|
| L1 | Volle wemelscène: ~20-30 acties/elementen (net zo druk als een praatplaat) |
| L2 | 6-8 duidelijk herkenbare sound-sources, opvallend vindbaar tussen de drukte — benoem elk met x/y-schatting in % (→ hotspot-startadvies INTEGRATIE.md) |
| L3 | Sound-sources ruimtelijk gespreid; niet in de onderste ~8% strook (app-UI); achtergrond-gags mogen daar wel |
| L4 | Elke sound-source matcht 1-op-1 met een sample; extra acties zijn on-theme (hoeven geen eigen sample) |

## Storyboard-frame (extra)

| # | Criterium |
|---|---|
| S1 | Held identiek aan vorige frames (kleuren, bouw, gezicht, kleding/onderdelen) |
| S2 | Decor en belichting consistent met vorige frames |
| S3 | Handeling in één oogopslag leesbaar (digibord-afstand) |
| S4 | Chronologie klopt binnen de reeks |

## Plattegrond (extra)

| # | Criterium |
|---|---|
| M1 | Alle locaties als herkenbare zone aanwezig, matchend met de locatie-achtergronden |
| M2 | Zones gespreid — markers (40-64px) kunnen zonder overlap op de geplande posities |
| M3 | Labels exact en foutloos gespeld (letter voor letter); geen andere tekst |

## Bij afkeuring

- Lokale fout (één element, tekst-restje, artefact) → **gerichte edit**:
  `--edit-van <vorige>.png --edit-prompt "…"` (beschrijf alleen de wijziging).
- Structurele fout (compositie, stijl, drukte, palet) → **regenereren** met
  aangescherpte prompt; noteer in de prompt-file wat je aanscherpte en waarom.
- Max 3 iteraties per beeld, daarna escaleren naar Bert met de beste 2-3 kandidaten
  en jouw analyse per kandidaat.
