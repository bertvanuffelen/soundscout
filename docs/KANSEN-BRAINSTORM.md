# Kansen & brainstorm — uitkomsten sparringsessie

> Vastgelegd 2026-07-14. Uitkomsten van de brainstorm over de website-schil,
> educatieve kansen en de DAW. Besluiten van Bert zijn als zodanig gemarkeerd;
> de rest is voorraad voor latere fasen.

## Besluiten

### Website-schil: app-first blijft, geen blog/CMS
- soundscout.nl blijft de app (Chrome Music Lab/Scratch-model, niet het
  BandLab-model met marketing-voorportaal). `/teacher` is en blijft de etalage.
- **Geen blog**: Bert schrijft geen artikelen. De SEO-kans zit in
  **publieke leskaart-pagina's** (zie Kansen hieronder) — leskaarten maken
  vindt Bert wél leuk, en dat is dezelfde content in een andere jas.

### Microfoon / soundwalk: GEPARKEERD (besluit Bert)
Rationale Bert: de kracht van SoundScout is dat leerlingen **direct met
gecureerde samples het creatieve proces in gaan** — onderzoeken welke geluiden
bij de plaat passen. Zelf opnemen leidt daarvan af en duwt het product richting
"gewone DAW" (concurrentie met GarageBand i.p.v. eigen categorie).
- Open deurtje voor later: **docent-upload** — de docent neemt klasgeluiden op
  of uploadt ze als geluidenset. Nul privacyrisico, bedient de
  "eigen school als thema"-wens. Niet gepland.

### Samen componeren: noteren, niet bouwen (besluit Bert)
Estafette via bewaarcode, duet-modus en klas-compositie-per-spoor zijn mooi
maar complex → voorraad. De **storyboard-verdeling** (hieronder) is de beste
eerste vorm en is als concreet ontwerp uitgewerkt.

## Concreet ontwerp: storyboard-verdeling — "Samen één verhaal" (idee Bert)

**Didactiek**: de docent verdeelt de frames van een storyboard over
kinderen/duo's; elk maakt de muziek bij één scène; samen vormen ze het hele
verhaal. Vraagt afstemming ("jouw scène moet aansluiten op de mijne") en
eindigt in een gezamenlijke première.

**Techniek = het praatplaat-model toegepast op het storyboard** (geen nieuwe
architectuur):
1. Docent: bij een storyboard-opdracht een toggle "frames verdelen".
2. Leerling: na de klascode een **frame-kiezer** (patroon
   `PraatplaatSelectScreen`) — kies (of krijg) één frame; bezette frames
   zichtbaar. Meerdere kinderen per frame toestaan (zoals praatplaat-spots).
3. Inzending draagt `frame_index` (patroon `position_x/y` op `submissions`;
   kleine additieve migratie t.z.t.).
4. Studio: zoomt/opent op het eigen frame (patroon praatplaat-zoom #80 /
   `currentImageIndex`).
5. Presentatie: `ClassPresentationView` sorteert op `frame_index` → het hele
   verhaal klinkt met per scène de muziek van een ander groepje. Bij meerdere
   inzendingen per frame: achter elkaar of docent kiest.

**Omvang**: middelgroot (vergelijkbaar met de praatplaat-kiezer destijds).
**Status**: ontwerp klaar; bouwbeslissing later.

## Kansen-voorraad (gezeefd op uniek + past bij het DNA)

1. **Luister-modus / geluiddictee** — de app omgedraaid: docent speelt op het
   digibord een geluid, leerlingen zoeken de bron op de praatplaat of raden 'm.
   Actief luisteren als spel; alle bouwstenen (praatplaat, hotspots,
   digibord-modus) bestaan. Geen enkele DAW heeft dit.
2. **Muzikaal paspoort** — de app analyseert wat een kind al dééd (lagen,
   loops/ostinato, secties/vorm, dynamiek, effecten) en benoemt het in
   vaktaal: "jouw compositie heeft een ostinato, drie klanklagen en een
   ABA-vorm". Woordenschat gekoppeld aan eigen werk; goedkoop (data bestaat).
3. **Klas-album** — één deel-link met alle composities van een project als
   afspeellijst (ouderavond, nieuwsbrief). De presentatiemodus is er ~80% van;
   nog nodig: publieke variant + bundel-link.
4. **Publieke leskaart-pagina's** (`/les/[builtin_key]`) — elke ingebouwde
   leskaart als prerendered pagina (titel, lesdoel, fasering, niveau,
   "Open voor je klas"-knop), gegenereerd uit de bestaande database/registry.
   = de SEO-motor zonder bloggen: matcht op "muziekles idee groep 6".
   Patroon: statische head zoals `teacher.html`.
5. **Prentenboek-koppeling** — storyboard-modus met de platen van het boek dat
   de klas leest → soundscape per scène. Muziek × taal; sluit aan op de
   storyboard-verdeling hierboven.

## DAW-ronde (in uitvoering — zie plan)

Gekozen door Bert, met als harde eis **eenvoud bewaren** (progressive
disclosure — niets nieuws in beeld tot je het nodig hebt):
- Grijze-vlak-bug (BUG-TIMELINE-GRIJS) fixen
- "+ 8 maten"-tegel voorbij de laatste maat (max 64 maten)
- "+ spoor" tot 12 + solo-toggle in de bestaande volume-popover
- Sectie-loop ("loop deze sectie" — hergebruik van het sectie-concept
  i.p.v. een nieuw A/B-paradigma) + zoomknoppen op touch
- Technische hygiëne: bpm-veld in export, iPad-sleepvertraging,
  drie studio-lint-fouten
